import { todayKey, msUntilMidnight } from '../date.js';
import { colorFor, upcoming, validate, formatDay, newId } from '../agenda.js';
import { loadAgenda, saveAgenda } from '../storage.js';

export default {
  id: 'agenda',
  label: 'Agenda',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  mount(el) {
    let items = upcoming(loadAgenda());
    let mode = 'list'; // 'list' | 'form'
    let editingId = null;
    let saveFailed = false;
    let timer = null;

    function renderList() {
      mode = 'list';
      el.innerHTML = `
        <header class="page-head"><h1>Agenda</h1><button type="button" class="btn primary" data-act="new">+ Novo</button></header>
        <p class="save-error" role="alert" ${saveFailed ? '' : 'hidden'}>Não foi possível salvar neste aparelho. O compromisso pode se perder ao fechar o app.</p>
        <section class="appts"></section>`;
      const box = el.querySelector('.appts');
      if (items.length === 0) {
        box.innerHTML = '<div class="empty-inline"><p class="empty-title">Nenhum compromisso</p><p class="empty-text">Toque em + Novo para marcar um.</p></div>';
        return;
      }
      const now = new Date();
      for (const item of items) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'appt';
        const color = colorFor(item, now);
        if (color) row.classList.add(color);
        row.dataset.id = item.id;
        const when = document.createElement('span');
        when.className = 'when';
        when.textContent = `${formatDay(item.date, now)} · ${item.time}`;
        const text = document.createElement('span');
        text.className = 'text';
        text.textContent = item.text;
        row.append(when, text);
        box.append(row);
      }
    }

    function renderForm(item) {
      mode = 'form';
      editingId = item ? item.id : null;
      el.innerHTML = `
        <header class="page-head"><h1>${item ? 'Editar compromisso' : 'Novo compromisso'}</h1></header>
        <form class="appt-form" novalidate>
          <label>Data<input type="date" name="date" min="${todayKey()}"></label>
          <label>Horário<input type="time" name="time"></label>
          <label>O que é<textarea name="text" rows="4"></textarea></label>
          <p class="form-error" role="alert" hidden></p>
          <div class="form-actions">
            <button type="button" class="btn" data-act="cancel">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
          ${item ? '<button type="button" class="btn danger" data-act="delete">Excluir</button>' : ''}
        </form>`;
      const form = el.querySelector('form');
      form.elements.date.value = item ? item.date : todayKey();
      form.elements.time.value = item ? item.time : '';
      form.elements.text.value = item ? item.text : '';
    }

    function persist() {
      items = upcoming(items);
      saveFailed = !saveAgenda(items);
    }

    function onClick(e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'new') return renderForm(null);
      if (btn.dataset.act === 'cancel') return renderList();
      if (btn.dataset.act === 'delete') {
        if (!confirm('Excluir este compromisso?')) return;
        items = items.filter(i => i.id !== editingId);
        persist();
        return renderList();
      }
      if (btn.classList.contains('appt')) {
        const item = items.find(i => i.id === btn.dataset.id);
        if (item) renderForm(item);
      }
    }

    function onSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const draft = {
        date: form.elements.date.value,
        time: form.elements.time.value,
        text: form.elements.text.value.trim(),
      };
      const error = validate(draft, new Date());
      if (error) {
        const box = form.querySelector('.form-error');
        box.textContent = error;
        box.hidden = false;
        return;
      }
      const index = items.findIndex(i => i.id === editingId);
      if (index >= 0) items[index] = { id: editingId, ...draft };
      else items.push({ id: editingId ?? newId(), ...draft });
      persist();
      renderList();
    }

    // #view é compartilhado entre abas: estes ouvintes precisam sair no cleanup.
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(refresh, msUntilMidnight() + 1000);
    }

    // Ao voltar ao app e na virada do dia: tira vencidos e recalcula cores.
    // Com o formulário aberto não redesenha, para não apagar o que está sendo digitado.
    function refresh() {
      items = upcoming(items);
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
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('focus', refresh);
    };
  },
};
