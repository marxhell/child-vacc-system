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
  loadAllReports();
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
    const summary = Array.isArray(response?.data?.summary) ? response.data.summary : [];
    const detailedReport = Array.isArray(response?.data?.detailedReport) ? response.data.detailedReport : [];

    if (summary.length === 0 && detailedReport.length === 0) {
      document.getElementById('appointmentReport').innerHTML = '<div class="alert alert-info">No appointment data</div>';
      return;
    }

    const totalAppointments = detailedReport.length || summary.reduce((acc, item) => acc + (item.count || 0), 0);
    const statusLabels = {
      completed: 'Completed',
      scheduled: 'Scheduled',
      missed: 'Missed',
      cancelled: 'Cancelled',
      rescheduled: 'Rescheduled',
    };

    let html = `
      <div class="card shadow-sm border-0">
        <div class="card-header bg-primary text-white">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-0">Appointment Report</h5>
              <small class="opacity-75">Summary of all appointments and current status</small>
            </div>
            <span class="badge bg-light text-primary">${totalAppointments} total</span>
          </div>
        </div>
        <div class="card-body">
          <div class="row g-3 mb-4">
    `;

    summary.forEach(item => {
      const statusName = statusLabels[item._id] || (item._id || 'Unknown').toString().replace(/\b\w/g, c => c.toUpperCase());
      const badgeClass = item._id === 'missed' ? 'bg-danger' : item._id === 'cancelled' ? 'bg-secondary' : item._id === 'completed' ? 'bg-success' : 'bg-info';
      html += `
            <div class="col-md-3">
              <div class="border rounded p-3 h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <strong>${statusName}</strong>
                  <span class="badge ${badgeClass}">${item.count || 0}</span>
                </div>
                <small class="text-muted">${item.count ? 'Records in this status' : 'No records found'}</small>
              </div>
            </div>
      `;
    });

    html += `
          </div>

          <h6 class="text-primary mb-3">Detailed Appointments</h6>
          <div class="table-responsive">
            <table class="table table-hover align-middle">
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

    if (detailedReport.length > 0) {
      detailedReport.forEach(apt => {
        const statusBadge = apt.status === 'completed' ? 'bg-success' : 
                           apt.status === 'missed' ? 'bg-danger' : 
                           apt.status === 'cancelled' ? 'bg-secondary' : 'bg-info';
        html += `
          <tr>
            <td><strong>${apt.child?.firstName || ''} ${apt.child?.lastName || 'N/A'}</strong></td>
            <td>${apt.vaccine || 'N/A'}</td>
            <td>${formatDate(apt.appointmentDate)}</td>
            <td><span class="badge ${statusBadge}">${(apt.status || 'unknown').toString().replace(/\b\w/g, c => c.toUpperCase())}</span></td>
          </tr>
        `;
      });
    } else {
      html += `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">No detailed appointment data available.</td>
        </tr>
      `;
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('appointmentReport').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('appointmentReport', `Error: ${error.message}`);
  }
}

function exportCurrentReportAsPdf() {
  const activePane = document.querySelector('.tab-pane.active');
  if (!activePane) {
    alert('No report is currently selected.');
    return;
  }

  const reportTitle = activePane.querySelector('.card-header h5')?.textContent || 'Report';
  const reportBody = activePane.querySelector('.card-body');
  if (!reportBody) {
    alert('No report content is available to export.');
    return;
  }

  if (!window.jspdf?.jsPDF) {
    alert('PDF export is unavailable right now.');
    return;
  }

  const doc = new window.jspdf.jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(reportTitle, 14, 20);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, 28);
  doc.setTextColor(0);
  
  let y = 38;
  
  // Extract tables if they exist
  const tables = reportBody.querySelectorAll('table');
  const statusCards = reportBody.querySelectorAll('.border.rounded');
  
  // If this is an appointment report with status cards
  if (statusCards.length > 0 && reportTitle.includes('Appointment')) {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.text('Summary by Status', 14, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    statusCards.forEach(card => {
      const statusName = card.querySelector('strong')?.textContent || '';
      const count = card.querySelector('.badge')?.textContent || '0';
      
      if (statusName) {
        doc.text(`${statusName}: ${count} records`, 18, y);
        y += 6;
      }
    });
    
    y += 5;
  }
  
  // Add tables with better formatting
  tables.forEach((table, tableIndex) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent.trim());
    
    if (rows.length > 0) {
      // Add table title (if available)
      if (tableIndex > 0 || statusCards.length > 0) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.text('Detailed Records', 14, y);
        y += 8;
      }
      
      // Create table data
      const tableData = [];
      tableData.push(headers);
      
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
        tableData.push(cells);
      });
      
      // Add table to PDF with auto layout
      if (window.autoTable) {
        window.autoTable(doc, {
          head: [tableData[0]],
          body: tableData.slice(1),
          startY: y,
          margin: 14,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            halign: 'left',
          },
          headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [248, 251, 255],
          },
          didDrawPage: function(data) {
            y = data.cursor.y;
          },
        });
        
        y = doc.lastAutoTable.finalY + 5;
      } else {
        // Fallback: simple text representation
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text(headers.join(' | '), 14, y);
        y += 6;
        
        doc.setFont(undefined, 'normal');
        rows.forEach(row => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
          doc.text(cells.join(' | '), 14, y);
          y += 5;
        });
      }
    }
  });
  
  // Footer
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
  }
  
  const fileName = `${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
  doc.save(fileName);
}

