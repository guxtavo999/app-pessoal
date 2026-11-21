import { DEFAULT_TASKS, isValidTask } from './routine.js';
import { isValidItem } from './agenda.js';

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
// Ids de tarefas que não existem mais são ignorados na tela; aqui só se filtra o formato.
const ID_OK = id => typeof id === 'string' && id !== '';

export function loadRoutineDay(key, store) {
  const marks = {};
  try {
    const data = JSON.parse(read('rotina:' + key, store));
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [id, v] of Object.entries(data)) if (ID_OK(id) && v === true) marks[id] = true;
    }
  } catch { /* dado corrompido */ }
  return marks;
}

export function saveRoutineDay(key, marks, store) {
  const clean = {};
  for (const [id, v] of Object.entries(marks)) if (ID_OK(id) && v === true) clean[id] = true;
  return write('rotina:' + key, JSON.stringify(clean), store);
}

// Lista de tarefas da Rotina, editável pelo app. Sem nada salvo = lista padrão.
const cleanTask = ({ id, time, text }) => ({ id, time, text });
const defaults = () => DEFAULT_TASKS.map(cleanTask);

export function loadRoutineTasks(store) {
  const raw = read('rotina:tarefas', store);
  if (raw === null) return defaults();
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data.filter(isValidTask).map(cleanTask);
  } catch { /* dado corrompido */ }
  return defaults();
}

export function saveRoutineTasks(tasks, store) {
  return write('rotina:tarefas', JSON.stringify(tasks.filter(isValidTask).map(cleanTask)), store);
}

// Agenda: lista única de compromissos; itens inválidos são descartados um a um.
const cleanItem = ({ id, date, time, text }) => ({ id, date, time, text });

export function loadAgenda(store) {
  try {
    const data = JSON.parse(read('agenda', store));
    if (Array.isArray(data)) return data.filter(isValidItem).map(cleanItem);
  } catch { /* dado corrompido */ }
  return [];
}

export function saveAgenda(items, store) {
  return write('agenda', JSON.stringify(items.filter(isValidItem).map(cleanItem)), store);
}

export function getLastTab(store) {
  return read('ultimaAba', store);
}

export function setLastTab(id, store) {
  write('ultimaAba', id, store);
}
