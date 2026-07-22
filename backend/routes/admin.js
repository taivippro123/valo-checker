import express from 'express';
import Log from '../models/Log.js';
import { protect } from '../middleware/authMiddleware.js';
import { getAdminConfig, getAutomationStatus, getWishlistItems, removeWishlistItem, replaceWishlistItems, triggerReauthNow, triggerShopCheckNow, updateAdminConfig } from '../services/adminRuntimeService.js';

const router = express.Router();

const parseAdminSecret = () => {
  const secret = process.env.ADMIN_SECRET || 'valo-admin-secret';
  return secret;
};

const requireAdmin = (req, res, next) => {
  const provided = req.headers['x-admin-secret'];
  const isAdminUser = req.user?.username?.toLowerCase() === 'admin';
  if ((provided && provided === parseAdminSecret()) || isAdminUser) {
    return next();
  }

  return res.status(401).json({ message: 'Admin access required' });
};

router.get('/logs', protect, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const total = await Log.countDocuments({});
    const logs = await Log.find({}).sort({ timestamp: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit);

    res.json({
      logs,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/logs', protect, requireAdmin, async (req, res) => {
  try {
    await Log.deleteMany({});
    res.json({ message: 'Logs cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/config', protect, requireAdmin, async (req, res) => {
  try {
    const config = await getAdminConfig();
    const status = await getAutomationStatus();
    res.json({
      config: {
        redirectUrl: config?.redirectUrl || '',
        riotCookies: config?.riotCookies || '',
        ntfyTopicUrl: config?.ntfyTopicUrl || '',
        hasAccessToken: Boolean(config?.accessToken),
        hasEntitlementToken: Boolean(config?.entitlementToken),
        tokenExpiresAt: config?.tokenExpiresAt || null,
        lastReauthAt: config?.lastReauthAt || null,
        lastShopCheckAt: config?.lastShopCheckAt || null,
        lastReauthStatus: config?.lastReauthStatus || '',
        lastReauthError: config?.lastReauthError || '',
        lastShopCheckStatus: config?.lastShopCheckStatus || '',
        lastShopCheckError: config?.lastShopCheckError || '',
        jobsStarted: status.jobsStarted,
        nextReauthInMinutes: status.nextReauthInMinutes,
        dailyShopCron: status.dailyShopCron
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/config', protect, requireAdmin, async (req, res) => {
  try {
    const { redirectUrl = '', riotCookies = '', ntfyTopicUrl = '' } = req.body || {};
    const config = await updateAdminConfig({ redirectUrl, riotCookies, ntfyTopicUrl });
    res.json({
      message: 'Config saved',
      config: {
        redirectUrl: config.redirectUrl || '',
        riotCookies: config.riotCookies || '',
        ntfyTopicUrl: config.ntfyTopicUrl || '',
        hasAccessToken: Boolean(config.accessToken),
        hasEntitlementToken: Boolean(config.entitlementToken),
        tokenExpiresAt: config.tokenExpiresAt || null,
        lastReauthAt: config.lastReauthAt || null,
        lastShopCheckAt: config.lastShopCheckAt || null,
        lastReauthStatus: config.lastReauthStatus || '',
        lastReauthError: config.lastReauthError || '',
        lastShopCheckStatus: config.lastShopCheckStatus || '',
        lastShopCheckError: config.lastShopCheckError || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/automation/status', protect, requireAdmin, async (req, res) => {
  try {
    const status = await getAutomationStatus();
    res.json({ status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/automation/reauth-now', protect, requireAdmin, async (req, res) => {
  try {
    const result = await triggerReauthNow();
    res.json({ message: result.ok ? 'Reauth complete' : 'Reauth failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/automation/shop-now', protect, requireAdmin, async (req, res) => {
  try {
    const result = await triggerShopCheckNow();
    res.json({ message: result.ok ? 'Shop check complete' : 'Shop check failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/wishlist', protect, requireAdmin, async (req, res) => {
  try {
    const wishlist = await getWishlistItems();
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/wishlist', protect, requireAdmin, async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const wishlist = await replaceWishlistItems(items);
    res.json({ message: 'Wishlist saved', wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/wishlist/:skinUuid', protect, requireAdmin, async (req, res) => {
  try {
    await removeWishlistItem(req.params.skinUuid);
    res.json({ message: 'Wishlist item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
