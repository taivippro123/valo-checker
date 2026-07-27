import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate Limit
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Max 3 requests per IP
  message: {
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const sendDiscordWebhook = async (data) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL not configured');
    return false;
  }

  const issueLabels = {
    bug: 'Lỗi',
    feature: 'Tính năng mới',
    question: 'Hỏi đáp',
    other: 'Khác'
  };

  const embed = {
    title: 'Có người gửi form liên hệ',
    color: 0xff4655, // Valorant red
    fields: [
      {
        name: '👤 Tên',
        value: data.name || 'N/A',
        inline: true
      },
      {
        name: '📧 Email',
        value: data.email || 'N/A',
        inline: true
      },
      {
        name: '🔖 Loại vấn đề',
        value: issueLabels[data.issue] || data.issue || 'N/A',
        inline: true
      },
      {
        name: '💬 Tin nhắn',
        value: data.message || 'N/A',
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Valorant Shop Checker'
    }
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Failed to send Discord webhook:', error.message);
    return false;
  }
};

// Apply rate limit middleware to POST route
router.post('/', contactLimiter, async (req, res) => {
  try {
    const { name, email, issue, message } = req.body || {};

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!issue || !issue.trim()) {
      return res.status(400).json({ message: 'Issue type is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Send to Discord webhook
    const webhookSent = await sendDiscordWebhook({ name, email, issue, message });

    if (!webhookSent) {
      return res.status(500).json({ message: 'Failed to send message' });
    }

    res.json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;