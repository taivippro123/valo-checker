import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  skinUuid: {
    type: String,
    required: true,
    trim: true
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

// Compound unique index to allow same skin in multiple accounts' wishlists
wishlistItemSchema.index({ accountId: 1, skinUuid: 1 }, { unique: true });

const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema);

export default WishlistItem;
