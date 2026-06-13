// public/js/exercises.js — Catalog (02): search, filters, create.

(function () {
  const container = document.getElementById('exercises-container');
  const searchInput = document.getElementById('ex-search');
  const chips = document.getElementById('ex-chips');
  let activeFilter = { type: 'all' };

  function cardHtml(ex) {
    const img = ex.gifUrl || (ex.externalId ? `/api/exercises/${ex._id}/gif` : null);
    return `
      <div class="card">
        ${img
          ? `<img class="card-img" src="${escapeHtml(img)}" alt="${escapeHtml(ex.name)}" loading="lazy" onerror="this.replaceWith(placeholderHtml('${escapeHtml(ex.name)}','${escapeHtml(ex.target || ex.bodyPart)}'))" />`
          : placeholderHtml(ex.name, ex.target || ex.bodyPart)}
        <p class="card-title">${escapeHtml(ex.name)}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <span class="tag">${escapeHtml(ex.target || ex.bodyPart)}</span>
          <span class="tag">${escapeHtml(ex.equipment)}</span>
          ${difficultyBadge(ex.difficulty)}
        </div>
      </div>`;
  }

  function placeholderHtml(name, tag) {
    const hue = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
    const initial = name.charAt(0).toUpperCase();
    return `<div class="card-img card-img--placeholder" style="background:hsl(${hue},36%,86%);color:hsl(${hue},40%,35%);">
      <span class="card-img__initial">${initial}</span>
      <span class="card-img__tag">${escapeHtml(tag || '')}</span>
    </div>`;
  }

  async function load() {
    const params = new URLSearchParams({ limit: 30 });
    const q = searchInput.value.trim();
    if (q) params.set('search', q);
    if (activeFilter.type !== 'all') params.set(activeFilter.type, activeFilter.value);

    container.innerHTML = '<p class="card-sub">Loading…</p>';
    try {
      const data = await api.get(`/exercises?${params.toString()}`);
      if (!data.data.length) {
        container.innerHTML = '<div class="empty">No exercises found.</div>';
        return;
      }
      container.innerHTML = data.data.map(cardHtml).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  searchInput.addEventListener('input', debounce(load, 350));

  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = { type: chip.dataset.type, value: chip.dataset.value };
    load();
  });

  // ─── New exercise modal ──────────────────────────────────
  const modal = document.getElementById('ex-modal');
  const openModal = () => modal.classList.add('open');
  const closeModal = () => modal.classList.remove('open');
  document.getElementById('btn-new-exercise').addEventListener('click', openModal);
  document.getElementById('ex-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  document.getElementById('form-exercise').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      await api.post('/exercises', body);
      showToast('Exercise created 💪', 'success');
      closeModal();
      e.target.reset();
      load();
    } catch (err) {
      showToast(err.message || 'Could not create the exercise.', 'error');
    }
  });

  load();
})();
