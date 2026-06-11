const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getTodayAppointments,
  getMissedAppointments,
} = require('../controllers/appointmentController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateAppointmentCreation, validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.post('/', validateAppointmentCreation, createAppointment);
router.get('/', getAppointments);
router.get('/today/schedule', authorize(ROLES.NURSE, ROLES.ADMINISTRATOR), getTodayAppointments);
router.get('/missed', getMissedAppointments);
router.get('/:id', validateMongoId, getAppointmentById);
router.put('/:id', updateAppointment);
router.delete('/:id', validateMongoId, cancelAppointment);

module.exports = router;
