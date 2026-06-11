const express = require('express');
const router = express.Router();
const {
  addVaccine,
  getInventory,
  getVaccineByBatch,
  getInventorySummary,
  getLowStockAlerts,
  getExpiringVaccines,
  updateStock,
  deleteVaccine,
} = require('../controllers/inventoryController');
const { verifyToken, authorize } = require('../middleware/auth');
const { validateVaccineCreation, validateMongoId } = require('../validations/validators');
const { ROLES } = require('../config/constants');

router.use(verifyToken);

router.post('/', authorize(ROLES.PHARMACIST, ROLES.ADMINISTRATOR), validateVaccineCreation, addVaccine);
router.get('/', getInventory);
router.get('/summary', getInventorySummary);
router.get('/alerts/low-stock', authorize(ROLES.PHARMACIST, ROLES.ADMINISTRATOR), getLowStockAlerts);
router.get('/alerts/expiring', authorize(ROLES.PHARMACIST, ROLES.ADMINISTRATOR), getExpiringVaccines);
router.get('/batch/:batchNumber', getVaccineByBatch);
router.put('/:id/stock', authorize(ROLES.PHARMACIST, ROLES.ADMINISTRATOR), updateStock);
router.delete('/:id', authorize(ROLES.PHARMACIST, ROLES.ADMINISTRATOR), validateMongoId, deleteVaccine);

module.exports = router;
