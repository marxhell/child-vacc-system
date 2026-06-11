// ===== CHILDREN PAGE INITIALIZATION =====

let childrenModal;
let childDetailsModal;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize modals
  childrenModal = new bootstrap.Modal(document.getElementById('registerChildModal'));
  childDetailsModal = new bootstrap.Modal(document.getElementById('childDetailsModal'));

  // Display user info
  document.getElementById('userDisplay').textContent = `${user.firstName} ${user.lastName}`;

  // Initialize sidebar
  initializeSidebar(user.role);

  // Load children
  loadChildren();

  // Setup search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentPage = 1;
    loadChildren(e.target.value);
  });
});

// ===== LOAD CHILDREN =====

async function loadChildren(search = '', page = 1) {
  try {
    showLoadingSpinner('childrenList');
    const response = await getChildren(page, 10, search);
    const children = response.data || [];
    const pagination = response.pagination || null;

    if (children.length === 0) {
      document.getElementById('childrenList').innerHTML = `
        <div class="alert alert-info">
          No children found. ${search ? 'Try a different search term.' : 'Register a new child to get started.'}
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Date of Birth</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    children.forEach(child => {
      const age = getAgeInMonths(child.dateOfBirth);
      const ageDisplay = age < 12 ? `${age} months` : `${getAgeInYears(child.dateOfBirth)} years`;
      const status = child.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';

      html += `
        <tr>
          <td><strong>${child.patientId}</strong></td>
          <td>${child.firstName} ${child.lastName}</td>
          <td>${formatDate(child.dateOfBirth)}</td>
          <td>${child.gender}</td>
          <td>${ageDisplay}</td>
          <td>${status}</td>
          <td>
            <button class="btn btn-sm btn-info" onclick="viewChildDetails('${child._id}')">View</button>
            <button class="btn btn-sm btn-warning" onclick="editChild('${child._id}')">Edit</button>
          </td>
        </tr>
      `;
    });

    html += `
      </tbody>
        </table>
      </div>
    `;

    // Add pagination if needed
    if (pagination && pagination.pages > 1) {
      html += `
        <nav>
          <ul class="pagination">
            ${pagination.page > 1 ? `<li class="page-item"><a class="page-link" href="#" onclick="loadChildren('${search}', ${pagination.page - 1})">Previous</a></li>` : ''}
            <li class="page-item active"><a class="page-link" href="#">Page ${pagination.page} of ${pagination.pages}</a></li>
            ${pagination.page < pagination.pages ? `<li class="page-item"><a class="page-link" href="#" onclick="loadChildren('${search}', ${pagination.page + 1})">Next</a></li>` : ''}
          </ul>
        </nav>
      `;
    }

    document.getElementById('childrenList').innerHTML = html;
  } catch (error) {
    console.error('Error loading children:', error);
    showErrorMessage('childrenList', `Error loading children: ${error.message}`);
  }
}

// ===== REGISTER CHILD =====

async function handleRegisterChild() {
  try {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const gender = document.getElementById('gender').value;
    const bloodGroup = document.getElementById('bloodGroup').value;
    const guardianName = document.getElementById('guardianName').value.trim();
    const guardianRelationship = document.getElementById('guardianRelationship').value;
    const guardianEmail = document.getElementById('guardianEmail').value.trim();
    const guardianPhone = document.getElementById('guardianPhone').value.trim();

    // Validate
    if (!firstName || !lastName || !dateOfBirth || !gender) {
      alert('Please fill in all required fields');
      return;
    }

    if (!validateDateOfBirth(dateOfBirth)) {
      alert('Date of birth must be in the past');
      return;
    }

    const childData = {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || undefined,
      guardianName: guardianName || undefined,
      guardianRelationship: guardianRelationship || undefined,
      guardianEmail: guardianEmail || undefined,
      guardianPhone: guardianPhone || undefined,
    };

    const response = await registerChild(childData);
    
    showSuccessMessage(' Child registered successfully!');
    
    // Close modal and reload
    childrenModal.hide();
    document.getElementById('registerChildForm').reset();
    loadChildren();

  } catch (error) {
    console.error('Registration error:', error);
    showErrorAlert(`Registration failed: ${error.message}`);
  }
}

// ===== VIEW CHILD DETAILS =====

async function viewChildDetails(childId) {
  try {
    showLoadingSpinner('childDetailsContent');
    childDetailsModal.show();

    const response = await getChildById(childId);
    const child = response.data;

    const vaccinations = child.vaccinations || [];
    const guardians = child.guardians || [];

    let html = `
      <div class="row mb-4">
        <div class="col-md-6">
          <h6 class="text-muted">Personal Information</h6>
          <p><strong>Patient ID:</strong> ${child.patientId}</p>
          <p><strong>Name:</strong> ${child.firstName} ${child.lastName}</p>
          <p><strong>Date of Birth:</strong> ${formatDate(child.dateOfBirth)}</p>
          <p><strong>Age:</strong> ${getAgeInMonths(child.dateOfBirth)} months</p>
          <p><strong>Gender:</strong> ${child.gender}</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-muted">Additional Information</h6>
          <p><strong>Blood Group:</strong> ${child.bloodGroup || 'N/A'}</p>
          <p><strong>Birth Certificate:</strong> ${child.birthCertificateNumber || 'N/A'}</p>
          <p><strong>Residence:</strong> ${child.residence || 'N/A'}</p>
          <p><strong>Status:</strong> ${child.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</p>
        </div>
      </div>

      <hr>

      <h6 class="text-muted mb-3">Guardians (${guardians.length})</h6>
      ${guardians.length > 0 ? `
        <div class="row mb-4">
          ${guardians.map(g => `
            <div class="col-md-6 mb-3">
              <div class="card">
                <div class="card-body">
                  <p class="mb-1"><strong>${g.name}</strong></p>
                  <small class="text-muted">${g.relationship || 'N/A'}</small><br>
                  <small>${g.phoneNumber || 'N/A'}</small>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="text-muted">No guardians linked</p>'}

      <hr>

      <h6 class="text-muted mb-3">Vaccination Schedule (${vaccinations.length})</h6>
      ${vaccinations.length > 0 ? `
        <div class="table-responsive">
          <table class="table table-sm">
            <thead class="table-light">
              <tr>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Scheduled Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${vaccinations.map(v => `
                <tr>
                  <td>${v.vaccine}</td>
                  <td>Dose ${v.doseNumber}</td>
                  <td>${formatDate(v.scheduledDate)}</td>
                  <td><span class="badge bg-${v.status === 'completed' ? 'success' : v.status === 'overdue' ? 'danger' : 'warning'}">${v.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="text-muted">No vaccinations scheduled</p>'}
    `;

    document.getElementById('childDetailsContent').innerHTML = html;
  } catch (error) {
    console.error('Error loading child details:', error);
    document.getElementById('childDetailsContent').innerHTML = `
      <div class="alert alert-danger">Error loading details: ${error.message}</div>
    `;
  }
}

// ===== EDIT CHILD =====

async function editChild(childId) {
  try {
    const response = await getChildById(childId);
    const child = response.data;

    // Pre-fill form
    document.getElementById('firstName').value = child.firstName;
    document.getElementById('lastName').value = child.lastName;
    document.getElementById('dateOfBirth').value = child.dateOfBirth.split('T')[0];
    document.getElementById('gender').value = child.gender;
    document.getElementById('bloodGroup').value = child.bloodGroup || '';

    // Change button to update
    const submitBtn = document.querySelector('#registerChildModal .modal-footer .btn-primary');
    submitBtn.textContent = 'Update Child';
    submitBtn.onclick = () => handleUpdateChild(childId);

    childrenModal.show();
  } catch (error) {
    console.error('Error loading child:', error);
    showErrorAlert(`Error loading child: ${error.message}`);
  }
}

async function handleUpdateChild(childId) {
  try {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const gender = document.getElementById('gender').value;
    const bloodGroup = document.getElementById('bloodGroup').value;

    const childData = {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || undefined,
    };

    await updateChild(childId, childData);
    
    showSuccessMessage(' Child updated successfully!');
    childrenModal.hide();
    document.getElementById('registerChildForm').reset();
    loadChildren();

  } catch (error) {
    console.error('Update error:', error);
    showErrorAlert(`Update failed: ${error.message}`);
  }
}
