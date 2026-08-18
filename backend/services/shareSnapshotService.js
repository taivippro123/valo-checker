import crypto from 'crypto';
import ShopSnapshot from '../models/ShopSnapshot.js';
import {
  SITE_URL,
  MAX_ITEMS,
  buildItemsFromStorefront,
  getBundleTitle,
  isAllowedImageUrl
} from './shopImageService.js';

/**
 * Tạo và định địa chỉ cho snapshot chia sẻ.
 * Tách khỏi routes/share.js vì cron gửi Discord cũng cần tạo snapshot.
 */

// Mọi URL công khai đều nằm trên domain site và được proxy về backend
// (xem api/share.mjs). Không trỏ thẳng vào origin backend: thẻ og:image và <img>
// không gửi được header tuỳ biến, mà backend đang sau ngrok chặn theo User-Agent.
export const snapshotUrls = (shortId) => ({
  shortId,
  pageUrl: SITE_URL + '/s/' + shortId,
  imageUrl: SITE_URL + '/s/' + shortId + '/image',
  ogImageUrl: SITE_URL + '/s/' + shortId + '/og'
});

export const makeShortId = () => crypto.randomBytes(6).toString('base64url'); // 8 ký tự, ~2.8e14 tổ hợp

/**
 * ID ổn định cho ảnh shop hằng ngày của một account.
 * Cron chạy lại trong cùng ngày sẽ ghi đè đúng bản ghi cũ thay vì đẻ thêm link mới.
 * Có salt để link không đoán được từ accountId.
 */
const dailyShortId = (accountId, dayKey) => {
  const salt = process.env.SHARE_ID_SALT || process.env.JWT_SECRET || 'valocheck';
  return crypto
    .createHash('sha256')
    .update(`${salt}|${accountId}|${dayKey}`)
    .digest('base64url')
    .slice(0, 10);
};

const prepareItems = (storefront, { variant, wishlistUuids, wishlistNames }) =>
  buildItemsFromStorefront(storefront || {}, { variant, wishlistUuids, wishlistNames })
    .filter((item) => item.name && isAllowedImageUrl(item.imageUrl))
    .slice(0, MAX_ITEMS);

/**
 * Snapshot cho nút chia sẻ trên web (ID ngẫu nhiên, mỗi lần bấm là một link).
 */
export const createSnapshot = async (data) => {
  const shortId = makeShortId();
  await ShopSnapshot.create({ ...data, shortId });
  return snapshotUrls(shortId);
};

/**
 * Snapshot kèm theo thông báo Discord hằng ngày.
 * @returns {Promise<{shortId, pageUrl, imageUrl, ogImageUrl}>}
 */
export const createDailySnapshot = async ({
  accountId,
  dayKey,
  storefront,
  variant = 'daily',
  lang = 'vn',
  shard = '',
  riotId = '',
  wishlistUuids,
  wishlistNames
}) => {
  const items = prepareItems(storefront, { variant, wishlistUuids, wishlistNames });
  if (!items.length) return null;

  const shortId = dailyShortId(accountId, dayKey);

  await ShopSnapshot.findOneAndUpdate(
    { shortId },
    {
      $set: {
        shortId,
        variant,
        lang,
        shard,
        title: variant === 'bundle' ? getBundleTitle(storefront) : '',
        riotId: String(riotId || '').slice(0, 40),
        showRiotId: Boolean(riotId),
        items,
        createdAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  return snapshotUrls(shortId);
};
