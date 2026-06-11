// User Roles
const ROLES = {
  ADMINISTRATOR: 'administrator',
  NURSE: 'nurse',
  RECORDS_OFFICER: 'records_officer',
  PHARMACIST: 'pharmacist',
};

// Appointment Statuses
const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  MISSED: 'missed',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
};

// Notification Statuses
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

// Vaccine Names
const VACCINE_NAMES = [
  'BCG',
  'OPV',
  'Pentavalent',
  'PCV',
  'Rotavirus',
  'Measles-Rubella',
  'Yellow Fever',
  'Hepatitis B',
  'DPT',
  'Typhoid',
];

// Reminder Types
const REMINDER_TYPES = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  VACCINATION_DUE: 'vaccination_due',
  MISSED_VACCINATION: 'missed_vaccination',
  EXPIRING_VACCINE: 'expiring_vaccine',
};

// Gender Options
const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

// Notification Types
const NOTIFICATION_TYPES = {
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  REMINDER_7_DAYS: 'reminder_7_days',
  REMINDER_3_DAYS: 'reminder_3_days',
  REMINDER_1_DAY: 'reminder_1_day',
  MISSED_APPOINTMENT: 'missed_appointment',
  RESCHEDULED_APPOINTMENT: 'rescheduled_appointment',
  OVERDUE_VACCINATION: 'overdue_vaccination',
};

module.exports = {
  ROLES,
  APPOINTMENT_STATUS,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPES,
  VACCINE_NAMES,
  REMINDER_TYPES,
  GENDER,
};
