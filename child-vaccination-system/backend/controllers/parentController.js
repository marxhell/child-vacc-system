const Guardian = require('../models/Guardian');
const Child = require('../models/Child');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const VaccinationRecord = require('../models/vaccinationrecord');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Get parent dashboard data
// @route   GET /api/parent/dashboard
// @access  Private/Parent
exports.getParentDashboard = async (req, res, next) => {
  try {
    const guardianId = req.guardian._id;

    // Get associated children
    const children = await Child.find({ guardians: guardianId, isActive: true });
    const childrenCount = children.length;

    // Get upcoming vaccinations for all children (next 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingVaccinations = await VaccinationSchedule.find({
      child: { $in: children.map(c => c._id) },
      scheduledDate: { $gte: today, $lte: thirtyDaysFromNow },
      status: { $in: ['pending', 'overdue'] },
    })
      .populate('child', 'firstName lastName dateOfBirth patientId')
      .sort({ scheduledDate: 1 });

    // Get overdue vaccinations
    const overdueVaccinations = await VaccinationSchedule.find({
      child: { $in: children.map(c => c._id) },
      status: 'overdue',
      isOverdue: true,
    })
      .populate('child', 'firstName lastName dateOfBirth patientId')
      .sort({ scheduledDate: 1 });

    // Get completed vaccination counts
    const completedVaccinations = await VaccinationRecord.countDocuments({
      child: { $in: children.map(c => c._id) },
    });

    // Get recent vaccination history
    const recentVaccinations = await VaccinationRecord.find({
      child: { $in: children.map(c => c._id) },
    })
      .populate('child', 'firstName lastName patientId')
      .sort({ administrationDate: -1 })
      .limit(10);

    sendSuccess(
      res,
      {
        guardian: {
          name: req.guardian.name,
          email: req.guardian.email,
          phoneNumber: req.guardian.phoneNumber,
        },
        children,
        childrenCount,
        upcomingVaccinations,
        overdueVaccinations,
        completedVaccinations,
        recentVaccinations,
      },
      'Parent dashboard retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get child vaccination schedule for parent
// @route   GET /api/parent/children/:childId/schedule
// @access  Private/Parent
exports.getChildSchedule = async (req, res, next) => {
  try {
    const guardianId = req.guardian._id;
    const childId = req.params.childId;

    // Verify child belongs to this guardian
    const child = await Child.findOne({ _id: childId, guardians: guardianId });
    if (!child) {
      return sendError(res, 'Child not found or not associated with you', 404);
    }

    const schedule = await VaccinationSchedule.find({ child: childId })
      .sort({ scheduledDate: 1 });

    const records = await VaccinationRecord.find({ child: childId })
      .sort({ administrationDate: -1 });

    sendSuccess(
      res,
      {
        child,
        schedule,
        records,
      },
      'Child schedule retrieved',
      200
    );
  } catch (error) {
    sendError(res, error.message, 500, error);
  }
};

// @desc    Get disease information
// @route   GET /api/parent/diseases
// @access  Public
exports.getDiseaseInfo = async (req, res, next) => {
  const diseaseInfo = [
    {
      id: 1,
      name: 'Measles',
      vaccine: 'Measles-Rubella (MR)',
      symptoms: 'High fever, cough, runny nose, red eyes, rash',
      cause: 'Measles virus (paramyxovirus)',
      prevention: 'Vaccination at 9 months',
      riskFactors: 'Unvaccinated children, malnutrition, weakened immune system',
      icon: '🤒',
    },
    {
      id: 2,
      name: 'Tuberculosis (TB)',
      vaccine: 'BCG',
      symptoms: 'Persistent cough, weight loss, night sweats, fever',
      cause: 'Mycobacterium tuberculosis bacteria',
      prevention: 'BCG vaccine at birth',
      riskFactors: 'Close contact with infected person, poor ventilation, weak immunity',
      icon: '🫁',
    },
    {
      id: 3,
      name: 'Polio',
      vaccine: 'OPV (Oral Polio Vaccine)',
      symptoms: 'Fever, fatigue, headache, vomiting, stiff neck, limb paralysis',
      cause: 'Poliovirus (enterovirus)',
      prevention: 'Multiple doses of OPV at birth, 2 months, 3 months',
      riskFactors: 'Unvaccinated children, poor sanitation, contaminated water',
      icon: '🦠',
    },
    {
      id: 4,
      name: 'Diphtheria, Pertussis, Tetanus',
      vaccine: 'Pentavalent / DPT',
      symptoms: 'Severe sore throat, breathing difficulty (Diphtheria), severe cough (Pertussis), muscle stiffness (Tetanus)',
      cause: 'Corynebacterium diphtheriae, Bordetella pertussis, Clostridium tetani bacteria',
      prevention: 'Pentavalent vaccine at 1, 2, and 3 months; DPT boosters',
      riskFactors: 'Unvaccinated children, crowded living conditions, poor hygiene',
      icon: '💉',
    },
    {
      id: 5,
      name: 'Pneumonia',
      vaccine: 'PCV (Pneumococcal)',
      symptoms: 'High fever, cough with phlegm, difficulty breathing, chest pain',
      cause: 'Streptococcus pneumoniae bacteria',
      prevention: 'PCV vaccine at 1, 2, and 3 months',
      riskFactors: 'Malnutrition, indoor air pollution, low birth weight, no breastfeeding',
      icon: '🫁',
    },
    {
      id: 6,
      name: 'Rotavirus Diarrhea',
      vaccine: 'Rotavirus Vaccine',
      symptoms: 'Severe watery diarrhea, vomiting, fever, dehydration',
      cause: 'Rotavirus',
      prevention: 'Rotavirus vaccine at 1 and 2 months',
      riskFactors: 'Poor hygiene, contaminated food/water, unvaccinated infants',
      icon: '🤢',
    },
    {
      id: 7,
      name: 'Hepatitis B',
      vaccine: 'Hepatitis B Vaccine',
      symptoms: 'Jaundice (yellow skin/eyes), fatigue, abdominal pain, dark urine',
      cause: 'Hepatitis B virus (HBV)',
      prevention: 'Hepatitis B vaccine at birth',
      riskFactors: 'Infected mother, contaminated needles, unprotected contact',
      icon: '🩺',
    },
    {
      id: 8,
      name: 'Yellow Fever',
      vaccine: 'Yellow Fever Vaccine',
      symptoms: 'Fever, chills, severe headache, back pain, nausea, jaundice',
      cause: 'Yellow fever virus (flavivirus)',
      prevention: 'Yellow fever vaccine at 9 months',
      riskFactors: 'Mosquito bites, tropical regions, unvaccinated individuals',
      icon: '🦟',
    },
  ];

  sendSuccess(res, diseaseInfo, 'Disease information retrieved', 200);
};