const Guardian = require('../models/Guardian');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

// Generate JWT token for parent
const generateToken = (id) => {
  return jwt.sign({ id, type: 'guardian' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Parent login using National ID or Email + Phone
// @route   POST /api/parent/auth/login
// @access  Public
exports.parentLogin = async (req, res, next) => {
  try {
    const { identifier, phoneNumber } = req.body;

    if (!identifier || !phoneNumber) {
      return sendError(res, 'Please provide National ID/Email and phone number', 400);
    }

    // Find guardian by email or phone number
    const guardian = await Guardian.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phoneNumber: identifier },
      ],
    });

    if (!guardian) {
      return sendError(res, 'No parent/guardian record found with these credentials', 401);
    }

    // Verify phone number matches (secondary verification)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const guardianPhone = guardian.phoneNumber.replace(/\D/g, '');
    
    if (!guardianPhone.endsWith(normalizedPhone.slice(-9))) {
      return sendError(res, 'Phone number does not match our records', 401);
    }

    // Create token
    const token = generateToken(guardian._id);

    sendSuccess(
      res,
      {
        token,
        guardian: {
          id: guardian._id,
          name: guardian.name,
          email: guardian.email,
          phoneNumber: guardian.phoneNumber,
          relationship: guardian.relationship,
        },
      },
      'Login successful',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get parent profile
// @route   GET /api/parent/auth/me
// @access  Private/Parent
exports.getParentProfile = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.guardian._id);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 404);
    }

    sendSuccess(res, guardian, 'Profile retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};