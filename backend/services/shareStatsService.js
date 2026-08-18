import ShareStat from '../models/ShareStat.js';

/**
 * Gom số đếm trong RAM rồi flush theo chu kỳ.
 * Một link share lan mạnh có thể tạo hàng nghìn lượt xem; ghi Mongo mỗi lượt
 * sẽ đắt hơn nhiều so với chính việc phục vụ ảnh (vốn đã được CDN cache).
 */
const FLUSH_INTERVAL_MS = Number(process.env.SHARE_STATS_FLUSH_MS || 60 * 1000);

const pending = new Map(); // `${day}|${variant}` -> counters
let flushTimer = null;
let flushing = false;

const dayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(date);

export const trackShare = (field, { variant = 'daily', amount = 1 } = {}) => {
  const day = dayKey();
  const key = day + '|' + variant;
  const entry = pending.get(key) || { day, variant };
  entry[field] = (entry[field] || 0) + amount;
  pending.set(key, entry);
};

export const flushShareStats = async () => {
  if (flushing || pending.size === 0) return { flushed: 0 };
  flushing = true;

  // Lấy snapshot rồi xoá ngay, để số đếm phát sinh trong lúc ghi không bị mất.
  const batch = [...pending.values()];
  pending.clear();

  try {
    const operations = batch.map(({ day, variant, ...counters }) => ({
      updateOne: {
        filter: { day, variant },
        update: { $inc: counters, $setOnInsert: { day, variant } },
        upsert: true
      }
    }));

    if (operations.length) {
      await ShareStat.bulkWrite(operations, { ordered: false });
    }
    return { flushed: operations.length };
  } catch (error) {
    // Ghi hỏng thì trả số đếm về hàng đợi để lần flush sau thử lại.
    batch.forEach(({ day, variant, ...counters }) => {
      const key = day + '|' + variant;
      const entry = pending.get(key) || { day, variant };
      Object.entries(counters).forEach(([field, value]) => {
        entry[field] = (entry[field] || 0) + value;
      });
      pending.set(key, entry);
    });
    console.error('[ShareStats] Flush failed:', error.message);
    return { flushed: 0, error: error.message };
  } finally {
    flushing = false;
  }
};

export const startShareStatsFlusher = () => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushShareStats().catch(() => {});
  }, FLUSH_INTERVAL_MS);
  if (typeof flushTimer.unref === 'function') flushTimer.unref();

  // Cố gắng ghi nốt khi process tắt (deploy, restart).
  const drain = () => {
    flushShareStats().catch(() => {});
  };
  process.once('SIGTERM', drain);
  process.once('SIGINT', drain);
};

export const getShareStats = async (days = 14) => {
  const rows = await ShareStat.find({})
    .sort({ day: -1 })
    .limit(days * 4)
    .lean();

  const byDay = new Map();
  rows.forEach((row) => {
    const entry = byDay.get(row.day) || {
      day: row.day,
      imagesRendered: 0,
      snapshotsCreated: 0,
      pageViews: 0,
      imageServes: 0,
      variants: {}
    };
    entry.imagesRendered += row.imagesRendered || 0;
    entry.snapshotsCreated += row.snapshotsCreated || 0;
    entry.pageViews += row.pageViews || 0;
    entry.imageServes += row.imageServes || 0;
    entry.variants[row.variant] = {
      imagesRendered: row.imagesRendered || 0,
      snapshotsCreated: row.snapshotsCreated || 0,
      pageViews: row.pageViews || 0
    };
    byDay.set(row.day, entry);
  });

  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, days);
};

export const getPendingShareStats = () => [...pending.values()];
