import express from 'express';
import Log from '../models/Log.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(401).json({ message: 'Admin access required' });
  }
  return next();
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

// Get all users
router.get('/users', protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    const usersWithAccounts = await Promise.all(users.map(async (user) => {
      const accounts = await Account.find({ userId: user._id }).lean();
      return {
        id: user._id?.toString?.() || user.id || null,
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'user',
        isPremium: user.isPremium || false,
        isActive: user.isActive !== false,
        language: user.language || 'en',
        createdAt: user.createdAt || null,
        accountCount: accounts.length,
        accounts: accounts.map(acc => ({
          id: acc._id?.toString?.() || acc.id || null,
          name: acc.name || '',
          shard: acc.shard || 'ap',
          isActive: acc.isActive !== false,
          hasNotifications: !!(acc.ntfyTopicUrl || acc.discordWebhookUrl)
        }))
      };
    }));
    res.json({ users: usersWithAccounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get specific user with their accounts
router.get('/users/:id', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const accounts = await Account.find({ userId: user._id }).lean();
    const userDetails = {
      id: user._id?.toString?.() || user.id || null,
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'user',
      isPremium: user.isPremium || false,
      isActive: user.isActive !== false,
      language: user.language || 'en',
      createdAt: user.createdAt || null,
      accounts: accounts.map(acc => ({
        id: acc._id?.toString?.() || acc.id || null,
        name: acc.name || '',
        shard: acc.shard || 'ap',
        isActive: acc.isActive !== false,
        redirectUrl: acc.redirectUrl || '',
        ntfyTopicUrl: acc.ntfyTopicUrl || '',
        discordWebhookUrl: acc.discordWebhookUrl || '',
        lastReauthAt: acc.lastReauthAt || null,
        lastReauthStatus: acc.lastReauthStatus || '',
        lastShopCheckAt: acc.lastShopCheckAt || null,
        lastShopCheckStatus: acc.lastShopCheckStatus || ''
      }))
    };

    res.json({ user: userDetails });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ban user
router.put('/users/:id/ban', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot ban admin users' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unban user
router.put('/users/:id/unban', protect, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    await user.save();

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
