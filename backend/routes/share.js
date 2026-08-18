import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import ShopSnapshot from '../models/ShopSnapshot.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  renderShopImage,
  buildItemsFromStorefront,
  getAvailableVariants,
  getBundleTitle,
  getImageCacheStats,
  isAllowedImageUrl,
  MAX_ITEMS,
  SITE_URL
} from '../services/shopImageService.js';
import { trackShare, getShareStats } from '../services/shareStatsService.js';

const router = express.Router();

// Payload storefront to hơn mặc định 100kb của express.json nên router này
// dùng limit riêng thay vì nới toàn cục.
const jsonBody = express.json({ limit: '1mb' });

const VALID_VARIANTS = new Set(['daily', 'night-market', 'bundle', 'accessory']);
const VALID_SIZES = new Set(['feed', 'og']);

const renderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn tạo ảnh quá nhanh, thử lại sau ít phút.' }
});

const snapshotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bạn tạo link chia sẻ quá nhiều, thử lại sau.' }
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const cleanString = (value, max = 64) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const normalizeVariant = (value) => (VALID_VARIANTS.has(value) ? value : 'daily');
const normalizeSize = (value) => (VALID_SIZES.has(value) ? value : 'feed');
const normalizeLang = (value) => (value === 'en' ? 'en' : 'vn');

const parseRequest = (body = {}) => {
  const variant = normalizeVariant(body.variant);
  const size = normalizeSize(body.size);
  const lang = normalizeLang(body.lang);
  const shard = cleanString(body.shard, 8);
  const showRiotId = body.showRiotId === true;
  // Riot ID chỉ đi vào ảnh khi user chủ động bật; mặc định luôn ẩn.
  const riotId = showRiotId ? cleanString(body.riotId, 40) : '';

  const items = buildItemsFromStorefront(body.storefront || {}, {
    variant,
    wishlistNames: Array.isArray(body.wishlistNames) ? body.wishlistNames.slice(0, 200) : [],
    wishlistUuids: Array.isArray(body.wishlistUuids) ? body.wishlistUuids.slice(0, 200) : []
  })
    .filter((item) => item.name && isAllowedImageUrl(item.imageUrl))
    .slice(0, MAX_ITEMS);

  const title = variant === 'bundle' ? getBundleTitle(body.storefront || {}) : '';

  return { variant, size, lang, shard, showRiotId, riotId, items, title };
};

const makeShortId = () => crypto.randomBytes(6).toString('base64url'); // 8 ký tự, ~2.8e14 tổ hợp

// Trang share nằm trên domain frontend, còn ảnh do backend phục vụ.
// PUBLIC_API_URL cần trỏ về origin backend để thẻ og:image dùng được URL tuyệt đối.
const API_PUBLIC_URL = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');

const snapshotUrls = (shortId) => ({
  pageUrl: SITE_URL + '/s/' + shortId,
  imageUrl: API_PUBLIC_URL + '/api/share/s/' + shortId + '/image',
  ogImageUrl: API_PUBLIC_URL + '/api/share/s/' + shortId + '/og'
});

const sendImage = (res, result, { immutable = false } = {}) => {
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Length', result.buffer.length);
  res.setHeader('X-Image-Cache', result.cached ? 'HIT' : 'MISS');
  res.setHeader(
    'Cache-Control',
    immutable
      // Ảnh của một snapshot không bao giờ đổi -> để CDN/trình duyệt giữ luôn.
      ? 'public, max-age=86400, s-maxage=604800, immutable'
      : 'private, max-age=300'
  );
  return res.end(result.buffer);
};

/* ------------------------------------------------------------------ *
 * Phase 1 - tải/copy ảnh trực tiếp, không tạo link
 * ------------------------------------------------------------------ */

/**
 * POST /api/share/image
 * Nhận storefront từ client, trả thẳng bytes ảnh để tải hoặc copy.
 */
router.post('/image', renderLimiter, jsonBody, async (req, res) => {
  try {
    const parsed = parseRequest(req.body);

    if (!parsed.items.length) {
      return res.status(400).json({ message: 'Không có dữ liệu shop để tạo ảnh.' });
    }

    const result = await renderShopImage({
      ...parsed,
      title: parsed.title || undefined,
      date: new Date()
    });

    trackShare('imagesRendered', { variant: parsed.variant });
    return sendImage(res, result);
  } catch (error) {
    if (error.message === 'NO_ITEMS_TO_RENDER') {
      return res.status(400).json({ message: 'Không có dữ liệu shop để tạo ảnh.' });
    }
    console.error('[ShareRoute] Render failed:', error.message);
    return res.status(500).json({ message: 'Không tạo được ảnh shop.' });
  }
});

/**
 * POST /api/share/variants
 * Cho frontend biết storefront hiện có những mục nào đáng chia sẻ.
 */
