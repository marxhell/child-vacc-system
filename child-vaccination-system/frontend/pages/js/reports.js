// ===== REPORTS PAGE INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Only admin can access reports
  if (user.role !== 'administrator') {
    window.location.href = 'dashboard.html';
    return;
  }

  document.getElementById('userDisplay').textContent = `${user.firstName} ${user.lastName}`;
  initializeSidebar(user.role);

  // Set default dates (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
  document.getElementById('endDate').value = today.toISOString().split('T')[0];

  // Load all reports
  loadAllReports();
});

// ===== APPLY DATE FILTER =====

async function applyDateFilter() {
  await loadAllReports();
  await downloadCurrentReportPdf();
}

function getActiveReportTab() {
  const activeTab = document.querySelector('.nav-link.active');
  return activeTab ? activeTab.getAttribute('data-bs-target') : '#immunizationTab';
}

async function downloadCurrentReportPdf() {
  const activeTab = getActiveReportTab();
  if (activeTab === '#coverageTab') return downloadCoveragePdf();
  if (activeTab === '#overdueTab') return downloadOverduePdf();
  if (activeTab === '#stockTab') return downloadStockPdf();
  if (activeTab === '#usageTab') return downloadUsagePdf();
  if (activeTab === '#appointmentTab') return downloadAppointmentPdf();
  return downloadImmunizationPdf();
}

// ===== LOAD ALL REPORTS =====

async function loadAllReports() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  loadImmunizationReport(startDate, endDate);
  loadCoverageReport();
  loadOverdueReport();
  loadStockReport();
  loadUsageReport(startDate, endDate);
  loadAppointmentReport();
}

// ===== IMMUNIZATION REPORT =====
// API: { month, year, report: [{ _id: vaccine, totalAdministered }] }

