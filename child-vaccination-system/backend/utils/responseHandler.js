// Centralized response handler
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message = 'Error', statusCode = 500, error = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  });
};

const sendPaginated = (res, data, totalItems, page, limit, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total: totalItems,
      pages: Math.ceil(totalItems / limit),
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};
