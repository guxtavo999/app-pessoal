// Regras puras da aba Agenda. Item = { id, date: 'AAAA-MM-DD', time: 'HH:MM', text }.

const DAY_MS = 86400000;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = n => String(n).padStart(2, '0');

// Data real no formato AAAA-MM-DD → { y, m, d }; senão null.
function parseDate(date) {
  const match = typeof date === 'string' ? DATE_RE.exec(date) : null;
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

// Dias de calendário de hoje até `date`; compara em UTC para não sofrer com horário de verão.
export function daysUntil(date, now = new Date()) {
  const { y, m, d } = parseDate(date);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / DAY_MS);
}

export function colorFor(item, now = new Date()) {
  const d = daysUntil(item.date, now);
  if (d === 0) return 'today';
  if (d >= 1 && d <= 3) return 'near';
  if (d >= 4 && d <= 7) return 'week';
  return null;
}

export function upcoming(items, now = new Date()) {
  return items
    .filter(item => daysUntil(item.date, now) >= 0)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : a.date + a.time > b.date + b.time ? 1 : 0));
}

export function validate(draft, now = new Date()) {
  if (!parseDate(draft.date)) return 'Escolha a data.';
  if (!TIME_RE.test(draft.time ?? '')) return 'Escolha o horário.';
  if (!String(draft.text ?? '').trim()) return 'Escreva o que é o compromisso.';
  if (daysUntil(draft.date, now) < 0) return 'Essa data já passou.';
  return null;
}

export function formatDay(date, now = new Date()) {
  const days = daysUntil(date, now);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  const { y, m, d } = parseDate(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const base = `${weekday} ${pad(d)}/${pad(m)}`;
  return y === now.getFullYear() ? base : `${base}/${y}`;
}

export function isValidItem(x) {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
    && typeof x.id === 'string' && x.id !== ''
    && parseDate(x.date) !== null
    && typeof x.time === 'string' && TIME_RE.test(x.time)
    && typeof x.text === 'string' && x.text.trim() !== '';
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
}
