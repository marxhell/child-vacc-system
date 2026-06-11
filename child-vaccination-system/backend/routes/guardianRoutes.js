const express = require('express');
const router = express.Router();
const {
  createGuardian,
  getGuardians,
  getGuardianById,
  updateGuardian,
  deleteGuardian,
  linkGuardianToChild,
} = require('../controllers/guardianController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateGuardianCreation, validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.post('/', validateGuardianCreation, createGuardian);
router.get('/', getGuardians);
router.get('/:id', validateMongoId, getGuardianById);
router.put('/:id', updateGuardian);
router.delete('/:id', validateMongoId, authorize(ROLES.ADMINISTRATOR), deleteGuardian);
router.post('/:guardianId/children/:childId', linkGuardianToChild);

module.exports = router;
