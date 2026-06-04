/**
 * logicTFR.ts — Motore di calcolo puro "Ultimo Miglio TFR"
 * Immedia S.p.A. — XDESK
 *
 * Modulo SENZA dipendenze da React: tutte le funzioni sono testabili in isolamento.
 * Replica i campi della maschera PASSWEB "Inserimento Dati Retributivi utili al TFR"
 * applicando la regola dei 15 giorni al mese di assunzione e al mese di cessazione.
 *
 * Tutti i calcoli passano per round2 (src/utils/math.ts).
 */

import { round2 } from '../../utils/math';

// ─── Tipi risultato ────────────────────────────────────────────────────────────

export type CasoIniziale = 'PIENO' | 'PARZIALE_GE15' | 'PARZIALE_LT15';
export type CasoFinale   = 'PIENO' | 'PARZIALE_GE15' | 'PARZIALE_LT15';

export interface RisultatoTFR {
  decorrenzaGiuridica: string;
  decorrenzaEconomica: string;
  dataCessazione: string;
  casoIniziale: CasoIniziale;
  casoFinale: CasoFinale;
  // blocco iniziale
  rateoPrimoAnno?: number;             // valore mensile, Modalità Parziale
  // blocco finale
  rateoCessazione?: number;            // valore mensile, Modalità Parziale
  tredicesimaEmolumentiCassa?: number; // campo PASSWEB caso finale < 15
  // input grezzi conservati per audit
  inputs: Record<string, number | string>;
}

/**
 * Input grezzi raccolti dal wizard.
 * I campi opzionali sono richiesti solo per la casistica corrispondente.
 */
export interface InputTFR {
  dataAssunzione: string;                 // ISO 'YYYY-MM-DD'
  dataCessazione: string;                 // ISO 'YYYY-MM-DD'
  // mese iniziale, caso PARZIALE_GE15
  retrVirtualePrimoMesePieno?: number;
  // mese finale, caso PARZIALE_GE15
  retrVirtualeUltimoMesePieno?: number;
  // mese finale, caso PARZIALE_LT15
  giorniTotaliMaturazione?: number;
  tredicesimaAnnua?: number;
  giorniUltimoMese?: number;              // = giornoDelMese(dataCessazione)
  emolumentiValutabili?: number;
}

// ─── Funzioni di supporto sulle date ───────────────────────────────────────────

interface DateParts { y: number; m: number; d: number }

/** Parsing manuale di una data ISO 'YYYY-MM-DD' (no timezone). */
function parseISO(isoDate: string): DateParts {
  const [y, m, d] = isoDate.split('-').map(Number);
  return { y, m, d };
}

/** Giorni del mese di una data ISO (es. 30, 31, 28, 29). */
export function giorniNelMese(isoDate: string): number {
  const { y, m } = parseISO(isoDate);
  // Date(year, monthIndex, 0) → ultimo giorno del mese (m è 1-based ⇒ monthIndex = m, day 0).
  return new Date(y, m, 0).getDate();
}

/** Giorno del mese (1..31). */
export function giornoDelMese(isoDate: string): number {
  return parseISO(isoDate).d;
}

/** Primo giorno del mese successivo, formato ISO 'YYYY-MM-01'. */
export function primoGiornoMeseSuccessivo(isoDate: string): string {
  const { y, m } = parseISO(isoDate);
  let ny = y;
  let nm = m + 1;
  if (nm > 12) { nm = 1; ny += 1; }
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}

// ─── Classificazione casistiche ────────────────────────────────────────────────

/**
 * MESE INIZIALE — regola dei 15 giorni di calendario residui.
 *   residui = giorniNelMese(assunzione) − giornoDelMese(assunzione) + 1
 *   giorno === 1            → PIENO
 *   residui >= 15           → PARZIALE_GE15 (decorrenza economica = giuridica, rateo 13^ teorica)
 *   residui < 15            → PARZIALE_LT15 (decorrenza economica = 1° giorno mese successivo)
 */
