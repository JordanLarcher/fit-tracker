// public/js/progress.js — Estadísticas (07) con Chart.js.

(function () {
  const accent = '#3cb9a0';
  const accentSoft = '#bfe3da';
  let volumeChart, streakChart;

  function renderVolume(weeklyVolume) {
    // weeklyVolume viene desc por año/semana → invertimos para orden cronológico
    const data = [...weeklyVolume].reverse();
    const labels = data.map((w) => `S${w._id.week}`);
    const values = data.map((w) => w.totalVolume);
    const max = Math.max(...values, 1);

    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(document.getElementById('chart-volume'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map((v) => (v === max ? accent : accentSoft)),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#eef0f2' } }, x: { grid: { display: false } } },
      },
    });
  }

  function renderStreak(weeklyVolume) {
    const data = [...weeklyVolume].reverse();
    const labels = data.map((w) => `S${w._id.week}`);
    const values = data.map((w) => w.workoutCount);

    if (streakChart) streakChart.destroy();
    streakChart = new Chart(document.getElementById('chart-streak'), {
      type: 'line',
      data: { labels, datasets: [{ data: values, borderColor: accent, backgroundColor: 'transparent', tension: 0.35, borderWidth: 3, pointRadius: 0 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#eef0f2' } }, x: { grid: { display: false } } },
      },
    });
  }

  function renderPRs(personalRecords) {
    const el = document.getElementById('pr-list');
    if (!personalRecords.length) { el.innerHTML = '<p class="empty">No records yet. Log progress in the Log tab.</p>'; return; }
    el.innerHTML = personalRecords.map((pr) => `
      <div class="pr-row">
        <span class="pr-row__name">${escapeHtml(pr.exerciseName)}</span>
        <span class="pr-row__val">${pr.maxWeight} kg</span>
      </div>`).join('');
  }

  async function renderHeatmap() {
    // 13 semanas x 3 filas (≈ proxy visual). Marcamos días con sesión.
    const el = document.getElementById('heatmap');
    let days = new Set();
    try {
      const data = await api.get('/sessions?limit=100');
      data.data.forEach((s) => days.add(new Date(s.date).toDateString()));
    } catch (_) {}
    const cells = [];
    const today = new Date();
    for (let i = 39 - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      cells.push(days.has(d.toDateString()) ? 'l3' : '');
    }
    el.innerHTML = cells.map((c) => `<span class="heat__cell ${c}"></span>`).join('');
  }

  async function load() {
    try {
      const { data } = await api.get('/progress/stats');
      renderVolume(data.weeklyVolume);
      renderStreak(data.weeklyVolume);
      renderPRs(data.personalRecords);
      renderHeatmap();
    } catch (err) {
      showToast(err.message || 'Could not load the stats.', 'error');
    }
  }

  // Toggle de rango (visual; el backend agrega por semana fija)
  document.querySelectorAll('.chip[data-range]').forEach((chip) =>
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-range]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
    }));

  load();
})();
