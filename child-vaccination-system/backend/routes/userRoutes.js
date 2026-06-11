const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
} = require('../controllers/userController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateUserCreation, validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);
router.use(authorize(ROLES.ADMINISTRATOR));

router.post('/', validateUserCreation, createUser);
router.get('/', getUsers);
router.get('/:id', validateMongoId, getUserById);
router.put('/:id', updateUser);
router.delete('/:id', validateMongoId, deleteUser);
router.put('/:id/reset-password', resetPassword);

module.exports = router;