router.post('/variants', publicLimiter, jsonBody, (req, res) => {
  res.json({ variants: getAvailableVariants(req.body?.storefront || {}) });
});

/* ------------------------------------------------------------------ *
 * Phase 2 - link chia sẻ có preview
 * ------------------------------------------------------------------ */

/**
 * POST /api/share/snapshot
 * Lưu lại phần metadata (không lưu ảnh) và trả về link chia sẻ.
 */
router.post('/snapshot', snapshotLimiter, jsonBody, async (req, res) => {
  try {
    const parsed = parseRequest(req.body);

    if (!parsed.items.length) {
      return res.status(400).json({ message: 'Không có dữ liệu shop để tạo link.' });
    }

    const shortId = makeShortId();
    await ShopSnapshot.create({
      shortId,
      variant: parsed.variant,
      lang: parsed.lang,
      shard: parsed.shard,
      title: parsed.title,
      riotId: parsed.riotId,
      showRiotId: parsed.showRiotId,
      items: parsed.items
    });

    trackShare('snapshotsCreated', { variant: parsed.variant });
    return res.json({ shortId, ...snapshotUrls(shortId) });
  } catch (error) {
    console.error('[ShareRoute] Snapshot failed:', error.message);
    return res.status(500).json({ message: 'Không tạo được link chia sẻ.' });
  }
});

const loadSnapshot = async (shortId) => {
  if (!/^[A-Za-z0-9_-]{4,16}$/.test(shortId || '')) return null;
  return ShopSnapshot.findOne({ shortId }).lean();
};

/**
 * GET /api/share/s/:shortId
 * Metadata cho trang OG (serverless function của frontend gọi vào đây).
 */
router.get('/s/:shortId', publicLimiter, async (req, res) => {
  try {
    const snapshot = await loadSnapshot(req.params.shortId);
    if (!snapshot) return res.status(404).json({ message: 'Link không tồn tại hoặc đã hết hạn.' });

    trackShare('pageViews', { variant: snapshot.variant });
    ShopSnapshot.updateOne({ shortId: snapshot.shortId }, { $inc: { views: 1 } }).catch(() => {});

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.json({
      shortId: snapshot.shortId,
      variant: snapshot.variant,
      lang: snapshot.lang,
      shard: snapshot.shard,
      title: snapshot.title,
      riotId: snapshot.showRiotId ? snapshot.riotId : '',
      itemCount: snapshot.items.length,
      itemNames: snapshot.items.map((item) => item.name),
      createdAt: snapshot.createdAt,
      views: snapshot.views,
      ...snapshotUrls(snapshot.shortId)
    });
  } catch (error) {
    console.error('[ShareRoute] Snapshot lookup failed:', error.message);
    return res.status(500).json({ message: 'Lỗi tải link chia sẻ.' });
  }
});

const serveSnapshotImage = (size) => async (req, res) => {
  try {
    const snapshot = await loadSnapshot(req.params.shortId);
    if (!snapshot) return res.status(404).json({ message: 'Link không tồn tại hoặc đã hết hạn.' });

    const result = await renderShopImage({
      items: snapshot.items,
      variant: snapshot.variant,
      size,
      lang: snapshot.lang,
      shard: snapshot.shard,
      riotId: snapshot.riotId,
      showRiotId: snapshot.showRiotId,
      title: snapshot.title || undefined,
      date: snapshot.createdAt
    });

    trackShare('imageServes', { variant: snapshot.variant });
    if (!result.cached) {
      ShopSnapshot.updateOne({ shortId: snapshot.shortId }, { $inc: { imageHits: 1 } }).catch(() => {});
    }

    return sendImage(res, result, { immutable: true });
  } catch (error) {
    console.error('[ShareRoute] Snapshot image failed:', error.message);
    return res.status(500).json({ message: 'Không tạo được ảnh cho link này.' });
  }
};

router.get('/s/:shortId/image', publicLimiter, serveSnapshotImage('feed'));
router.get('/s/:shortId/og', publicLimiter, serveSnapshotImage('og'));

/* ------------------------------------------------------------------ *
 * Phase 3 - theo dõi hiệu quả
 * ------------------------------------------------------------------ */

router.get('/stats', protect, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }

  try {
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
    const [stats, topLinks] = await Promise.all([
      getShareStats(days),
      ShopSnapshot.find({}).sort({ views: -1 }).limit(10)
        .select('shortId variant views imageHits createdAt').lean()
    ]);

    return res.json({ stats, topLinks, imageCache: getImageCacheStats() });
  } catch (error) {
    console.error('[ShareRoute] Stats failed:', error.message);
    return res.status(500).json({ message: 'Lỗi tải thống kê chia sẻ.' });
  }
});

export default router;
