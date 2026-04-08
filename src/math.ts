// ─── Utility matematiche: arrotondamento deterministico a 2 decimali ──────
// Strategia: arrotondamento alla sorgente (motore di calcolo) per prevenire
// accumulo di errori floating-point in catene di operazioni (/, *, %).

export const round2 = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
};

export const fmtEuro = (n: number): string =>
  round2(n).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const sumRound2 = (values: number[]): number =>
  round2(values.reduce((acc, v) => acc + (Number(v) || 0), 0));
