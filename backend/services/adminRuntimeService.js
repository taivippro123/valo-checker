import cron from 'node-cron';
import Account from '../models/Account.js';
import WishlistItem from '../models/WishlistItem.js';
import { fetchAccountStore } from './storeService.js';
import { sendDailyShopDiscord, sendDiscordNotification } from './discordService.js';
import { getClientVersion, refreshTokenWithCookie } from './riotAuthService.js';
import { sendNtfyNotification } from './ntfyService.js';
import { decryptText, encryptText } from '../utils/crypto.js';

const REAUTH_INTERVAL_MS = 50 * 60 * 1000;
const SHOP_CRON_EXPRESSION = '1 7 * * *';
const SHOP_CRON_TIMEZONE = 'Asia/Ho_Chi_Minh';
const SHOP_CHECK_QUEUE_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const decryptAccountDocument = (doc) => {
  if (!doc) return null;

  return {
    id: doc._id?.toString?.() || doc.id || null,
    name: doc.name || '',
    redirectUrl: doc.redirectUrl || '',
    riotCookies: decryptText(doc.riotCookies || ''),
    ntfyTopicUrl: doc.ntfyTopicUrl || '',
    discordWebhookUrl: doc.discordWebhookUrl || '',
    accessToken: decryptText(doc.accessToken || ''),
    entitlementToken: decryptText(doc.entitlementToken || ''),
    idToken: decryptText(doc.idToken || ''),
    puuid: doc.puuid || '',
    shard: doc.shard || 'ap',
    clientVersion: doc.clientVersion || '',
    tokenExpiresAt: doc.tokenExpiresAt || null,
    lastReauthAt: doc.lastReauthAt || null,
    lastShopCheckAt: doc.lastShopCheckAt || null,
    lastReauthStatus: doc.lastReauthStatus || '',
    lastReauthError: doc.lastReauthError || '',
    lastShopCheckStatus: doc.lastShopCheckStatus || '',
    lastShopCheckError: doc.lastShopCheckError || '',
    isActive: doc.isActive !== false,
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

export const getAccounts = async ({ forceRefresh = false, userId } = {}) => {
  const filter = userId ? { userId } : {};
  const docs = await Account.find(filter).sort({ createdAt: 1 });
  return docs.map(decryptAccountDocument);
};

export const getAccountById = async (accountId) => {
  const doc = await Account.findById(accountId);
  return decryptAccountDocument(doc);
};

export const createAccount = async (data) => {
  const encryptedData = applyEncryptedFields(data);
  const doc = await Account.create(encryptedData);
  return decryptAccountDocument(doc);
};

export const updateAccount = async (accountId, updates) => {
  const encryptedUpdates = applyEncryptedFields(updates);
  const doc = await Account.findByIdAndUpdate(
    accountId,
    { $set: encryptedUpdates },
    { new: true }
  );
  return decryptAccountDocument(doc);
};

export const deleteAccount = async (accountId) => {
  await WishlistItem.deleteMany({ accountId });
  const result = await Account.findByIdAndDelete(accountId);
  return result;
};

export const updateRuntimeTokens = async (accountId, { accessToken, entitlementToken, idToken = '', puuid = '', shard = 'ap', clientVersion = '', tokenExpiresAt = null }) => {
  return updateAccount(accountId, {
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

export const getRuntimeAuthDetails = async (accountId) => {
  const account = await getAccountById(accountId);
  if (!account?.accessToken || !account?.entitlementToken) {
    return null;
  }

  return {
    accessToken: account.accessToken,
    entitlementToken: account.entitlementToken,
    idToken: account.idToken || '',
    puuid: account.puuid || '',
    shard: account.shard || 'ap',
    clientVersion: account.clientVersion || (await getClientVersion()),
    tokenExpiresAt: account.tokenExpiresAt || null
  };
};

const notifyNtfy = async (ntfyTopicUrl, message, title = 'VALO CHECK') => {
  if (!ntfyTopicUrl) {
    return false;
  }

  try {
    await sendNtfyNotification(ntfyTopicUrl, message, title);
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

const performReauth = async (accountId, { source = 'cron' } = {}) => {
  const account = await getAccountById(accountId);
  if (!account?.riotCookies) {
    return { ok: false, reason: 'NO_COOKIE' };
  }

  try {
    const result = await refreshTokenWithCookie(account.riotCookies);
    const newCookieString = buildCookieStringFromSetCookie(result.setCookies || []);
    const tokenExpiresAt = result.expiresIn ? new Date(Date.now() + Number(result.expiresIn) * 1000) : null;

    if (!newCookieString) {
      throw new Error('COOKIE_EXPIRED');
    }

    await updateRuntimeTokens(accountId, {
      accessToken: result.accessToken,
      entitlementToken: result.entitlementToken,
      idToken: result.idToken || '',
      puuid: result.puuid || '',
      shard: account.shard || 'ap',
      clientVersion: account.clientVersion || '',
      tokenExpiresAt
    });

    await updateAccount(accountId, {
      riotCookies: newCookieString,
      lastReauthAt: new Date(),
      lastReauthStatus: 'success',
      lastReauthError: '',
      lastCookieUpdateSource: source
    });

    console.log(`[AdminAutomation] Riot cookie reauth refreshed successfully for account: ${account.name}`);
    return { ok: true, newCookieString, tokenExpiresAt, accessToken: result.accessToken, entitlementToken: result.entitlementToken };
  } catch (error) {
    const isCookieExpired = error.message === 'COOKIE_EXPIRED' || /authenticate\.riotgames\.com\/login/i.test(error.message);
    if (isCookieExpired && (account?.ntfyTopicUrl || account?.discordWebhookUrl)) {
      // Only notify if not notified in the last 24 hours
      const lastNotifyAt = account.lastCookieExpiredNotifyAt;
      const now = new Date();
      const shouldNotify = !lastNotifyAt || (now - new Date(lastNotifyAt)) > 24 * 60 * 60 * 1000;
      
      if (shouldNotify) {
        const message = `Cookie hết hạn cho tài khoản ${account.name}, cần đăng nhập lại`;
        if (account.ntfyTopicUrl) {
          await notifyNtfy(account.ntfyTopicUrl, message, 'Riot cookie expired');
        }
        if (account.discordWebhookUrl) {
          await sendDiscordNotification(account.discordWebhookUrl, message, '🔴 Riot Cookie Expired');
        }
        await updateAccount(accountId, { lastCookieExpiredNotifyAt: now });
      }
    }

    await updateAccount(accountId, {
      lastReauthAt: new Date(),
      lastReauthStatus: 'failed',
      lastReauthError: error.message
    });

    console.error(`[AdminAutomation] Reauth failed for account ${account.name}:`, error.message);
    return { ok: false, reason: error.message };
  }
};

const performShopCheck = async (accountId, { source = 'cron' } = {}) => {
  const account = await getAccountById(accountId);
  if (!account?.ntfyTopicUrl && !account?.discordWebhookUrl) {
    return { ok: false, reason: 'NO_NOTIFICATION_CHANNEL' };
  }

  if (source === 'cron' && account.lastShopCheckAt) {
    const lastCheckedDay = getHoChiMinhDayKey(account.lastShopCheckAt);
    const today = getHoChiMinhDayKey(new Date());
    if (lastCheckedDay === today) {
      return { ok: true, reason: 'ALREADY_CHECKED_TODAY' };
    }
  }

  const authDetails = await getRuntimeAuthDetails(accountId);
  if (!authDetails?.accessToken || !authDetails?.entitlementToken || !authDetails?.puuid) {
    return { ok: false, reason: 'NO_RUNTIME_TOKEN' };
  }

  try {
    const { storefront } = await fetchAccountStore(account.shard || authDetails.shard || 'ap', authDetails.puuid, authDetails);
    const offers = storefront?.skinsPanel?.offers || [];

    if (!offers.length) {
      if (account.ntfyTopicUrl) {
        await notifyNtfy(account.ntfyTopicUrl, `Hôm nay shop Valorant cho tài khoản ${account.name} chưa có dữ liệu skin.`, 'Daily Shop');
      }
      return;
    }

    const wishlistItems = await WishlistItem.find({ accountId }).lean();
    const wishlistUuidSet = new Set(wishlistItems.map((item) => (item.skinUuid || '').toLowerCase()));
    const wishlistNameSet = new Set(wishlistItems.map((item) => (item.skinName || '').toLowerCase()));

    // Prepare skin data for Discord
    const skinsData = offers.map((offer) => {
      const skinName = offer.metadata?.displayName || 'Unknown Skin';
      const price = offer.priceVP || 0;
      const tier = offer.metadata?.contentTier?.displayName || 'Unknown';
      const tierIcon = offer.metadata?.contentTier?.displayIcon || '';
      const displayIcon = offer.metadata?.displayIcon || offer.metadata?.image || '';
      
      return {
        displayName: skinName,
        price: price,
        tier: tier,
        tierIcon: tierIcon,
        displayIcon: displayIcon
      };
    });

    // Send Discord notification if webhook URL is configured
    if (account.discordWebhookUrl) {
      await sendDailyShopDiscord(account.discordWebhookUrl, account.name, skinsData, account.shard || 'ap');
    }

    // Send ntfy notification if configured
    if (account.ntfyTopicUrl) {
      const skinLines = offers.map((offer, index) => {
        const skinName = offer.metadata?.displayName || 'Unknown Skin';
        return `${index + 1}. ${skinName}`;
      });

      await notifyNtfy(account.ntfyTopicUrl, `${skinLines.join('\n')}`, `Daily Shop for ${account.name}`);
    }

    const matches = offers.filter((offer) => {
      const skinName = (offer.metadata?.displayName || '').toLowerCase();
      const itemId = (offer.itemId || '').toLowerCase();
      return wishlistUuidSet.has(itemId) || wishlistNameSet.has(skinName);
    });

    if (matches.length) {
      const matchText = matches.map((offer) => offer.metadata?.displayName || 'Unknown Skin').join(', ');
      if (account.ntfyTopicUrl) {
        await notifyNtfy(account.ntfyTopicUrl, `Tài khoản ${account.name} - skin yêu thích xuất hiện: ${matchText}`, 'Wishlist Match');
      }
      if (account.discordWebhookUrl) {
        await sendDiscordNotification(account.discordWebhookUrl, `Tài khoản ${account.name} - skin yêu thích xuất hiện: ${matchText}`, '⭐ Wishlist Match');
      }
    }

    await updateAccount(accountId, {
      lastShopCheckAt: new Date(),
      lastShopCheckStatus: 'success',
      lastShopCheckError: '',
      lastShopCheckSource: source
    });
    return { ok: true, offers };
  } catch (error) {
    await updateAccount(accountId, {
      lastShopCheckAt: new Date(),
      lastShopCheckStatus: 'failed',
      lastShopCheckError: error.message
    });
    console.error(`[AdminAutomation] Daily shop check failed for account ${account.name}:`, error.message);
    return { ok: false, reason: error.message };
  }
};

export const startAdminAutomation = async () => {
  if (jobsStarted) {
    return;
  }

  jobsStarted = true;

  const scheduleReauth = async () => {
    const accounts = await getAccounts();
    const activeAccounts = accounts.filter(acc => acc.isActive);

    for (const account of activeAccounts) {
      await performReauth(account.id, { source: 'cron' });
    }

    reauthTimer = setTimeout(scheduleReauth, REAUTH_INTERVAL_MS);
  };

  reauthTimer = setTimeout(scheduleReauth, 10 * 1000);

  dailyShopJob = cron.schedule(SHOP_CRON_EXPRESSION, async () => {
    const accounts = await getAccounts();
    const activeAccounts = accounts.filter(acc => acc.isActive);

    for (const [index, account] of activeAccounts.entries()) {
      if (index > 0) {
        await sleep(SHOP_CHECK_QUEUE_DELAY_MS);
      }

      await performShopCheck(account.id, { source: 'cron' });
    }
  }, {
    timezone: SHOP_CRON_TIMEZONE
  });
};

export const triggerReauthNow = async (accountId) => performReauth(accountId, { source: 'manual' });

export const triggerShopCheckNow = async (accountId) => performShopCheck(accountId, { source: 'manual' });

export const getAutomationStatus = async () => {
  const accounts = await getAccounts();
  return {
    accounts: accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      reauth: {
        lastAt: acc.lastReauthAt || null,
        status: acc.lastReauthStatus || '',
        error: acc.lastReauthError || ''
      },
      shop: {
        lastAt: acc.lastShopCheckAt || null,
        status: acc.lastShopCheckStatus || '',
        error: acc.lastShopCheckError || ''
      }
    })),
    jobsStarted,
    nextReauthInMinutes: REAUTH_INTERVAL_MS / 60000,
    dailyShopCron: `${SHOP_CRON_EXPRESSION} ${SHOP_CRON_TIMEZONE}`
  };
};

export const getWishlistItems = async (accountId) => {
  return WishlistItem.find({ accountId }).sort({ addedAt: -1, createdAt: -1 }).lean();
};

export const addToWishlistItems = async (accountId, items = []) => {
  const cleaned = (Array.isArray(items) ? items : [])
    .map((item) => ({
      accountId,
      skinUuid: String(item.skinUuid || '').trim(),
      skinName: String(item.skinName || '').trim()
    }))
    .filter((item) => item.skinUuid && item.skinName);

  const result = [];
  for (const item of cleaned) {
    const doc = await WishlistItem.findOneAndUpdate(
      { accountId, skinUuid: item.skinUuid },
      {
        $set: { skinName: item.skinName },
        $setOnInsert: { addedAt: new Date() }
      },
      { new: true, upsert: true }
    );
    if (doc) result.push(doc);
  }

  return result;
};

export const replaceWishlistItems = async (accountId, items = []) => {
  const cleaned = (Array.isArray(items) ? items : [])
    .map((item) => ({
      accountId,
      skinUuid: String(item.skinUuid || '').trim(),
      skinName: String(item.skinName || '').trim()
    }))
    .filter((item) => item.skinUuid && item.skinName);

  const validUuids = cleaned.map((item) => item.skinUuid);

  // Delete items that are not in the new list for this account
  await WishlistItem.deleteMany(
    { accountId, skinUuid: { $nin: validUuids } }
  );

  const result = [];
  for (const item of cleaned) {
    const doc = await WishlistItem.findOneAndUpdate(
      { accountId, skinUuid: item.skinUuid },
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

export const removeWishlistItem = async (accountId, skinUuid) => {
  return WishlistItem.deleteOne({ accountId, skinUuid });
};
