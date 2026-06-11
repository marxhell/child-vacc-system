const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const Guardian = require('../models/Guardian');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');
const { APPOINTMENT_STATUS } = require('../config/constants');
const {
  sendAppointmentConfirmation,
  sendRescheduleNotification,
  sendMissedAppointmentNotification,
} = require('../services/notificationService');

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
  try {
    const { childId, vaccine, appointmentDate, remarks, guardianId } = req.body;

    const child = await Child.findById(childId).populate('guardians');
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    // Use provided guardian or default to first guardian from child record
    let guardianRef = guardianId;
    if (!guardianRef && child.guardians && child.guardians.length > 0) {
      guardianRef = child.guardians[0]._id;
    }

    const appointment = new Appointment({
      child: childId,
      guardian: guardianRef,
      vaccine,
      appointmentDate: new Date(appointmentDate),
      remarks,
      createdBy: req.user._id,
    });

    await appointment.save();
    await appointment.populate('child guardian createdBy');

    // Send appointment confirmation notification via notification service
    if (appointment.guardian && appointment.guardian.email) {
      sendAppointmentConfirmation({
        child: appointment.child,
        guardian: appointment.guardian,
        appointment,
        vaccine: appointment.vaccine,
        appointmentDate: appointment.appointmentDate,
      }).catch(err => console.error('Failed to send confirmation:', err.message));
    }

    sendSuccess(res, appointment, 'Appointment created successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get appointments
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || null;

    const query = status ? { status } : {};

    const appointments = await Appointment.find(query)
      .populate('child guardian createdBy completedBy')
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDate: 1 });

    const totalItems = await Appointment.countDocuments(query);

    sendPaginated(res, appointments, totalItems, page, limit, 'Appointments retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('child guardian createdBy completedBy');
    if (!appointment) {
      return sendError(res, 'Appointment not found', 404);
    }

    sendSuccess(res, appointment, 'Appointment retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Update appointment
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
  try {
    const { appointmentDate, status, remarks } = req.body;

    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return sendError(res, 'Appointment not found', 404);
    }

    const oldData = {
      appointmentDate: appointment.appointmentDate,
      status: appointment.status,
    };

    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (status) appointment.status = status;
    if (remarks) appointment.remarks = remarks;

    if (status === APPOINTMENT_STATUS.COMPLETED) {
      appointment.completionDate = new Date();
      appointment.completedBy = req.user._id;
    }

    await appointment.save();
    await appointment.populate('child guardian createdBy completedBy');

    // Send reschedule notification if date changed
    if (appointmentDate && oldData.appointmentDate && 
        new Date(appointmentDate).getTime() !== new Date(oldData.appointmentDate).getTime() &&
        appointment.guardian && appointment.guardian.email) {
      sendRescheduleNotification({
        child: appointment.child,
        guardian: appointment.guardian,
        appointment,
        vaccine: appointment.vaccine,
        oldDate: oldData.appointmentDate,
        newDate: appointment.appointmentDate,
      }).catch(err => console.error('Failed to send reschedule notification:', err.message));
    }

    // Send missed notification if status changed to missed
    if (status === APPOINTMENT_STATUS.MISSED && appointment.guardian && appointment.guardian.email) {
      sendMissedAppointmentNotification({
        child: appointment.child,
        guardian: appointment.guardian,
        appointment,
        vaccine: appointment.vaccine,
      }).catch(err => console.error('Failed to send missed notification:', err.message));
    }

    sendSuccess(res, appointment, 'Appointment updated successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return sendError(res, 'Appointment not found', 404);
    }

    appointment.status = APPOINTMENT_STATUS.CANCELLED;
    await appointment.save();

    sendSuccess(res, null, 'Appointment cancelled successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get today's appointments
// @route   GET /api/appointments/today/schedule
// @access  Private/Nurse
exports.getTodayAppointments = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.RESCHEDULED] },
    })
      .populate('child guardian createdBy')
      .sort({ appointmentDate: 1 });

    sendSuccess(res, appointments, 'Today\'s appointments retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get missed appointments
// @route   GET /api/appointments/missed
// @access  Private
exports.getMissedAppointments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const appointments = await Appointment.find({ status: APPOINTMENT_STATUS.MISSED })
      .populate('child guardian createdBy')
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDate: -1 });

    const totalItems = await Appointment.countDocuments({ status: APPOINTMENT_STATUS.MISSED });

    sendPaginated(res, appointments, totalItems, page, limit, 'Missed appointments retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
