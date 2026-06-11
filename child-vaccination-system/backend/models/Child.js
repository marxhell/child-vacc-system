const mongoose = require('mongoose');
const { GENDER } = require('../config/constants');

const childSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: Object.values(GENDER),
      required: true,
    },
    birthCertificateNumber: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'],
      default: 'Unknown',
    },
    residence: {
      type: String,
      trim: true,
    },
    guardians: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guardian',
      },
    ],
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate patient ID
childSchema.pre('save', async function (next) {
  if (this.isNew && !this.patientId) {
    const count = await mongoose.model('Child').countDocuments();
    this.patientId = `CHD-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Get age in months
childSchema.methods.getAgeInMonths = function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getMonth() - birthDate.getMonth();
  if (age < 0) age += 12;
  if (today.getDate() < birthDate.getDate()) age--;
  const years = today.getFullYear() - birthDate.getFullYear();
  return years * 12 + age;
};

// Get age in years
childSchema.methods.getAgeInYears = function () {
  const today = new Date();
  let age = today.getFullYear() - this.dateOfBirth.getFullYear();
  const month = today.getMonth() - this.dateOfBirth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < this.dateOfBirth.getDate())) {
    age--;
  }
  return age;
};

module.exports = mongoose.model('Child', childSchema);
