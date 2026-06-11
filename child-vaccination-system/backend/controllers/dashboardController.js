const Child = require('../models/Child');
const User = require('../models/User');
const VaccinationRecord = require('../models/vaccinationrecord');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const Appointment = require('../models/Appointment');
const Vaccine = require('../models/Vaccine');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { ROLES, APPOINTMENT_STATUS } = require('../config/constants');

// @desc    Get admin dashboard
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalChildren = await Child.countDocuments({ isActive: true });
    const totalVaccinations = await VaccinationRecord.countDocuments();
    const totalUsers = await User.countDocuments({ isActive: true });

    const upcomingAppointments = await Appointment.countDocuments({
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.RESCHEDULED] },
      appointmentDate: { $gte: new Date() },
    });

    const overdueVaccinations = await VaccinationSchedule.countDocuments({
      status: 'overdue',
      isOverdue: true,
    });

    const availableVaccineStock = await Vaccine.aggregate([
      {
        $group: {
          _id: null,
          totalAvailable: { $sum: '$quantityAvailable' },
        },
      },
    ]);

    const activeUsers = await User.countDocuments({ isActive: true });

    // Notification stats
    const totalNotifications = await Notification.countDocuments();
    const pendingNotifications = await Notification.countDocuments({ status: 'pending' });
    const failedNotifications = await Notification.countDocuments({ status: 'failed' });
    const notificationsSentToday = await Notification.countDocuments({
      sentAt: { $gte: today },
    });

    sendSuccess(
      res,
      {
        totalChildren,
        totalVaccinations,
        totalUsers,
        upcomingAppointments,
        overdueVaccinations,
        availableVaccineStock: availableVaccineStock[0]?.totalAvailable || 0,
        activeUsers,
        totalNotifications,
        pendingNotifications,
        failedNotifications,
        notificationsSentToday,
      },
      'Admin dashboard retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get nurse dashboard
// @route   GET /api/dashboard/nurse
// @access  Private/Nurse
exports.getNurseDashboard = async (req, res, next) => {
  try {
    // Today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.RESCHEDULED] },
    });

    // Vaccinations due today
    const vaccinationsDueToday = await VaccinationSchedule.countDocuments({
      scheduledDate: { $gte: today, $lt: tomorrow },
      status: 'pending',
    });

    // Completed vaccinations today
    const completedToday = await VaccinationRecord.countDocuments({
      administrationDate: { $gte: today, $lt: tomorrow },
    });

    // Recent activities
    const recentVaccinations = await VaccinationRecord.find()
      .populate('child administeredBy')
      .sort({ administrationDate: -1 })
      .limit(5);

    sendSuccess(
      res,
      {
        todayAppointments,
        vaccinationsDueToday,
        completedToday,
        recentVaccinations,
      },
      'Nurse dashboard retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get pharmacist dashboard
// @route   GET /api/dashboard/pharmacist
// @access  Private/Pharmacist
exports.getPharmacistDashboard = async (req, res, next) => {
  try {
    // Current stock
    const currentStock = await Vaccine.aggregate([
      {
        $group: {
          _id: '$name',
          totalQuantity: { $sum: '$quantityAvailable' },
          batches: { $sum: 1 },
        },
      },
    ]);

    // Low stock items
    const lowStockItems = await Vaccine.find({
      $expr: { $lte: ['$quantityAvailable', '$minStockLevel'] },
    }).select('name quantityAvailable minStockLevel batchNumber');

    // Expiring vaccines
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringVaccines = await Vaccine.find({
      expiryDate: { $gte: today, $lte: thirtyDaysFromNow },
      isExpired: false,
    }).select('name expiryDate quantityAvailable batchNumber');

    sendSuccess(
      res,
      {
        currentStock,
        lowStockItems,
        expiringVaccines,
      },
      'Pharmacist dashboard retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get records officer dashboard
// @route   GET /api/dashboard/records-officer
// @access  Private/RecordsOfficer
exports.getRecordsOfficerDashboard = async (req, res, next) => {
  try {
    // New registrations this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const newRegistrations = await Child.countDocuments({
      createdAt: { $gte: firstDayOfMonth },
    });

    // Upcoming appointments
    const upcomingAppointments = await Appointment.countDocuments({
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.RESCHEDULED] },
      appointmentDate: { $gte: new Date() },
    });

    // Recent registrations
    const recentRegistrations = await Child.find()
      .populate('guardians registeredBy', '-password')
      .sort({ createdAt: -1 })
      .limit(10);

    sendSuccess(
      res,
      {
        newRegistrations,
        upcomingAppointments,
        recentRegistrations,
      },
      'Records Officer dashboard retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
