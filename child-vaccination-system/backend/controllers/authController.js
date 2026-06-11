const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for required fields
    if (!email || !password) {
      return sendError(res, 'Please provide email and password', 400);
    }

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return sendError(res, 'User account is inactive', 403);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = generateToken(user._id);

    sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      },
      'Login successful',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    sendSuccess(res, null, 'Logout successful', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    sendSuccess(res, user, 'User retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
