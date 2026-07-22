import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  skinUuid: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  skinName: {
    type: String,
    required: true,
    trim: true
  },
  addedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'wishlist'
});

const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema);

export default WishlistItem;
