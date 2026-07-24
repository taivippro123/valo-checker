import express from 'express';
import Log from '../models/Log.js';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getAccounts, 
  getAccountById, 
  createAccount, 
  updateAccount, 
  deleteAccount, 
  getAutomationStatus, 
  getWishlistItems, 
  removeWishlistItem, 
  replaceWishlistItems, 
  triggerReauthNow, 
  triggerShopCheckNow 
} from '../services/adminRuntimeService.js';

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

router.get('/accounts', protect, requireAdmin, async (req, res) => {
  try {
    const accounts = await getAccounts();
    res.json({ accounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/accounts/:id', protect, requireAdmin, async (req, res) => {
  try {
    const account = await getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/accounts', protect, requireAdmin, async (req, res) => {
  try {
    const { name, redirectUrl = '', riotCookies = '', ntfyTopicUrl = '' } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Account name is required' });
    }
    const account = await createAccount({ name, redirectUrl, riotCookies, ntfyTopicUrl });
    res.json({ message: 'Account created', account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/accounts/:id', protect, requireAdmin, async (req, res) => {
  try {
    const { name, redirectUrl, riotCookies, ntfyTopicUrl, isActive } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (redirectUrl !== undefined) updates.redirectUrl = redirectUrl;
    if (riotCookies !== undefined) updates.riotCookies = riotCookies;
    if (ntfyTopicUrl !== undefined) updates.ntfyTopicUrl = ntfyTopicUrl;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const account = await updateAccount(req.params.id, updates);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account updated', account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/accounts/:id', protect, requireAdmin, async (req, res) => {
  try {
    const result = await deleteAccount(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account deleted' });
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
    const { accountId } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    const result = await triggerReauthNow(accountId);
    res.json({ message: result.ok ? 'Reauth complete' : 'Reauth failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/automation/shop-now', protect, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    const result = await triggerShopCheckNow(accountId);
    res.json({ message: result.ok ? 'Shop check complete' : 'Shop check failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/wishlist', protect, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.query || {};
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    const wishlist = await getWishlistItems(accountId);
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/wishlist', protect, requireAdmin, async (req, res) => {
  try {
    const { accountId, items = [] } = req.body || {};
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    const wishlist = await replaceWishlistItems(accountId, items);
    res.json({ message: 'Wishlist saved', wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/wishlist/:skinUuid', protect, requireAdmin, async (req, res) => {
  try {
    const { accountId } = req.query || {};
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }
    await removeWishlistItem(accountId, req.params.skinUuid);
    res.json({ message: 'Wishlist item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
