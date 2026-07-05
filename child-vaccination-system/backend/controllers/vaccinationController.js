const VaccinationSchedule = require('../models/VaccinationSchedule');
const VaccinationRecord = require('../models/vaccinationrecord');
const Child = require('../models/Child');
const Vaccine = require('../models/Vaccine');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');

// @desc    Get vaccination schedule for child
// @route   GET /api/vaccinations/schedule/:childId
// @access  Private
exports.getChildSchedule = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    const schedules = await VaccinationSchedule.find({ child: child._id })
      .populate('child createdBy')
      .sort({ scheduledDate: 1 });

    // Update overdue status for pending vaccines
    for (let schedule of schedules) {
      if (schedule.status === 'pending' && new Date() > schedule.scheduledDate) {
        schedule.isOverdue = true;
        schedule.status = 'overdue';
        await schedule.save();
      }
    }

    sendSuccess(res, schedules, 'Vaccination schedule retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get all overdue vaccinations
// @route   GET /api/vaccinations/overdue
// @access  Private
exports.getOverdueVaccinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const schedules = await VaccinationSchedule.find({
      status: 'overdue',
      isOverdue: true,
    })
      .populate('child createdBy')
      .skip(skip)
      .limit(limit)
      .sort({ scheduledDate: 1 });

    const totalItems = await VaccinationSchedule.countDocuments({
      status: 'overdue',
      isOverdue: true,
    });

    sendPaginated(res, schedules, totalItems, page, limit, 'Overdue vaccinations retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get upcoming vaccinations
// @route   GET /api/vaccinations/upcoming
// @access  Private
exports.getUpcomingVaccinations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schedules = await VaccinationSchedule.find({
      status: 'pending',
      scheduledDate: { $gte: today, $lte: thirtyDaysFromNow },
    })
      .populate('child createdBy')
      .skip(skip)
      .limit(limit)
      .sort({ scheduledDate: 1 });

    const totalItems = await VaccinationSchedule.countDocuments({
      status: 'pending',
      scheduledDate: { $gte: today, $lte: thirtyDaysFromNow },
    });

    sendPaginated(res, schedules, totalItems, page, limit, 'Upcoming vaccinations retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Record vaccination
// @route   POST /api/vaccinations/record
// @access  Private/Nurse
exports.recordVaccination = async (req, res, next) => {
  try {
    const { childId, vaccine, doseNumber, adverseEffects, vaccineBatchId } = req.body;

    const child = await Child.findById(childId);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    // Create vaccination record
    const vaccinationRecord = new VaccinationRecord({
      child: childId,
      vaccine,
      doseNumber,
      administeredBy: req.user._id,
      adverseEffects,
      vaccineBatch: vaccineBatchId,
    });

    await vaccinationRecord.save();
    await vaccinationRecord.populate('child administeredBy vaccineBatch');

    // Update schedule status if exists
    const schedule = await VaccinationSchedule.findOne({
      child: childId,
      vaccine,
      doseNumber,
      status: { $in: ['pending', 'overdue'] },
    });

    if (schedule) {
      schedule.status = 'completed';
      await schedule.save();
    }

    // Deduct from inventory
    if (vaccineBatchId) {
      const vaccineBatch = await Vaccine.findById(vaccineBatchId);
      if (vaccineBatch && vaccineBatch.quantityAvailable > 0) {
        vaccineBatch.quantityAvailable -= 1;
        await vaccineBatch.save();
      }
    }

    sendSuccess(res, vaccinationRecord, 'Vaccination recorded successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccination history
// @route   GET /api/vaccinations/history/:childId
// @access  Private
exports.getVaccinationHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const child = await Child.findById(req.params.childId);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    const records = await VaccinationRecord.find({ child: req.params.childId })
      .populate('child administeredBy vaccineBatch')
      .skip(skip)
      .limit(limit)
      .sort({ administrationDate: -1 });

    const totalItems = await VaccinationRecord.countDocuments({ child: req.params.childId });

    sendPaginated(res, records, totalItems, page, limit, 'Vaccination history retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
