import mongoose from 'mongoose';

const riotAccountSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  authMode: {
    type: String,
    required: true,
    enum: ['credentials', 'token'],
    default: 'credentials'
  },
  accessToken: {
    type: String,
    default: ''
  },
  entitlementToken: {
    type: String,
    default: ''
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  alias: {
    type: String,
    required: true,
    trim: true
  },
  shard: {
    type: String,
    required: true,
    default: 'ap'
  },
  puuid: {
    type: String,
    default: ''
  },
  wishlist: {
    type: [String],
    default: []
  },
  ntfyTopic: {
    type: String,
    default: ''
  },
  lastChecked: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const RiotAccount = mongoose.model('RiotAccount', riotAccountSchema);

export default RiotAccount;
