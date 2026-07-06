let currentUser = JSON.parse(localStorage.getItem('user'));
let childModal, appointmentModal, vaccineModal;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  childModal = new bootstrap.Modal(document.getElementById('childModal'));
  
  if (currentUser) {
    showMainApp();
    initializeSidebar();
    loadDashboard();
  } else {
    showLoginPage();
  }
});

// Login handler
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const user = await login(email, password);
    currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    
    showMainApp();
    initializeSidebar();
    loadDashboard();
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
}

// UI Functions
function showLoginPage() {
  document.getElementById('loginPage').style.display = 'block';
  document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.getElementById('userDisplay').textContent = `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
}

function initializeSidebar() {
  const menu = document.getElementById('sidebarMenu');
  menu.innerHTML = '';
  
  const menuItems = [
    { label: 'Dashboard', id: 'dashboard', icon: '' },
    { label: 'Children', id: 'children', icon: '' },
    { label: 'Vaccinations', id: 'vaccinations', icon: '' },
    { label: 'Appointments', id: 'appointments', icon: '' },
  ];
  
  if (currentUser.role === 'pharmacist' || currentUser.role === 'administrator') {
    menuItems.push({ label: 'Inventory', id: 'inventory', icon: '' });
  }
  
  if (currentUser.role === 'administrator') {
    menuItems.push({ label: 'Reports', id: 'reports', icon: '' });
  }
  
  menuItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <a class="nav-link" href="#" onclick="navigateTo('${item.id}')">
        ${item.icon} ${item.label}
      </a>
    `;
    menu.appendChild(li);
  });
}

function navigateTo(page) {
  document.querySelectorAll('.content-page').forEach(p => p.style.display = 'none');
  
  const pageMap = {
    'dashboard': 'dashboardPage',
    'children': 'childrenPage',
    'vaccinations': 'vaccinationsPage',
    'appointments': 'appointmentsPage',
    'inventory': 'inventoryPage',
    'reports': 'reportsPage',
  };
  
  const pageId = pageMap[page];
  if (pageId) {
    document.getElementById(pageId).style.display = 'block';
    
    switch(page) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'children':
        loadChildren();
        break;
      case 'vaccinations':
        loadVaccinations();
        break;
      case 'appointments':
        loadAppointments();
        break;
      case 'inventory':
        loadInventory();
        break;
      case 'reports':
        loadReports();
        break;
    }
  }
}

// Dashboard
async function loadDashboard() {
  try {
    let data;
    
    if (currentUser.role === 'administrator') {
      data = await getAdminDashboard();
    } else if (currentUser.role === 'nurse') {
      data = await getNurseDashboard();
    } else if (currentUser.role === 'pharmacist') {
      data = await getPharmacistDashboard();
    } else if (currentUser.role === 'records_officer') {
      data = await getRecordsOfficerDashboard();
    }
    
    const stats = document.getElementById('dashboardStats');
    stats.innerHTML = Object.entries(data.data)
      .filter(([key, value]) => typeof value === 'number')
      .map(([key, value]) => `
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h5>${key.replace(/([A-Z])/g, ' $1')}</h5>
              <h2>${value}</h2>
            </div>
          </div>
        </div>
      `).join('');
  } catch (error) {
    alert('Error loading dashboard: ' + error.message);
  }
}

