// public/js/utils.js
// Shared helpers across all frontend modules.

/** Formats an ISO date to a human-readable format. */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Debounce: delays execution until `delay` ms have passed since the last call. */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** Escapes HTML to prevent injection when rendering user data. */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Shows a toast notification. */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-custom toast-custom--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/** HTML placeholder shown when an exercise has no image/gif. `base` is the image class (e.g. "card-img" or "detail-img"). */
function placeholderHtml(name, tag, base = 'card-img') {
  const hue = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  const initial = name.charAt(0).toUpperCase();
  return `<div class="${base} ${base}--placeholder" style="background:hsl(${hue},36%,86%);color:hsl(${hue},40%,35%);">
    <span class="${base}__initial">${initial}</span>
    <span class="${base}__tag">${escapeHtml(tag || '')}</span>
  </div>`;
}

/** Replaces a broken <img> with its placeholder. Used as an inline onerror handler. */
function imgFallback(img, name, tag, base = 'card-img') {
  const div = document.createElement('div');
  div.innerHTML = placeholderHtml(name, tag, base);
  img.replaceWith(div.firstElementChild);
}

/** HTML badge for an exercise's difficulty. */
function difficultyBadge(difficulty) {
  if (!difficulty) return '';
  return `<span class="tag tag--${difficulty}">${escapeHtml(difficulty)}</span>`;
}

/** Greeting according to the time of day. */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
