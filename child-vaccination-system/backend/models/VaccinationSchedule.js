const mongoose = require('mongoose');
const { VACCINE_NAMES } = require('../config/constants');

const vaccinationScheduleSchema = new mongoose.Schema(
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
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue', 'skipped'],
      default: 'pending',
    },
    isOverdue: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Update overdue status
vaccinationScheduleSchema.methods.updateOverdueStatus = function () {
  if (this.status === 'pending' && new Date() > this.scheduledDate) {
    this.isOverdue = true;
    this.status = 'overdue';
  }
  return this;
};

module.exports = mongoose.model('VaccinationSchedule', vaccinationScheduleSchema);
