import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Check if any admin users exist
router.get('/setup-check', async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    res.json({ setupRequired: userCount === 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register first user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // For safety in single-user setups, prevent registering multiple users if one already exists
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already complete. Registration is locked.' });
    }

    const user = await User.create({
      username,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

export default router;
