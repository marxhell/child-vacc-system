const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getNurseDashboard,
  getPharmacistDashboard,
  getRecordsOfficerDashboard,
} = require('../controllers/dashboardController');
const { verifyToken, authorize } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.get('/admin', authorize(ROLES.ADMINISTRATOR), getAdminDashboard);
router.get('/nurse', authorize(ROLES.NURSE), getNurseDashboard);
router.get('/pharmacist', authorize(ROLES.PHARMACIST), getPharmacistDashboard);
router.get('/records-officer', authorize(ROLES.RECORDS_OFFICER), getRecordsOfficerDashboard);

module.exports = router;
