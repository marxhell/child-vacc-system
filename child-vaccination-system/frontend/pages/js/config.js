// ==============================================
// ENVIRONMENT CONFIGURATION
// ==============================================
// This file centralizes environment configuration for the frontend
// to support both development and production deployments

// Determine if we're in production
const isProduction = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1';

// Set API base URL based on environment
let API_BASE_URL = 'http://localhost:5000/api'; // Default to local development

// Production URL - set based on deployment
if (isProduction) {
  // For production deployments, use Render backend
  API_BASE_URL = 'https://child-vacc-system.onrender.com/api';
}

// Development override via global window variable (can be set in HTML or via external config)
if (window.API_BASE_URL) {
  API_BASE_URL = window.API_BASE_URL;
}

console.log(`[Config] API Base URL: ${API_BASE_URL}`);
console.log(`[Config] Environment: ${isProduction ? 'production' : 'development'}`);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL, isProduction };
}
