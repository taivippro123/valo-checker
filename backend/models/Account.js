import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
  discordWebhookUrl: {
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
  // Dạng gameName#tagLine. Lấy một lần rồi lưu lại: cron chỉ cần đọc,
  // không phải gọi Riot mỗi lần gửi thông báo.
  riotId: {
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
  },
  lastCookieExpiredNotifyAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'accounts'
});

const Account = mongoose.model('Account', accountSchema);

export default Account;
