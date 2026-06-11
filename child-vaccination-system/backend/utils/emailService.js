const { sendPushNotification } = require('../config/firebase');

// DEPRECATED: SMTP email has been removed.
// Notifications are now sent exclusively through Firebase.
// This file is kept for backward compatibility.
// All notification logic is in services/notificationService.js

// Send notification via Firebase
const sendNotification = async (recipientToken, title, body, data = {}) => {
  try {
    const result = await sendPushNotification(recipientToken, title, body, data);
    return result;
  } catch (error) {
    console.error('Firebase notification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
};