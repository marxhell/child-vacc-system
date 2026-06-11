const mongoose = require('mongoose');
const { NOTIFICATION_STATUS, NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
    },
    guardian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guardian',
    },
    guardianEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    notificationType: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'read'],
      default: 'pending',
    },
    sentAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    relatedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    scheduledFor: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ status: 1, sentAt: 1 });
notificationSchema.index({ guardianEmail: 1 });
notificationSchema.index({ notificationType: 1 });
notificationSchema.index({ child: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);