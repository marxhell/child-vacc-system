const express = require('express');
const router = express.Router();
const {
  registerChild,
  getChildren,
  getChildById,
  updateChild,
  deleteChild,
} = require('../controllers/childController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateChildRegistration, validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.post('/', validateChildRegistration, registerChild);
router.get('/', getChildren);
router.get('/:id', validateMongoId, getChildById);
router.put('/:id', updateChild);
router.delete('/:id', validateMongoId, authorize(ROLES.ADMINISTRATOR), deleteChild);

module.exports = router;
