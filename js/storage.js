import { DEFAULT_TASKS, isValidTask } from './routine.js';
import { isValidItem } from './agenda.js';
import { DEFAULT_CUPS, DEFAULT_GOAL_ML, isValidCup, isValidGoal } from './water.js';

const PREFIX = 'app-pessoal:'; // a origem <usuario>.github.io é compartilhada com outros projetos

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

// Água: marcações do dia por id do copo ({ id: true }).
// Formato antigo (lista de 6 true/false por posição) é convertido para os ids c1..c6.
export function loadDay(key, store) {
  const marks = {};
  try {
    const data = JSON.parse(read('agua:' + key, store));
    if (Array.isArray(data)) {
      if (data.length === DEFAULT_CUPS.length) {
        data.forEach((v, i) => { if (v === true) marks[DEFAULT_CUPS[i].id] = true; });
      }
    } else if (data && typeof data === 'object') {
      for (const [id, v] of Object.entries(data)) if (id !== '' && v === true) marks[id] = true;
    }
  } catch { /* dado corrompido */ }
  return marks;
}

export function saveDay(key, marks, store) {
  const clean = {};
  for (const [id, v] of Object.entries(marks)) if (id !== '' && v === true) clean[id] = true;
  return write('agua:' + key, JSON.stringify(clean), store);
}

// Lista de copos da Água, editável pelo app. Sem nada salvo (ou dado ruim) = lista padrão.
const cleanCup = ({ id, ml }) => ({ id, ml });

export function loadCups(store) {
  try {
    const data = JSON.parse(read('agua:copos', store));
    if (Array.isArray(data)) {
      const cups = data.filter(isValidCup).map(cleanCup);
      if (cups.length > 0) return cups;
    }
  } catch { /* dado corrompido */ }
  return DEFAULT_CUPS.map(cleanCup);
}

export function saveCups(cups, store) {
  return write('agua:copos', JSON.stringify(cups.filter(isValidCup).map(cleanCup)), store);
}

// Meta diária da Água em ml. Sem nada salvo (ou dado ruim) = 4 L.
export function loadGoal(store) {
  try {
    const ml = JSON.parse(read('agua:meta', store));
    if (isValidGoal(ml)) return ml;
  } catch { /* dado corrompido */ }
  return DEFAULT_GOAL_ML;
}

export function saveGoal(ml, store) {
  if (!isValidGoal(ml)) return false;
  return write('agua:meta', JSON.stringify(ml), store);
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
