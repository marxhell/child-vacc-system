const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for sending notifications
// Uses Firebase only as a notification delivery service
// All business data remains in MongoDB

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('Firebase notification service initialized');
    return firebaseApp;
  } catch (error) {
    console.warn('Firebase not configured. Notifications will be logged only.');
    return null;
  }
};

// Get Firebase Messaging instance
const getMessaging = () => {
  const app = initializeFirebase();
  if (!app) return null;
  return admin.messaging();
};

// Send push notification to a device token
const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase not configured' };
    }

    const message = {
      token,
      notification: { title, body },
      data,
    };

    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Firebase push notification error:', error);
    return { success: false, error: error.message };
  }
};

// Send notification to a topic
const sendTopicNotification = async (topic, title, body, data = {}) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase not configured' };
    }

    const message = {
      topic,
      notification: { title, body },
      data,
    };

    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Firebase topic notification error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeFirebase,
  getMessaging,
  sendPushNotification,
  sendTopicNotification,
};