const nodemailer = require('nodemailer');
const { sendPushNotification } = require('../config/firebase');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendNotification = async (recipientEmail, title, body, data = {}) => {
  try {
    if (recipientEmail) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: recipientEmail,
        subject: title,
        text: body,
      });
      return { success: true, method: 'email' };
    }

    const result = await sendPushNotification(data.deviceToken, title, body, data);
    return result;
  } catch (error) {
    console.error('Notification delivery error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
};
