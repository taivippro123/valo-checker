import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { isMailConfigured, sendOtpEmail } from '../services/mailService.js';

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeIdentifier = (identifier = '') => identifier.trim().toLowerCase();

const findUserByIdentifier = async (identifier = '') => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return null;
  }

  return User.findOne({
    $or: [
      { username: normalized },
      { email: normalized }
    ]
  });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashOtp = (otp, userId) => {
  return crypto
    .createHash('sha256')
    .update(`${otp}:${userId}:${process.env.JWT_SECRET || ''}`)
    .digest('hex');
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

// Register new user (public registration)
router.post('/register', async (req, res) => {
  const { fullName, username, email, password, language = 'en' } = req.body;

  try {
    // Validate inputs
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({ message: 'Username is required' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be between 3 and 20 characters' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['en', 'vn'].includes(language)) {
      return res.status(400).json({ message: 'Invalid language' });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
      role: 'user', // New registrations are always user role
      language
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        language: user.language,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register first admin user (setup mode)
router.post('/setup', async (req, res) => {
  const { username, password } = req.body;

  try {
    // For safety in single-user setups, prevent registering multiple users if one already exists
    const userCount = await User.countDocuments({});
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already complete. Registration is locked.' });
    }

    const user = await User.create({
      fullName: 'Admin',
      username,
      email: 'phanvothanhtai1007@gmail.com',
      password,
      role: 'admin' // First user is admin
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
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
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is banned' });
      }

      res.json({
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        language: user.language,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body || {};

  try {
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Username or email is required' });
    }

    if (!isMailConfigured()) {
      return res.status(503).json({ message: 'Mail service is not configured' });
    }

    const user = await findUserByIdentifier(identifier);

    if (user && user.isActive !== false) {
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      user.passwordResetOtpHash = hashOtp(otp, user._id.toString());
      user.passwordResetOtpExpiresAt = otpExpiresAt;
      await user.save();

      try {
        await sendOtpEmail({
          to: user.email,
          otp,
          fullName: user.fullName,
          language: user.language || 'vn'
        });
      } catch (mailError) {
        user.passwordResetOtpHash = '';
        user.passwordResetOtpExpiresAt = null;
        await user.save();
        throw mailError;
      }
    }

    return res.json({
      message: 'If the account exists, an OTP has been sent to the registered email.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { identifier, otp, newPassword } = req.body || {};

  try {
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: 'Username or email is required' });
    }
    if (!otp || !String(otp).trim()) {
      return res.status(400).json({ message: 'OTP is required' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      user.passwordResetOtpHash = '';
      user.passwordResetOtpExpiresAt = null;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const expectedHash = hashOtp(String(otp).trim(), user._id.toString());
    if (expectedHash !== user.passwordResetOtpHash) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.passwordResetOtpHash = '';
    user.passwordResetOtpExpiresAt = null;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user profile
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

export default router;
