const mongoose = require('mongoose');
const { VACCINE_NAMES } = require('../config/constants');

const vaccinationRecordSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
    },
    vaccine: {
      type: String,
      enum: VACCINE_NAMES,
      required: true,
    },
    doseNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    administrationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    nextDueDate: {
      type: Date,
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vaccineBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vaccine',
    },
    notes: {
      type: String,
      trim: true,
    },
    adverseEffects: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for quick searches
vaccinationRecordSchema.index({ child: 1, vaccine: 1 });
vaccinationRecordSchema.index({ administrationDate: 1 });

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);
