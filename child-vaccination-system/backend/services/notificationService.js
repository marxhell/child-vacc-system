const Notification = require('../models/Notification');
const { sendPushNotification } = require('../config/firebase');
const { NOTIFICATION_TYPES } = require('../config/constants');

// Helper: Save notification log to MongoDB
const saveNotification = async ({ childId, guardianId, guardianEmail, notificationType, subject, message, relatedAppointment, scheduledFor }) => {
  try {
    const notification = new Notification({
      child: childId,
      guardian: guardianId,
      guardianEmail,
      notificationType,
      subject,
      message,
      status: 'sent',
      sentAt: new Date(),
      relatedAppointment: relatedAppointment || undefined,
      scheduledFor: scheduledFor || undefined,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error saving notification log:', error);
    return null;
  }
};

// Helper: Save failed notification
const saveFailedNotification = async ({ childId, guardianId, guardianEmail, notificationType, subject, message, failureReason }) => {
  try {
    const notification = new Notification({
      child: childId,
      guardian: guardianId,
      guardianEmail,
      notificationType,
      subject,
      message,
      status: 'failed',
      failureReason,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error saving failed notification:', error);
    return null;
  }
};

// 1. Send Appointment Confirmation
const sendAppointmentConfirmation = async ({ child, guardian, appointment, vaccine, appointmentDate }) => {
  try {
    const guardianName = guardian?.name || 'Guardian';
    const childName = `${child.firstName} ${child.lastName}`;
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const title = '✅ Appointment Confirmed';
    const body = `${childName} - ${vaccine} on ${formattedDate}`;

    // Send via Firebase (if guardian has a device token)
    // For now, log the notification content
    console.log(`[Firebase] Appointment Confirmation for ${guardian.email}: ${title} - ${body}`);

    // Save notification log to MongoDB
    await saveNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMATION,
      subject: title,
      message: body,
      relatedAppointment: appointment._id,
      scheduledFor: new Date(appointmentDate),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending appointment confirmation:', error);
    await saveFailedNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMATION,
      subject: 'Appointment Confirmed',
      message: error.message,
      failureReason: error.message,
    });
    return { success: false, error: error.message };
  }
};

// 2. Send Vaccination Reminder
const sendVaccinationReminder = async ({ child, guardian, appointment, vaccine, appointmentDate, daysBefore }) => {
  try {
    const guardianName = guardian?.name || 'Guardian';
    const childName = `${child.firstName} ${child.lastName}`;
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const dayLabels = { 7: '7 days', 3: '3 days', 1: '1 day' };
    const dayLabel = dayLabels[daysBefore] || `${daysBefore} days`;

    const title = `⏰ Reminder in ${dayLabel}`;
    const body = `${childName} - ${vaccine} on ${formattedDate}`;

    console.log(`[Firebase] Reminder (${dayLabel}) for ${guardian.email}: ${title} - ${body}`);

    const notifType = daysBefore === 7 ? NOTIFICATION_TYPES.REMINDER_7_DAYS
                     : daysBefore === 3 ? NOTIFICATION_TYPES.REMINDER_3_DAYS
                     : NOTIFICATION_TYPES.REMINDER_1_DAY;

    await saveNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: notifType,
      subject: title,
      message: body,
      relatedAppointment: appointment._id,
      scheduledFor: new Date(appointmentDate),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending reminder:', error);
    return { success: false, error: error.message };
  }
};

// 3. Send Missed Appointment Notification
const sendMissedAppointmentNotification = async ({ child, guardian, appointment, vaccine }) => {
  try {
    const guardianName = guardian?.name || 'Guardian';
    const childName = `${child.firstName} ${child.lastName}`;

    const title = '⚠️ Missed Appointment';
    const body = `${childName} missed ${vaccine} vaccination. Please reschedule.`;

    console.log(`[Firebase] Missed Appointment for ${guardian.email}: ${title} - ${body}`);

    await saveNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: NOTIFICATION_TYPES.MISSED_APPOINTMENT,
      subject: title,
      message: body,
      relatedAppointment: appointment._id,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending missed appointment notification:', error);
    return { success: false, error: error.message };
  }
};

// 4. Send Reschedule Notification
const sendRescheduleNotification = async ({ child, guardian, appointment, vaccine, oldDate, newDate }) => {
  try {
    const guardianName = guardian?.name || 'Guardian';
    const childName = `${child.firstName} ${child.lastName}`;
    const formattedNewDate = new Date(newDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const title = '🔄 Appointment Rescheduled';
    const body = `${childName} - ${vaccine} rescheduled to ${formattedNewDate}`;

    console.log(`[Firebase] Reschedule for ${guardian.email}: ${title} - ${body}`);

    await saveNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: NOTIFICATION_TYPES.RESCHEDULED_APPOINTMENT,
      subject: title,
      message: body,
      relatedAppointment: appointment._id,
      scheduledFor: new Date(newDate),
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending reschedule notification:', error);
    return { success: false, error: error.message };
  }
};

// 5. Send Overdue Vaccination Alert
const sendOverdueVaccinationAlert = async ({ child, guardian, vaccine, scheduledDate }) => {
  try {
    const guardianName = guardian?.name || 'Guardian';
    const childName = `${child.firstName} ${child.lastName}`;
    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const title = '⚠️ Overdue Vaccination';
    const body = `${childName} overdue for ${vaccine} (was due ${formattedDate})`;

    console.log(`[Firebase] Overdue Alert for ${guardian.email}: ${title} - ${body}`);

    await saveNotification({
      childId: child._id,
      guardianId: guardian._id,
      guardianEmail: guardian.email,
      notificationType: NOTIFICATION_TYPES.OVERDUE_VACCINATION,
      subject: title,
      message: body,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending overdue vaccination alert:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAppointmentConfirmation,
  sendVaccinationReminder,
  sendMissedAppointmentNotification,
  sendRescheduleNotification,
  sendOverdueVaccinationAlert,
};