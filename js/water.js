export const GOAL_ML = 4000;

export const CUPS = Object.freeze([
  { ml: 910, label: '910 ml' },
  { ml: 910, label: '910 ml' },
  { ml: 910, label: '910 ml' },
  { ml: 1000, label: '1 L' },
  { ml: 1000, label: '1 L' },
  { ml: 1000, label: '1 L' },
]);

export function totalMl(marks) {
  return CUPS.reduce((sum, cup, i) => sum + (marks[i] ? cup.ml : 0), 0);
}

export function fillRatio(total) {
  return Math.max(0, Math.min(total, GOAL_ML)) / GOAL_ML;
}

export function formatLiters(ml) {
  return String(Math.round(ml / 10) / 100).replace('.', ',');
}

export function formatProgress(ml) {
  return `${formatLiters(ml)} / ${formatLiters(GOAL_ML)} L`;
}
