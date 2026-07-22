import cron from 'node-cron';
import AdminConfig from '../models/AdminConfig.js';
import WishlistItem from '../models/WishlistItem.js';
import { decryptText, encryptText } from '../utils/crypto.js';
import { fetchAccountStore } from './storeService.js';
import { getClientVersion, refreshTokenWithCookie } from './riotAuthService.js';
import { sendNtfyNotification } from './ntfyService.js';

const REAUTH_INTERVAL_MS = 50 * 60 * 1000;
const SHOP_CRON_EXPRESSION = '1 7 * * *';
const SHOP_CRON_TIMEZONE = 'Asia/Ho_Chi_Minh';

let configCache = null;
let jobsStarted = false;
let reauthTimer = null;
let dailyShopJob = null;

const normalizeCookieHeader = (cookieString) => {
  if (!cookieString || typeof cookieString !== 'string') {
    return '';
  }

  return cookieString
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('; ');
};

const buildCookieStringFromSetCookie = (setCookieHeaders = []) => {
  const cookieMap = new Map();

  setCookieHeaders.forEach((cookieLine) => {
    if (!cookieLine) return;
    const [pair] = cookieLine.split(';');
    const [name, ...valueParts] = pair.split('=');
    if (!name || !valueParts.length) return;
    cookieMap.set(name.trim(), `${name.trim()}=${valueParts.join('=').trim()}`);
  });

  return Array.from(cookieMap.values()).join('; ');
};

const decryptConfigDocument = (doc) => {
  if (!doc) return null;

  return {
    id: doc._id?.toString?.() || doc.id || null,
    key: doc.key || 'singleton',
    redirectUrl: doc.redirectUrl || '',
    riotCookies: decryptText(doc.riotCookies || ''),
    ntfyTopicUrl: doc.ntfyTopicUrl || '',
    accessToken: decryptText(doc.accessToken || ''),
    entitlementToken: decryptText(doc.entitlementToken || ''),
    idToken: decryptText(doc.idToken || ''),
    puuid: doc.puuid || '',
    shard: doc.shard || 'ap',
    clientVersion: doc.clientVersion || '',
    tokenExpiresAt: doc.tokenExpiresAt || null,
    lastReauthAt: doc.lastReauthAt || null,
    lastShopCheckAt: doc.lastShopCheckAt || null,
    updatedAt: doc.updatedAt || null,
    createdAt: doc.createdAt || null
  };
};

const applyEncryptedFields = (payload = {}) => {
  const updates = { ...payload };

  if (Object.prototype.hasOwnProperty.call(updates, 'riotCookies')) {
    updates.riotCookies = encryptText(normalizeCookieHeader(updates.riotCookies));
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'accessToken')) {
    updates.accessToken = encryptText(updates.accessToken || '');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'entitlementToken')) {
    updates.entitlementToken = encryptText(updates.entitlementToken || '');
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'idToken')) {
    updates.idToken = encryptText(updates.idToken || '');
  }

  return updates;
};

export const getAdminConfig = async ({ forceRefresh = false } = {}) => {
  if (configCache && !forceRefresh) {
    return configCache;
  }

  let doc = await AdminConfig.findOne({ key: 'singleton' });
  if (!doc) {
    doc = await AdminConfig.create({ key: 'singleton' });
  }

  configCache = decryptConfigDocument(doc);
  return configCache;
};

