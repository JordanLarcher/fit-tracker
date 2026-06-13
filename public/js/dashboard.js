// public/js/dashboard.js — Carga y renderiza el dashboard (06).

(async function () {
  const user = window.ftAuth.getCurrentUser();
  if (!user) return;

  const greeting = document.getElementById('dash-greeting');
  if (greeting) greeting.textContent = `${getGreeting()}, ${user.name.split(' ')[0]} 👋`;

  try {
    const [meData, sessionsData, routinesData, statsData] = await Promise.allSettled([
      api.get('/auth/me'),
      api.get('/sessions?limit=5'),
      api.get('/routines'),
      api.get('/progress/stats'),
    ]);

    // ─── Streak ──────────────────────────────────────────────────
    let streak = 0;
    if (meData.status === 'fulfilled') streak = meData.value.user.streak || 0;
    document.getElementById('dash-streak').textContent = streak;
    document.getElementById('dash-streak-big').textContent = streak;
    const pct = Math.min(streak / 7, 1) * 100;
    document.getElementById('ring-fg').setAttribute('stroke-dasharray', `${pct} 100`);

    // ─── Recent sessions + this week ───────────────────────
    const container = document.getElementById('recent-sessions');
    if (sessionsData.status === 'fulfilled') {
      const sessions = sessionsData.value.data;
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      document.getElementById('dash-weekly').textContent =
        sessions.filter((s) => new Date(s.date) >= weekStart).length;

      if (!sessions.length) {
        container.innerHTML = `<p class="empty">No sessions yet. <a href="/sessions">Log your first workout →</a></p>`;
      } else {
        container.innerHTML = sessions.map((s) => `
          <div class="list-row">
            <span class="list-row__ico"></span>
            <div class="list-row__main">
              <p class="list-row__title"><span class="feeling feeling--${escapeHtml(s.feeling)}"></span>${escapeHtml(s.routine?.name || 'Rutina')}</p>
              <p class="list-row__meta">${formatDate(s.date)} · ${s.durationMinutes || '?'} min</p>
            </div>
          </div>`).join('');
      }
    }

    // ─── Active routines + last routine ────────────────────────
    if (routinesData.status === 'fulfilled') {
      const routines = routinesData.value.data;
      const mine = routines.filter((r) => {
        const ownerId = r.owner?._id ? r.owner._id.toString() : (r.owner || '').toString();
        return ownerId === user._id;
      });
      document.getElementById('dash-routines').textContent = mine.length;

      const lastPanel = document.getElementById('last-routine');
      const last = mine[0];
      if (last) {
        lastPanel.innerHTML = `
          <p class="card-title">${escapeHtml(last.name)}</p>
          <p class="card-sub" style="margin-bottom:16px">${last.exercises.length} exercises</p>
          <button class="btn btn--dark btn--sm" id="btn-repeat" data-id="${last._id}">Repeat routine ▸</button>`;
        document.getElementById('btn-repeat').addEventListener('click', () => {
          window.location.href = `/sessions?routine=${last._id}`;
        });
      } else {
        lastPanel.innerHTML = `<p class="empty">Create your first routine in <a href="/routines">Routines</a>.</p>`;
      }
    }

    // ─── Total volume ──────────────────────────────────────────
    if (statsData.status === 'fulfilled') {
      const { weeklyVolume } = statsData.value.data;
      const total = weeklyVolume.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
      document.getElementById('dash-volume').textContent = total > 0 ? total.toLocaleString('es-ES') : '0';
    }
  } catch (err) {
    showToast('Could not load the dashboard.', 'error');
    console.error(err);
  }

  // Quick-start → go to Log to register a session
  const qs = document.getElementById('btn-quickstart');
  if (qs) qs.addEventListener('click', () => (window.location.href = '/sessions?new=1'));
})();
