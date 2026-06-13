// public/js/routines.js — Routine Builder (03).

(function () {
  const user = window.ftAuth.getCurrentUser();
  const catalogEl = document.getElementById('rt-catalog');
  const selectedEl = document.getElementById('rt-selected');
  const countEl = document.getElementById('rt-count');
  const searchEl = document.getElementById('rt-search');
  const nameEl = document.getElementById('rt-name');
  const publicEl = document.getElementById('rt-public');
  const editingEl = document.getElementById('rt-editing');
  const tagsEl = document.getElementById('rt-tags');
  const mineEl = document.getElementById('rt-mine');

  // ─── Tags (multi-selection chips) ──────────────────────
  tagsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) chip.classList.toggle('active');
  });
  const getTags = () => [...tagsEl.querySelectorAll('.chip.active')].map((c) => c.dataset.tag);
  const setTags = (tags = []) => tagsEl.querySelectorAll('.chip').forEach((c) =>
    c.classList.toggle('active', tags.includes(c.dataset.tag)));

  let selected = []; // { exercise, name, sets, reps, restSeconds }
  let sortable;

  // ─── Catalog (left panel) ─────────────────────────────
  async function loadCatalog() {
    const q = searchEl.value.trim();
    const params = new URLSearchParams({ limit: 25 });
    if (q) params.set('search', q);
    try {
      const data = await api.get(`/exercises?${params.toString()}`);
      if (!data.data.length) { catalogEl.innerHTML = '<p class="card-sub">No results.</p>'; return; }
      catalogEl.innerHTML = data.data.map((ex) => `
        <div class="catalog-item">
          <span class="catalog-item__thumb"></span>
          <span class="catalog-item__name">${escapeHtml(ex.name)}</span>
          <button class="catalog-item__add" data-id="${ex._id}" data-name="${escapeHtml(ex.name)}">+</button>
        </div>`).join('');
    } catch (err) {
      catalogEl.innerHTML = `<p class="card-sub">${escapeHtml(err.message)}</p>`;
    }
  }

  catalogEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.catalog-item__add');
    if (!btn) return;
    addExercise(btn.dataset.id, btn.dataset.name);
  });
  searchEl.addEventListener('input', debounce(loadCatalog, 350));

  // ─── Right panel (routine under construction) ─────────────────
  function addExercise(id, name) {
    if (selected.some((s) => s.exercise === id)) { showToast('Already in the routine.', 'info'); return; }
    selected.push({ exercise: id, name, sets: 3, reps: 10, restSeconds: 60 });
    renderSelected();
  }

  function renderSelected() {
    countEl.textContent = selected.length;
    if (!selected.length) {
      selectedEl.innerHTML = '<p class="empty">Add exercises from the catalog →</p>';
      return;
    }
    selectedEl.innerHTML = selected.map((s, i) => `
      <div class="rx-card" data-idx="${i}">
        <div class="rx-card__head">
          <span class="rx-card__name">${escapeHtml(s.name)}</span>
          <span class="rx-card__drag" title="Drag to reorder">⠿ drag</span>
          <button class="rx-card__rm" data-rm="${i}" title="Remove">✕</button>
        </div>
        <div class="rx-fields">
          <div class="rx-field"><label>sets</label><input type="number" min="1" max="20" value="${s.sets}" data-f="sets" data-i="${i}"></div>
          <div class="rx-field"><label>reps</label><input type="number" min="1" value="${s.reps}" data-f="reps" data-i="${i}"></div>
          <div class="rx-field"><label>descanso</label><input type="number" min="0" value="${s.restSeconds}" data-f="restSeconds" data-i="${i}"></div>
        </div>
      </div>`).join('');

    if (sortable) sortable.destroy();
    sortable = Sortable.create(selectedEl, {
      handle: '.rx-card__drag',
      animation: 150,
      onEnd: (evt) => {
        const [moved] = selected.splice(evt.oldIndex, 1);
        selected.splice(evt.newIndex, 0, moved);
        renderSelected();
      },
    });
  }

  selectedEl.addEventListener('input', (e) => {
    const inp = e.target;
    if (!inp.dataset.f) return;
    selected[+inp.dataset.i][inp.dataset.f] = parseInt(inp.value, 10) || 0;
  });
  selectedEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm]');
    if (!btn) return;
    selected.splice(+btn.dataset.rm, 1);
    renderSelected();
  });

  // ─── Save ────────────────────────────────────────────────
  document.getElementById('rt-save').addEventListener('click', async () => {
    const name = nameEl.value.trim();
    if (!name) { showToast('Give the routine a name.', 'error'); return; }
    if (!selected.length) { showToast('Add at least one exercise.', 'error'); return; }

    const body = {
      name,
      isPublic: publicEl.checked,
      tags: getTags(),
      exercises: selected.map((s) => ({
        exercise: s.exercise, sets: s.sets, reps: s.reps, restSeconds: s.restSeconds,
      })),
    };

    try {
      const editingId = editingEl.value;
      if (editingId) {
        await api.put(`/routines/${editingId}`, body);
        showToast('Routine updated ✅', 'success');
      } else {
        await api.post('/routines', body);
        showToast('Routine created ✅', 'success');
      }
      resetBuilder();
      loadMine();
    } catch (err) {
      showToast(err.message || 'Could not save.', 'error');
    }
  });

  function resetBuilder() {
    selected = [];
    nameEl.value = '';
    publicEl.checked = false;
    editingEl.value = '';
    setTags([]);
    renderSelected();
  }

  // ─── My routines (list) ────────────────────────────────────
  async function loadMine() {
    try {
      const data = await api.get('/routines');
      const mine = data.data.filter((r) => {
        const ownerId = r.owner?._id ? r.owner._id.toString() : (r.owner || '').toString();
        return ownerId === user._id;
      });
      if (!mine.length) { mineEl.innerHTML = '<div class="empty">You don\'t have routines yet.</div>'; return; }
      mineEl.innerHTML = mine.map((r) => `
        <div class="card">
          <p class="card-title">${escapeHtml(r.name)} ${r.isPublic ? '<span class="tag">public</span>' : ''}</p>
          <p class="card-sub" style="margin-bottom:14px">${r.exercises.length} exercises</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn--ghost btn--sm" data-edit="${r._id}">Edit</button>
            <button class="btn btn--ghost btn--sm" data-del="${r._id}">Delete</button>
          </div>
        </div>`).join('');
      window._myRoutines = mine;
    } catch (err) {
      mineEl.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  mineEl.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if (editBtn) {
      const r = (window._myRoutines || []).find((x) => x._id === editBtn.dataset.edit);
      if (!r) return;
      editingEl.value = r._id;
      nameEl.value = r.name;
      publicEl.checked = r.isPublic;
      setTags(r.tags || []);
      selected = r.exercises.map((ex) => ({
        exercise: ex.exercise?._id || ex.exercise,
        name: ex.exercise?.name || 'Ejercicio',
        sets: ex.sets, reps: ex.reps, restSeconds: ex.restSeconds,
      }));
      renderSelected();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (delBtn) {
      if (!confirm('Delete this routine?')) return;
      try {
        await api.delete(`/routines/${delBtn.dataset.del}`);
        showToast('Routine deleted.', 'success');
        loadMine();
      } catch (err) { showToast(err.message, 'error'); }
    }
  });

  loadCatalog();
  renderSelected();
  loadMine();
})();
