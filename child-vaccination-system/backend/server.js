const app = require('./app');
const { initializeFirebase } = require('./config/firebase');
const { startReminderScheduler } = require('./jobs/reminderScheduler');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize Firebase notification service
  initializeFirebase();
  
  // Start automated reminder scheduler
  startReminderScheduler();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
