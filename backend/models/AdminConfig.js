import mongoose from 'mongoose';

const adminConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'singleton'
  },
  redirectUrl: {
    type: String,
    default: ''
  },
  riotCookies: {
    type: String,
    default: ''
  },
  ntfyTopicUrl: {
    type: String,
    default: ''
  },
  accessToken: {
    type: String,
    default: ''
  },
  entitlementToken: {
    type: String,
    default: ''
  },
  idToken: {
    type: String,
    default: ''
  },
  puuid: {
    type: String,
    default: ''
  },
  shard: {
    type: String,
    default: 'ap'
  },
  clientVersion: {
    type: String,
    default: ''
  },
  tokenExpiresAt: {
    type: Date,
    default: null
  },
  lastReauthAt: {
    type: Date,
    default: null
  },
  lastReauthStatus: {
    type: String,
    default: ''
  },
  lastReauthError: {
    type: String,
    default: ''
  },
  lastShopCheckAt: {
    type: Date,
    default: null
  },
  lastShopCheckStatus: {
    type: String,
    default: ''
  },
  lastShopCheckError: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'admin_config'
});

const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);

export default AdminConfig;
