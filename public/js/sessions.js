// public/js/sessions.js — Diario (04): sesiones + registro de progreso.

(function () {
  const container = document.getElementById('sessions-container');
  const sessionModal = document.getElementById('session-modal');
  const progressModal = document.getElementById('progress-modal');
  let routinesCache = [];
  let sessionsCache = [];

  // ─── Modales helpers ────────────────────────────────────────
  function open(m) { m.classList.add('open'); }
  function close(m) { m.classList.remove('open'); }
  document.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', (e) => close(e.target.closest('.modal-backdrop'))));
  [sessionModal, progressModal].forEach((m) =>
    m.addEventListener('click', (e) => { if (e.target === m) close(m); }));

  // ─── Cargar lista de sesiones ───────────────────────────────
  async function loadSessions() {
    container.innerHTML = '<p class="card-sub">Loading…</p>';
    try {
      const data = await api.get('/sessions');
      sessionsCache = data.data;
      if (!data.data.length) {
        container.innerHTML = '<div class="empty">No sessions yet. Log your first workout.</div>';
        return;
      }
      container.innerHTML = data.data.map((s) => `
        <div class="list-row">
          <span class="list-row__ico"></span>
          <div class="list-row__main">
            <p class="list-row__title"><span class="feeling feeling--${escapeHtml(s.feeling)}"></span>${escapeHtml(s.routine?.name || 'Rutina')}</p>
            <p class="list-row__meta">${formatDate(s.date)} · ${s.durationMinutes || '?'} min${s.notes ? ' · ' + escapeHtml(s.notes) : ''}</p>
          </div>
          <button class="btn btn--ghost btn--sm" data-del="${s._id}">Delete</button>
        </div>`).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!confirm('Delete this session?')) return;
    try { await api.delete(`/sessions/${btn.dataset.del}`); showToast('Session deleted.', 'success'); loadSessions(); }
    catch (err) { showToast(err.message, 'error'); }
  });

  // ─── Cargar rutinas para los selects ────────────────────────
  async function loadRoutines() {
    try {
      const data = await api.get('/routines');
      routinesCache = data.data;
      const opts = data.data.map((r) => `<option value="${r._id}">${escapeHtml(r.name)}</option>`).join('');
      document.getElementById('session-routine').innerHTML = opts || '<option value="">— create a routine first —</option>';
    } catch (err) { showToast(err.message, 'error'); }
  }

  // ─── Nueva sesión ───────────────────────────────────────────
  document.getElementById('btn-new-session').addEventListener('click', () => {
    document.getElementById('session-date').valueAsDate = new Date();
    open(sessionModal);
  });

  document.getElementById('form-session').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    if (!body.durationMinutes) delete body.durationMinutes;
    try {
      await api.post('/sessions', body);
      showToast('Session logged 🎉', 'success');
      close(sessionModal);
      e.target.reset();
      loadSessions();
    } catch (err) { showToast(err.message || 'Could not log the session.', 'error'); }
  });

  // ─── Registrar progreso ─────────────────────────────────────
  const setsEl = document.getElementById('progress-sets');
  function addSetRow(n) {
    const div = document.createElement('div');
    div.className = 'rx-fields';
    div.style.marginBottom = '8px';
    div.innerHTML = `
      <div class="rx-field"><label>set</label><input type="number" value="${n}" data-k="setNumber" readonly></div>
      <div class="rx-field"><label>reps</label><input type="number" min="0" value="10" data-k="reps"></div>
      <div class="rx-field"><label>weight (kg)</label><input type="number" min="0" value="20" data-k="weightKg"></div>`;
    setsEl.appendChild(div);
  }
  document.getElementById('add-set').addEventListener('click', () => addSetRow(setsEl.children.length + 1));

  document.getElementById('btn-new-progress').addEventListener('click', async () => {
    // poblar sesiones
    if (!sessionsCache.length) await loadSessions();
    document.getElementById('progress-session').innerHTML =
      sessionsCache.map((s) => `<option value="${s._id}">${escapeHtml(s.routine?.name || 'Rutina')} · ${formatDate(s.date)}</option>`).join('')
      || '<option value="">— log a session first —</option>';
    // poblar ejercicios
    try {
      const ex = await api.get('/exercises?limit=100');
      document.getElementById('progress-exercise').innerHTML =
        ex.data.map((x) => `<option value="${x._id}">${escapeHtml(x.name)}</option>`).join('');
    } catch (_) {}
    setsEl.innerHTML = '';
    addSetRow(1);
    open(progressModal);
  });

  document.getElementById('form-progress').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sets = [...setsEl.children].map((row) => {
      const o = {};
      row.querySelectorAll('input').forEach((i) => (o[i.dataset.k] = parseInt(i.value, 10) || 0));
      return o;
    });
    const body = {
      session: document.getElementById('progress-session').value,
      exercise: document.getElementById('progress-exercise').value,
      sets,
    };
    try {
      await api.post('/progress', body);
      showToast('Progress saved 📈', 'success');
      close(progressModal);
    } catch (err) { showToast(err.message || 'Could not save the progress.', 'error'); }
  });

  // ─── Init + atajos (quick-start / repetir rutina) ───────────
  (async function init() {
    await loadRoutines();
    await loadSessions();
    const params = new URLSearchParams(window.location.search);
    if (params.has('new') || params.has('routine')) {
      document.getElementById('session-date').valueAsDate = new Date();
      if (params.get('routine')) document.getElementById('session-routine').value = params.get('routine');
      open(sessionModal);
    }
  })();
})();
