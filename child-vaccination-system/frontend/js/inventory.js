// ===== INVENTORY PAGE INITIALIZATION =====

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
  loadInventory();
  loadLowStockAlerts();
  loadExpiringVaccines();
  loadSummary();

  // Setup search
  document.getElementById('searchVaccine').addEventListener('input', (e) => {
    loadInventory(e.target.value);
  });
});

// ===== LOAD INVENTORY =====

async function loadInventory(search = '') {
  try {
    showLoadingSpinner('inventoryList');
    const response = await getInventory(1, 50, search);
    const vaccines = response.data || [];

    if (vaccines.length === 0) {
      document.getElementById('inventoryList').innerHTML = '<div class="alert alert-info">No vaccines in inventory</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine Name</th>
              <th>Batch Number</th>
              <th>Available</th>
              <th>Min Level</th>
              <th>Status</th>
              <th>Expiry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaccines.forEach(vaccine => {
      const status = vaccine.isExpired ? 'Expired' : 
                    vaccine.quantityAvailable <= vaccine.minStockLevel ? 'Low Stock' : 
                    'In Stock';
      const statusBadge = `
        <span class="badge ${
          vaccine.isExpired ? 'bg-danger' :
          vaccine.quantityAvailable <= vaccine.minStockLevel ? 'bg-warning' :
          'bg-success'
        }">${status}</span>
      `;

      html += `
        <tr>
          <td><strong>${vaccine.name}</strong></td>
          <td>${vaccine.batchNumber}</td>
          <td>${vaccine.quantityAvailable}</td>
          <td>${vaccine.minStockLevel}</td>
          <td>${statusBadge}</td>
          <td>${formatDate(vaccine.expiryDate)}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="updateStockModal('${vaccine._id}', ${vaccine.quantityAvailable})">Update Stock</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('inventoryList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('inventoryList', `Error: ${error.message}`);
  }
}

// ===== LOAD LOW STOCK ALERTS =====

async function loadLowStockAlerts() {
  try {
    showLoadingSpinner('lowStockList');
    const response = await getLowStockAlerts();
    const alerts = response.data || [];

    if (alerts.length === 0) {
      document.getElementById('lowStockList').innerHTML = '<div class="alert alert-success"> All vaccines have adequate stock</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Current Stock</th>
              <th>Min Level</th>
              <th>Shortage</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    alerts.forEach(alert => {
      const shortage = alert.minStockLevel - alert.quantityAvailable;
      html += `
        <tr>
          <td><strong>${alert.name}</strong></td>
          <td>${alert.quantityAvailable}</td>
          <td>${alert.minStockLevel}</td>
          <td><span class="badge bg-danger">${shortage} units</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="showAddVaccineModal()">Order More</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('lowStockList').innerHTML = html;
    document.getElementById('lowStockCount').textContent = alerts.length;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('lowStockList', `Error: ${error.message}`);
  }
}

// ===== LOAD EXPIRING VACCINES =====

async function loadExpiringVaccines() {
  try {
    showLoadingSpinner('expiringList');
    const response = await getExpiringVaccines();
    const vaccines = response.data || [];

    if (vaccines.length === 0) {
      document.getElementById('expiringList').innerHTML = '<div class="alert alert-success"> No vaccines expiring soon</div>';
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Vaccine</th>
              <th>Batch Number</th>
              <th>Expiry Date</th>
              <th>Days Until Expiry</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
    `;

    vaccines.forEach(vaccine => {
      const today = new Date();
      const expiryDate = new Date(vaccine.expiryDate);
      const daysUntil = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      html += `
        <tr>
          <td><strong>${vaccine.name}</strong></td>
          <td>${vaccine.batchNumber}</td>
          <td>${formatDate(vaccine.expiryDate)}</td>
          <td><span class="badge bg-danger">${daysUntil} days</span></td>
          <td>${vaccine.quantityAvailable}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    document.getElementById('expiringList').innerHTML = html;
    document.getElementById('expiringCount').textContent = vaccines.length;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('expiringList', `Error: ${error.message}`);
  }
}

// ===== LOAD SUMMARY =====

async function loadSummary() {
  try {
    const response = await getInventorySummary();
    const summary = response.data || {};

    document.getElementById('totalStock').textContent = summary.totalAvailable || 0;
  } catch (error) {
    console.error('Error:', error);
  }
}

// ===== ADD VACCINE =====

async function handleAddVaccine(event) {
  if (event) event.preventDefault();

  try {
    const vaccineName = document.getElementById('vaccineName').value;
    const batchNumber = document.getElementById('batchNumber').value;
    const quantity = document.getElementById('quantity').value;
    const minStock = document.getElementById('minStock').value;
    const dateReceived = document.getElementById('dateReceived').value;
    const expiryDate = document.getElementById('expiryDate').value;
    const supplier = document.getElementById('supplier').value;

    if (!vaccineName || !batchNumber || !quantity || !dateReceived || !expiryDate || !supplier) {
      alert('Please fill in all required fields');
      return;
    }

    const data = {
      name: vaccineName,
      batchNumber,
      quantityReceived: parseInt(quantity),
      quantityAvailable: parseInt(quantity),
      minStockLevel: parseInt(minStock),
      dateReceived,
      expiryDate,
      supplier
    };

    await addVaccine(data);
    
    showSuccessMessage(' Vaccine batch added successfully!');
    document.getElementById('vaccineForm').reset();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('addVaccineModal'));
    modal.hide();

    // Refresh lists
    loadInventory();
    loadLowStockAlerts();
    loadExpiringVaccines();
    loadSummary();
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}

// ===== UPDATE STOCK MODAL =====

async function updateStockModal(vaccineId, currentStock) {
  const newStock = prompt(`Update stock for vaccine (Current: ${currentStock})`, currentStock);
  
  if (newStock !== null && newStock !== '') {
    try {
      const change = parseInt(newStock) - currentStock;
      const data = {
        quantityChange: change,
        reason: 'Manual adjustment'
      };

      await updateVaccineStock(vaccineId, data);
      
      showSuccessMessage(' Stock updated successfully!');
      
      // Refresh lists
      loadInventory();
      loadLowStockAlerts();
      loadSummary();
    } catch (error) {
      console.error('Error:', error);
      showErrorAlert(`Error: ${error.message}`);
    }
  }
}

// ===== SHOW ADD VACCINE MODAL =====

function showAddVaccineModal() {
  const modal = new bootstrap.Modal(document.getElementById('addVaccineModal'));
  modal.show();
}
