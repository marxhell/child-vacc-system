const jwt = require('jsonwebtoken');
const Guardian = require('../models/Guardian');
const { sendError } = require('../utils/responseHandler');

// Verify guardian token for parent portal access
const verifyGuardianToken = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorized, no token provided', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'guardian') {
      return sendError(res, 'Not authorized, invalid token type', 401);
    }

    const guardian = await Guardian.findById(decoded.id);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 401);
    }

    req.guardian = guardian;
    next();
  } catch (error) {
    return sendError(res, 'Not authorized, token failed', 401);
  }
};

module.exports = {
  verifyGuardianToken,
};