import axios from 'axios';

export const sendNtfyNotification = async (topicUrl, message, title = 'VALO CHECK') => {
  if (!topicUrl || !message) {
    return false;
  }

  await axios.post(topicUrl, message, {
    headers: {
      Title: title,
      Priority: 'default',
      Tags: 'rotating_light'
    }
  });

  return true;
};
