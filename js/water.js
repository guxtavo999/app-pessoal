export const DEFAULT_GOAL_ML = 4000;
export const MIN_GOAL_ML = 100;
export const MAX_GOAL_ML = 20000;
export const MAX_CUPS = 20;
export const MAX_ML = 5000;

// Copo = { id, ml }. A lista é editada pelo app e salva no aparelho; DEFAULT_CUPS só vale
// enquanto nada foi salvo. Marcações são guardadas pelo id do copo, não pela posição.
// Os ids c1..c6 correspondem às 6 posições antigas (migração das marcações em lista).
export const DEFAULT_CUPS = Object.freeze([
  { id: 'c1', ml: 910 },
  { id: 'c2', ml: 910 },
  { id: 'c3', ml: 910 },
  { id: 'c4', ml: 1000 },
  { id: 'c5', ml: 1000 },
  { id: 'c6', ml: 1000 },
].map(Object.freeze));

export function totalMl(cups, marks) {
  return cups.reduce((sum, cup) => sum + (marks[cup.id] === true ? cup.ml : 0), 0);
}

export function fillRatio(total, goal) {
  return Math.max(0, Math.min(total, goal)) / goal;
}

export function formatLiters(ml) {
  return String(Math.round(ml / 10) / 100).replace('.', ',');
}

export function formatProgress(ml, goal) {
  return `${formatLiters(ml)} / ${formatLiters(goal)} L`;
}

export function isValidGoal(ml) {
  return Number.isInteger(ml) && ml >= MIN_GOAL_ML && ml <= MAX_GOAL_ML;
}

// Meta digitada em litros ("4", "3,5", "2.25") → ml inteiro, ou null se inválida.
export function parseGoal(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const ml = Math.round(Number(t) * 1000);
  return isValidGoal(ml) ? ml : null;
}

// Texto do quadrado: abaixo de 1 L em ml, a partir de 1 L em litros.
export function cupLabel(ml) {
  return ml >= 1000 ? `${formatLiters(ml)} L` : `${ml} ml`;
}

export function isValidCup(x) {
  return Boolean(x) && typeof x === 'object' && !Array.isArray(x)
    && typeof x.id === 'string' && x.id !== ''
    && Number.isInteger(x.ml) && x.ml >= 1 && x.ml <= MAX_ML;
}

// Valida a lista digitada no formulário (ml como texto). Devolve mensagem de erro ou null.
export function validateCups(drafts) {
  if (drafts.length === 0) return 'Deixe pelo menos um copo.';
  if (drafts.length > MAX_CUPS) return `No máximo ${MAX_CUPS} copos.`;
  for (const d of drafts) {
    const ml = Number(String(d.ml).trim());
    if (String(d.ml).trim() === '' || !Number.isInteger(ml) || ml < 1 || ml > MAX_ML) {
      return `Cada copo precisa de um valor entre 1 e ${MAX_ML} ml.`;
    }
  }
  return null;
}

export function newCupId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
