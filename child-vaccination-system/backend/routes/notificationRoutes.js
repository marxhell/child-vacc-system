const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationStats,
  getNotificationReport,
  markAsRead,
  sendManualReminder,
} = require('../controllers/notificationController');
const { verifyToken, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.get('/', getNotifications);
router.get('/stats', getNotificationStats);
router.get('/report', authorize(ROLES.ADMINISTRATOR), getNotificationReport);
router.post('/send-reminder', authorize(ROLES.ADMINISTRATOR), sendManualReminder);
router.put('/:id/read', markAsRead);

module.exports = router;
