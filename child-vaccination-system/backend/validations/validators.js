const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/responseHandler');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => `${err.param}: ${err.msg}`);
    return sendError(res, messages.join(', '), 400);
  }
  next();
};

// Auth validations
const validateLogin = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
];

const validateUserCreation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['administrator', 'nurse', 'records_officer', 'pharmacist']).withMessage('Invalid role'),
  validate,
];

// Child registration validation
const validateChildRegistration = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  validate,
];

// Guardian validation
const validateGuardianCreation = [
  body('name').trim().notEmpty().withMessage('Guardian name is required'),
  body('relationship').custom((value) => {
    const allowed = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'];
    if (!value) throw new Error('Guardian relationship is required');
    if (!allowed.map(v => v.toLowerCase()).includes(String(value).toLowerCase())) {
      throw new Error('Invalid relationship');
    }
    return true;
  }),
  body('nationalId').trim().notEmpty().withMessage('National ID is required'),
  body('phoneNumber').isMobilePhone().withMessage('Invalid phone number'),
  body('email').isEmail().withMessage('Valid email is required for appointment reminders'),
  validate,
];

// Vaccine validation
const validateVaccineCreation = [
  body('name').isIn(['BCG', 'OPV', 'Pentavalent', 'PCV', 'Rotavirus', 'Measles-Rubella', 'Yellow Fever']).withMessage('Invalid vaccine name'),
  body('batchNumber').trim().notEmpty().withMessage('Batch number is required'),
  body('quantityReceived').isInt({ min: 1 }).withMessage('Quantity received must be at least 1'),
  body('supplier').trim().notEmpty().withMessage('Supplier is required'),
  body('dateReceived').isISO8601().withMessage('Invalid date received'),
  body('expiryDate').isISO8601().withMessage('Invalid expiry date'),
  validate,
];

// Appointment validation
const validateAppointmentCreation = [
  body('child').isMongoId().withMessage('Invalid child ID'),
  body('vaccine').notEmpty().withMessage('Vaccine is required'),
  body('appointmentDate').isISO8601().withMessage('Invalid appointment date'),
  validate,
];

// ID validation
const validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

module.exports = {
  validate,
  validateLogin,
  validateUserCreation,
  validateChildRegistration,
  validateGuardianCreation,
  validateVaccineCreation,
  validateAppointmentCreation,
  validateMongoId,
};
