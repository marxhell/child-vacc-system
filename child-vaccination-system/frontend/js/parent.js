// ===== PARENT PORTAL CONFIGURATION =====
const API_BASE_URL = 'http://localhost:5000/api';
const PARENT_API = `${API_BASE_URL}/parent`;

// ===== AUTHENTICATION HELPERS =====

function getParentToken() {
  return localStorage.getItem('parentToken');
}

function getParentUser() {
  const user = localStorage.getItem('parentUser');
  return user ? JSON.parse(user) : null;
}

function removeParentAuth() {
  localStorage.removeItem('parentToken');
  localStorage.removeItem('parentUser');
}

// ===== PARENT API CALL =====

async function parentApiCall(endpoint, method = 'GET', data = null) {
  const token = getParentToken();
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${PARENT_API}${endpoint}`, options);

    if (response.status === 401) {
      removeParentAuth();
      window.location.href = 'parent-login.html';
      throw new Error('Session expired. Please login again.');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `Error: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`Parent API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ===== PAGE INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  const token = getParentToken();
  const guardian = getParentUser();

  if (!token || !guardian) {
    window.location.href = 'parent-login.html';
    return;
  }

  // Display parent name
  const nameDisplay = document.getElementById('parentNameDisplay');
  if (nameDisplay) nameDisplay.textContent = ` ${guardian.name}`;

  // Welcome message
  const welcomeMsg = document.getElementById('welcomeMessage');
  if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${guardian.name}! `;

  const subtext = document.getElementById('welcomeSubtext');
  if (subtext) subtext.textContent = `Monitor your child's vaccination journey at Kenyenya District Hospital`;

  // Load all data
  await loadParentDashboard();
  await loadDiseaseInfo();
});

// ===== SIDEBAR TOGGLE =====

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ===== SECTION SWITCHING =====

function switchSection(section, btnElement) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  
  // Show selected section
  const sectionEl = document.getElementById(`section-${section}`);
  if (sectionEl) sectionEl.classList.add('active');

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');

  // Update sidebar links
  document.querySelectorAll('#sidebarMenu .nav-link').forEach(l => l.classList.remove('active'));
}

// ===== LOGOUT =====

async function handleParentLogout() {
  if (confirm('Are you sure you want to logout?')) {
    removeParentAuth();
    window.location.href = 'parent-login.html';
  }
}

// ===== LOAD PARENT DASHBOARD =====