async function loadImmunizationReport(startDate, endDate) {
  try {
    showLoadingSpinner('immunizationReport');
    const response = await getMonthlyImmunizationReport(startDate, endDate);
    const data = response.data?.report || [];

    if (data.length === 0) {
      document.getElementById('immunizationReport').innerHTML = '<div class="alert alert-info">No data available</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <div class="d-flex justify-content-end mb-2">
          <button class="btn btn-sm btn-outline-primary" onclick="downloadImmunizationPdf()">Download PDF</button>
        </div>
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Total Administered</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      html += `
        <tr>
          <td><strong>${item._id || item.vaccine}</strong></td>
          <td><span class="badge bg-info">${item.totalAdministered || 0}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('immunizationReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('immunizationReport', `Error: ${error.message}`);
  }
}

async function downloadImmunizationPdf() {
  try {
    const blob = await downloadReportPdf('/reports/monthly-immunization.pdf');
    const filename = `monthly-immunization.pdf`;
    triggerFileDownload(blob, filename);
  } catch (err) {
    console.error('Error downloading immunization PDF:', err);
    showErrorMessage('immunizationReport', 'Failed to download PDF');
  }
}

// ===== COVERAGE REPORT =====
// API: { totalChildren, vaccineStats: [{ vaccine, childrenVaccinated, coverage }] }

async function loadCoverageReport() {
  try {
    showLoadingSpinner('coverageReport');
    const response = await getVaccinationCoverageReport();
    const vaccineStats = response.data?.vaccineStats || [];
    const totalChildren = response.data?.totalChildren || 0;

    if (vaccineStats.length === 0) {
      document.getElementById('coverageReport').innerHTML = '<div class="alert alert-info">No data available</div>';
      return;
    }

    let html = `
      <div class="d-flex justify-content-end mb-2">
        <button class="btn btn-sm btn-outline-primary" onclick="downloadCoveragePdf()">Download PDF</button>
      </div>
      <p class="text-muted">Total registered children: <strong>${totalChildren}</strong></p>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Children Vaccinated</th>
              <th>Coverage %</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaccineStats.forEach(item => {
      const coverage = item.coverage || 0;
      const coverageBadge = coverage >= 90 ? 'bg-success' : coverage >= 70 ? 'bg-warning' : 'bg-danger';
      
      html += `
        <tr>
          <td><strong>${item.vaccine}</strong></td>
          <td>${item.childrenVaccinated || 0}</td>
          <td><span class="badge ${coverageBadge}">${coverage.toFixed(2)}%</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('coverageReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('coverageReport', `Error: ${error.message}`);
  }
}

async function downloadCoveragePdf() {
  try {
    const blob = await downloadReportPdf('/reports/vaccination-coverage.pdf');
    triggerFileDownload(blob, 'vaccination-coverage.pdf');
  } catch (err) {
    console.error('Error downloading coverage PDF:', err);
    showErrorMessage('coverageReport', 'Failed to download PDF');
  }
}

// ===== OVERDUE REPORT =====
// API: { totalOverdue, report: [{ child, vaccine, scheduledDate, ... }] }

async function loadOverdueReport() {
  try {
    showLoadingSpinner('overdueReport');
    const response = await getOverdueVaccinationsReport(1, 50);
    const data = response.data?.report || [];

    if (data.length === 0) {
      document.getElementById('overdueReport').innerHTML = '<div class="alert alert-success">No overdue vaccinations</div>';
      return;
    }

    let html = `
      <div class="d-flex justify-content-end mb-2">
        <button class="btn btn-sm btn-outline-primary" onclick="downloadOverduePdf()">Download PDF</button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Child</th>
              <th>Patient ID</th>
              <th>Vaccine</th>
              <th>Due Date</th>
              <th>Days Overdue</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      const today = new Date();
      const dueDate = new Date(item.scheduledDate);
      const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
      
      html += `
        <tr>
          <td><strong>${item.child?.firstName} ${item.child?.lastName}</strong></td>
          <td>${item.child?.patientId || 'N/A'}</td>
          <td>${item.vaccine}</td>
          <td>${formatDate(item.scheduledDate)}</td>
          <td><span class="badge bg-danger">${daysOverdue} days</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('overdueReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('overdueReport', `Error: ${error.message}`);
  }
}

async function downloadOverduePdf() {
  try {
    const blob = await downloadReportPdf('/reports/overdue-vaccinations.pdf');
    triggerFileDownload(blob, 'overdue-vaccinations.pdf');
  } catch (err) {
    console.error('Error downloading overdue PDF:', err);
    showErrorMessage('overdueReport', 'Failed to download PDF');
  }
}

// ===== STOCK REPORT =====
// API: { report: [{ vaccine, totalAvailable, totalReceived, batches, minStockLevel, status }] }

async function loadStockReport() {
  try {
    showLoadingSpinner('stockReport');
    const response = await getVaccineStockReport();
    const data = response.data?.report || [];

    if (data.length === 0) {
      document.getElementById('stockReport').innerHTML = '<div class="alert alert-info">No inventory data</div>';
      return;
    }

    let html = `
      <div class="d-flex justify-content-end mb-2">
        <button class="btn btn-sm btn-outline-primary" onclick="downloadStockPdf()">Download PDF</button>
      </div>
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Total Available</th>
              <th>Total Received</th>
              <th>Batches</th>
              <th>Min Stock Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      const statusBadge = item.status === 'Out of Stock' ? 'bg-danger' : 
                          item.status === 'Low Stock' ? 'bg-warning' : 'bg-success';
      
      html += `
        <tr>
          <td><strong>${item.vaccine}</strong></td>
          <td>${item.totalAvailable || 0}</td>
          <td>${item.totalReceived || 0}</td>
          <td>${item.batches || 0}</td>
          <td>${item.minStockLevel || 0}</td>
          <td><span class="badge ${statusBadge}">${item.status || 'Unknown'}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('stockReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('stockReport', `Error: ${error.message}`);
  }
}

async function downloadStockPdf() {
  try {
    const blob = await downloadReportPdf('/reports/vaccine-stock.pdf');
    triggerFileDownload(blob, 'vaccine-stock.pdf');
  } catch (err) {
    console.error('Error downloading stock PDF:', err);
    showErrorMessage('stockReport', 'Failed to download PDF');
  }
}

// ===== USAGE REPORT =====
// API: { startDate, endDate, report: [{ _id: vaccine, totalUsed }] }

async function loadUsageReport(startDate, endDate) {
  try {
    showLoadingSpinner('usageReport');
    const response = await getVaccineUsageReport(startDate, endDate);
    const data = response.data?.report || [];

    if (data.length === 0) {
      document.getElementById('usageReport').innerHTML = '<div class="alert alert-info">No usage data</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Total Used</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.forEach(item => {
      html += `
        <tr>
          <td><strong>${item._id || item.vaccine}</strong></td>
          <td><span class="badge bg-info">${item.totalUsed || 0}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('usageReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('usageReport', `Error: ${error.message}`);
  }
}

// ===== APPOINTMENT REPORT =====
// API: { startDate, endDate, summary: [{ _id: status, count }], detailedReport: [...] }

async function loadAppointmentReport() {
  try {
    showLoadingSpinner('appointmentReport');
    const response = await getAppointmentsReport(1, 50);
    const summary = response.data?.summary || [];
    const detailedReport = response.data?.detailedReport || [];

    if (summary.length === 0) {
      document.getElementById('appointmentReport').innerHTML = '<div class="alert alert-info">No appointment data</div>';
      return;
    }

    let html = `
      <h6 class="text-muted mb-3">Appointments Summary by Status</h6>
      <div class="table-responsive mb-4">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
    `;

    summary.forEach(item => {
      html += `
        <tr>
          <td><strong>${(item._id || 'unknown').charAt(0).toUpperCase() + (item._id || 'unknown').slice(1)}</strong></td>
          <td><span class="badge bg-primary">${item.count || 0}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';

    // Show detailed report if available
    if (detailedReport.length > 0) {
      html += `
        <h6 class="text-muted mb-3">Detailed Appointments</h6>
        <div class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Child</th>
                <th>Vaccine</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
      `;

      detailedReport.forEach(apt => {
        const statusBadge = apt.status === 'completed' ? 'bg-success' : 
                           apt.status === 'missed' ? 'bg-danger' : 
                           apt.status === 'cancelled' ? 'bg-secondary' : 'bg-info';
        html += `
          <tr>
            <td><strong>${apt.child?.firstName || ''} ${apt.child?.lastName || 'N/A'}</strong></td>
            <td>${apt.vaccine || 'N/A'}</td>
            <td>${formatDate(apt.appointmentDate)}</td>
            <td><span class="badge ${statusBadge}">${apt.status}</span></td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';
    }

    document.getElementById('appointmentReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('appointmentReport', `Error: ${error.message}`);
  }
}

async function downloadAppointmentPdf() {
  try {
    const blob = await downloadReportPdf('/reports/appointments.pdf');
    triggerFileDownload(blob, 'appointments-report.pdf');
  } catch (err) {
    console.error('Error downloading appointment PDF:', err);
    showErrorMessage('appointmentReport', 'Failed to download PDF');
  }
}

function triggerFileDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

