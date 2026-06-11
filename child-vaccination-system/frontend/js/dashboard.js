// ===== DASHBOARD INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Display user info
  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay) userDisplay.textContent = `${user.firstName} ${user.lastName} (${user.role})`;

  // Make user info clickable to toggle sidebar
  const userInfoToggle = document.getElementById('userInfoToggle');
  if (userInfoToggle) {
    userInfoToggle.textContent = `${user.firstName} ${user.lastName} (${user.role})`;
  }

  // Initialize sidebar
  initializeSidebar(user.role);

  // Only load dashboard if on dashboard page
  if (document.getElementById('dashboardStats')) {
    loadDashboard(user.role);
  }
});

// ===== SIDEBAR TOGGLE =====

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ===== SIDEBAR INITIALIZATION =====

function initializeSidebar(role) {
  const sidebarMenu = document.getElementById('sidebarMenu');
  if (!sidebarMenu) return;
  sidebarMenu.innerHTML = '';

  const menuItems = [
    { label: 'Dashboard', icon: '', href: 'dashboard.html', roles: ['all'] },
    { label: 'Children', icon: '', href: 'children.html', roles: ['nurse', 'records_officer', 'administrator'] },
    { label: 'Vaccinations', icon: '', href: 'vaccinations.html', roles: ['nurse', 'administrator'] },
    { label: 'Appointments', icon: '', href: 'appointments.html', roles: ['nurse', 'records_officer', 'administrator'] },
    { label: 'Inventory', icon: '', href: 'inventory.html', roles: ['pharmacist', 'administrator'] },
    { label: 'Reports', icon: '', href: 'reports.html', roles: ['administrator'] },
  ];

  menuItems.forEach(item => {
    if (item.roles.includes('all') || item.roles.includes(role)) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `
        <a class="nav-link" href="${item.href}" onclick="closeSidebar()">
          ${item.icon} ${item.label}
        </a>
      `;

      if (window.location.pathname.includes(item.href)) {
        li.querySelector('a').classList.add('active');
      }

      sidebarMenu.appendChild(li);
    }
  });

  // Add logout link
  const hr = document.createElement('hr');
  const logoutLi = document.createElement('li');
  logoutLi.className = 'nav-item';
  logoutLi.innerHTML = `
    <a class="nav-link text-danger" href="#" onclick="handleLogout()">
       Logout
    </a>
  `;
  sidebarMenu.appendChild(hr);
  sidebarMenu.appendChild(logoutLi);
}

// ===== LOGOUT HANDLER =====

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      removeAuth();
      window.location.href = 'login.html';
    }
  }
}

// ===== LOAD DASHBOARD =====

