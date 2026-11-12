// Alterna dos métricas independientes dentro del carrusel de Ranking en Inicio.
// No modifica las clasificaciones de lecturas ni vuelve a crear el carrusel.
import { profileVisitRanking } from './series-profile-visits.js?v=1';

export function bindHomeVisitRanking({
  sb, rankCar, byId, media, esc, sectionCount, toast, readLabel, readPeriod
}) {
  if (!rankCar) return;
  const section = rankCar.closest('.ob-rank-section');
  const heading = section?.querySelector('h2');
  const period = section?.querySelector('[data-home-rank-period]');
  const link = section?.querySelector('[data-home-rank-link]');
  const counter = rankCar.parentElement?.querySelector('[data-rank-status]');
  const original = rankCar.innerHTML;
  let visitsMarkup = null;
  let loading = false;

  const card = (r, i) => {
    const work = byId[r.series_id];
    const image = work.cover_thumb_path || work.cover_path;
    const cover = image
      ? `<img src="${esc(media(image))}" alt="" loading="lazy" decoding="async" width="264" height="352" fetchpriority="low">`
      : `<span class="ob-rank-cover-fallback">${esc(work.short || work.title)}</span>`;
    return `<a class="ob-ritem" href="/serie/${esc(work.slug)}"><span class="n">${i + 1}</span><span class="c">${cover}</span><b>${esc(work.title)}</b><small>${Math.round(+r.score || 0).toLocaleString('es-MX')} visitas a fichas · ${sectionCount(work.chapters?.[0]?.count)}</small></a>`;
  };
  section?.querySelectorAll('[data-home-rank]').forEach(button => {
    button.addEventListener('click', async () => {
      const mode = button.dataset.homeRank;
      if (mode === 'visitas' && visitsMarkup === null) {
        if (loading) return;
        loading = true;
        try {
          const { data, error } = await profileVisitRanking(sb, { period: 'semana', limit: 6 });
          if (!rankCar.isConnected) return;
          if (error) throw error;
          const entries = (data || []).filter(r => byId[r.series_id]);
          visitsMarkup = entries.length ? entries.map(card).join('')
            : '<p class="mono" role="status">Todavía no hay visitas a fichas registradas esta semana.</p>';
        } catch {
          toast('No se pudieron consultar las visitas a fichas.');
          return;
        } finally {
          loading = false;
        }
      }
      if (!rankCar.isConnected) return;
      rankCar.innerHTML = mode === 'visitas' ? visitsMarkup : original;
      rankCar.scrollLeft = 0;
      if (heading) heading.textContent = mode === 'visitas' ? 'Más visitadas' : 'Más leídas';
      if (period) period.textContent = mode === 'visitas' ? 'visitas a fichas · esta semana' : readLabel;
      if (link) link.href = mode === 'visitas'
        ? '/ranking?lista=visitas&periodo=semana'
        : '/ranking?lista=leidas&periodo=' + readPeriod;
      section.querySelectorAll('[data-home-rank]').forEach(b => {
        const active = b.dataset.homeRank === mode;
        b.classList.toggle('on', active);
        b.setAttribute('aria-pressed', String(active));
      });
      if (counter) counter.hidden = mode === 'visitas' && !visitsMarkup.includes('class="ob-ritem"');
      rankCar.dispatchEvent(new Event('scroll'));
    });
  });
}
