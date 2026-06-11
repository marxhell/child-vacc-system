const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');
const { ROLES } = require('../config/constants');

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return sendError(res, 'User already exists', 400);
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
      role: role || ROLES.NURSE,
      phoneNumber,
      createdBy: req.user._id,
    });

    await user.save();

    sendSuccess(res, user, 'User created successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find().skip(skip).limit(limit);
    const totalItems = await User.countDocuments();

    sendPaginated(res, users, totalItems, page, limit, 'Users retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user, 'User retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, role, isActive } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    };

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (role && req.user.role === ROLES.ADMINISTRATOR) user.role = role;
    if (isActive !== undefined && req.user.role === ROLES.ADMINISTRATOR) user.isActive = isActive;

    await user.save();

    sendSuccess(res, user, 'User updated successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, null, 'User deleted successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, null, 'Password reset successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
