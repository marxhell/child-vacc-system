const express = require('express');
const router = express.Router();
const { login, logout, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { validateLogin } = require('../validations/validators');

router.post('/login', validateLogin, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);

module.exports = router;
