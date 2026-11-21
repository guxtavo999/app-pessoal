import { todayKey } from '../date.js';
import { isOverdue, msUntilNextEvent, validateTask, move, newTaskId } from '../routine.js';
import { loadRoutineDay, saveRoutineDay, loadRoutineTasks, saveRoutineTasks } from '../storage.js';

const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>';
const UP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DOWN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Texto da tarefa: horário (se houver) em destaque e a descrição ao lado.
function labelEl(task) {
  const label = document.createElement('span');
  label.className = 'label';
  if (task.time) {
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = task.time;
    label.append(time, ' ');
  }
  label.append(task.text);
  return label;
}

export default {
  id: 'rotina',
  label: 'Rotina',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5l1.8 1.8L9 5M4 12.5l1.8 1.8L9 11M4 18.5l1.8 1.8L9 17M12 7h8M12 13h8M12 19h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  mount(el) {
    let key = todayKey();
    let marks = loadRoutineDay(key);
    let tasks = loadRoutineTasks();
    let mode = 'list'; // 'list' (marcar) | 'edit' (organizar) | 'form' (criar/editar uma)
    let editingId = null;
    let saveFailed = false;
    let timer = null;

    const saveErrorHtml = () => `<p class="save-error" role="alert" ${saveFailed ? '' : 'hidden'}>Não foi possível salvar neste aparelho. A alteração pode se perder ao fechar o app.</p>`;

    function renderList() {
      mode = 'list';
      el.innerHTML = `
        <header class="page-head"><h1>Rotina</h1><button type="button" class="btn" data-act="edit">Editar</button></header>
        <p class="routine-count" aria-live="polite"></p>
        ${saveErrorHtml()}
        <section class="tasks"></section>`;
      const box = el.querySelector('.tasks');
      if (tasks.length === 0) {
        box.innerHTML = '<div class="empty-inline"><p class="empty-title">Nenhuma tarefa</p><p class="empty-text">Toque em Editar para montar sua rotina.</p></div>';
        el.querySelector('.routine-count').hidden = true;
        return;
      }
      const now = new Date();
      let done = 0;
      for (const task of tasks) {
        const checked = marks[task.id] === true;
        if (checked) done++;
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'task';
        row.dataset.id = task.id;
        row.setAttribute('aria-pressed', String(checked));
        row.classList.toggle('late', isOverdue(task, marks, now));
        const late = document.createElement('span');
        late.className = 'late-tag';
        late.textContent = 'atrasado';
        row.insertAdjacentHTML('afterbegin', `<span class="box">${X_ICON}</span>`);
        row.append(labelEl(task), late);
        box.append(row);
      }
      const count = el.querySelector('.routine-count');
      count.textContent = `${done} de ${tasks.length} feitas hoje`;
      count.classList.toggle('done', done === tasks.length);
    }

    function renderEdit() {
      mode = 'edit';
      el.innerHTML = `
        <header class="page-head"><h1>Editar rotina</h1><button type="button" class="btn primary" data-act="new">+ Nova</button></header>
        <p class="routine-hint">Toque numa tarefa para mudar o horário ou a descrição. Use as setas para mudar a ordem.</p>
        ${saveErrorHtml()}
        <section class="tasks"></section>
        <button type="button" class="btn primary wide" data-act="done">Pronto</button>`;
      const box = el.querySelector('.tasks');
      if (tasks.length === 0) {
        box.innerHTML = '<div class="empty-inline small"><p class="empty-title">Nenhuma tarefa</p><p class="empty-text">Toque em + Nova para adicionar.</p></div>';
        return;
      }
      tasks.forEach((task, i) => {
        const row = document.createElement('div');
        row.className = 'task-edit';
        const open = document.createElement('button');
        open.type = 'button';
        open.className = 'task-open';
        open.dataset.act = 'open';
        open.dataset.id = task.id;
        open.append(labelEl(task));
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'icon-btn';
        up.dataset.act = 'up';
        up.dataset.id = task.id;
        up.disabled = i === 0;
        up.setAttribute('aria-label', 'Subir');
        up.innerHTML = UP_ICON;
        const down = document.createElement('button');
        down.type = 'button';
        down.className = 'icon-btn';
        down.dataset.act = 'down';
        down.dataset.id = task.id;
        down.disabled = i === tasks.length - 1;
        down.setAttribute('aria-label', 'Descer');
        down.innerHTML = DOWN_ICON;
        row.append(open, up, down);
        box.append(row);
      });
    }

    function renderForm(task) {
      mode = 'form';
      editingId = task ? task.id : null;
      el.innerHTML = `
        <header class="page-head"><h1>${task ? 'Editar tarefa' : 'Nova tarefa'}</h1></header>
        <form class="appt-form" novalidate>
          <label>Horário (opcional)
            <span class="time-row">
              <input type="time" name="time">
              <button type="button" class="btn" data-act="clear-time">Sem horário</button>
            </span>
          </label>
          <label>Descrição<textarea name="text" rows="3"></textarea></label>
          <p class="form-error" role="alert" hidden></p>
          <div class="form-actions">
            <button type="button" class="btn" data-act="cancel">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
          ${task ? '<button type="button" class="btn danger" data-act="delete">Excluir</button>' : ''}
        </form>`;
      const form = el.querySelector('form');
      form.elements.time.value = task ? task.time : '';
      form.elements.text.value = task ? task.text : '';
    }

    function persistTasks() {
      saveFailed = !saveRoutineTasks(tasks);
      schedule();
    }

    function onClick(e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      if (act === 'edit') return renderEdit();
      if (act === 'done') return renderList();
      if (act === 'new') return renderForm(null);
      if (act === 'cancel') return renderEdit();
      if (act === 'open') {
        const task = tasks.find(t => t.id === id);
        if (task) renderForm(task);
        return;
      }
      if (act === 'up' || act === 'down') {
        tasks = move(tasks, id, act === 'up' ? -1 : 1);
        persistTasks();
        return renderEdit();
      }
      if (act === 'clear-time') {
        btn.form.elements.time.value = '';
        return;
      }
      if (act === 'delete') {
        if (!confirm('Excluir esta tarefa?')) return;
        tasks = tasks.filter(t => t.id !== editingId);
        if (marks[editingId]) {
          delete marks[editingId];
          saveRoutineDay(key, marks);
        }
        persistTasks();
        return renderEdit();
      }
      if (mode === 'list' && btn.classList.contains('task')) {
        refresh(); // se o dia virou sem perceber, marca no dia certo
        if (marks[id]) delete marks[id]; else marks[id] = true;
        saveFailed = !saveRoutineDay(key, marks);
        renderList();
        schedule();
      }
    }

    function onSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const draft = { time: form.elements.time.value, text: form.elements.text.value.trim() };
      const error = validateTask(draft);
      if (error) {
        const box = form.querySelector('.form-error');
        box.textContent = error;
        box.hidden = false;
        return;
      }
      const index = tasks.findIndex(t => t.id === editingId);
      if (index >= 0) tasks = tasks.map((t, i) => (i === index ? { id: editingId, ...draft } : t));
      else tasks = [...tasks, { id: newTaskId(), ...draft }];
      persistTasks();
      renderEdit();
    }

    // #view é compartilhado entre abas: estes ouvintes precisam sair no cleanup.
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    const onTouch = () => {}; // faz o :active funcionar no iOS
    el.addEventListener('touchstart', onTouch, { passive: true });

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextEvent(tasks, marks));
    }

    // Ao voltar ao app, na virada do dia e a cada horário de tarefa.
    // Fora da lista de marcar não redesenha, para não atrapalhar a edição.
    function refresh() {
      const now = todayKey();
      if (now !== key) {
        key = now;
        marks = loadRoutineDay(key);
      }
      if (mode === 'list') renderList();
      schedule();
    }

    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

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
