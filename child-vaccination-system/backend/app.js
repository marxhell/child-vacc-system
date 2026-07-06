const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const childRoutes = require('./routes/childRoutes');
const guardianRoutes = require('./routes/guardianRoutes');
const vaccinationRoutes = require('./routes/vaccinationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const parentRoutes = require('./routes/parentRoutes');

const app = express();

// Connect to database
connectDB();

// Middleware
// Configure CORS to accept local dev origins and Netlify deploy previews
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (e.g., curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'https://child-immunization.netlify.app',
      // add any other explicit origins here
    ];

    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // allow any Netlify subdomain like https://your-site.netlify.app
    try {
      const hostname = new URL(origin).hostname;
      if (/\.netlify\.app$/.test(hostname)) return callback(null, true);
    } catch (err) {
      // fallthrough to rejection
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware
// Configure CORS to accept local dev origins and Netlify deploy previews
const corsOptions = {
  origin: (origin, callback) => {
    // log incoming origin for debugging on the server
    console.log('CORS origin:', origin);

    // allow requests with no origin (e.g., curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'https://child-immunization.netlify.app',
      // add any other explicit origins here
    ];

    if (allowed.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // allow any Netlify subdomain like https://your-site.netlify.app
    try {
      const hostname = new URL(origin).hostname;
      if (/\.netlify\.app$/.test(hostname)) return callback(null, true);
    } catch (err) {
      // fallthrough to rejection
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Ensure OPTIONS preflight requests are handled with the same CORS options
app.options('*', cors(corsOptions));
app.use(errorHandler);

module.exports = app;