async function loadDashboard(role) {
  try {
    const dashboardStats = document.getElementById('dashboardStats');
    if (!dashboardStats) return; // Not on dashboard page
    dashboardStats.innerHTML = '<div class="col-12"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

    let data;
    switch (role) {
      case 'administrator':
        data = await getAdminDashboard();
        displayAdminDashboard(data.data);
        break;
      case 'nurse':
        data = await getNurseDashboard();
        displayNurseDashboard(data.data);
        break;
      case 'pharmacist':
        data = await getPharmacistDashboard();
        displayPharmacistDashboard(data.data);
        break;
      case 'records_officer':
        data = await getRecordsOfficerDashboard();
        displayRecordsOfficerDashboard(data.data);
        break;
      default:
        throw new Error('Unknown role');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    const errorEl = document.getElementById('dashboardStats');
    if (!errorEl) return;
    errorEl.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          <strong>Error loading dashboard:</strong> ${error.message}
        </div>
      </div>
    `;
  }
}

// ===== ADMIN DASHBOARD =====

function displayAdminDashboard(data) {
  const html = `
    <div class="col-md-3">
      <div class="stat-card">
        <div class="stat-number">${data.totalChildren || 0}</div>
        <div class="stat-label">Total Children</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card success-stat">
        <div class="stat-number">${data.totalVaccinations || 0}</div>
        <div class="stat-label">Vaccinations</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card warning-stat">
        <div class="stat-number">${data.upcomingAppointments || 0}</div>
        <div class="stat-label">Upcoming Appointments</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card alert-stat">
        <div class="stat-number">${data.overdueVaccinations || 0}</div>
        <div class="stat-label">Overdue Vaccinations</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card info-stat">
        <div class="stat-number">${data.availableVaccineStock || 0}</div>
        <div class="stat-label">Vaccine Stock</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card success-stat">
        <div class="stat-number">${data.activeUsers || 0}</div>
        <div class="stat-label">Active Users</div>
      </div>
    </div>
  `;
  document.getElementById('dashboardStats').innerHTML = html;
}

// ===== NURSE DASHBOARD =====

function displayNurseDashboard(data) {
  const recentCount = Array.isArray(data.recentVaccinations) ? data.recentVaccinations.length : 0;
  
  let recentList = '';
  if (Array.isArray(data.recentVaccinations) && data.recentVaccinations.length > 0) {
    recentList = `
      <div class="card mt-3">
        <div class="card-header">Recent Vaccinations</div>
        <div class="card-body">
          <ul class="list-unstyled mb-0">
            ${data.recentVaccinations.map(v => `<li>${v.child?.firstName || 'Unknown'} ${v.child?.lastName || ''} - ${v.vaccine || 'N/A'}</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }

  const html = `
    <div class="col-md-3">
      <div class="stat-card">
        <div class="stat-number">${data.todayAppointments || 0}</div>
        <div class="stat-label">Today's Appointments</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card success-stat">
        <div class="stat-number">${data.completedToday || 0}</div>
        <div class="stat-label">Completed Today</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card warning-stat">
        <div class="stat-number">${data.vaccinationsDueToday || 0}</div>
        <div class="stat-label">Vaccinations Due</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card info-stat">
        <div class="stat-number">${recentCount}</div>
        <div class="stat-label">Recent Vaccinations</div>
      </div>
    </div>
    <div class="col-12">
      ${recentList}
    </div>
  `;
  document.getElementById('dashboardStats').innerHTML = html;
}

// ===== PHARMACIST DASHBOARD =====

function displayPharmacistDashboard(data) {
  const currentStockCount = Array.isArray(data.currentStock) ? data.currentStock.length : 0;
  const lowStockCount = Array.isArray(data.lowStockItems) ? data.lowStockItems.length : 0;
  const expiringCount = Array.isArray(data.expiringVaccines) ? data.expiringVaccines.length : 0;

  let lowStockDetails = '';
  if (Array.isArray(data.lowStockItems) && data.lowStockItems.length > 0) {
    lowStockDetails = `
      <div class="card mt-3">
        <div class="card-header bg-warning">Low Stock Details</div>
        <div class="card-body">
          <ul class="list-unstyled mb-0">
            ${data.lowStockItems.map(item => `<li>${item.name} (${item.batchNumber}): ${item.quantityAvailable} remaining</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }

  let expiringDetails = '';
  if (Array.isArray(data.expiringVaccines) && data.expiringVaccines.length > 0) {
    expiringDetails = `
      <div class="card mt-3">
        <div class="card-header bg-danger">Expiring Vaccines</div>
        <div class="card-body">
          <ul class="list-unstyled mb-0">
            ${data.expiringVaccines.map(item => `<li>${item.name} (${item.batchNumber}): Expires ${new Date(item.expiryDate).toLocaleDateString()}</li>`).join('')}
          </ul>
        </div>
      </div>`;
  }

  const html = `
    <div class="col-md-3">
      <div class="stat-card">
        <div class="stat-number">${currentStockCount}</div>
        <div class="stat-label">Vaccine Types</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card alert-stat">
        <div class="stat-number">${lowStockCount}</div>
        <div class="stat-label">Low Stock Items</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card warning-stat">
        <div class="stat-number">${expiringCount}</div>
        <div class="stat-label">Expiring Vaccines</div>
      </div>
    </div>
    <div class="col-12">
      ${lowStockDetails}
      ${expiringDetails}
    </div>
  `;
  document.getElementById('dashboardStats').innerHTML = html;
}

// ===== RECORDS OFFICER DASHBOARD =====

function displayRecordsOfficerDashboard(data) {
  const html = `
    <div class="col-md-3">
      <div class="stat-card">
        <div class="stat-number">${data.newRegistrations || 0}</div>
        <div class="stat-label">New Registrations</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card warning-stat">
        <div class="stat-number">${data.upcomingAppointments || 0}</div>
        <div class="stat-label">Upcoming Appointments</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card success-stat">
        <div class="stat-number">${data.recentRegistrations || 0}</div>
        <div class="stat-label">Recent Registrations</div>
      </div>
    </div>
  `;
  document.getElementById('dashboardStats').innerHTML = html;
}
