import express from 'express';
import axios from 'axios';

const router = express.Router();

const sendDiscordWebhook = async (data) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL not configured');
    return false;
  }

  const embed = {
    title: '📊 New Survey Response',
    color: 0xff4655, // Valorant red
    fields: [
      {
        name: '👤 Name',
        value: data.userName || 'N/A',
        inline: true
      },
      {
        name: '🆔 Device ID',
        value: data.deviceId || 'N/A',
        inline: true
      },
      {
        name: '🌐 Language',
        value: data.language || 'N/A',
        inline: true
      },
      {
        name: '🔔 Notification Method',
        value: data.notificationMethod || 'N/A',
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Valorant Shop Checker - Daily Notification Survey'
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

router.post('/', async (req, res) => {
  try {
    const { deviceId, userName, notificationMethod, language } = req.body || {};

    // Validation
    if (!deviceId || !deviceId.trim()) {
      return res.status(400).json({ message: 'Device ID is required' });
    }
    if (!userName || !userName.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!notificationMethod || !notificationMethod.trim()) {
      return res.status(400).json({ message: 'Notification method is required' });
    }

    // Send to Discord webhook
    const webhookSent = await sendDiscordWebhook({ deviceId, userName, notificationMethod, language });

    if (!webhookSent) {
      return res.status(500).json({ message: 'Failed to submit survey' });
    }

    res.json({ message: 'Survey submitted successfully' });
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
