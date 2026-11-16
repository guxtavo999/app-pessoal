export default {
  id: 'rotina',
  label: 'Rotina',
  icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5l1.8 1.8L9 5M4 12.5l1.8 1.8L9 11M4 18.5l1.8 1.8L9 17M12 7h8M12 13h8M12 19h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mount(el) {
    el.innerHTML = `
      <header class="page-head"><h1>Rotina</h1></header>
      <section class="empty">
        <p class="empty-title">Em breve</p>
        <p class="empty-text">Aqui vai ficar a sua rotina do dia.</p>
      </section>`;
  },
};
