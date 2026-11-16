import { test } from 'node:test';
import assert from 'node:assert/strict';
import agenda from '../js/tabs/agenda.js';

// #view é o mesmo elemento entre abas: o que a aba pendura nele precisa sair no cleanup.
function fakeView() {
  const listeners = [];
  return {
    listeners,
    addEventListener: (type, fn) => listeners.push([type, fn]),
    removeEventListener: (type, fn) => {
      const i = listeners.findIndex(([t, f]) => t === type && f === fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    set innerHTML(_) {},
    querySelector: () => ({ innerHTML: '', append() {} }),
  };
}

test('cleanup da Agenda remove os ouvintes que ela pôs no #view', () => {
  const noop = () => {};
  globalThis.document = { visibilityState: 'visible', addEventListener: noop, removeEventListener: noop };
  globalThis.window = { addEventListener: noop, removeEventListener: noop };
  try {
    const view = fakeView();
    const cleanup = agenda.mount(view);
    assert.ok(view.listeners.length > 0);
    cleanup();
    assert.equal(view.listeners.length, 0);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
