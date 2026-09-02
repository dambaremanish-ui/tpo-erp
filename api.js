// Paste the Web App URL generated from Step 1 deployment
const API_URL = 'https://script.google.com/macros/s/AKfycbyniyQRZQV5dVDuLCvu77R0dc-naspfqSaO0yKUU7lIVuiab3YvIj9UqatrAHwlQdI8/exec';

/**
 * Handles all network requests to the Apps Script backend.
 * Automatically manages the global loading spinner and error modals.
 */
async function fetchAPI(action, payload = {}) {
  const loader = document.getElementById('global-loader');
  loader.classList.remove('d-none');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify({ action: action, payload: payload })
    });

    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error(result.message || 'Unknown Backend Error');
    }
    
    return result.data;

  } catch (error) {
    Swal.fire('Server Error', error.message, 'error');
    return null; // Return null so the calling component knows the request failed
  } finally {
    loader.classList.add('d-none');
  }
}