// Children Management
async function loadChildren() {
  try {
    const response = await getChildren();
    const list = document.getElementById('childrenList');
    
    list.innerHTML = response.data.map(child => `
      <div class="card mb-3">
        <div class="card-body">
          <h5>${child.firstName} ${child.lastName}</h5>
          <p><strong>Patient ID:</strong> ${child.patientId}</p>
          <p><strong>DOB:</strong> ${new Date(child.dateOfBirth).toLocaleDateString()}</p>
          <p><strong>Gender:</strong> ${child.gender}</p>
          <button class="btn btn-sm btn-primary" onclick="viewChild('${child._id}')">View Details</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    alert('Error loading children: ' + error.message);
  }
}

function showRegisterChildModal() {
  document.getElementById('childForm').reset();
  childModal.show();
}

async function handleChildRegistration(event) {
  event.preventDefault();
  
  const data = {
    firstName: document.getElementById('childFirstName').value,
    lastName: document.getElementById('childLastName').value,
    dateOfBirth: document.getElementById('childDOB').value,
    gender: document.getElementById('childGender').value,
    bloodGroup: document.getElementById('childBloodGroup').value,
  };
  
  try {
    await registerChild(data);
    childModal.hide();
    loadChildren();
    alert('Child registered successfully!');
  } catch (error) {
    alert('Error registering child: ' + error.message);
  }
}

async function viewChild(childId) {
  try {
    const response = await getChildById(childId);
    console.log('Child details:', response.data);
    alert(`Child: ${response.data.firstName} ${response.data.lastName}\nPatient ID: ${response.data.patientId}`);
  } catch (error) {
    alert('Error loading child details: ' + error.message);
  }
}

// Vaccinations
async function loadVaccinations() {
  try {
    const upcoming = await getUpcomingVaccinations();
    const overdue = await getOverdueVaccinations();
    
    document.getElementById('upcomingVaccinations').innerHTML = upcoming.data.length === 0 
      ? '<p>No upcoming vaccinations</p>'
      : upcoming.data.map(v => `
        <div class="alert alert-info">
          <strong>${v.vaccine}</strong> - Scheduled: ${new Date(v.scheduledDate).toLocaleDateString()}
        </div>
      `).join('');
    
    document.getElementById('overdueVaccinations').innerHTML = overdue.data.length === 0 
      ? '<p>No overdue vaccinations</p>'
      : overdue.data.map(v => `
        <div class="alert alert-danger">
          <strong>${v.vaccine}</strong> - Overdue since: ${new Date(v.scheduledDate).toLocaleDateString()}
        </div>
      `).join('');
  } catch (error) {
    alert('Error loading vaccinations: ' + error.message);
  }
}

// Appointments
async function loadAppointments() {
  try {
    const response = await getAppointments();
    const list = document.getElementById('appointmentsList');
    
    list.innerHTML = response.data.map(apt => `
      <div class="card mb-3">
        <div class="card-body">
          <h5>${apt.child?.firstName} ${apt.child?.lastName}</h5>
          <p><strong>Vaccine:</strong> ${apt.vaccine}</p>
          <p><strong>Date:</strong> ${new Date(apt.appointmentDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span class="badge bg-${apt.status === 'scheduled' ? 'warning' : 'success'}">${apt.status}</span></p>
        </div>
      </div>
    `).join('');
  } catch (error) {
    alert('Error loading appointments: ' + error.message);
  }
}

function showCreateAppointmentModal() {
  alert('Appointment scheduling feature coming soon!');
}

// Inventory
async function loadInventory() {
  try {
    const response = await getInventory();
    const list = document.getElementById('inventoryList');
    
    list.innerHTML = response.data.map(vaccine => `
      <div class="card mb-3">
        <div class="card-body">
          <h5>${vaccine.name}</h5>
          <p><strong>Batch:</strong> ${vaccine.batchNumber}</p>
          <p><strong>Available:</strong> ${vaccine.quantityAvailable}</p>
          <p><strong>Expiry:</strong> ${new Date(vaccine.expiryDate).toLocaleDateString()}</p>
          <span class="badge bg-${vaccine.quantityAvailable > vaccine.minStockLevel ? 'success' : 'danger'}">
            ${vaccine.quantityAvailable > vaccine.minStockLevel ? 'In Stock' : 'Low Stock'}
          </span>
        </div>
      </div>
    `).join('');
  } catch (error) {
    alert('Error loading inventory: ' + error.message);
  }
}

function showAddVaccineModal() {
  alert('Add vaccine feature coming soon!');
}

// Reports
async function loadReports() {
  try {
    const report = await getMonthlyImmunizationReport();
    const coverage = await getVaccinationCoverageReport();
    
    const list = document.getElementById('reportsList');
    list.innerHTML = `
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Monthly Immunization</div>
          <div class="card-body">
            ${report.data.report.map(r => `
              <p>${r._id}: ${r.totalAdministered}</p>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Vaccination Coverage</div>
          <div class="card-body">
            ${coverage.data.vaccineStats.map(s => `
              <p>${s.vaccine}: ${s.coverage.toFixed(2)}%</p>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    alert('Error loading reports: ' + error.message);
  }
}
