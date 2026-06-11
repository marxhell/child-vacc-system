const express = require('express');
const router = express.Router();
const {
  getParentDashboard,
  getChildSchedule,
  getDiseaseInfo,
} = require('../controllers/parentController');
const {
  parentLogin,
  getParentProfile,
} = require('../controllers/parentAuthController');
const { verifyGuardianToken } = require('../middleware/guardianAuth');

// Public routes
router.post('/auth/login', parentLogin);

// Disease info - public
router.get('/diseases', getDiseaseInfo);

// Protected routes
router.get('/auth/me', verifyGuardianToken, getParentProfile);
router.get('/dashboard', verifyGuardianToken, getParentDashboard);
router.get('/children/:childId/schedule', verifyGuardianToken, getChildSchedule);

module.exports = router;