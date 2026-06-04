/**
 * projectTFR.ts — Modello dati del sotto-programma "Calcolo Ultimo Miglio TFR"
 * Immedia S.p.A. — XDESK
 *
 * Chiave localStorage distinta da quella PASSWEB (xdesk_passweb_progetti_v1)
 * per evitare collisioni tra i due archivi progetti.
 */

import type { RisultatoTFR } from '../components/tfr/logicTFR';

export const LS_KEY_TFR = 'xdesk_tfr_progetti_v1';

/** Chiave archivio bozze di lavorazione (checklist persistita per (progetto + CF)). */
export const LS_KEY_TFR_BOZZE = 'xdesk_tfr_bozze_v1';

export interface ChecklistTFR {
  dateEsatte: boolean;                // Verifica delle date esatte
  tipoImpiego: boolean;               // Verifica tipo impiego esatto
  assenzaVuotiContributivi: boolean;  // Verifica assenza vuoti contributivi
  interoPeriodoTFR: boolean;          // Verifica se intero periodo TFR
  codiceCessazione: boolean;          // Verifica codice cessazione
  nonAccavallamento: boolean;         // Verifica non accavallamento date assunzione/cessazione
  congruitaImponibili: boolean;       // Verifica congruità imponibili tra i mesi
}

export interface DipendenteTFR {
  id: string;
  cf: string;
  cognome: string;
  nome: string;
  dataAssunzione: string;   // ISO 'YYYY-MM-DD'
  dataCessazione: string;   // ISO 'YYYY-MM-DD'
  checklist: ChecklistTFR;  // stato avanzamento persistito
  risultato?: RisultatoTFR; // popolato dopo lo Step 3 (vedi logicTFR.ts)
  savedAt: string;
}

export interface ProgettoTFR {
  id: string;
  nomeComune: string;
  createdAt: string;
  dipendenti: DipendenteTFR[];
}

/** Checklist vuota di default. */
export const emptyChecklist = (): ChecklistTFR => ({
  dateEsatte: false,
  tipoImpiego: false,
  assenzaVuotiContributivi: false,
  interoPeriodoTFR: false,
  codiceCessazione: false,
  nonAccavallamento: false,
  congruitaImponibili: false,
});

/** Voci della checklist con etichetta, nell'ordine richiesto dalla maschera. */
export const CHECKLIST_VOCI: Array<{ key: keyof ChecklistTFR; label: string }> = [
  { key: 'dateEsatte',               label: 'Verifica delle date esatte' },
  { key: 'tipoImpiego',              label: 'Verifica tipo impiego esatto' },
  { key: 'assenzaVuotiContributivi', label: 'Verifica assenza vuoti contributivi' },
  { key: 'interoPeriodoTFR',         label: 'Verifica se intero periodo TFR' },
  { key: 'codiceCessazione',         label: 'Verifica codice cessazione' },
  { key: 'nonAccavallamento',        label: 'Verifica non accavallamento date assunzione/cessazione' },
  { key: 'congruitaImponibili',      label: 'Verifica congruità imponibili tra i mesi' },
];

/** True se tutte le 7 voci della checklist sono flaggate. */
export const checklistCompleta = (c: ChecklistTFR): boolean =>
  CHECKLIST_VOCI.every(({ key }) => c[key]);
