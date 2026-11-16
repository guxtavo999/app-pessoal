import { TASKS } from './routine.js';

const SIZE = 6;
const PREFIX = 'app-pessoal:'; // a origem <usuario>.github.io é compartilhada com outros projetos
const blank = () => Array(SIZE).fill(false);

function defaultStore() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function read(key, store) {
  try { return (store ?? defaultStore())?.getItem(PREFIX + key) ?? null; } catch { return null; }
}

function write(key, value, store) {
  try {
    const s = store ?? defaultStore();
    if (!s) return false;
    s.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadDay(key, store) {
  try {
    const data = JSON.parse(read('agua:' + key, store));
    if (Array.isArray(data) && data.length === SIZE) return data.map(v => v === true);
  } catch { /* dado corrompido */ }
  return blank();
}

export function saveDay(key, marks, store) {
  return write('agua:' + key, JSON.stringify(marks.map(Boolean)), store);
}

// Rotina: marcações guardadas por id da tarefa ({ id: true }), não por posição.
export function loadRoutineDay(key, store) {
  const marks = {};
  try {
    const data = JSON.parse(read('rotina:' + key, store));
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const { id } of TASKS) if (data[id] === true) marks[id] = true;
    }
  } catch { /* dado corrompido */ }
  return marks;
}

export function saveRoutineDay(key, marks, store) {
  const clean = {};
  for (const { id } of TASKS) if (marks[id] === true) clean[id] = true;
  return write('rotina:' + key, JSON.stringify(clean), store);
}

export function getLastTab(store) {
  return read('ultimaAba', store);
}

export function setLastTab(id, store) {
  write('ultimaAba', id, store);
}
