import express from 'express';
import Account from '../models/Account.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { getAccounts, createAccount, updateAccount, deleteAccount, triggerReauthNow, triggerShopCheckNow, getWishlistItems, addToWishlistItems, replaceWishlistItems, removeWishlistItem } from '../services/adminRuntimeService.js';
import { loadSkinsCache } from '../services/storeService.js';

const router = express.Router();

// Get user's own accounts
router.get('/accounts', protect, async (req, res) => {
  try {
    const accounts = await getAccounts({ userId: req.user._id });
    const formattedAccounts = accounts.map(account => ({
      id: account._id?.toString?.() || account.id || null,
      name: account.name || '',
      redirectUrl: account.redirectUrl || '',
      riotCookies: account.riotCookies || '',
      ntfyTopicUrl: account.ntfyTopicUrl || '',
      discordWebhookUrl: account.discordWebhookUrl || '',
      shard: account.shard || 'ap',
      isActive: account.isActive !== false,
      lastReauthAt: account.lastReauthAt || null,
      lastReauthStatus: account.lastReauthStatus || '',
      lastReauthError: account.lastReauthError || '',
      lastShopCheckAt: account.lastShopCheckAt || null,
      lastShopCheckStatus: account.lastShopCheckStatus || '',
      lastShopCheckError: account.lastShopCheckError || ''
    }));
    res.json({ accounts: formattedAccounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create account for user
router.post('/accounts', protect, async (req, res) => {
  try {
    const { name, redirectUrl = '', riotCookies = '', ntfyTopicUrl = '', discordWebhookUrl = '' } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Account name is required' });
    }

    // Check if user already has an account and is not premium
    const user = await User.findById(req.user._id);
    if (!user.isPremium) {
      const existingAccounts = await Account.countDocuments({ userId: req.user._id });
      if (existingAccounts >= 1) {
        return res.status(400).json({ message: 'Hiện tại bạn chỉ có thể tạo 1 tài khoản' });
      }
    }

    const account = await createAccount({ 
      name, 
      redirectUrl, 
      riotCookies, 
      ntfyTopicUrl, 
      discordWebhookUrl, 
      userId: req.user._id 
    });
    res.json({ message: 'Account created', account });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user's own account
router.put('/accounts/:id', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const { name, redirectUrl, riotCookies, ntfyTopicUrl, discordWebhookUrl, isActive } = req.body || {};
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (redirectUrl !== undefined) updates.redirectUrl = redirectUrl;
    if (riotCookies !== undefined) updates.riotCookies = riotCookies;
    if (ntfyTopicUrl !== undefined) updates.ntfyTopicUrl = ntfyTopicUrl;
    if (discordWebhookUrl !== undefined) updates.discordWebhookUrl = discordWebhookUrl;
    if (isActive !== undefined) updates.isActive = isActive;
    
    const updatedAccount = await updateAccount(req.params.id, updates);
    if (!updatedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account updated', account: updatedAccount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user's own account
router.delete('/accounts/:id', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const result = await deleteAccount(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Trigger reauth for user's own account
router.post('/accounts/:id/reauth', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const result = await triggerReauthNow(req.params.id);
    res.json({ message: result.ok ? 'Reauth complete' : 'Reauth failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Trigger shop check for user's own account
router.post('/accounts/:id/check-shop', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const result = await triggerShopCheckNow(req.params.id);
    res.json({ message: result.ok ? 'Shop check complete' : 'Shop check failed', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get wishlist for user's account
router.get('/wishlist/:accountId', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const wishlist = await getWishlistItems(req.params.accountId);
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add skins to wishlist for user's account
router.post('/wishlist/:accountId', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const { skinUuids } = req.body || {};
    if (!Array.isArray(skinUuids) || skinUuids.length === 0) {
      return res.status(400).json({ message: 'skinUuids array is required' });
    }

    const skinLevels = await loadSkinsCache();

    const items = skinUuids.map(skinUuid => {
      const skinDetails = skinLevels.get(skinUuid.toLowerCase());
      return {
        skinUuid,
        skinName: skinDetails?.displayName || 'Unknown Skin'
      };
    });

    const wishlist = await addToWishlistItems(req.params.accountId, items);
    res.json({ message: 'Added to wishlist', wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove item from wishlist for user's account
router.delete('/wishlist/:accountId/:skinUuid', protect, async (req, res) => {
  try {
    // Verify account belongs to user
    const account = await Account.findOne({ _id: req.params.accountId, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    await removeWishlistItem(req.params.accountId, req.params.skinUuid);
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
