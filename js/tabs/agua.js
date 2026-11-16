import { todayKey, msUntilMidnight } from '../date.js';
import { CUPS, GOAL_ML, totalMl, fillRatio, formatLiters, formatProgress } from '../water.js';
import { loadDay, saveDay } from '../storage.js';

const TOP = 6;      // topo da cabeça no SVG
const BOTTOM = 212; // sola dos pés no SVG
const H = BOTTOM - TOP;

const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

const BODY_PATH = 'M44 38L56 38L56 44C70 45 80 48 82 60L90 118Q91 124 85 124Q80 124 79 118L72 74L72 130L70 206Q70 212 64 212Q58 212 57 206L52 136L48 136L43 206Q42 212 36 212Q30 212 30 206L28 130L28 74L21 118Q20 124 15 124Q9 124 10 118L18 60C20 48 30 45 44 44Z';

const figureSvg = () => {
  const marks = [1000, 2000, 3000].map(ml => {
    const y = BOTTOM - (ml / GOAL_ML) * H;
    return `<line x1="0" x2="100" y1="${y}" y2="${y}"/>`;
  }).join('');
  return `
  <svg class="body-figure" viewBox="0 0 100 218" role="img" aria-label="Boneco mostrando a água do dia">
    <defs>
      <clipPath id="body-clip">
        <circle cx="50" cy="22" r="16"/>
        <path d="${BODY_PATH}"/>
      </clipPath>
    </defs>
    <g clip-path="url(#body-clip)">
      <rect class="empty-fill" x="0" y="0" width="100" height="218"/>
      <rect class="level" x="0" y="${BOTTOM}" width="100" height="0"/>
      <g class="marks">${marks}</g>
    </g>
    <circle class="outline" cx="50" cy="22" r="16"/>
    <path class="outline" d="${BODY_PATH}"/>
  </svg>`;
};

export default {
  id: 'agua',
  label: 'Água',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c3.2 4 6 7.4 6 10.6a6 6 0 0 1-12 0c0-3.2 2.8-6.6 6-10.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',

  mount(el) {
    let key = todayKey();
    let marks = loadDay(key);
    let timer = null;

    el.innerHTML = `
      <header class="page-head"><h1>Água</h1><span class="sub">Hoje</span></header>
      <p class="water-total" aria-live="polite"><strong></strong><span></span></p>
      <p class="save-error" role="alert" hidden>Não foi possível salvar neste aparelho. A marcação pode se perder ao fechar o app.</p>
      <section class="water">
        <div class="cups">
          ${CUPS.map((cup, i) => `
            <button type="button" class="cup" data-i="${i}" aria-pressed="false">
              <span class="box">${X_ICON}</span>
              <span class="label">${cup.label}</span>
            </button>`).join('')}
        </div>
        ${figureSvg()}
      </section>`;

    const buttons = [...el.querySelectorAll('.cup')];
    const totalBox = el.querySelector('.water-total');
    const level = el.querySelector('.level');
    const saveError = el.querySelector('.save-error');

    function render() {
      const total = totalMl(marks);
      buttons.forEach((btn, i) => btn.setAttribute('aria-pressed', String(marks[i])));
      totalBox.querySelector('strong').textContent = formatProgress(total);
      totalBox.querySelector('span').textContent = total >= GOAL_ML
        ? 'Meta do dia atingida'
        : `Faltam ${formatLiters(GOAL_ML - total)} L`;
      totalBox.classList.toggle('done', total >= GOAL_ML);
      const h = fillRatio(total) * H;
      level.setAttribute('y', String(BOTTOM - h));
      level.setAttribute('height', String(h));
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilMidnight() + 1000);
    }

    function refresh() {
      const now = todayKey();
      if (now !== key) {
        key = now;
        marks = loadDay(key);
        render();
      }
      schedule();
    }

    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    const cupsEl = el.querySelector('.cups');
    cupsEl.addEventListener('click', e => {
      const btn = e.target.closest('.cup');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      refresh(); // se o dia virou sem perceber, marca no dia certo
      marks[i] = !marks[i];
      saveError.hidden = saveDay(key, marks);
      render();
    });
    cupsEl.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);

    render();
    schedule();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('focus', refresh);
    };
  },
};
