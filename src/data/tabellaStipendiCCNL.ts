// ─── Tabella Stipendi CCNL 2022-2024 – Funzioni Locali ───────────────────────
// Fonte: Tabella_comparativa_miglioramenti_contrattuali_2022-2024.xlsx
// Tabellare mensile Tab. G: valore area, invariante per tutte le posizioni
// nell'area (il differenziale storico ex PEO è voce separata).

export type AreaCCNL =
  | 'Funzionari ed E.Q.'
  | 'Istruttori'
  | 'Operatori Esperti'
  | 'Operatori';

export interface PosizioneTabellare {
  codice: string;              // ex posizione economica, es. 'D7', 'C3', 'B5', 'A1'
  area: AreaCCNL;
  tabellareMensile2024: number; // CCNL 2022-2024, Tab. G, dal 01.01.2024
  tabellareMensile2026: number; // CCNL 2022-2024, Tab. G, dal 01.01.2026
                                // (post conglobamento parziale Ind. Comparto)
}

// ─── Tabellare mensile area (Tab. G) ─────────────────────────────────────────
const F2024 = 2078.47;  // Funzionari ed E.Q. – dal 01.01.2024
const F2026 = 2092.84;  // Funzionari ed E.Q. – dal 01.01.2026
const I2024 = 1915.55;  // Istruttori         – dal 01.01.2024
const I2026 = 1928.23;  // Istruttori         – dal 01.01.2026
const B2024 = 1704.38;  // Operatori Esperti  – dal 01.01.2024
const B2026 = 1715.27;  // Operatori Esperti  – dal 01.01.2026
const A2024 = 1637.12;  // Operatori          – dal 01.01.2024
const A2026 = 1646.09;  // Operatori          – dal 01.01.2026

export const POSIZIONI_TABELLARI: PosizioneTabellare[] = [
  // ── Funzionari ed E.Q. (Area D) ─────────────────────────────────────────
  { codice: 'D7', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D6', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D5', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D4', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D3', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D2', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  { codice: 'D1', area: 'Funzionari ed E.Q.', tabellareMensile2024: F2024, tabellareMensile2026: F2026 },
  // ── Istruttori (Area C) ──────────────────────────────────────────────────
  { codice: 'C6', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  { codice: 'C5', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  { codice: 'C4', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  { codice: 'C3', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  { codice: 'C2', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  { codice: 'C1', area: 'Istruttori', tabellareMensile2024: I2024, tabellareMensile2026: I2026 },
  // ── Operatori Esperti (Area B) ───────────────────────────────────────────
  { codice: 'B8', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B7', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B6', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B5', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B4', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B3', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B2', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  { codice: 'B1', area: 'Operatori Esperti', tabellareMensile2024: B2024, tabellareMensile2026: B2026 },
  // ── Operatori (Area A) ───────────────────────────────────────────────────
  { codice: 'A6', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
  { codice: 'A5', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
  { codice: 'A4', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
  { codice: 'A3', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
  { codice: 'A2', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
  { codice: 'A1', area: 'Operatori', tabellareMensile2024: A2024, tabellareMensile2026: A2026 },
];
