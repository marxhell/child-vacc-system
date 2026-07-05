const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';
let token = localStorage.getItem('token');

// API Helper
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'API Error');
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Authentication
async function login(email, password) {
  const response = await apiCall('/auth/login', 'POST', { email, password });
  token = response.data.token;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(response.data.user));
  return response.data.user;
}

async function logout() {
  try {
    await apiCall('/auth/logout', 'POST');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}

// Children APIs
async function getChildren(page = 1, limit = 10) {
  return await apiCall(`/children?page=${page}&limit=${limit}`);
}

async function registerChild(data) {
  return await apiCall('/children', 'POST', data);
}

async function getChildById(childId) {
  return await apiCall(`/children/${childId}`);
}

async function updateChild(childId, data) {
  return await apiCall(`/children/${childId}`, 'PUT', data);
}

// Vaccinations APIs
async function getUpcomingVaccinations(page = 1, limit = 10) {
  return await apiCall(`/vaccinations/upcoming?page=${page}&limit=${limit}`);
}

async function getOverdueVaccinations(page = 1, limit = 10) {
  return await apiCall(`/vaccinations/overdue?page=${page}&limit=${limit}`);
}

async function recordVaccination(data) {
  return await apiCall('/vaccinations/record', 'POST', data);
}

async function getVaccinationHistory(childId, page = 1, limit = 10) {
  return await apiCall(`/vaccinations/history/${childId}?page=${page}&limit=${limit}`);
}

// Appointments APIs
async function getAppointments(page = 1, limit = 10) {
  return await apiCall(`/appointments?page=${page}&limit=${limit}`);
}

async function getTodayAppointments() {
  return await apiCall('/appointments/today/schedule');
}

async function createAppointment(data) {
  return await apiCall('/appointments', 'POST', data);
}

async function updateAppointment(appointmentId, data) {
  return await apiCall(`/appointments/${appointmentId}`, 'PUT', data);
}

// Inventory APIs
async function getInventory(page = 1, limit = 10) {
  return await apiCall(`/inventory?page=${page}&limit=${limit}`);
}

async function addVaccine(data) {
  return await apiCall('/inventory', 'POST', data);
}

async function getInventorySummary() {
  return await apiCall('/inventory/summary');
}

async function getLowStockAlerts() {
  return await apiCall('/inventory/alerts/low-stock');
}

// Dashboard APIs
async function getAdminDashboard() {
  return await apiCall('/dashboard/admin');
}

async function getNurseDashboard() {
  return await apiCall('/dashboard/nurse');
}

async function getPharmacistDashboard() {
  return await apiCall('/dashboard/pharmacist');
}

async function getRecordsOfficerDashboard() {
  return await apiCall('/dashboard/records-officer');
}

// Reports APIs
async function getMonthlyImmunizationReport() {
  return await apiCall('/reports/monthly-immunization');
}

async function getVaccinationCoverageReport() {
  return await apiCall('/reports/vaccination-coverage');
}

async function getOverdueVaccinationsReport() {
  return await apiCall('/reports/overdue-vaccinations');
}

// Notifications APIs
async function sendAppointmentReminders() {
  return await apiCall('/notifications/send-appointment-reminders', 'POST', { daysInAdvance: 1 });
}
