const mongoose = require('mongoose');
const { VACCINE_NAMES } = require('../config/constants');

const vaccineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: VACCINE_NAMES,
      required: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      unique: true,
    },
    quantityReceived: {
      type: Number,
      required: [true, 'Quantity received is required'],
      min: 0,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      required: true,
      trim: true,
    },
    dateReceived: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    minStockLevel: {
      type: Number,
      default: 10,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Check if vaccine is expired
vaccineSchema.methods.checkExpiry = function () {
  this.isExpired = new Date() > this.expiryDate;
  return this.isExpired;
};

// Get stock status
vaccineSchema.methods.getStockStatus = function () {
  if (this.quantityAvailable === 0) return 'out_of_stock';
  if (this.quantityAvailable <= this.minStockLevel) return 'low_stock';
  return 'in_stock';
};

module.exports = mongoose.model('Vaccine', vaccineSchema);
