const Guardian = require('../models/Guardian');
const Child = require('../models/Child');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');

// @desc    Create guardian
// @route   POST /api/guardians
// @access  Private
exports.createGuardian = async (req, res, next) => {
  try {
    const { name, relationship, nationalId, phoneNumber, email, physicalAddress } = req.body;

    // Check if guardian with same national ID exists
    let guardian = await Guardian.findOne({ nationalId });
    if (guardian) {
      return sendError(res, 'Guardian with this national ID already exists', 400);
    }

    guardian = new Guardian({
      name,
      relationship,
      nationalId,
      phoneNumber,
      email,
      physicalAddress,
    });

    await guardian.save();

    sendSuccess(res, guardian, 'Guardian created successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get all guardians
// @route   GET /api/guardians
// @access  Private
exports.getGuardians = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
      ],
    };

    const guardians = await Guardian.find(query).skip(skip).limit(limit);
    const totalItems = await Guardian.countDocuments(query);

    sendPaginated(res, guardians, totalItems, page, limit, 'Guardians retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get guardian by ID
// @route   GET /api/guardians/:id
// @access  Private
exports.getGuardianById = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 404);
    }

    // Get associated children
    const children = await Child.find({ guardians: guardian._id });

    sendSuccess(
      res,
      {
        ...guardian.toObject(),
        children,
      },
      'Guardian retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Update guardian
// @route   PUT /api/guardians/:id
// @access  Private
exports.updateGuardian = async (req, res, next) => {
  try {
    const { name, relationship, phoneNumber, email, physicalAddress } = req.body;

    let guardian = await Guardian.findById(req.params.id);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 404);
    }

    const oldData = {
      name: guardian.name,
      relationship: guardian.relationship,
      phoneNumber: guardian.phoneNumber,
      email: guardian.email,
    };

    if (name) guardian.name = name;
    if (relationship) guardian.relationship = relationship;
    if (phoneNumber) guardian.phoneNumber = phoneNumber;
    if (email) guardian.email = email;
    if (physicalAddress) guardian.physicalAddress = physicalAddress;

    await guardian.save();

    sendSuccess(res, guardian, 'Guardian updated successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Delete guardian
// @route   DELETE /api/guardians/:id
// @access  Private/Admin
exports.deleteGuardian = async (req, res, next) => {
  try {
    const guardian = await Guardian.findByIdAndDelete(req.params.id);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 404);
    }

    // Remove from children
    await Child.updateMany({ guardians: guardian._id }, { $pull: { guardians: guardian._id } });

    sendSuccess(res, null, 'Guardian deleted successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Link guardian to child
// @route   POST /api/guardians/:guardianId/children/:childId
// @access  Private
exports.linkGuardianToChild = async (req, res, next) => {
  try {
    const { guardianId, childId } = req.params;

    const guardian = await Guardian.findById(guardianId);
    if (!guardian) {
      return sendError(res, 'Guardian not found', 404);
    }

    const child = await Child.findById(childId);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    // Add guardian to child if not already linked
    if (!child.guardians.includes(guardianId)) {
      child.guardians.push(guardianId);
      await child.save();
    }

    await child.populate('guardians');

    sendSuccess(res, child, 'Guardian linked to child successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};