export const updateAdminConfig = async (updates) => {
  const encryptedUpdates = applyEncryptedFields(updates);
  const doc = await AdminConfig.findOneAndUpdate(
    { key: 'singleton' },
    { $set: encryptedUpdates },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  configCache = decryptConfigDocument(doc);
  return configCache;
};

export const updateRuntimeTokens = async ({ accessToken, entitlementToken, idToken = '', puuid = '', shard = 'ap', clientVersion = '', tokenExpiresAt = null }) => {
  return updateAdminConfig({
    accessToken,
    entitlementToken,
    idToken,
    puuid,
    shard,
    clientVersion,
    tokenExpiresAt,
    lastReauthAt: new Date()
  });
};

export const getRuntimeAuthDetails = async () => {
  const config = await getAdminConfig();
  if (!config?.accessToken || !config?.entitlementToken) {
    return null;
  }

  return {
    accessToken: config.accessToken,
    entitlementToken: config.entitlementToken,
    idToken: config.idToken || '',
    puuid: config.puuid || '',
    shard: config.shard || 'ap',
    clientVersion: config.clientVersion || (await getClientVersion()),
    tokenExpiresAt: config.tokenExpiresAt || null
  };
};

const notifyNtfy = async (message, title = 'VALO CHECK') => {
  const config = await getAdminConfig();
  if (!config?.ntfyTopicUrl) {
    return false;
  }

  try {
    await sendNtfyNotification(config.ntfyTopicUrl, message, title);
    return true;
  } catch (error) {
    console.error('[AdminAutomation] ntfy notification failed:', error.message);
    return false;
  }
};

const getHoChiMinhDayKey = (dateValue = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_CRON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dateValue);
};

const performReauth = async ({ source = 'cron' } = {}) => {
  const config = await getAdminConfig();
  if (!config?.riotCookies) {
    return { ok: false, reason: 'NO_COOKIE' };
  }

  try {
    const result = await refreshTokenWithCookie(config.riotCookies);
    const newCookieString = buildCookieStringFromSetCookie(result.setCookies || []);
    const tokenExpiresAt = result.expiresIn ? new Date(Date.now() + Number(result.expiresIn) * 1000) : null;

    if (!newCookieString) {
      throw new Error('COOKIE_EXPIRED');
    }

    await updateRuntimeTokens({
      accessToken: result.accessToken,
      entitlementToken: result.entitlementToken,
      idToken: result.idToken || '',
      puuid: result.puuid || '',
      shard: config.shard || 'ap',
      clientVersion: config.clientVersion || '',
      tokenExpiresAt
    });

    await updateAdminConfig({
      riotCookies: newCookieString,
      lastReauthAt: new Date(),
      lastReauthStatus: 'success',
      lastReauthError: '',
      lastCookieUpdateSource: source
    });

    console.log('[AdminAutomation] Riot cookie reauth refreshed successfully.');
    return { ok: true, newCookieString, tokenExpiresAt, accessToken: result.accessToken, entitlementToken: result.entitlementToken };
  } catch (error) {
    const isCookieExpired = error.message === 'COOKIE_EXPIRED' || /authenticate\.riotgames\.com\/login/i.test(error.message);
    if (isCookieExpired) {
      await notifyNtfy('cookie hết hạn, cần đăng nhập lại', 'Riot cookie expired');
    }

    await updateAdminConfig({
      lastReauthAt: new Date(),
      lastReauthStatus: 'failed',
      lastReauthError: error.message
    });

    console.error('[AdminAutomation] Reauth failed:', error.message);
    return { ok: false, reason: error.message };
  }
};

