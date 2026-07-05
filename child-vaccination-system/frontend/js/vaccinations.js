// ===== VACCINATIONS PAGE INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('userDisplay').textContent = `${user.firstName} ${user.lastName}`;
  initializeSidebar(user.role);

  // Load data
  loadUpcomingVaccinations();
  loadOverdueVaccinations();
  loadChildrenForForm();
  loadVaccinesForForm();
});

// ===== LOAD UPCOMING VACCINATIONS =====

async function loadUpcomingVaccinations() {
  try {
    showLoadingSpinner('upcomingList');
    const response = await getUpcomingVaccinations(1, 20);
    const vaccinations = response.data || [];

    if (vaccinations.length === 0) {
      document.getElementById('upcomingList').innerHTML = '<div class="alert alert-info">No upcoming vaccinations</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Patient ID</th>
              <th>Child Name</th>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Scheduled Date</th>
              <th>Days Until</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaccinations.forEach(v => {
      const today = new Date();
      const scheduledDate = new Date(v.scheduledDate);
      const daysUntil = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));
      
      html += `
        <tr>
          <td><strong>${v.child?.patientId || 'N/A'}</strong></td>
          <td>${v.child?.firstName} ${v.child?.lastName}</td>
          <td>${v.vaccine}</td>
          <td>Dose ${v.doseNumber}</td>
          <td>${formatDate(v.scheduledDate)}</td>
          <td><span class="badge bg-info">${daysUntil} days</span></td>
          <td><span class="badge bg-warning">${v.status}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('upcomingList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('upcomingList', `Error: ${error.message}`);
  }
}

// ===== LOAD OVERDUE VACCINATIONS =====

async function loadOverdueVaccinations() {
  try {
    showLoadingSpinner('overdueList');
    const response = await getOverdueVaccinations(1, 20);
    const vaccinations = response.data || [];

    if (vaccinations.length === 0) {
      document.getElementById('overdueList').innerHTML = '<div class="alert alert-success">No overdue vaccinations</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Patient ID</th>
              <th>Child Name</th>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaccinations.forEach(v => {
      const today = new Date();
      const scheduledDate = new Date(v.scheduledDate);
      const daysOverdue = Math.ceil((today - scheduledDate) / (1000 * 60 * 60 * 24));
      
      html += `
        <tr>
          <td><strong>${v.child?.patientId || 'N/A'}</strong></td>
          <td>${v.child?.firstName} ${v.child?.lastName}</td>
          <td>${v.vaccine}</td>
          <td>Dose ${v.doseNumber}</td>
          <td>${formatDate(v.scheduledDate)}</td>
          <td><span class="badge bg-danger">${daysOverdue} days</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="recordOverdueVaccination('${v._id}', '${v.child._id}', '${v.vaccine}', ${v.doseNumber})">
              Record Now
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('overdueList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('overdueList', `Error: ${error.message}`);
  }
}

// ===== LOAD CHILDREN FOR FORM =====

async function loadChildrenForForm() {
  try {
    const response = await getChildren(1, 100);
    const children = response.data || [];
    
    const select = document.getElementById('childSelect');
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child._id;
      option.textContent = `${child.firstName} ${child.lastName} (${child.patientId})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading children:', error);
  }
}

// ===== LOAD VACCINES FOR FORM =====

async function loadVaccinesForForm() {
  try {
    const vaccineNames = ['BCG', 'OPV', 'Pentavalent', 'Measles', 'Rotavirus', 'PCV', 'Hepatitis B'];
    const select = document.getElementById('vaccineSelect');
    
    vaccineNames.forEach(vaccine => {
      const option = document.createElement('option');
      option.value = vaccine;
      option.textContent = vaccine;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// ===== RECORD VACCINATION =====

async function handleRecordVaccination(event) {
  event.preventDefault();

  try {
    const childId = document.getElementById('childSelect').value;
    const vaccine = document.getElementById('vaccineSelect').value;
    const doseNumber = document.getElementById('doseNumber').value;
    const administrationDate = document.getElementById('adminDate').value;
    const vaccineBatch = document.getElementById('batchNumber').value;

    if (!childId || !vaccine || !doseNumber || !administrationDate || !vaccineBatch) {
      alert('Please fill in all required fields');
      return;
    }

    const data = {
      child: childId,
      vaccine,
      doseNumber: parseInt(doseNumber),
      administrationDate,
      vaccineBatch,
      adverseEffects: []
    };

    await recordVaccination(data);
    
    showSuccessMessage(' Vaccination recorded successfully!');
    document.getElementById('recordVaccinationForm').reset();
    
    // Refresh lists
    loadUpcomingVaccinations();
    loadOverdueVaccinations();
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}

// ===== RECORD OVERDUE VACCINATION =====

async function recordOverdueVaccination(scheduleId, childId, vaccine, doseNumber) {
  try {
    const data = {
      child: childId,
      vaccine,
      doseNumber,
      administrationDate: new Date().toISOString().split('T')[0],
      vaccineBatch: 'BATCH-' + Date.now(),
      adverseEffects: []
    };

    await recordVaccination(data);
    
    showSuccessMessage(' Vaccination recorded!');
    loadUpcomingVaccinations();
    loadOverdueVaccinations();
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}
