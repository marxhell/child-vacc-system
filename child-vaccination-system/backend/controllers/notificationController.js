const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');
const { NOTIFICATION_TYPES } = require('../config/constants');

// @desc    Get notification logs
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;
    const type = req.query.type || null;

    const query = {};
    if (status) query.status = status;
    if (type) query.notificationType = type;

    const notifications = await Notification.find(query)
      .populate('child', 'firstName lastName patientId')
      .populate('guardian', 'name phoneNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalItems = await Notification.countDocuments(query);

    sendPaginated(res, notifications, totalItems, page, limit, 'Notifications retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
exports.getNotificationStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalSent, pendingCount, failedCount, sentToday, byType] = await Promise.all([
      Notification.countDocuments({ status: 'sent' }),
      Notification.countDocuments({ status: 'pending' }),
      Notification.countDocuments({ status: 'failed' }),
      Notification.countDocuments({ sentAt: { $gte: today, $lt: tomorrow } }),
      Notification.aggregate([
        { $group: { _id: '$notificationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    sendSuccess(res, {
      totalSent,
      pending: pendingCount,
      failed: failedCount,
      sentToday,
      byType,
    }, 'Notification statistics retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get notification report
// @route   GET /api/notifications/report
// @access  Private/Admin
exports.getNotificationReport = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const notifications = await Notification.find(query)
      .populate('child', 'firstName lastName patientId')
      .populate('guardian', 'name phoneNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalItems = await Notification.countDocuments(query);

    sendPaginated(res, notifications, totalItems, page, limit, 'Notification report retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }

    sendSuccess(res, notification, 'Notification marked as read', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Send manual reminder from admin
// @route   POST /api/notifications/send-reminder
// @access  Private/Admin
exports.sendManualReminder = async (req, res, next) => {
  try {
    const { appointmentId, daysBefore } = req.body;
    const { sendVaccinationReminder } = require('../services/notificationService');
    const Appointment = require('../models/Appointment');

    const appointment = await Appointment.findById(appointmentId).populate('child guardian');
    if (!appointment) {
      return sendError(res, 'Appointment not found', 404);
    }

    if (!appointment.guardian || !appointment.guardian.email) {
      return sendError(res, 'Guardian email not available', 400);
    }

    const result = await sendVaccinationReminder({
      child: appointment.child,
      guardian: appointment.guardian,
      appointment,
      vaccine: appointment.vaccine,
      appointmentDate: appointment.appointmentDate,
      daysBefore: daysBefore || 1,
    });

    if (result.success) {
      sendSuccess(res, { sent: true }, 'Reminder sent successfully', 200);
    } else {
      sendError(res, 'Failed to send reminder', 500, result.error);
    }
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Send appointment reminders immediately (admin-triggered)
// @route   POST /api/notifications/send-appointment-reminders
// @access  Private/Admin
exports.sendAppointmentReminders = async (req, res, next) => {
  try {
    const { daysInAdvance } = req.body;
    const days = parseInt(daysInAdvance, 10) || 1;

    const { sendVaccinationReminder } = require('../services/notificationService');
    const Appointment = require('../models/Appointment');
    const { APPOINTMENT_STATUS } = require('../config/constants');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    const start = new Date(targetDate);
    const end = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: start, $lt: end },
      status: APPOINTMENT_STATUS.SCHEDULED,
    }).populate('child guardian');

    let sent = 0;
    const errors = [];

    for (const appointment of appointments) {
      try {
        if (appointment.guardian && appointment.guardian.email) {
          await sendVaccinationReminder({
            child: appointment.child,
            guardian: appointment.guardian,
            appointment,
            vaccine: appointment.vaccine,
            appointmentDate: appointment.appointmentDate,
            daysBefore: days,
          });
          sent += 1;
        }
      } catch (err) {
        errors.push({ appointmentId: appointment._id, error: err.message });
      }
    }

    sendSuccess(res, { sent, attempted: appointments.length, errors }, 'Reminders processed', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};