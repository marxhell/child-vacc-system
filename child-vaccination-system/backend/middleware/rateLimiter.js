const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const createRateLimitHandler = (message) => {
  return (req, res /*, next */) => {
    res.status(429).json({
      success: false,
      message,
    });
  };
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  handler: createRateLimitHandler('Too many login attempts, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // allow normal UI browsing and repeated refreshes during demos
  message: 'Too many requests from this IP, please try again later.',
  handler: createRateLimitHandler('Too many requests from this IP, please try again later.'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  apiLimiter,
};
