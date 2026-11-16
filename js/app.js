import { getLastTab, setLastTab } from './storage.js';
import rotina from './tabs/rotina.js';
import agua from './tabs/agua.js';
import agenda from './tabs/agenda.js';

// Único lugar para registrar abas. Ordem = ordem na barra inferior.
const TABS = [rotina, agua, agenda];

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let cleanup = null;
let current = null;

function show(id) {
  const tab = TABS.find(t => t.id === id) ?? TABS[0];
  if (current === tab.id) return;
  if (typeof cleanup === 'function') cleanup();
  view.replaceChildren();
  window.scrollTo(0, 0);
  cleanup = tab.mount(view) ?? null;
  current = tab.id;
  setLastTab(tab.id);
  for (const btn of tabbar.children) {
    const active = btn.dataset.tab === tab.id;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : 'false');
  }
}

for (const tab of TABS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.tab = tab.id;
  btn.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
  btn.addEventListener('click', () => show(tab.id));
  tabbar.append(btn);
}

show(getLastTab());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {});
}
