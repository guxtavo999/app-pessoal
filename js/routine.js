import { msUntilMidnight } from './date.js';

// Lista fixa da aba Rotina. Para mudar/adicionar/reordenar tarefas, edite aqui.
// O id é a chave da marcação salva: nunca reutilize nem renomeie um id existente.
export const TASKS = Object.freeze([
  { id: 'skincare-morning', label: 'Skin care matinal' },
  { id: 'remedios-morning', label: 'Remédios matinais' },
  { id: 'topiramato-11', label: '11:00 Topiramato', time: '11:00' },
  { id: 'topiramato-18', label: '18:00 Topiramato', time: '18:00' },
  { id: 'skincare-night', label: 'Skin care noturna' },
]);

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
export function msUntilNextEvent(marks, now = new Date()) {
  let ms = msUntilMidnight(now);
  for (const task of TASKS) {
    if (!task.time || marks[task.id] === true) continue;
    const wait = at(task.time, now) - now;
    if (wait > 0 && wait < ms) ms = wait;
  }
  return ms + 1000;
}
