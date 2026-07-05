const Child = require('../models/Child');
const Guardian = require('../models/Guardian');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const VaccinationRecord = require('../models/vaccinationrecord');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHandler');

// @desc    Register child
// @route   POST /api/children
// @access  Private
exports.registerChild = async (req, res, next) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, birthCertificateNumber, bloodGroup, residence, guardianId, guardianName, guardianRelationship, guardianEmail, guardianPhone, guardianNationalId } = req.body;

    let guardianIds = [];

    // If guardianId is provided directly, use it
    if (guardianId) {
      const guardian = await Guardian.findById(guardianId);
      if (!guardian) {
        return sendError(res, 'Guardian not found', 404);
      }
      guardianIds = [guardianId];
    } else if (guardianName && (guardianPhone || guardianEmail)) {
      // Try to find existing guardian by email or phone
      let guardian = null;
      if (guardianEmail) {
        guardian = await Guardian.findOne({ email: guardianEmail.toLowerCase() });
      }
      if (!guardian && guardianPhone) {
        guardian = await Guardian.findOne({ phoneNumber: guardianPhone });
      }
      
      if (!guardian) {
        guardian = new Guardian({
          name: guardianName,
          relationship: Guardian.normalizeRelationship(guardianRelationship || 'Guardian'),
          phoneNumber: guardianPhone || '',
          email: guardianEmail ? guardianEmail.toLowerCase() : '',
          nationalId: guardianNationalId || '',
        });
        await guardian.save();
      } else {
        // Update existing guardian info
        guardian.name = guardianName || guardian.name;
        guardian.relationship = Guardian.normalizeRelationship(guardianRelationship || guardian.relationship);
        guardian.phoneNumber = guardianPhone || guardian.phoneNumber;
        guardian.email = guardianEmail ? guardianEmail.toLowerCase() : guardian.email;
        if (guardianNationalId) guardian.nationalId = guardianNationalId;
        await guardian.save();
      }
      
      guardianIds = [guardian._id];
    }

    const child = new Child({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      birthCertificateNumber,
      bloodGroup,
      residence,
      guardians: guardianIds,
      registeredBy: req.user._id,
    });

    await child.save();
    await child.populate('guardians registeredBy', '-password');

    // Auto-generate vaccination schedule
    await generateVaccinationSchedule(child);

    sendSuccess(res, child, 'Child registered successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get all children
// @route   GET /api/children
// @access  Private
exports.getChildren = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {
      isActive: true,
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ],
    };

    const children = await Child.find(query).populate('guardians registeredBy', '-password').skip(skip).limit(limit);
    const totalItems = await Child.countDocuments(query);

    sendPaginated(res, children, totalItems, page, limit, 'Children retrieved');
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get child by ID
// @route   GET /api/children/:id
// @access  Private
exports.getChildById = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id).populate('guardians registeredBy', '-password');
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    // Get vaccination history
    const vaccinations = await VaccinationRecord.find({ child: child._id }).sort({ administrationDate: -1 });
    const schedule = await VaccinationSchedule.find({ child: child._id }).sort({ scheduledDate: 1 });

    sendSuccess(
      res,
      {
        ...child.toObject(),
        vaccinations,
        schedule,
      },
      'Child retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Update child
// @route   PUT /api/children/:id
// @access  Private
exports.updateChild = async (req, res, next) => {
  try {
    const { firstName, lastName, bloodGroup, residence } = req.body;

    let child = await Child.findById(req.params.id);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    const oldData = {
      firstName: child.firstName,
      lastName: child.lastName,
      bloodGroup: child.bloodGroup,
      residence: child.residence,
    };

    if (firstName) child.firstName = firstName;
    if (lastName) child.lastName = lastName;
    if (bloodGroup) child.bloodGroup = bloodGroup;
    if (residence) child.residence = residence;

    await child.save();
    await child.populate('guardians registeredBy', '-password');

    sendSuccess(res, child, 'Child updated successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Delete child (soft delete)
// @route   DELETE /api/children/:id
// @access  Private/Admin
exports.deleteChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) {
      return sendError(res, 'Child not found', 404);
    }

    child.isActive = false;
    await child.save();

    sendSuccess(res, null, 'Child deleted successfully', 200);
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// Helper function to generate vaccination schedule
const generateVaccinationSchedule = async (child) => {
  const schedules = [
    { vaccine: 'BCG', doseNumber: 1, ageInMonths: 0 },
    { vaccine: 'OPV', doseNumber: 1, ageInMonths: 0 },
    { vaccine: 'Hepatitis B', doseNumber: 1, ageInMonths: 0 },
    { vaccine: 'Pentavalent', doseNumber: 1, ageInMonths: 1 },
    { vaccine: 'PCV', doseNumber: 1, ageInMonths: 1 },
    { vaccine: 'Rotavirus', doseNumber: 1, ageInMonths: 1 },
    { vaccine: 'OPV', doseNumber: 2, ageInMonths: 2 },
    { vaccine: 'Pentavalent', doseNumber: 2, ageInMonths: 2 },
    { vaccine: 'PCV', doseNumber: 2, ageInMonths: 2 },
    { vaccine: 'Rotavirus', doseNumber: 2, ageInMonths: 2 },
    { vaccine: 'OPV', doseNumber: 3, ageInMonths: 3 },
    { vaccine: 'Pentavalent', doseNumber: 3, ageInMonths: 3 },
    { vaccine: 'PCV', doseNumber: 3, ageInMonths: 3 },
    { vaccine: 'Measles-Rubella', doseNumber: 1, ageInMonths: 9 },
    { vaccine: 'Yellow Fever', doseNumber: 1, ageInMonths: 9 },
  ];

  for (const schedule of schedules) {
    const scheduledDate = new Date(child.dateOfBirth);
    scheduledDate.setMonth(scheduledDate.getMonth() + schedule.ageInMonths);

    await VaccinationSchedule.create({
      child: child._id,
      vaccine: schedule.vaccine,
      doseNumber: schedule.doseNumber,
      scheduledDate,
      createdBy: child.registeredBy,
    });
  }
};
