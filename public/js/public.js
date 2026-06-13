// public/js/public.js — Public routines library (08).

(function () {
  const user = window.ftAuth.getCurrentUser();
  const container = document.getElementById('pub-container');
  let all = [];
  let tag = 'all';

  function estimateMinutes(r) {
    // Estimate: ~ (total sets) minutes. Simple proxy for the card.
    const sets = r.exercises.reduce((s, e) => s + (e.sets || 0), 0);
    return Math.max(15, sets * 2);
  }

  function render() {
    let list = all.filter((r) => r.isPublic);
    if (tag !== 'all') list = list.filter((r) => (r.tags || []).map((t) => t.toLowerCase()).includes(tag));
    if (!list.length) { container.innerHTML = '<div class="empty">No public routines for this filter.</div>'; return; }
    container.innerHTML = list.map((r) => `
      <div class="card">
        <div class="card-img"></div>
        <p class="card-title">${escapeHtml(r.name)}</p>
        <p class="card-sub">by ${escapeHtml(r.owner?.name || 'anonymous')}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">
          <span class="subtle">${r.exercises.length} ej · ${estimateMinutes(r)}min</span>
          <button class="btn btn--dark btn--sm" data-copy="${r._id}">Copiar</button>
        </div>
      </div>`).join('');
  }

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    btn.disabled = true;
    try {
      await api.post(`/routines/${btn.dataset.copy}/copy`);
      showToast('Routine copied to your account ✅', 'success');
    } catch (err) {
      showToast(err.message || 'Could not copy.', 'error');
    } finally { btn.disabled = false; }
  });

  document.getElementById('pub-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#pub-chips .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    tag = chip.dataset.tag;
    render();
  });

  (async function load() {
    try {
      const data = await api.get('/routines');
      all = data.data;
      render();
    } catch (err) {
      container.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  })();
})();
