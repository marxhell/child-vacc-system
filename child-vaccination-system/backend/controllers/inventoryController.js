const Vaccine = require('../models/Vaccine');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');

// @desc    Add vaccine to inventory
// @route   POST /api/inventory
// @access  Private/Pharmacist
exports.addVaccine = async (req, res, next) => {
  try {
    const { name, batchNumber, quantityReceived, supplier, dateReceived, expiryDate, minStockLevel } = req.body;

    // Check if batch already exists
    let vaccine = await Vaccine.findOne({ batchNumber });
    if (vaccine) {
      return sendError(res, 'Vaccine batch already exists', 400);
    }

    vaccine = new Vaccine({
      name,
      batchNumber,
      quantityReceived,
      quantityAvailable: quantityReceived,
      supplier,
      dateReceived: new Date(dateReceived),
      expiryDate: new Date(expiryDate),
      minStockLevel: minStockLevel || 10,
      managedBy: req.user._id,
    });

    await vaccine.save();
    await vaccine.populate('managedBy', '-password');

    sendSuccess(res, vaccine, 'Vaccine added successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get all vaccines in inventory
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const vaccineName = req.query.name || null;

    const query = vaccineName ? { name: vaccineName } : {};

    const vaccines = await Vaccine.find(query)
      .populate('managedBy', '-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalItems = await Vaccine.countDocuments(query);

    sendPaginated(res, vaccines, totalItems, page, limit, 'Inventory retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine by batch
// @route   GET /api/inventory/batch/:batchNumber
// @access  Private
exports.getVaccineByBatch = async (req, res, next) => {
  try {
    const vaccine = await Vaccine.findOne({ batchNumber: req.params.batchNumber }).populate('managedBy', '-password');
    if (!vaccine) {
      return sendError(res, 'Vaccine batch not found', 404);
    }

    sendSuccess(res, vaccine, 'Vaccine retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get vaccine stock summary
// @route   GET /api/inventory/summary
// @access  Private
exports.getInventorySummary = async (req, res, next) => {
  try {
    const summary = await Vaccine.aggregate([
      {
        $group: {
          _id: '$name',
          totalQuantity: { $sum: '$quantityAvailable' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantityAvailable', '$minStockLevel'] }, 1, 0],
            },
          },
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ['$quantityAvailable', 0] }, 1, 0],
            },
          },
          expiredCount: {
            $sum: {
              $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0],
            },
          },
        },
      },
    ]);

    sendSuccess(res, summary, 'Inventory summary retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get low stock alerts
// @route   GET /api/inventory/alerts/low-stock
// @access  Private/Pharmacist
exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const vaccines = await Vaccine.find({
      $expr: { $lte: ['$quantityAvailable', '$minStockLevel'] },
    }).populate('managedBy', '-password');

    sendSuccess(res, vaccines, 'Low stock alerts retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get expiring vaccines
// @route   GET /api/inventory/alerts/expiring
// @access  Private/Pharmacist
exports.getExpiringVaccines = async (req, res, next) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const vaccines = await Vaccine.find({
      expiryDate: { $gte: today, $lte: thirtyDaysFromNow },
      isExpired: false,
    }).populate('managedBy', '-password');

    sendSuccess(res, vaccines, 'Expiring vaccines retrieved', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Update vaccine stock
// @route   PUT /api/inventory/:id/stock
// @access  Private/Pharmacist
exports.updateStock = async (req, res, next) => {
  try {
    const { quantityChange, reason } = req.body;

    const vaccine = await Vaccine.findById(req.params.id);
    if (!vaccine) {
      return sendError(res, 'Vaccine not found', 404);
    }

    const oldQuantity = vaccine.quantityAvailable;
    vaccine.quantityAvailable += quantityChange;

    if (vaccine.quantityAvailable < 0) {
      vaccine.quantityAvailable = oldQuantity;
      return sendError(res, 'Insufficient stock', 400);
    }

    await vaccine.save();

    sendSuccess(res, vaccine, 'Stock updated successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Delete vaccine batch
// @route   DELETE /api/inventory/:id
// @access  Private/Pharmacist
exports.deleteVaccine = async (req, res, next) => {
  try {
    const vaccine = await Vaccine.findByIdAndDelete(req.params.id);
    if (!vaccine) {
      return sendError(res, 'Vaccine not found', 404);
    }

    sendSuccess(res, null, 'Vaccine deleted successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
