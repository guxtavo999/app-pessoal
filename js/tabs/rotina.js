import { todayKey } from '../date.js';
import { TASKS, isOverdue, msUntilNextEvent } from '../routine.js';
import { loadRoutineDay, saveRoutineDay } from '../storage.js';

const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';

export default {
  id: 'rotina',
  label: 'Rotina',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5l1.8 1.8L9 5M4 12.5l1.8 1.8L9 11M4 18.5l1.8 1.8L9 17M12 7h8M12 13h8M12 19h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  mount(el) {
    let key = todayKey();
    let marks = loadRoutineDay(key);
    let timer = null;

    el.innerHTML = `
      <header class="page-head"><h1>Rotina</h1><span class="sub">Hoje</span></header>
      <p class="routine-count" aria-live="polite"></p>
      <p class="save-error" role="alert" hidden>Não foi possível salvar neste aparelho. A marcação pode se perder ao fechar o app.</p>
      <section class="tasks">
        ${TASKS.map(task => `
          <button type="button" class="task" data-id="${task.id}" aria-pressed="false">
            <span class="box">${X_ICON}</span>
            <span class="label">${task.label}</span>
            <span class="late-tag">atrasado</span>
          </button>`).join('')}
      </section>`;

    const buttons = [...el.querySelectorAll('.task')];
    const count = el.querySelector('.routine-count');
    const saveError = el.querySelector('.save-error');

    function render() {
      const now = new Date();
      let done = 0;
      TASKS.forEach((task, i) => {
        const checked = marks[task.id] === true;
        if (checked) done++;
        buttons[i].setAttribute('aria-pressed', String(checked));
        buttons[i].classList.toggle('late', isOverdue(task, marks, now));
      });
      count.textContent = `${done} de ${TASKS.length} feitas`;
      count.classList.toggle('done', done === TASKS.length);
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextEvent(marks));
    }

    // Chamado ao voltar ao app, na virada do dia e a cada horário de tarefa.
    function refresh() {
      const now = todayKey();
      if (now !== key) {
        key = now;
        marks = loadRoutineDay(key);
      }
      render();
      schedule();
    }

    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    const list = el.querySelector('.tasks');
    list.addEventListener('click', e => {
      const btn = e.target.closest('.task');
      if (!btn) return;
      refresh(); // se o dia virou sem perceber, marca no dia certo
      const id = btn.dataset.id;
      if (marks[id]) delete marks[id]; else marks[id] = true;
      saveError.hidden = saveRoutineDay(key, marks);
      render();
      schedule();
    });
    list.addEventListener('touchstart', () => {}, { passive: true });
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
