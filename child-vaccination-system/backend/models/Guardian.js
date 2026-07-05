const mongoose = require('mongoose');

const normalizeRelationship = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const relationshipMap = {
    mother: 'Mother',
    father: 'Father',
    guardian: 'Guardian',
    grandparent: 'Grandparent',
    other: 'Other',
  };

  return relationshipMap[trimmed.toLowerCase()] || trimmed;
};

const guardianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true,
    },
    relationship: {
      type: String,
      enum: ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other'],
      required: true,
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

guardianSchema.pre('validate', function (next) {
  if (this.relationship) {
    this.relationship = normalizeRelationship(this.relationship);
  }
  next();
});

const Guardian = mongoose.model('Guardian', guardianSchema);
Guardian.normalizeRelationship = normalizeRelationship;

module.exports = Guardian;
