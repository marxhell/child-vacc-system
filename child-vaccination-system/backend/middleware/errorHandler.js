const { sendError } = require('../utils/responseHandler');

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return sendError(res, `Validation Error: ${messages}`, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, `${field} already exists`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Cast error
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid ID format', 400);
  }

  // Default error
  sendError(res, err.message || 'Server Error', err.statusCode || 500, err);
};

module.exports = errorHandler;
