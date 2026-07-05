// ===== APPOINTMENTS PAGE INITIALIZATION =====

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
  loadTodayAppointments();
  loadAllAppointments();
  loadMissedAppointments();
  loadChildrenForAppointment();
  loadVaccinesForAppointment();
});

// ===== LOAD TODAY'S APPOINTMENTS =====

async function loadTodayAppointments() {
  try {
    showLoadingSpinner('todayList');
    const response = await getTodayAppointments();
    const appointments = response.data || [];

    if (appointments.length === 0) {
      document.getElementById('todayList').innerHTML = '<div class="alert alert-info">No appointments scheduled for today</div>';
      return;
    }

    let html = generateAppointmentTable(appointments, 'today');
    document.getElementById('todayList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('todayList', `Error: ${error.message}`);
  }
}

// ===== LOAD ALL APPOINTMENTS =====

async function loadAllAppointments() {
  try {
    showLoadingSpinner('allList');
    const response = await getAppointments(1, 50);
    const appointments = response.data || [];

    if (appointments.length === 0) {
      document.getElementById('allList').innerHTML = '<div class="alert alert-info">No appointments found</div>';
      return;
    }

    let html = generateAppointmentTable(appointments, 'all');
    document.getElementById('allList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('allList', `Error: ${error.message}`);
  }
}

// ===== LOAD MISSED APPOINTMENTS =====

async function loadMissedAppointments() {
  try {
    showLoadingSpinner('missedList');
    const response = await getMissedAppointments(1, 50);
    const appointments = response.data || [];

    if (appointments.length === 0) {
      document.getElementById('missedList').innerHTML = '<div class="alert alert-success">No missed appointments</div>';
      return;
    }

    let html = generateAppointmentTable(appointments, 'missed');
    document.getElementById('missedList').innerHTML = html;
  } catch (error) {
    console.error('Error:', error);
    showErrorMessage('missedList', `Error: ${error.message}`);
  }
}

// ===== GENERATE APPOINTMENT TABLE =====

function generateAppointmentTable(appointments, type) {
  let html = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th>Patient</th>
            <th>Guardian</th>
            <th>Vaccine</th>
            <th>Date & Time</th>
            <th>Status</th>
            ${type === 'all' || type === 'today' ? '<th>Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>
  `;

  appointments.forEach(apt => {
    const statusBadge = `
      <span class="badge ${
        apt.status === 'completed' ? 'bg-success' :
        apt.status === 'missed' ? 'bg-danger' :
        apt.status === 'cancelled' ? 'bg-secondary' :
        apt.status === 'rescheduled' ? 'bg-warning' :
        'bg-info'
      }">${apt.status}</span>
    `;

    html += `
      <tr>
        <td><strong>${apt.child?.firstName} ${apt.child?.lastName}</strong></td>
        <td>${apt.guardian?.name || 'N/A'}</td>
        <td>${apt.vaccine}</td>
        <td>${formatDateTime(apt.appointmentDate)}</td>
        <td>${statusBadge}</td>
        ${type === 'all' ? `
          <td>
            <button class="btn btn-sm btn-warning" onclick="editAppointment('${apt._id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteAppointmentConfirm('${apt._id}')">Delete</button>
          </td>
        ` : type === 'today' ? `
          <td>
            ${apt.status === 'scheduled' ? `<button class="btn btn-sm btn-success" onclick="markAppointmentCompleted('${apt._id}')">Mark Done</button>` : ''}
          </td>
        ` : ''}
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  return html;
}

// ===== LOAD CHILDREN FOR APPOINTMENT =====

async function loadChildrenForAppointment() {
  try {
    const response = await getChildren(1, 100);
    const children = response.data || [];
    
    const select = document.getElementById('appointmentChild');
    children.forEach(child => {
      const option = document.createElement('option');
      option.value = child._id;
      option.textContent = `${child.firstName} ${child.lastName} (${child.patientId})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Populate vaccine dropdown for appointment form
async function loadVaccinesForAppointment() {
  try {
    const vaccineNames = ['BCG', 'OPV', 'Pentavalent', 'Measles', 'Rotavirus', 'PCV', 'Hepatitis B'];
    const select = document.getElementById('appointmentVaccine');
    vaccineNames.forEach(vaccine => {
      const option = document.createElement('option');
      option.value = vaccine;
      option.textContent = vaccine;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading vaccines for appointment:', error);
  }
}

// Send reminders immediately (presentation/manual trigger)
async function handleSendReminders() {
  try {
    const confirmSend = confirm('Send appointment reminders for 1 day before appointments?');
    if (!confirmSend) return;
    // disable button while sending
    const btn = document.getElementById('sendRemindersBtn');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    // Call API: default daysInAdvance = 1
    const result = await sendAppointmentReminders();
    showSuccessMessage(`Reminders processed: sent=${result.data?.sent || 0}, attempted=${result.data?.attempted || 0}`);
  } catch (error) {
    console.error('Error sending reminders:', error);
    showErrorAlert(`Error sending reminders: ${error.message}`);
  } finally {
    const btn = document.getElementById('sendRemindersBtn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Reminders';
    }
  }
}

// ===== CREATE APPOINTMENT =====

async function handleCreateAppointment(event) {
  if (event) event.preventDefault();

  try {
    const childId = document.getElementById('appointmentChild').value;
    const vaccine = document.getElementById('appointmentVaccine').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;

    if (!childId || !vaccine || !appointmentDate || !appointmentTime) {
      alert('Please fill in all required fields');
      return;
    }

    const dateTime = `${appointmentDate}T${appointmentTime}`;

    const data = {
      child: childId,
      vaccine,
      appointmentDate: dateTime,
      status: 'scheduled'
    };

    await createAppointment(data);
    
    showSuccessMessage(' Appointment scheduled successfully!');
    document.getElementById('appointmentForm').reset();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('createAppointmentModal'));
    modal.hide();

    // Refresh lists
    loadTodayAppointments();
    loadAllAppointments();
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}

// ===== EDIT APPOINTMENT =====

async function editAppointment(appointmentId) {
  try {
    const response = await getAppointmentById(appointmentId);
    // Appointment is directly in response.data
    const apt = response.data;

    document.getElementById('appointmentChild').value = apt.child._id;
    document.getElementById('appointmentVaccine').value = apt.vaccine;
    
    const dateTime = apt.appointmentDate.split('T');
    document.getElementById('appointmentDate').value = dateTime[0];
    document.getElementById('appointmentTime').value = dateTime[1].substring(0, 5);
    // remarks removed

    const modal = new bootstrap.Modal(document.getElementById('createAppointmentModal'));
    modal.show();

    // Update button handler
    const submitBtn = document.querySelector('#createAppointmentModal .modal-footer .btn-primary');
    submitBtn.textContent = 'Update Appointment';
    submitBtn.onclick = () => handleUpdateAppointment(appointmentId);
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}

async function handleUpdateAppointment(appointmentId) {
  try {
    const childId = document.getElementById('appointmentChild').value;
    const vaccine = document.getElementById('appointmentVaccine').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('appointmentTime').value;
    const dateTime = `${appointmentDate}T${appointmentTime}`;
    const data = {
      child: childId,
      vaccine,
      appointmentDate: dateTime,
    };

    await updateAppointment(appointmentId, data);
    
    showSuccessMessage(' Appointment updated successfully!');
    document.getElementById('appointmentForm').reset();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('createAppointmentModal'));
    modal.hide();

    loadTodayAppointments();
    loadAllAppointments();
  } catch (error) {
    console.error('Error:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}

// ===== DELETE APPOINTMENT =====

async function deleteAppointmentConfirm(appointmentId) {
  if (confirm('Are you sure you want to delete this appointment?')) {
    try {
      await deleteAppointment(appointmentId);
      showSuccessMessage(' Appointment deleted');
      loadTodayAppointments();
      loadAllAppointments();
    } catch (error) {
      console.error('Error:', error);
      showErrorAlert(`Error: ${error.message}`);
    }
  }
}

// Mark appointment as completed (nurse action)
async function markAppointmentCompleted(appointmentId) {
  if (!confirm('Mark this appointment as completed?')) return;
  try {
    await updateAppointment(appointmentId, { status: 'completed' });
    showSuccessMessage(' Appointment marked completed');
    loadTodayAppointments();
    loadAllAppointments();
  } catch (error) {
    console.error('Error marking appointment completed:', error);
    showErrorAlert(`Error: ${error.message}`);
  }
}
