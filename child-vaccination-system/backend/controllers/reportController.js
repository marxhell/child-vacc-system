const Child = require('../models/Child');
const VaccinationRecord = require('../models/vaccinationrecord');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const Appointment = require('../models/Appointment');
const Vaccine = require('../models/Vaccine');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { APPOINTMENT_STATUS } = require('../config/constants');

// @desc    Get monthly immunization report
// @route   GET /api/reports/monthly-immunization
// @access  Private
exports.getMonthlyImmunizationReport = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const report = await VaccinationRecord.aggregate([
      {
        $match: {
          administrationDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$vaccine',
          totalAdministered: { $sum: 1 },
        },
      },
      {
        $sort: { totalAdministered: -1 },
      },
    ]);

    sendSuccess(res, { month, year, report }, 'Monthly immunization report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get daily vaccinations report
// @route   GET /api/reports/daily-vaccinations
// @access  Private
exports.getDailyVaccinationsReport = async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const report = await VaccinationRecord.find({
      administrationDate: { $gte: startDate, $lte: endDate },
    })
      .populate('child administeredBy vaccineBatch')
      .sort({ administrationDate: 1 });

    sendSuccess(res, { date: date.toISOString().split('T')[0], totalVaccinations: report.length, report }, 'Daily vaccinations report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccination coverage report
// @route   GET /api/reports/vaccination-coverage
// @access  Private
exports.getVaccinationCoverageReport = async (req, res, next) => {
  try {
    const totalChildren = await Child.countDocuments({ isActive: true });

    const vaccineStats = await VaccinationRecord.aggregate([
      {
        $group: {
          _id: '$vaccine',
          childrenVaccinated: { $addToSet: '$child' },
        },
      },
      {
        $project: {
          vaccine: '$_id',
          childrenVaccinated: { $size: '$childrenVaccinated' },
          coverage: {
            $multiply: [{ $divide: [{ $size: '$childrenVaccinated' }, totalChildren] }, 100],
          },
        },
      },
      {
        $sort: { coverage: -1 },
      },
    ]);

    sendSuccess(res, { totalChildren, vaccineStats }, 'Vaccination coverage report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get overdue vaccinations report
// @route   GET /api/reports/overdue-vaccinations
// @access  Private
exports.getOverdueVaccinationsReport = async (req, res, next) => {
  try {
    const report = await VaccinationSchedule.find({
      status: 'overdue',
      isOverdue: true,
    })
      .populate('child')
      .sort({ scheduledDate: 1 });

    sendSuccess(res, { totalOverdue: report.length, report }, 'Overdue vaccinations report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine stock report
// @route   GET /api/reports/vaccine-stock
// @access  Private
exports.getVaccineStockReport = async (req, res, next) => {
  try {
    const report = await Vaccine.aggregate([
      {
        $group: {
          _id: '$name',
          totalAvailable: { $sum: '$quantityAvailable' },
          totalReceived: { $sum: '$quantityReceived' },
          batches: { $sum: 1 },
          minStockLevel: { $first: '$minStockLevel' },
        },
      },
      {
        $project: {
          vaccine: '$_id',
          totalAvailable: 1,
          totalReceived: 1,
          batches: 1,
          minStockLevel: 1,
          status: {
            $cond: [
              { $eq: ['$totalAvailable', 0] },
              'Out of Stock',
              { $cond: [{ $lte: ['$totalAvailable', '$minStockLevel'] }, 'Low Stock', 'In Stock'] },
            ],
          },
        },
      },
      {
        $sort: { totalAvailable: 1 },
      },
    ]);

    sendSuccess(res, { report }, 'Vaccine stock report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine usage report
// @route   GET /api/reports/vaccine-usage
// @access  Private
exports.getVaccineUsageReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const report = await VaccinationRecord.aggregate([
      {
        $match: {
          administrationDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$vaccine',
          totalUsed: { $sum: 1 },
        },
      },
      {
        $sort: { totalUsed: -1 },
      },
    ]);

    sendSuccess(res, { startDate, endDate, report }, 'Vaccine usage report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get expired vaccine report
// @route   GET /api/reports/expired-vaccines
// @access  Private
exports.getExpiredVaccineReport = async (req, res, next) => {
  try {
    const report = await Vaccine.find({
      expiryDate: { $lt: new Date() },
    })
      .populate('managedBy', '-password')
      .sort({ expiryDate: 1 });

    sendSuccess(res, { totalExpired: report.length, report }, 'Expired vaccine report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get appointment report
// @route   GET /api/reports/appointments
// @access  Private
exports.getAppointmentReport = async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const report = await Appointment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const detailedReport = await Appointment.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate('child guardian')
      .sort({ appointmentDate: -1 });

    sendSuccess(res, { startDate, endDate, summary: report, detailedReport }, 'Appointment report retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
