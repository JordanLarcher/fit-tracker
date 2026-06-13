// public/js/auth.js
// Client-side authentication management.

(function () {
  // ─── Save / read session ───────────────────────────────────
  function saveSession(token, user) {
    localStorage.setItem('ft_token', token);
    localStorage.setItem('ft_user', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('ft_user'));
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!localStorage.getItem('ft_token');
  }

  // ─── Expose helpers immediately ────────────────────────────
  // This runs in <head>, before page-specific scripts (e.g. routines.js)
  // are parsed, so window.ftAuth is guaranteed to exist when they run.
  window.ftAuth = { getCurrentUser, isLoggedIn, saveSession, clearSession };

  // ─── Protect pages that require auth ─────────────────────
  const protectedPaths = ['/dashboard', '/routines', '/sessions', '/progress', '/public', '/profile'];
  if (protectedPaths.some((p) => window.location.pathname.startsWith(p)) && !isLoggedIn()) {
    window.location.href = '/login';
  }

  // ─── DOM-dependent setup ───────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
  // ─── Update navbar according to state ─────────────────────────
  function updateNavbar() {
    const user = getCurrentUser();
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.style.display = user ? 'flex' : 'none';
  }

  // ─── Login form ───────────────────────────────────────────────
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-login-submit');
      btn.disabled = true;
      btn.textContent = 'Signing in...';

      try {
        const data = await api.post('/auth/login', {
          email: document.getElementById('email').value,
          password: document.getElementById('password').value,
        });
        saveSession(data.token, data.user);
        window.location.href = '/dashboard';
      } catch (err) {
        showToast(err.message || 'Login failed. Please try again.', 'error');
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
  }

  // ─── Register form ────────────────────────────────────────────
  const registerForm = document.getElementById('form-register');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await api.post('/auth/register', {
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value,
        });
        saveSession(data.token, data.user);
        showToast('Account created! Welcome to FitTrack 🎉', 'success');
        setTimeout(() => (window.location.href = '/dashboard'), 1000);
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'error');
      }
    });
  }

  // ─── Logout ───────────────────────────────────────────────────
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      clearSession();
      window.location.href = '/';
    });
  }

  // Update navbar on every page
  updateNavbar();
  });
})();