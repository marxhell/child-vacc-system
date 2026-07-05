const mongoose = require('mongoose');

const guardianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      enum: ['mother', 'father', 'guardian', 'grandparent', 'other'],
      required: true,
      lowercase: true,
    },
    nationalId: {
      type: String,
      sparse: true,
      default: '',
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Guardian email is required for appointment reminders'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    physicalAddress: {
      type: String,
      trim: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Guardian', guardianSchema);
