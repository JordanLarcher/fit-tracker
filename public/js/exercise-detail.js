(function () {
  const root = document.getElementById('detail-root');
  const id = window.__EXERCISE_ID__;

  function placeholderHtml(name, tag) {
    const hue = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
    const initial = name.charAt(0).toUpperCase();
    return `<div class="detail-img detail-img--placeholder" style="background:hsl(${hue},36%,86%);color:hsl(${hue},40%,35%);">
      <span class="detail-img__initial">${initial}</span>
      <span class="detail-img__tag">${escapeHtml(tag || '')}</span>
    </div>`;
  }

  async function load() {
    try {
      const res = await api.get(`/exercises/${id}`);
      const ex = res.data;

      const img = ex.gifUrl || (ex.externalId ? `/api/exercises/${ex._id}/gif` : null);

      root.innerHTML = `
        <a href="/exercises" class="btn btn--ghost detail__back">&larr; Back to catalog</a>

        <div class="detail__card">
          <div class="detail__header">
            <div class="detail__media">
              ${img
                ? `<img class="detail-img" src="${escapeHtml(img)}" alt="${escapeHtml(ex.name)}" onerror="this.replaceWith(placeholderHtml('${escapeHtml(ex.name)}','${escapeHtml(ex.target || ex.bodyPart)}'))" />`
                : placeholderHtml(ex.name, ex.target || ex.bodyPart)}
            </div>
            <div class="detail__info">
              <h1 class="detail__title">${escapeHtml(ex.name)}</h1>
              <div class="detail__tags">
                <span class="tag">${escapeHtml(ex.bodyPart)}</span>
                <span class="tag">${escapeHtml(ex.target)}</span>
                <span class="tag">${escapeHtml(ex.equipment)}</span>
                ${difficultyBadge(ex.difficulty)}
              </div>
              <div class="detail__meta">
                <div class="detail__meta-item">
                  <span class="detail__meta-label">Body part</span>
                  <span class="detail__meta-value">${escapeHtml(ex.bodyPart)}</span>
                </div>
                <div class="detail__meta-item">
                  <span class="detail__meta-label">Target muscle</span>
                  <span class="detail__meta-value">${escapeHtml(ex.target)}</span>
                </div>
                <div class="detail__meta-item">
                  <span class="detail__meta-label">Equipment</span>
                  <span class="detail__meta-value">${escapeHtml(ex.equipment)}</span>
                </div>
                <div class="detail__meta-item">
                  <span class="detail__meta-label">Difficulty</span>
                  <span class="detail__meta-value">${escapeHtml(ex.difficulty)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ex.secondaryMuscles && ex.secondaryMuscles.length ? `
          <div class="detail__card">
            <h2 class="detail__section-title">Secondary muscles</h2>
            <div class="detail__sec-grid">
              ${ex.secondaryMuscles.map(m => `<span class="tag tag--sm">${escapeHtml(m)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="detail__card">
          <h2 class="detail__section-title">Instructions</h2>
          ${ex.instructions && ex.instructions.length ? `
            <ol class="detail__list">
              ${ex.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ol>
          ` : '<div class="detail__empty">No instructions available for this exercise.</div>'}
        </div>
      `;
    } catch (err) {
      root.innerHTML = `
        <a href="/exercises" class="btn btn--ghost detail__back">&larr; Back to catalog</a>
        <div class="empty">${escapeHtml(err.message)}</div>`;
    }
  }

  load();
})();
