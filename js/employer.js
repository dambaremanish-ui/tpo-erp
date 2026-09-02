let currentEmployerSession = null;

document.addEventListener("DOMContentLoaded", () => {
  // Auto-fill Drive ID if provided via URL parameter (e.g., ?driveId=DRI123)
  const urlParams = new URLSearchParams(window.location.search);
  const prefillDriveId = urlParams.get('driveId');
  if (prefillDriveId) {
    const driveInput = document.getElementById('loginDriveId');
    driveInput.value = prefillDriveId;
    driveInput.readOnly = true;
    driveInput.classList.add('bg-light');
  }

  document.getElementById('employerLoginForm').addEventListener('submit', handleEmployerLogin);
});

async function handleEmployerLogin(e) {
  e.preventDefault();
  const dId = document.getElementById('loginDriveId').value.trim();
  const cId = document.getElementById('loginCompanyId').value.trim();

  const data = await fetchAPI('getEmployerDriveData', { driveId: dId, companyId: cId });
  
  if (data) {
    currentEmployerSession = data;
    renderEmployerDashboard();
  }
}

function renderEmployerDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');
  
  document.getElementById('empCompanyName').innerText = currentEmployerSession.companyName;
  document.getElementById('empRole').innerText = currentEmployerSession.role;

  const tbody = document.getElementById('applicantList');
  if (currentEmployerSession.applicants.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No applicants have registered yet.</td></tr>`;
    return;
  }

  let html = '';
  currentEmployerSession.applicants.forEach(a => {
    const cvBtn = a.cvUrl ? `<a href="${a.cvUrl}" target="_blank" class="btn btn-sm btn-outline-danger"><i class="bi bi-file-pdf"></i> View CV</a>` : '-';
    const badge = a.status.toUpperCase() === 'SELECTED' ? 'bg-success' : (a.status.toUpperCase() === 'REJECTED' ? 'bg-danger' : 'bg-primary');
    
    html += `<tr>
      <td class="ps-4 fw-bold">${a.name}<br><small class="text-muted">${a.mobile}</small></td>
      <td>${a.branch}</td>
      <td>${a.cgpa}</td>
      <td><a href="mailto:${a.email}" class="text-decoration-none">${a.email}</a></td>
      <td><span class="badge ${badge}">${a.status}</span></td>
      <td class="text-end pe-4">${cvBtn}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function employerLogout() {
  currentEmployerSession = null;
  document.getElementById('dashboardView').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('loginCompanyId').value = '';
}

/**
 * Parses nested JSON extra fields and exports a flat CSV.
 */
function exportEmployerCSV() {
  if (!currentEmployerSession || currentEmployerSession.applicants.length === 0) return;

  const applicants = currentEmployerSession.applicants;
  let csvContent = "data:text/csv;charset=utf-8,";
  
  let customKeys = new Set();
  applicants.forEach(app => {
    if (app.customDetails) {
      try { Object.keys(JSON.parse(app.customDetails)).forEach(k => customKeys.add(k)); } catch(e) {}
    }
  });
  
  const customKeyArray = Array.from(customKeys);
  const headers = ["Name", "Branch", "CGPA", "Email", "Mobile", "Status", "Resume Link", ...customKeyArray];
  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

  applicants.forEach(app => {
    const clean = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    let row = [
      clean(app.name), clean(app.branch), clean(app.cgpa), 
      clean(app.email), clean(app.mobile), clean(app.status), clean(app.cvUrl)
    ];
    
    let customData = {};
    if (app.customDetails) {
      try { customData = JSON.parse(app.customDetails); } catch(e) {}
    }
    customKeyArray.forEach(key => row.push(clean(customData[key] || '-')));

    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${currentEmployerSession.companyName}_Applicants.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
