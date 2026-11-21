import { msUntilMidnight } from './date.js';

// Regras puras da aba Rotina. Tarefa = { id, time: 'HH:MM' | '', text }.
// A lista é editada pelo app e salva no aparelho. DEFAULT_TASKS só vale enquanto
// nada foi salvo; os ids antigos foram mantidos para não perder marcações já feitas.
export const DEFAULT_TASKS = Object.freeze([
  { id: 'skincare-morning', time: '', text: 'Skin care matinal' },
  { id: 'remedios-morning', time: '', text: 'Remédios matinais' },
  { id: 'topiramato-11', time: '11:00', text: 'Topiramato' },
  { id: 'topiramato-18', time: '18:00', text: 'Topiramato' },
  { id: 'skincare-night', time: '', text: 'Skin care noturna' },
].map(Object.freeze));

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = n => String(n).padStart(2, '0');
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (time, now) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
};

// Atrasada = tem horário, não foi marcada e o horário já chegou (HH:MM zerado, compara como texto).
export function isOverdue(task, marks, now = new Date()) {
  return Boolean(task.time) && marks[task.id] !== true && hhmm(now) >= task.time;
}

// Ms até a próxima mudança na tela: o próximo horário de tarefa ainda não marcada
// ou a meia-noite, o que vier primeiro. +1 s de folga para o relógio já ter passado do horário.
export function msUntilNextEvent(tasks, marks, now = new Date()) {
  let ms = msUntilMidnight(now);
  for (const task of tasks) {
    if (!task.time || marks[task.id] === true) continue;
    const wait = at(task.time, now) - now;
    if (wait > 0 && wait < ms) ms = wait;
  }
  return ms + 1000;
}

// Horário é opcional; a descrição não.
export function validateTask(draft) {
  if (draft.time && !TIME_RE.test(draft.time)) return 'Horário inválido.';
  if (!String(draft.text ?? '').trim()) return 'Escreva a descrição da tarefa.';
  return null;
}

export function isValidTask(x) {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
    && typeof x.id === 'string' && x.id !== ''
    && typeof x.time === 'string' && (x.time === '' || TIME_RE.test(x.time))
    && typeof x.text === 'string' && x.text.trim() !== '';
}

// Troca a tarefa de posição com a vizinha (dir = -1 sobe, +1 desce). Devolve lista nova.
export function move(tasks, id, dir) {
  const i = tasks.findIndex(t => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tasks.length) return tasks;
  const next = tasks.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function newTaskId() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
