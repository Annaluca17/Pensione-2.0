// ─── Catalogo unificato dei motivi di cessazione del rapporto di lavoro ───
// Allineato alla normativa vigente per personale degli Enti Locali
// (DPR 1092/1973, D.Lgs. 165/2001, CCNL Funzioni Locali).

export const MOTIVI_CESSAZIONE = [
  'Limiti di età',
  'Pensione di Vecchiaia',
  'Pensione Anticipata',
  'Dimissioni volontarie',
  'Risoluzione unilaterale del rapporto',
  'Inabilità',
  'Decesso',
  'Altro',
] as const;

export type MotivoCessazione = typeof MOTIVI_CESSAZIONE[number] | '';
