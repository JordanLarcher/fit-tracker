// public/js/home.js — Landing page pública.

(function () {
  const loggedIn = window.ftAuth.isLoggedIn();
  const user = window.ftAuth.getCurrentUser();

  // ─── Header + hero CTAs según estado ────────────────────────
  const actions = document.getElementById('home-actions');
  const heroCta = document.getElementById('hero-cta');
  if (loggedIn) {
    actions.innerHTML = `
      <span class="card-sub" style="margin-right:6px">Hi, ${escapeHtml((user?.name || '').split(' ')[0])}</span>
      <a href="/dashboard" class="btn btn--dark btn--sm">My dashboard</a>`;
    heroCta.innerHTML = `<a href="/dashboard" class="btn btn--dark">Go to my dashboard</a>
      <a href="/exercises" class="btn btn--ghost">Browse catalog</a>`;
  } else {
    actions.innerHTML = `
      <a href="/login" class="btn btn--ghost btn--sm">Sign in</a>
      <a href="/login" class="btn btn--dark btn--sm">Create account</a>`;
    heroCta.innerHTML = `<a href="/login" class="btn btn--dark">Create free account</a>
      <a href="#" class="btn btn--ghost" id="cta-explore">Explore exercises</a>`;
  }

  const explore = document.getElementById('cta-explore');
  if (explore) explore.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('home-search').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('home-search').focus();
  });

  // ─── Features con candado ───────────────────────────────────
  document.querySelectorAll('.gated').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (loggedIn) { window.location.href = btn.dataset.to; return; }
      showToast('Sign in to use this feature.', 'info');
      setTimeout(() => (window.location.href = '/login'), 900);
    }));

  // ─── Catálogo público interactivo (sin login) ───────────────
  const container = document.getElementById('home-exercises');
  const search = document.getElementById('home-search');

  async function loadExercises() {
    const q = search.value.trim();
    const params = new URLSearchParams({ limit: 6 });
    if (q) params.set('search', q);
    container.innerHTML = '<p class="card-sub">Loading…</p>';
    try {
      const data = await api.get(`/exercises?${params.toString()}`);
      if (!data.data.length) {
        container.innerHTML = '<div class="empty">No exercises found. Try another search.</div>';
        return;
      }
      container.innerHTML = data.data.map((ex) => {
        const img = ex.gifUrl || (ex.externalId ? `/api/exercises/${ex._id}/gif` : null);
        return `
        <div class="card">
          ${img ? `<img class="card-img" src="${escapeHtml(img)}" alt="${escapeHtml(ex.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'card-img'}))" />` : '<div class="card-img"></div>'}
          <p class="card-title">${escapeHtml(ex.name)}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <span class="tag">${escapeHtml(ex.target || ex.bodyPart)}</span>
            <span class="tag">${escapeHtml(ex.equipment)}</span>
          </div>
        </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  search.addEventListener('input', debounce(loadExercises, 350));
  loadExercises();
})();
