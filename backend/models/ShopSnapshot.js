import mongoose from 'mongoose';

/**
 * Ảnh chia sẻ KHÔNG được lưu dưới dạng buffer trong Mongo.
 * Chỉ lưu phần metadata đã chuẩn hoá (vài KB/doc) rồi render lại khi cần,
 * dựa vào cache nhiều tầng trong shopImageService + cache CDN/trình duyệt.
 * Lưu buffer sẽ ngốn ~250KB/link, vượt free tier chỉ sau vài nghìn lượt share.
 */
const shopSnapshotItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    tierName: { type: String, default: '' },
    tierIconUrl: { type: String, default: '' },
    priceText: { type: String, default: '' },
    basePriceText: { type: String, default: '' },
    discountPercent: { type: Number, default: null },
    isWishlist: { type: Boolean, default: false }
  },
  { _id: false }
);

const shopSnapshotSchema = new mongoose.Schema(
  {
    shortId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    variant: {
      type: String,
      enum: ['daily', 'night-market', 'bundle', 'accessory'],
      default: 'daily'
    },
    lang: {
      type: String,
      enum: ['en', 'vn'],
      default: 'vn'
    },
    shard: { type: String, default: '' },
    title: { type: String, default: '' },
    // Chỉ được điền khi user chủ động bật hiện Riot ID.
    riotId: { type: String, default: '' },
    showRiotId: { type: Boolean, default: false },
    items: { type: [shopSnapshotItemSchema], default: [] },
    views: { type: Number, default: 0 },
    imageHits: { type: Number, default: 0 },
    createdAt: {
      type: Date,
      default: Date.now,
      // Link tự hết hạn sau 30 ngày, không cần dọn thủ công.
      expires: 60 * 60 * 24 * 30
    }
  },
  { collection: 'shopSnapshots' }
);

const ShopSnapshot = mongoose.model('ShopSnapshot', shopSnapshotSchema);

export default ShopSnapshot;
