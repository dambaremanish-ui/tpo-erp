let activeStudent = null;

document.addEventListener("DOMContentLoaded", () => {
  const session = localStorage.getItem('tpo_student_session');
  if (session) {
    activeStudent = JSON.parse(session);
    showDashboard();
  }
  
  document.getElementById('studentLoginForm').addEventListener('submit', handleStudentLogin);
});

async function handleStudentLogin(e) {
  e.preventDefault();
  const grNo = document.getElementById('loginGrNo').value.trim();
  const passkey = document.getElementById('loginPasskey').value.trim();

  const data = await fetchAPI('studentLogin', { grNo: grNo, passkey: passkey });
  
  if (data) {
    activeStudent = data;
    localStorage.setItem('tpo_student_session', JSON.stringify(activeStudent));
    showDashboard();
  }
}

function showDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  document.getElementById('studentName').innerText = activeStudent.name;
  loadStudentProfile();
}

function studentLogout() {
  localStorage.removeItem('tpo_student_session');
  activeStudent = null;
  document.getElementById('dashboardView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('studentLoginForm').reset();
}

/**
 * Fetches and renders the student's static profile and experiences.
 */
async function loadStudentProfile() {
  const container = document.getElementById('profileDataContainer');
  const expContainer = document.getElementById('experienceList');
  
  const data = await fetchAPI('getStudentPortalData', { grNo: activeStudent.grNo });
  
  if (data) {
    // Render Profile Fields
    let profHtml = '<div class="row g-3">';
    data.profile.headers.forEach((h, i) => {
      const hUpper = h.toUpperCase();
      if (!hUpper.includes('PASSKEY') && !hUpper.includes('URL') && !hUpper.includes('OTP')) {
        profHtml += `<div class="col-md-4"><label class="text-muted small fw-bold">${h}</label><div class="p-2 bg-light border rounded text-truncate">${data.profile.data[i] || '-'}</div></div>`;
      }
    });
    container.innerHTML = profHtml + '</div>';

    // Render Experiences
    let expHtml = '';
    data.experiences.forEach(e => {
      expHtml += `<div class="list-group-item mb-2 border rounded shadow-sm">
        <h6 class="mb-1 fw-bold">${e[4]} at ${e[3]}</h6>
        <p class="mb-1 small text-muted">Duration: ${e[5]}</p>
      </div>`;
    });
    expContainer.innerHTML = expHtml || '<div class="alert alert-light border">No records added.</div>';
  }
}

/**
 * Fetches drives eligible for the student.
 */
async function loadPlacementDrives() {
  const container = document.getElementById('drivesContainer');
  const data = await fetchAPI('getEligibleDrives', { grNo: activeStudent.grNo });
  
  if (data) {
    if (data.drives.length === 0) {
      container.innerHTML = `<div class="col-12"><div class="alert alert-light border text-center py-4">No active drives matching your criteria.</div></div>`;
      return;
    }

    let html = '';
    data.drives.forEach(d => {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100 shadow-sm ${d.isApplied ? 'border-success' : 'border-primary'} border-start border-4">
            <div class="card-body">
              <h6 class="fw-bold">${d.company}</h6>
              <p class="text-muted small mb-2">${d.designation}</p>
              ${d.isApplied ? `<button class="btn btn-sm btn-outline-success w-100" disabled>Applied</button>` : `<button class="btn btn-sm btn-primary w-100" onclick="alert('Smart Apply Logic Pending')">Apply Now</button>`}
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }
}

let currentActiveOTP = null;
let rawProfileHeaders = [];
let rawProfileData = [];

/**
 * Requests an OTP from the backend to unlock editing.
 */
async function requestEditOTP() {
  const data = await fetchAPI('requestProfileEditOTP', { grNo: activeStudent.grNo });
  
  if (data) {
    const result = await Swal.fire({
      title: 'Enter Edit Code',
      text: 'An OTP has been sent to your registered college email.',
      input: 'text',
      inputAttributes: { autocapitalize: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Unlock Profile'
    });

    if (result.isConfirmed && result.value) {
      currentActiveOTP = result.value;
      renderEditableProfile();
    }
  }
}

/**
 * Transforms the static profile UI into editable fields.
 */
function renderEditableProfile() {
  const container = document.getElementById('profileDataContainer');
  let formHtml = '<div class="row g-3">';
  
  rawProfileHeaders.forEach((h, i) => {
    const hUpper = h.toUpperCase();
    if (!hUpper.includes('PASSKEY') && !hUpper.includes('URL') && !hUpper.includes('OTP')) {
      const isReadOnly = (hUpper === 'GR NO.');
      formHtml += `
        <div class="col-md-4">
          <label class="text-muted small fw-bold">${h}</label>
          <input type="text" class="form-control edit-profile-input" data-header="${h}" value="${rawProfileData[i] || ''}" ${isReadOnly ? 'disabled bg-light' : ''}>
        </div>`;
    }
  });
  
  formHtml += `
    <div class="col-12 mt-4 text-end border-top pt-3">
      <button class="btn btn-secondary me-2" onclick="loadStudentProfile()">Cancel</button>
      <button class="btn btn-success fw-bold" onclick="submitProfileEdits()">Save Changes</button>
    </div>
  </div>`;
  
  container.innerHTML = formHtml;
}

/**
 * Gathers the updated fields and submits the patch to the backend.
 */
async function submitProfileEdits() {
  const updatedData = {};
  document.querySelectorAll('.edit-profile-input:not([disabled])').forEach(input => {
    updatedData[input.getAttribute('data-header')] = input.value;
  });

  const data = await fetchAPI('saveStudentProfile', {
    grNo: activeStudent.grNo,
    otp: currentActiveOTP,
    updatedData: updatedData
  });

  if (data) {
    Swal.fire('Success!', 'Your profile has been updated.', 'success');
    currentActiveOTP = null;
    loadStudentProfile(); // Resets back to static read-only view
  }
}

/**
 * Evaluates the form schema and dictates a 1-click apply or a dynamic modal.
 */
function handleSmartApplication(driveId, regLink, encodedSchema) {
  let schemaStr = decodeURIComponent(encodedSchema);
  let schema = null;
  try { if (schemaStr) schema = JSON.parse(schemaStr); } catch(e) {}

  if (!schema || (schema.stdFields.length === 0 && schema.customFields.length === 0)) {
    // 1-Click Apply Route
    Swal.fire({
      title: 'Quick Apply',
      text: 'Submit your default master profile for this drive?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Apply Now'
    }).then(res => {
      if (res.isConfirmed) executeDriveApplication(driveId, regLink, {});
    });
    return;
  }

  // Dynamic Form Route
  let formHtml = `<div class="text-start">`;
  schema.stdFields.forEach(f => {
    if (f.editable) {
      formHtml += `<label class="fw-bold small text-muted mb-1">${f.name}</label><input type="text" class="form-control mb-3 dynamic-app-input" data-key="${f.name}">`;
    }
  });

  if (schema.customFields.length > 0) {
    formHtml += `<hr><h6 class="fw-bold text-primary mb-3">Extra Requirements</h6>`;
    schema.customFields.forEach(f => {
      formHtml += `<label class="fw-bold small text-muted mb-1">${f}</label><input type="text" class="form-control mb-3 dynamic-app-input" data-key="${f}" required>`;
    });
  }
  
  Swal.fire({
    title: 'Application Details Required',
    html: formHtml + `</div>`,
    showCancelButton: true,
    confirmButtonText: 'Submit Application',
    preConfirm: () => {
      let submissionData = {};
      document.querySelectorAll('.dynamic-app-input').forEach(input => {
        submissionData[input.getAttribute('data-key')] = input.value;
      });
      return submissionData;
    }
  }).then(result => {
    if (result.isConfirmed) executeDriveApplication(driveId, regLink, result.value);
  });
}

/**
 * Fires the API request to officially record the application.
 */
async function executeDriveApplication(driveId, regLink, customDataObj) {
  const data = await fetchAPI('applyForDrive', {
    grNo: activeStudent.grNo,
    driveId: driveId,
    customDetailsJSON: JSON.stringify(customDataObj)
  });

  if (data) {
    Swal.fire('Submitted!', 'Application recorded successfully.', 'success');
    if (regLink && regLink.startsWith('http')) window.open(regLink, '_blank');
    loadPlacementDrives(); // Refresh the UI state
  }
}