export function classificaIniziale(dataAssunzione: string): CasoIniziale {
  const giorno = giornoDelMese(dataAssunzione);
  if (giorno === 1) return 'PIENO';
  const residui = giorniNelMese(dataAssunzione) - giorno + 1;
  return residui >= 15 ? 'PARZIALE_GE15' : 'PARZIALE_LT15';
}

/**
 * MESE FINALE — regola dei 15 giorni sul giorno di cessazione.
 *   giornoCess === giorniNelMese → PIENO (mese intero, nessun dato economico)
 *   giornoCess >= 15             → PARZIALE_GE15 (conta come mese pieno, rateo 13^ teorica)
 *   giornoCess < 15              → PARZIALE_LT15 (mese parziale, campo cassa)
 */
export function classificaFinale(dataCessazione: string): CasoFinale {
  const giornoCess = giornoDelMese(dataCessazione);
  const gMese = giorniNelMese(dataCessazione);
  if (giornoCess === gMese) return 'PIENO';
  return giornoCess >= 15 ? 'PARZIALE_GE15' : 'PARZIALE_LT15';
}

/** Giorni di calendario residui nel mese di assunzione (incluso il giorno stesso). */
export function giorniResiduiMeseIniziale(dataAssunzione: string): number {
  return giorniNelMese(dataAssunzione) - giornoDelMese(dataAssunzione) + 1;
}

// ─── Motore principale ─────────────────────────────────────────────────────────

export function calcolaTFR(input: InputTFR): RisultatoTFR {
  const casoIniziale = classificaIniziale(input.dataAssunzione);
  const casoFinale   = classificaFinale(input.dataCessazione);

  // Decorrenza giuridica = sempre la data di assunzione.
  const decorrenzaGiuridica = input.dataAssunzione;
  // Decorrenza economica = giuridica, salvo mese iniziale parziale < 15 giorni.
  const decorrenzaEconomica = casoIniziale === 'PARZIALE_LT15'
    ? primoGiornoMeseSuccessivo(input.dataAssunzione)
    : input.dataAssunzione;

  const inputs: Record<string, number | string> = {
    dataAssunzione: input.dataAssunzione,
    dataCessazione: input.dataCessazione,
  };

  // ── Blocco mese iniziale ──────────────────────────────────────────────────
  let rateoPrimoAnno: number | undefined;
  if (casoIniziale === 'PARZIALE_GE15') {
    const retr = input.retrVirtualePrimoMesePieno ?? 0;
    rateoPrimoAnno = round2(retr / 12);
    inputs.retrVirtualePrimoMesePieno = retr;
  }

  // ── Blocco mese finale ────────────────────────────────────────────────────
  let rateoCessazione: number | undefined;
  let tredicesimaEmolumentiCassa: number | undefined;
  if (casoFinale === 'PARZIALE_GE15') {
    const retr = input.retrVirtualeUltimoMesePieno ?? 0;
    rateoCessazione = round2(retr / 12);
    inputs.retrVirtualeUltimoMesePieno = retr;
  } else if (casoFinale === 'PARZIALE_LT15') {
    const tredAnnua  = input.tredicesimaAnnua ?? 0;
    const giorniTot  = input.giorniTotaliMaturazione ?? 0;
    const giorniUlt  = input.giorniUltimoMese ?? giornoDelMese(input.dataCessazione);
    const valutabili = input.emolumentiValutabili ?? 0;
    const quota = giorniTot > 0 ? (tredAnnua / giorniTot) * giorniUlt : 0;
    tredicesimaEmolumentiCassa = round2(quota + valutabili);
    inputs.tredicesimaAnnua          = tredAnnua;
    inputs.giorniTotaliMaturazione   = giorniTot;
    inputs.giorniUltimoMese          = giorniUlt;
    inputs.emolumentiValutabili      = valutabili;
  }

  return {
    decorrenzaGiuridica,
    decorrenzaEconomica,
    dataCessazione: input.dataCessazione,
    casoIniziale,
    casoFinale,
    rateoPrimoAnno,
    rateoCessazione,
    tredicesimaEmolumentiCassa,
    inputs,
  };
}
