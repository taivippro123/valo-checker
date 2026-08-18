import mongoose from 'mongoose';

/**
 * Đếm theo ngày (giờ VN) để biết vòng lặp chia sẻ có thật sự chạy không.
 * Ghi qua shareStatsService (gom trong RAM rồi flush định kỳ), không ghi
 * trực tiếp mỗi request.
 */
const shareStatSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },           // YYYY-MM-DD theo Asia/Ho_Chi_Minh
    variant: { type: String, default: 'daily' },
    imagesRendered: { type: Number, default: 0 },    // bấm Tải/Copy ảnh
    snapshotsCreated: { type: Number, default: 0 },  // bấm Tạo link chia sẻ
    pageViews: { type: Number, default: 0 },         // link share được mở
    imageServes: { type: Number, default: 0 }        // ảnh của link được tải về
  },
  { collection: 'shareStats', timestamps: true }
);

shareStatSchema.index({ day: 1, variant: 1 }, { unique: true });

const ShareStat = mongoose.model('ShareStat', shareStatSchema);

export default ShareStat;
