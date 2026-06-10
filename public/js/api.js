// public/js/api.js
// ─────────────────────────────────────────────────────────────────
// Wrapper centralizado para todas las llamadas fetch al backend.
//
// VENTAJAS de centralizar:
//   - El token se inyecta automáticamente en cada request
//   - Los errores 401 se manejan globalmente (redirect a login)
//   - La base URL se configura en un solo lugar
//   - El code de los otros módulos (exercises.js, routines.js) queda limpio
// ─────────────────────────────────────────────────────────────────

const API_BASE = '/api'; // Todas las rutas de API viven bajo /api.

/**
 * Fetch wrapper principal.
 * @param {string} endpoint - ej: '/exercises', '/auth/login'
 * @param {Object} options - fetch options extendidas
 * @returns {Promise<any>} data parseada como JSON
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('ft_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Si la respuesta es 401, el token expiró o es inválido
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

// Métodos de conveniencia
const api = {
  get:    (url)           => apiFetch(url, { method: 'GET' }),
  post:   (url, body)     => apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body)     => apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (url)           => apiFetch(url, { method: 'DELETE' }),
};