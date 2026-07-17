import axios from 'axios';

/**
 * Send a push notification using ntfy.sh
 * @param {string} topic - ntfy.sh topic
 * @param {string} body - Message body
 * @param {string} title - Message title
 * @returns {Promise<boolean>} Success status
 */
export const sendPushNotification = async (topic, body, title = '🚨 VALORANT SKIN FOUND!') => {
  if (!topic) {
    console.warn('[NtfyService] Skipping notification: No ntfy topic specified.');
    return false;
  }

  const cleanTopic = topic.trim();
  const url = `https://ntfy.sh/${cleanTopic}`;
  
  console.log(`[NtfyService] Sending notification to ${url}...`);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'bell,gun,tada',
        'Content-Type': 'text/plain'
      }
    });
    
    if (response.status === 200) {
      console.log(`[NtfyService] Push notification successfully sent to topic: ${cleanTopic}`);
      return true;
    }
    throw new Error(`Unexpected status response: ${response.status}`);
  } catch (error) {
    console.error(`[NtfyService] Failed to send push notification to topic ${cleanTopic}:`, error.message);
    return false;
  }
};
