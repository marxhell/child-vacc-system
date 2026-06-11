const express = require('express');
const router = express.Router();
const {
  getChildSchedule,
  getOverdueVaccinations,
  getUpcomingVaccinations,
  recordVaccination,
  getVaccinationHistory,
} = require('../controllers/vaccinationController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.get('/schedule/:childId', validateMongoId, getChildSchedule);
router.get('/overdue', getOverdueVaccinations);
router.get('/upcoming', getUpcomingVaccinations);
router.post('/record', authorize(ROLES.NURSE, ROLES.ADMINISTRATOR), recordVaccination);
router.get('/history/:childId', validateMongoId, getVaccinationHistory);

module.exports = router;
