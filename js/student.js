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
