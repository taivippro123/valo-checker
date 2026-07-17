import express from 'express';
import Log from '../models/Log.js';
import { protect } from '../middleware/authMiddleware.js';

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

export default router;
