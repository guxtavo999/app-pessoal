import { todayKey, msUntilMidnight } from '../date.js';
import { MAX_CUPS, MAX_ML, MIN_GOAL_ML, MAX_GOAL_ML, totalMl, fillRatio, formatLiters, formatProgress, cupLabel, validateCups, parseGoal, newCupId } from '../water.js';
import { loadDay, saveDay, loadCups, saveCups, loadGoal, saveGoal } from '../storage.js';

const TOP = 6;      // topo da cabeça no SVG
const BOTTOM = 212; // sola dos pés no SVG
const H = BOTTOM - TOP;

const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const BODY_PATH = 'M44 38L56 38L56 44C70 45 80 48 82 60L90 118Q91 124 85 124Q80 124 79 118L72 74L72 130L70 206Q70 212 64 212Q58 212 57 206L52 136L48 136L43 206Q42 212 36 212Q30 212 30 206L28 130L28 74L21 118Q20 124 15 124Q9 124 10 118L18 60C20 48 30 45 44 44Z';

// Linhas no boneco a cada 1/4 da meta (com 4 L: 1, 2 e 3 L, como antes).
const figureSvg = () => {
  const marks = [0.25, 0.5, 0.75].map(part => {
    const y = BOTTOM - part * H;
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
    let cups = loadCups();
    let goal = loadGoal();
    let mode = 'list'; // 'list' (marcar) | 'edit' (meta e copos)
    let drafts = [];   // copos em edição: { id, ml (texto digitado) }
    let goalDraft = ''; // meta em edição, em litros (texto digitado)
    let saveFailed = false;
    let timer = null;

    function renderList() {
      mode = 'list';
      el.innerHTML = `
        <header class="page-head"><h1>Água</h1><button type="button" class="btn" data-act="edit">Editar</button></header>
        <p class="water-total" aria-live="polite"><strong></strong><span></span></p>
        <p class="save-error" role="alert" ${saveFailed ? '' : 'hidden'}>Não foi possível salvar neste aparelho. A alteração pode se perder ao fechar o app.</p>
        <section class="water">
          <div class="cups" style="grid-template-rows: repeat(${Math.ceil(cups.length / 2)}, auto)">
            ${cups.map(cup => `
              <button type="button" class="cup" data-id="${cup.id}" aria-pressed="${marks[cup.id] === true}">
                <span class="box">${X_ICON}</span>
                <span class="label">${cupLabel(cup.ml)}</span>
              </button>`).join('')}
          </div>
          ${figureSvg()}
        </section>`;

      const total = totalMl(cups, marks);
      const totalBox = el.querySelector('.water-total');
      totalBox.querySelector('strong').textContent = formatProgress(total, goal);
      totalBox.querySelector('span').textContent = total >= goal
        ? 'Meta do dia atingida'
        : `Faltam ${formatLiters(goal - total)} L`;
      totalBox.classList.toggle('done', total >= goal);
      const h = fillRatio(total, goal) * H;
      const level = el.querySelector('.level');
      level.setAttribute('y', String(BOTTOM - h));
      level.setAttribute('height', String(h));
    }

    function renderEdit(error = null) {
      mode = 'edit';
      el.innerHTML = `
        <header class="page-head"><h1>Editar água</h1></header>
        <p class="routine-hint">Escolha a meta do dia, quantos quadrados aparecem e quantos ml vale cada um.</p>
        <form class="cups-form" novalidate>
          <div class="cup-row goal-row">
            <span class="cup-name">Meta do dia</span>
            <span class="ml-input"><input type="text" inputmode="decimal" name="goal" aria-label="Meta do dia em litros"><span>L</span></span>
          </div>
          <h2 class="form-section">Copos</h2>
          <div class="cup-rows">
            ${drafts.map((d, i) => `
              <div class="cup-row">
                <span class="cup-name">Copo ${i + 1}</span>
                <span class="ml-input"><input type="number" inputmode="numeric" min="1" max="${MAX_ML}" step="1" name="ml" data-i="${i}" aria-label="ml do copo ${i + 1}"><span>ml</span></span>
                <button type="button" class="icon-btn" data-act="remove" data-i="${i}" aria-label="Remover copo ${i + 1}">${TRASH_ICON}</button>
              </div>`).join('')}
          </div>
          <button type="button" class="btn wide" data-act="add" ${drafts.length >= MAX_CUPS ? 'disabled' : ''}>+ Adicionar copo</button>
          <p class="form-error" role="alert" ${error ? '' : 'hidden'}></p>
          <div class="form-actions">
            <button type="button" class="btn" data-act="cancel">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>`;
      el.querySelectorAll('input[name="ml"]').forEach(input => { input.value = drafts[Number(input.dataset.i)].ml; });
      el.querySelector('input[name="goal"]').value = goalDraft;
      if (error) el.querySelector('.form-error').textContent = error;
    }

    // Guarda o que já foi digitado antes de redesenhar o formulário.
    function readDrafts() {
      el.querySelectorAll('input[name="ml"]').forEach(input => { drafts[Number(input.dataset.i)].ml = input.value; });
      const goalInput = el.querySelector('input[name="goal"]');
      if (goalInput) goalDraft = goalInput.value;
    }

    function onClick(e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'edit') {
        drafts = cups.map(c => ({ id: c.id, ml: String(c.ml) }));
        goalDraft = formatLiters(goal);
        return renderEdit();
      }
      if (act === 'cancel') return renderList();
      if (act === 'add') {
        readDrafts();
        const last = drafts[drafts.length - 1];
        drafts.push({ id: newCupId(), ml: last ? last.ml : '500' });
        return renderEdit();
      }
      if (act === 'remove') {
        readDrafts();
        drafts.splice(Number(btn.dataset.i), 1);
        return renderEdit();
      }
      if (mode === 'list' && btn.classList.contains('cup')) {
        refresh(); // se o dia virou sem perceber, marca no dia certo
        const id = btn.dataset.id;
        if (marks[id]) delete marks[id]; else marks[id] = true;
        saveFailed = !saveDay(key, marks);
        renderList();
      }
    }

    function onSubmit(e) {
      e.preventDefault();
      readDrafts();
      const newGoal = parseGoal(goalDraft);
      if (newGoal === null) return renderEdit(`A meta precisa ficar entre ${formatLiters(MIN_GOAL_ML)} e ${formatLiters(MAX_GOAL_ML)} L.`);
      const error = validateCups(drafts);
      if (error) return renderEdit(error);
      goal = newGoal;
      cups = drafts.map(d => ({ id: d.id, ml: Number(String(d.ml).trim()) }));
      saveFailed = !saveCups(cups);
      if (!saveGoal(goal)) saveFailed = true;
      // Marcação de copo removido não conta mais: sai do dia.
      const ids = new Set(cups.map(c => c.id));
      const stale = Object.keys(marks).filter(id => !ids.has(id));
      if (stale.length > 0) {
        for (const id of stale) delete marks[id];
        if (!saveDay(key, marks)) saveFailed = true;
      }
      renderList();
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilMidnight() + 1000);
    }

    // Na virada do dia zera as marcações. Com o formulário aberto não redesenha.
    function refresh() {
      const now = todayKey();
      if (now !== key) {
        key = now;
        marks = loadDay(key);
        if (mode === 'list') renderList();
      }
      schedule();
    }

    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    // #view é compartilhado entre abas: estes ouvintes precisam sair no cleanup.
    const onTouch = () => {}; // faz o :active funcionar no iOS
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    el.addEventListener('touchstart', onTouch, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);

    renderList();
    schedule();

    return () => {
      clearTimeout(timer);
      el.removeEventListener('click', onClick);
      el.removeEventListener('submit', onSubmit);
      el.removeEventListener('touchstart', onTouch, { passive: true });
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('focus', refresh);
    };
  },
};
