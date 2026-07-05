// ===== API CONFIGURATION =====
const API_BASE_URL = 'http://localhost:5000/api';

// ===== UTILITY FUNCTIONS =====

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// ===== IMPROVED API CALL WITH ERROR HANDLING =====
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Handle 401 - Token expired
    if (response.status === 401) {
      removeAuth();
      window.location.href = 'login.html';
      throw new Error('Session expired. Please login again.');
    }

    let result;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = text ? { message: text } : {};
    }

    if (!response.ok) {
      const errorMsg = result.message || result.error || `Error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return result;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ===== AUTHENTICATION APIS =====

async function login(email, password) {
  const response = await apiCall('/auth/login', 'POST', { email, password });
  setToken(response.data.token);
  localStorage.setItem('user', JSON.stringify(response.data.user));
  return response.data.user;
}

async function logout() {
  try {
    await apiCall('/auth/logout', 'POST');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeAuth();
    window.location.href = 'login.html';
  }
}

async function getCurrentUserData() {
  return await apiCall('/auth/me');
}

// ===== CHILDREN APIS =====

async function getChildren(page = 1, limit = 10, search = '') {
  const url = `/children?page=${page}&limit=${limit}${search ? `&search=${search}` : ''}`;
  return await apiCall(url);
}

async function getChildById(childId) {
  return await apiCall(`/children/${childId}`);
}

async function registerChild(data) {
  return await apiCall('/children', 'POST', data);
}

async function updateChild(childId, data) {
  return await apiCall(`/children/${childId}`, 'PUT', data);
}

async function deleteChild(childId) {
  return await apiCall(`/children/${childId}`, 'DELETE');
}

// ===== GUARDIANS APIS =====

async function getGuardians(page = 1, limit = 10) {
  return await apiCall(`/guardians?page=${page}&limit=${limit}`);
}

async function getGuardianById(guardianId) {
  return await apiCall(`/guardians/${guardianId}`);
}

async function createGuardian(data) {
  return await apiCall('/guardians', 'POST', data);
}

async function updateGuardian(guardianId, data) {
  return await apiCall(`/guardians/${guardianId}`, 'PUT', data);
}

async function linkGuardianToChild(guardianId, childId) {
  return await apiCall(`/guardians/${guardianId}/children/${childId}`, 'POST');
}

// ===== VACCINATIONS APIS =====

async function getVaccinationSchedule(childId) {
  return await apiCall(`/vaccinations/schedule/${childId}`);
}

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

// ===== APPOINTMENTS APIS =====

async function getAppointments(page = 1, limit = 10) {
  return await apiCall(`/appointments?page=${page}&limit=${limit}`);
}

async function getAppointmentById(appointmentId) {
  return await apiCall(`/appointments/${appointmentId}`);
}

async function getTodayAppointments() {
  return await apiCall('/appointments/today/schedule');
}

async function getMissedAppointments(page = 1, limit = 10) {
  return await apiCall(`/appointments/missed?page=${page}&limit=${limit}`);
}

async function createAppointment(data) {
  return await apiCall('/appointments', 'POST', data);
}

async function updateAppointment(appointmentId, data) {
  return await apiCall(`/appointments/${appointmentId}`, 'PUT', data);
}

async function deleteAppointment(appointmentId) {
  return await apiCall(`/appointments/${appointmentId}`, 'DELETE');
}

// ===== INVENTORY APIS =====

async function getInventory(page = 1, limit = 10, vaccine = '') {
  const url = `/inventory?page=${page}&limit=${limit}${vaccine ? `&vaccine=${vaccine}` : ''}`;
  return await apiCall(url);
}

async function getInventorySummary() {
  return await apiCall('/inventory/summary');
}

async function getInventoryById(inventoryId) {
  return await apiCall(`/inventory/${inventoryId}`);
}

async function addVaccine(data) {
  return await apiCall('/inventory', 'POST', data);
}

async function updateVaccineStock(inventoryId, data) {
  return await apiCall(`/inventory/${inventoryId}/stock`, 'PUT', data);
}

async function getLowStockAlerts() {
  return await apiCall('/inventory/alerts/low-stock');
}

async function getExpiringVaccines() {
  return await apiCall('/inventory/alerts/expiring');
}

// ===== DASHBOARD APIS =====

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

// ===== REPORTS APIS =====

async function getMonthlyImmunizationReport(startDate = '', endDate = '') {
  const url = `/reports/monthly-immunization${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`;
  return await apiCall(url);
}

async function getDailyVaccinationsReport(date = '') {
  const url = `/reports/daily-vaccinations${date ? `?date=${date}` : ''}`;
  return await apiCall(url);
}

async function getVaccinationCoverageReport() {
  return await apiCall('/reports/vaccination-coverage');
}

async function getOverdueVaccinationsReport(page = 1, limit = 10) {
  return await apiCall(`/reports/overdue-vaccinations?page=${page}&limit=${limit}`);
}

async function getVaccineStockReport() {
  return await apiCall('/reports/vaccine-stock');
}

async function getVaccineUsageReport(startDate = '', endDate = '') {
  const url = `/reports/vaccine-usage${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`;
  return await apiCall(url);
}

async function getExpiredVaccinesReport() {
  return await apiCall('/reports/expired-vaccines');
}

async function getAppointmentsReport(page = 1, limit = 10) {
  return await apiCall(`/reports/appointments?page=${page}&limit=${limit}`);
}

// ===== NOTIFICATIONS APIS =====

async function getNotifications(page = 1, limit = 10) {
  return await apiCall(`/notifications?page=${page}&limit=${limit}`);
}

async function getNotificationStats() {
  return await apiCall('/notifications/stats');
}

async function sendAppointmentReminders() {
  return await apiCall('/notifications/send-bulk-reminders', 'POST');
}

async function sendBulkReminderEmails() {
  return await apiCall('/notifications/send-bulk-reminders', 'POST');
}

async function sendMissedVaccinationNotifications() {
  return await apiCall('/notifications/send-bulk-reminders', 'POST');
}

async function markNotificationAsRead(notificationId) {
  return await apiCall(`/notifications/${notificationId}/read`, 'PUT');
}

// ===== USERS APIS (Admin Only) =====

async function getUsers(page = 1, limit = 10) {
  return await apiCall(`/users?page=${page}&limit=${limit}`);
}

async function getUserById(userId) {
  return await apiCall(`/users/${userId}`);
}

async function createUser(data) {
  return await apiCall('/users', 'POST', data);
}

async function updateUser(userId, data) {
  return await apiCall(`/users/${userId}`, 'PUT', data);
}

async function deleteUser(userId) {
  return await apiCall(`/users/${userId}`, 'DELETE');
}

async function resetUserPassword(userId, newPassword) {
  return await apiCall(`/users/${userId}/reset-password`, 'PUT', { newPassword });
}

// ===== HELPER FUNCTIONS =====

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
}

function getAgeInMonths(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
  months += today.getMonth() - birthDate.getMonth();
  return Math.floor(months);
}

function getAgeInYears(dateOfBirth) {
  return Math.floor(getAgeInMonths(dateOfBirth) / 12);
}

function showLoadingSpinner(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
  }
}

function showErrorMessage(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
  }
}

function showSuccessMessage(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('.container-fluid') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

function showErrorAlert(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('.container-fluid') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// ===== VALIDATION HELPERS =====

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhoneNumber(phone) {
  const re = /^[0-9]{10,}$/;
  return re.test(phone.replace(/\D/g, ''));
}

function validateDateOfBirth(date) {
  const birthDate = new Date(date);
  const today = new Date();
  return birthDate < today;
}