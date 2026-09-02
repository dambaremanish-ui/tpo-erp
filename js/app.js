// Global State
let currentUser = null;

// Data Tracking State
let currentModule = '';
let currentHeaders = [];
let currentTableData = [];
let editModeIndex = -1; // -1 means 'Add Mode', otherwise it holds the row index for 'Edit Mode'

/**
 * Initializes the application on page load.
 */
document.addEventListener("DOMContentLoaded", () => {
  const session = localStorage.getItem('tpo_erp_session');
  if (session) {
    currentUser = JSON.parse(session);
    renderDashboard();
  } else {
    renderLogin();
  }
});

/**
 * Injects the Login View into the app root.
 */
function renderLogin() {
  const appRoot = document.getElementById('app-root');
  appRoot.innerHTML = `
    <div class="d-flex align-items-center justify-content-center min-vh-100">
      <div class="card shadow-lg p-4 w-100" style="max-width: 420px; border-radius: 16px;">
        <div class="text-center mb-4">
          <h3 class="fw-bold text-primary">TPO ERP Portal</h3>
          <p class="text-muted">Staff & Administrator Access</p>
        </div>
        <form id="loginForm">
          <div class="mb-3">
            <label class="form-label fw-semibold">Staff ID</label>
            <input type="text" class="form-control form-control-lg" id="staffId" placeholder="e.g. TPO01" required>
          </div>
          <div class="mb-4">
            <label class="form-label fw-semibold">Password / Email</label>
            <input type="password" class="form-control form-control-lg" id="password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold" id="loginBtn">Secure Login</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

/**
 * Processes the login request via the centralized API.
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const id = document.getElementById('staffId').value.trim();
  const password = document.getElementById('password').value.trim();
  
  // fetchAPI automatically handles the loading spinner and error alerts
  const data = await fetchAPI('authenticate', { 
    userType: 'STAFF', 
    id: id, 
    password: password 
  });

  if (data) {
    currentUser = data;
    localStorage.setItem('tpo_erp_session', JSON.stringify(currentUser));
    renderDashboard();
  }
}

/**
 * Injects the main Dashboard Shell into the app root.
 */
function renderDashboard() {
  const appRoot = document.getElementById('app-root');
  const isAdmin = currentUser.role.toUpperCase() === 'ADMIN';

  appRoot.innerHTML = `
    <!-- Top Navbar -->
    <nav class="navbar navbar-dark bg-dark px-3 shadow-sm">
      <span class="navbar-brand mb-0 h1 fw-bold"><i class="bi bi-mortarboard-fill me-2"></i>TPO ERP</span>
      <div class="ms-auto d-flex align-items-center">
        <span class="text-light me-3 fw-semibold">Hello, ${currentUser.name}</span>
        <button class="btn btn-sm btn-danger fw-bold" onclick="logout()">Logout</button>
      </div>
    </nav>

    <!-- Sidebar & Content Layout -->
    <div class="d-flex" style="min-height: calc(100vh - 56px);">
      
      <!-- Sidebar -->
      <div class="bg-white border-end pt-3" style="width: 250px; min-height: 100%;">
        <div class="list-group list-group-flush" id="navMenu">
          <a class="list-group-item list-group-item-action sidebar-link active" onclick="loadModule('Dashboard')"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a>
          <a class="list-group-item list-group-item-action sidebar-link" onclick="loadModule('Students')"><i class="bi bi-people-fill me-2"></i>Student Records</a>
          ${isAdmin ? `<a class="list-group-item list-group-item-action sidebar-link" onclick="loadModule('Drives')"><i class="bi bi-building me-2"></i>Placement Drives</a>` : ''}
          <a class="list-group-item list-group-item-action sidebar-link" onclick="loadModule('Companies')"><i class="bi bi-buildings me-2"></i>Company Master</a>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-grow-1 p-4 bg-light" id="mainContent" style="overflow-y: auto; height: calc(100vh - 56px);">
        <h4 class="fw-bold mb-3" id="moduleTitle">Welcome to TPO Operations</h4>
        <div class="card shadow-sm border-0">
          <div class="card-body" id="moduleContainer">
            <p class="text-muted">Please select a module from the menu.</p>
          </div>
        </div>
      </div>

    </div>
  `;
}

/**
 * Handles the sidebar navigation routing.
 */
async function loadModule(moduleName) {
  // Update UI active state
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  document.getElementById('moduleTitle').innerText = moduleName;
  const container = document.getElementById('moduleContainer');
  
  if (moduleName === 'Dashboard') {
    container.innerHTML = '<p class="text-muted">Dashboard analytics will load here.</p>';
    return;
  }

  // Fetch module data
  const data = await fetchAPI('getModuleData', {
    moduleName: moduleName,
    role: currentUser.role,
    branch: currentUser.branch
  });

  if (data) {
    // Capture state for the modals
    currentModule = moduleName;
    currentHeaders = data.headers;
    currentTableData = data.rows;
    
    // Render the table
    renderTable(moduleName, data.headers, data.rows);
  }
}

/**
 * Clears the session and reloads the app.
 */
function logout() {
  localStorage.removeItem('tpo_erp_session');
  currentUser = null;
  renderLogin();
}

/**
 * Placeholder for the Data Table Renderer (To be implemented in Step 4)
 */
/**
 * Dynamically builds and initializes a Bootstrap DataTable.
 */
function renderTable(moduleName, headers, rows) {
  const container = document.getElementById('moduleContainer');

  // 1. Build the HTML Table Structure
  let tableHTML = `
    <div class="table-responsive bg-white rounded shadow-sm border p-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="fw-bold text-primary mb-0">${moduleName} Database</h5>
        <button class="btn btn-sm btn-success fw-bold" onclick="openAddModal('${moduleName}')">
          <i class="bi bi-plus-lg me-1"></i> Add New
        </button>
      </div>
      <table id="dataTable" class="table table-striped table-hover align-middle w-100">
        <thead class="table-dark">
          <tr>
            <th>Actions</th>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => {
            
            // Generate standard Action Buttons
            let actionButtons = `
              <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditModal(${index})" title="Edit">
                <i class="bi bi-pencil-square"></i>
              </button>
            `;

            // Format Cells (You can expand this later to render images or links safely)
            let formattedCells = row.map(cell => {
              const cellData = cell ? String(cell) : '';
              if (cellData.startsWith('http')) {
                return `<td><a href="${cellData}" target="_blank" class="btn btn-sm btn-danger"><i class="bi bi-file-earmark-pdf"></i></a></td>`;
              }
              return `<td>${cellData}</td>`;
            }).join('');

            return `
              <tr>
                <td class="text-nowrap">${actionButtons}</td>
                ${formattedCells}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // 2. Inject HTML into the DOM
  container.innerHTML = tableHTML;

  // 3. Destroy existing DataTable instance if it exists (prevents initialization errors)
  if ($.fn.DataTable.isDataTable('#dataTable')) {
    $('#dataTable').DataTable().destroy();
  }

  // 4. Initialize the new DataTable
  $('#dataTable').DataTable({
    pageLength: 15,
    order: [[1, "desc"]], // Sort by the first data column by default
    language: {
      search: "_INPUT_",
      searchPlaceholder: "Search records..."
    }
  });
}

/**
 * Opens the modal in "Add" mode.
 */
function openAddModal(moduleName) {
  editModeIndex = -1; // Set to Add mode
  document.getElementById('universalModalTitle').innerText = `Add New ${moduleName} Record`;
  document.getElementById('modalHeader').className = 'modal-header bg-success text-white';
  
  const formFields = document.getElementById('universalFormFields');
  formFields.innerHTML = '';
  
  currentHeaders.forEach((header, i) => {
    // Auto-generate standard IDs if applicable
    let autoValue = '';
    let isReadOnly = false;
    if (header.toUpperCase().includes('ID') && !header.toUpperCase().includes('EMAIL')) {
      autoValue = moduleName.substring(0, 3).toUpperCase() + new Date().getTime();
      isReadOnly = true;
    }

    formFields.innerHTML += `
      <div class="col-md-6">
        <label class="form-label fw-bold text-muted small mb-1">${header}</label>
        <input type="text" class="form-control modal-input" id="input_col_${i}" value="${autoValue}" ${isReadOnly ? 'readonly bg-light' : ''}>
      </div>
    `;
  });
  
  new bootstrap.Modal(document.getElementById('universalModal')).show();
}

/**
 * Opens the modal in "Edit" mode and populates existing data.
 */
function openEditModal(rowIndex) {
  editModeIndex = rowIndex; // Set to Edit mode
  const rowData = currentTableData[rowIndex];
  
  document.getElementById('universalModalTitle').innerText = `Edit ${currentModule} Record`;
  document.getElementById('modalHeader').className = 'modal-header bg-primary text-white';
  
  const formFields = document.getElementById('universalFormFields');
  formFields.innerHTML = '';
  
  currentHeaders.forEach((header, i) => {
    // Make primary keys (like ID or Timestamp) read-only during edits
    const isReadOnly = header.toUpperCase().includes('ID') || header.toUpperCase().includes('TIMESTAMP');
    
    formFields.innerHTML += `
      <div class="col-md-6">
        <label class="form-label fw-bold text-muted small mb-1">${header}</label>
        <input type="text" class="form-control modal-input" id="input_col_${i}" value="${rowData[i] || ''}" ${isReadOnly ? 'readonly bg-light' : ''}>
      </div>
    `;
  });
  
  new bootstrap.Modal(document.getElementById('universalModal')).show();
}

/**
 * Gathers form data and pushes it to the backend REST API.
 */
async function saveRecord() {
  const btn = document.getElementById('saveRecordBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

  // Gather data from all generated inputs
  let payloadData = [];
  currentHeaders.forEach((_, i) => {
    payloadData.push(document.getElementById(`input_col_${i}`).value);
  });

  const isEdit = editModeIndex !== -1;
  const action = isEdit ? 'updateRecord' : 'addRecord';
  
  const payload = {
    moduleName: currentModule,
    rowData: payloadData,
    rowIndex: editModeIndex // Only used if updating
  };

  const result = await fetchAPI(action, payload);

  if (result) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Record saved successfully!',
      showConfirmButton: false,
      timer: 2000
    });
    
    // Hide modal and refresh the table
    bootstrap.Modal.getInstance(document.getElementById('universalModal')).hide();
    loadModule(currentModule);
  }

  btn.disabled = false;
  btn.innerText = 'Save';
}
