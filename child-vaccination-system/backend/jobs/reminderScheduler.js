const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Child = require('../models/Child');
const Guardian = require('../models/Guardian');
const VaccinationSchedule = require('../models/VaccinationSchedule');
const { APPOINTMENT_STATUS } = require('../config/constants');
const {
  sendVaccinationReminder,
  sendMissedAppointmentNotification,
  sendOverdueVaccinationAlert,
} = require('../services/notificationService');

// Run daily at 8:00 AM
const startReminderScheduler = () => {
  console.log('Reminder scheduler initialized');

  // Every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily reminder checks...');
    
    try {
      await checkAndSendAppointmentReminders();
      await checkAndMarkMissedAppointments();
      await checkAndSendOverdueVaccinationAlerts();
    } catch (error) {
      console.error('[Scheduler] Error in reminder cycle:', error);
    }
  });

  // Also run every hour for missed appointment detection
  cron.schedule('0 * * * *', async () => {
    try {
      await checkAndMarkMissedAppointments();
    } catch (error) {
      console.error('[Scheduler] Error in missed appointment check:', error);
    }
  });
};

// Check appointments and send reminders at 7, 3, and 1 days before
const checkAndSendAppointmentReminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminderDays = [7, 3, 1];

  for (const daysBefore of reminderDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysBefore);

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
      status: APPOINTMENT_STATUS.SCHEDULED,
    }).populate('child guardian');

    for (const appointment of appointments) {
      try {
        if (appointment.guardian && appointment.guardian.email) {
          await sendVaccinationReminder({
            child: appointment.child,
            guardian: appointment.guardian,
            appointment,
            vaccine: appointment.vaccine,
            appointmentDate: appointment.appointmentDate,
            daysBefore,
          });
          console.log(`[Scheduler] Sent ${daysBefore}-day reminder for ${appointment.child?.firstName} ${appointment.child?.lastName}`);
        }
      } catch (error) {
        console.error(`[Scheduler] Error sending ${daysBefore}-day reminder:`, error.message);
      }
    }
  }
};

// Check for missed appointments (past their date with scheduled status)
const checkAndMarkMissedAppointments = async () => {
  const now = new Date();
  
  // Find appointments that were yesterday and still scheduled
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const missedAppointments = await Appointment.find({
    appointmentDate: { $lte: endOfYesterday },
    status: APPOINTMENT_STATUS.SCHEDULED,
  }).populate('child guardian');

  for (const appointment of missedAppointments) {
    try {
      // Mark as missed
      appointment.status = APPOINTMENT_STATUS.MISSED;
      await appointment.save();

      // Send notification if guardian exists
      if (appointment.guardian && appointment.guardian.email) {
        await sendMissedAppointmentNotification({
          child: appointment.child,
          guardian: appointment.guardian,
          appointment,
          vaccine: appointment.vaccine,
        });
        console.log(`[Scheduler] Sent missed appointment notification for ${appointment.child?.firstName} ${appointment.child?.lastName}`);
      }
    } catch (error) {
      console.error('[Scheduler] Error processing missed appointment:', error.message);
    }
  }
};

// Check and send overdue vaccination alerts
const checkAndSendOverdueVaccinationAlerts = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find schedules that are overdue (past due date, still pending)
  const overdueSchedules = await VaccinationSchedule.find({
    scheduledDate: { $lt: today },
    status: 'pending',
    isOverdue: true,
  }).populate('child');

  for (const schedule of overdueSchedules) {
    try {
      // Get the child's guardian
      const child = schedule.child;
      if (!child) continue;

      const childWithGuardians = await Child.findById(child._id).populate('guardians');
      if (!childWithGuardians || !childWithGuardians.guardians || childWithGuardians.guardians.length === 0) continue;

      const guardian = childWithGuardians.guardians[0];

      if (guardian && guardian.email) {
        await sendOverdueVaccinationAlert({
          child: childWithGuardians,
          guardian,
          vaccine: schedule.vaccine,
          scheduledDate: schedule.scheduledDate,
        });
        console.log(`[Scheduler] Sent overdue alert for ${child.firstName} ${child.lastName} - ${schedule.vaccine}`);
      }
    } catch (error) {
      console.error('[Scheduler] Error sending overdue alert:', error.message);
    }
  }
};

module.exports = {
  startReminderScheduler,
};