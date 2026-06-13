// public/js/api.js
// ─────────────────────────────────────────────────────────────────
// Centralized wrapper for all fetch calls to the backend.
//
// ADVANTAGES of centralizing:
//   - The token is automatically injected in each request
//   - 401 errors are handled globally (redirect to login)
//   - The base URL is configured in one place
//   - The code of other modules (exercises.js, routines.js) stays clean
// ─────────────────────────────────────────────────────────────────

const API_BASE = '/api'; // All API routes live under /api.

/**
 * Fetch wrapper principal.
 * @param {string} endpoint - ej: '/exercises', '/auth/login'
 * @param {Object} options - fetch options extendidas
 * @returns {Promise<any>} data parseada como JSON
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('ft_token');

  const headers = { ...options.headers };

  // Only send Content-Type for requests with a body (POST/PUT)
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  // If the response is 401, the token expired or is invalid
  if (response.status === 401) {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
    window.location.href = '/login';
    return;
  }

  // Respuestas 204 (No Content) no tienen body
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  // Si el servidor retorna success: false, lanzamos un error con el mensaje
  if (!response.ok || !data.success) {
    const error = new Error(data.message || `HTTP error ${response.status}`);
    error.status = response.status;
    error.errors = data.errors;
    throw error;
  }

  return data;
}

// Convenience methods
const api = {
  get:    (url)           => apiFetch(url, { method: 'GET' }),
  post:   (url, body)     => apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body)     => apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (url)           => apiFetch(url, { method: 'DELETE' }),
};