const performShopCheck = async ({ source = 'cron' } = {}) => {
  const config = await getAdminConfig();
  if (!config?.ntfyTopicUrl) {
    return { ok: false, reason: 'NO_NTFY_TOPIC' };
  }

  if (source === 'cron' && config.lastShopCheckAt) {
    const lastCheckedDay = getHoChiMinhDayKey(config.lastShopCheckAt);
    const today = getHoChiMinhDayKey(new Date());
    if (lastCheckedDay === today) {
      return { ok: true, reason: 'ALREADY_CHECKED_TODAY' };
    }
  }

  const authDetails = await getRuntimeAuthDetails();
  if (!authDetails?.accessToken || !authDetails?.entitlementToken || !authDetails?.puuid) {
    return { ok: false, reason: 'NO_RUNTIME_TOKEN' };
  }

  try {
    const { storefront } = await fetchAccountStore(config.shard || authDetails.shard || 'ap', authDetails.puuid, authDetails);
    const offers = storefront?.skinsPanel?.offers || [];

    if (!offers.length) {
      await notifyNtfy('Hôm nay shop Valorant chưa có dữ liệu skin.', 'Daily Shop');
      return;
    }

    const wishlistItems = await WishlistItem.find({}).lean();
    const wishlistUuidSet = new Set(wishlistItems.map((item) => (item.skinUuid || '').toLowerCase()));
    const wishlistNameSet = new Set(wishlistItems.map((item) => (item.skinName || '').toLowerCase()));

    const skinLines = offers.map((offer, index) => {
      const skinName = offer.metadata?.displayName || 'Unknown Skin';
      return `${index + 1}. ${skinName}`;
    });

    await notifyNtfy(`Hôm nay shop Valorant:\n${skinLines.join('\n')}`, 'Daily Shop');

    const matches = offers.filter((offer) => {
      const skinName = (offer.metadata?.displayName || '').toLowerCase();
      const itemId = (offer.itemId || '').toLowerCase();
      return wishlistUuidSet.has(itemId) || wishlistNameSet.has(skinName);
    });

    if (matches.length) {
      const matchText = matches.map((offer) => offer.metadata?.displayName || 'Unknown Skin').join(', ');
      await notifyNtfy(`skin yêu thích xuất hiện: ${matchText}`, 'Wishlist Match');
    }

    await updateAdminConfig({
      lastShopCheckAt: new Date(),
      lastShopCheckStatus: 'success',
      lastShopCheckError: '',
      lastShopCheckSource: source
    });
    return { ok: true, offers };
  } catch (error) {
    await updateAdminConfig({
      lastShopCheckAt: new Date(),
      lastShopCheckStatus: 'failed',
      lastShopCheckError: error.message
    });
    console.error('[AdminAutomation] Daily shop check failed:', error.message);
    return { ok: false, reason: error.message };
  }
};

export const startAdminAutomation = async () => {
  if (jobsStarted) {
    return;
  }

  jobsStarted = true;
  await getAdminConfig();

  const scheduleReauth = async () => {
    await performReauth({ source: 'cron' });
    reauthTimer = setTimeout(scheduleReauth, REAUTH_INTERVAL_MS);
  };

  reauthTimer = setTimeout(scheduleReauth, 10 * 1000);

  dailyShopJob = cron.schedule(SHOP_CRON_EXPRESSION, () => {
    performShopCheck({ source: 'cron' });
  }, {
    timezone: SHOP_CRON_TIMEZONE
  });
};

export const triggerReauthNow = async () => performReauth({ source: 'manual' });

export const triggerShopCheckNow = async () => performShopCheck({ source: 'manual' });

export const getAutomationStatus = async () => {
  const config = await getAdminConfig();
  return {
    reauth: {
      lastAt: config?.lastReauthAt || null,
      status: config?.lastReauthStatus || '',
      error: config?.lastReauthError || ''
    },
    shop: {
      lastAt: config?.lastShopCheckAt || null,
      status: config?.lastShopCheckStatus || '',
      error: config?.lastShopCheckError || ''
    },
    jobsStarted,
    nextReauthInMinutes: REAUTH_INTERVAL_MS / 60000,
    dailyShopCron: `${SHOP_CRON_EXPRESSION} ${SHOP_CRON_TIMEZONE}`
  };
};

export const getWishlistItems = async () => WishlistItem.find({}).sort({ addedAt: -1, createdAt: -1 }).lean();

export const replaceWishlistItems = async (items = []) => {
  const cleaned = (Array.isArray(items) ? items : [])
    .map((item) => ({
      skinUuid: String(item.skinUuid || '').trim(),
      skinName: String(item.skinName || '').trim()
    }))
    .filter((item) => item.skinUuid && item.skinName);

  const validUuids = cleaned.map((item) => item.skinUuid);

  await WishlistItem.deleteMany(validUuids.length ? { skinUuid: { $nin: validUuids } } : {});

  const result = [];
  for (const item of cleaned) {
    const doc = await WishlistItem.findOneAndUpdate(
      { skinUuid: item.skinUuid },
      {
        $set: { skinName: item.skinName },
        $setOnInsert: { addedAt: new Date() }
      },
      { new: true, upsert: true }
    );
    result.push(doc);
  }

  return result;
};

export const removeWishlistItem = async (skinUuid) => {
  return WishlistItem.deleteOne({ skinUuid });
};