async function loadParentDashboard() {
  try {
    const response = await parentApiCall('/dashboard');
    const data = response.data;

    // Display stats
    displayParentStats(data);

    // Display children list
    displayChildrenList(data.children || []);

    // Display upcoming vaccinations
    displayUpcomingVaccinations(data.upcomingVaccinations || []);

    // Display overdue vaccinations
    displayOverdueVaccinations(data.overdueVaccinations || []);

    // Display full schedule and completed
    displayFullSchedule(data);
  } catch (error) {
    console.error('Error loading parent dashboard:', error);
    document.getElementById('parentStats').innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">Error loading dashboard: ${error.message}</div>
      </div>
    `;
  }
}

// ===== DISPLAY PARENT STATS =====

function displayParentStats(data) {
  const statsHtml = `
    <div class="col-md-3 col-6">
      <div class="stat-card">
        <div class="stat-number">${data.childrenCount || 0}</div>
        <div class="stat-label"> My Children</div>
      </div>
    </div>
    <div class="col-md-3 col-6">
      <div class="stat-card info">
        <div class="stat-number">${data.upcomingVaccinations ? data.upcomingVaccinations.length : 0}</div>
        <div class="stat-label"> Upcoming Vaccinations</div>
      </div>
    </div>
    <div class="col-md-3 col-6">
      <div class="stat-card ${(data.overdueVaccinations && data.overdueVaccinations.length > 0) ? 'warning' : 'info'}">
        <div class="stat-number">${data.overdueVaccinations ? data.overdueVaccinations.length : 0}</div>
        <div class="stat-label">️ Overdue</div>
      </div>
    </div>
    <div class="col-md-3 col-6">
      <div class="stat-card outline">
        <div class="stat-number">${data.completedVaccinations || 0}</div>
        <div class="stat-label"> Completed</div>
      </div>
    </div>
  `;

  document.getElementById('parentStats').innerHTML = statsHtml;
}

// ===== DISPLAY CHILDREN LIST =====

function displayChildrenList(children) {
  const container = document.getElementById('childrenList');
  
  if (!children || children.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">No children registered under your care yet. Please contact the hospital to register your child.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = children.map(child => {
    const ageMonths = Math.floor((new Date() - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30.44));
    const ageDisplay = ageMonths < 12 ? `${ageMonths} months` : `${Math.floor(ageMonths / 12)} years ${ageMonths % 12} months`;
    const initials = `${child.firstName[0]}${child.lastName[0]}`;

    return `
      <div class="col-md-6 mb-3">
        <div class="child-card card">
          <div class="card-body d-flex align-items-center">
            <div class="child-avatar me-3">${initials}</div>
            <div class="flex-grow-1">
              <h5 class="mb-1">${child.firstName} ${child.lastName}</h5>
              <p class="mb-1 small text-muted">
                🆔 ${child.patientId} |  ${ageDisplay} | ${child.gender}
              </p>
              <button class="btn btn-sm btn-parent mt-1" onclick="showChildDetail('${child._id}', '${child.firstName} ${child.lastName}')">
                View Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== DISPLAY UPCOMING VACCINATIONS =====

function displayUpcomingVaccinations(vaccinations) {
  const container = document.getElementById('upcomingVaccinationsList');

  if (!vaccinations || vaccinations.length === 0) {
    container.innerHTML = '<div class="alert alert-success"> No upcoming vaccinations due in the next 30 days.</div>';
    return;
  }

  container.innerHTML = vaccinations.map(v => {
    const childName = v.child ? `${v.child.firstName} ${v.child.lastName}` : 'Unknown';
    const date = new Date(v.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const isOverdue = v.status === 'overdue';
    const statusClass = isOverdue ? 'overdue' : '';

    return `
      <div class="schedule-item ${statusClass}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong> ${v.vaccine}</strong> - Dose ${v.doseNumber}
            <br><small class="text-muted"> ${childName}</small>
          </div>
          <div class="text-end">
            <div class="small">${date}</div>
            ${isOverdue ? '<span class="badge bg-danger mt-1">Overdue</span>' : '<span class="badge bg-warning mt-1">Upcoming</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== DISPLAY OVERDUE VACCINATIONS =====

function displayOverdueVaccinations(vaccinations) {
  const container = document.getElementById('overdueVaccinationsList');

  if (!vaccinations || vaccinations.length === 0) {
    container.innerHTML = '<div class="alert alert-success"> No overdue vaccinations. Your children are up to date!</div>';
    return;
  }

  container.innerHTML = vaccinations.map(v => {
    const childName = v.child ? `${v.child.firstName} ${v.child.lastName}` : 'Unknown';
    const date = new Date(v.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    return `
      <div class="schedule-item overdue">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>️ ${v.vaccine}</strong> - Dose ${v.doseNumber}
            <br><small class="text-muted"> ${childName}</small>
          </div>
          <div class="text-end">
            <div class="small">Was due: ${date}</div>
            <span class="badge bg-danger mt-1"> Overdue</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== DISPLAY FULL SCHEDULE =====

function displayFullSchedule(data) {
  // Build a combined schedule from all children
  const allSchedules = [];
  const allCompleted = data.recentVaccinations || [];

  // Collect schedule items from children
  const children = data.children || [];
  
  // For each child, we need to load their schedule
  // We'll use the data from upcoming/overdue and display them
  const pendingItems = [...(data.upcomingVaccinations || []), ...(data.overdueVaccinations || [])];
  
  // Display pending schedule
  const scheduleContainer = document.getElementById('fullScheduleList');
  if (pendingItems.length === 0) {
    scheduleContainer.innerHTML = '<p class="text-muted mb-0">No pending vaccinations scheduled.</p>';
  } else {
    scheduleContainer.innerHTML = pendingItems.map(v => {
      const childName = v.child ? `${v.child.firstName} ${v.child.lastName}` : 'Unknown';
      const date = new Date(v.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      const isOverdue = v.status === 'overdue';

      return `
        <div class="schedule-item ${isOverdue ? 'overdue' : ''}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong> ${v.vaccine}</strong> - Dose ${v.doseNumber}
              <br><small class="text-muted"> ${childName}</small>
            </div>
            <div class="text-end">
              <div class="small">${date}</div>
              <span class="badge bg-${isOverdue ? 'danger' : 'warning'}">${isOverdue ? 'Overdue' : 'Pending'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Display completed vaccinations
  const completedContainer = document.getElementById('completedVaccinationsList');
  if (allCompleted.length === 0) {
    completedContainer.innerHTML = '<p class="text-muted mb-0">No vaccinations completed yet.</p>';
  } else {
    completedContainer.innerHTML = allCompleted.map(v => {
      const childName = v.child ? `${v.child.firstName} ${v.child.lastName}` : 'Unknown';
      const date = new Date(v.administrationDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

      return `
        <div class="schedule-item completed">
          <div class="d-flex justify-content-between align-items-center">
            <div>
               <strong>${v.vaccine}</strong>
              <br><small class="text-muted"> ${childName}</small>
            </div>
            <div class="text-end">
              <div class="small">${date}</div>
              <span class="badge bg-success">Completed</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ===== SHOW CHILD DETAIL MODAL =====

async function showChildDetail(childId, childName) {
  try {
    const modal = new bootstrap.Modal(document.getElementById('childDetailModal'));
    document.getElementById('childDetailTitle').textContent = ` ${childName} - Vaccination Schedule`;
    document.getElementById('childDetailContent').innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    modal.show();

    const response = await parentApiCall(`/children/${childId}/schedule`);
    const data = response.data;

    let html = `
      <div class="row mb-3">
        <div class="col-md-6">
          <p><strong>Patient ID:</strong> ${data.child.patientId}</p>
          <p><strong>Name:</strong> ${data.child.firstName} ${data.child.lastName}</p>
          <p><strong>DOB:</strong> ${new Date(data.child.dateOfBirth).toLocaleDateString()}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Gender:</strong> ${data.child.gender}</p>
          <p><strong>Blood Group:</strong> ${data.child.bloodGroup || 'N/A'}</p>
        </div>
      </div>
      <hr>
    `;

    if (data.schedule && data.schedule.length > 0) {
      html += `
        <h6 class="mb-3"> Vaccination Schedule</h6>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light">
              <tr>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Scheduled Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.schedule.map(s => {
                const status = s.status === 'completed' ? 'success' : s.status === 'overdue' ? 'danger' : 'warning';
                const statusLabel = s.status === 'completed' ? ' Completed' : s.status === 'overdue' ? ' Overdue' : '⏳ Pending';
                return `
                  <tr>
                    <td> ${s.vaccine}</td>
                    <td>Dose ${s.doseNumber}</td>
                    <td>${new Date(s.scheduledDate).toLocaleDateString()}</td>
                    <td><span class="badge bg-${status}">${statusLabel}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      html += '<p class="text-muted">No vaccination schedule found.</p>';
    }

    if (data.records && data.records.length > 0) {
      html += `
        <hr>
        <h6 class="mb-3"> Vaccination Records</h6>
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead class="table-light">
              <tr>
                <th>Vaccine</th>
                <th>Date Administered</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${data.records.map(r => `
                <tr>
                  <td> ${r.vaccine}</td>
                  <td>${new Date(r.administrationDate).toLocaleDateString()}</td>
                  <td>${r.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    document.getElementById('childDetailContent').innerHTML = html;
  } catch (error) {
    console.error('Error loading child detail:', error);
    document.getElementById('childDetailContent').innerHTML = `
      <div class="alert alert-danger">Error loading child details: ${error.message}</div>
    `;
  }
}

// ===== LOAD DISEASE INFORMATION =====

async function loadDiseaseInfo() {
  try {
    const response = await parentApiCall('/diseases');
    const diseases = response.data || [];

    const container = document.getElementById('diseaseCards');
    if (!container) return;

    container.innerHTML = diseases.map(d => `
      <div class="col-md-6 col-lg-3 mb-4">
        <div class="disease-card card">
          <div class="card-header d-flex align-items-center">
            <span class="disease-icon me-2">${d.icon}</span>
            ${d.name}
          </div>
          <div class="card-body">
            <p class="mb-2">
              <span class="vaccine-badge"> ${d.vaccine}</span>
            </p>
            <p class="small mb-2"><strong>Symptoms:</strong><br>${d.symptoms}</p>
            <p class="small mb-2"><strong>Cause:</strong><br>${d.cause}</p>
            <p class="small mb-2"><strong>Prevention:</strong><br>${d.prevention}</p>
            <p class="small mb-0"><strong>Risk Factors:</strong><br>${d.riskFactors}</p>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading disease info:', error);
    const container = document.getElementById('diseaseCards');
    if (container) {
      container.innerHTML = '<div class="col-12"><div class="alert alert-danger">Error loading disease information.</div></div>';
    }
  }
}