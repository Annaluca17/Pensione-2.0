/**
 * Tipi del lettore di riepiloghi paga.
 *
 * Il lettore lavora su testo con coordinate (una pagina = elenco di frammenti),
 * così la logica è indipendente da pdf.js e si prova con pagine costruite a mano.
 */

/** Un frammento di testo della pagina, in punti PDF, con origine in alto a sinistra. */
export interface TestoPdf {
  testo: string;
  x: number;    // bordo sinistro
  x1: number;   // bordo destro
  top: number;  // distanza dal bordo superiore della pagina
}

export type PaginaPdf = TestoPdf[];

/** Una riga del riepilogo: etichetta e importo dei 12 mesi (null = cella vuota). */
export interface VoceLetta {
  etichetta: string;
  mesi: (number | null)[];
}

/** Pagina "VOCI DI TESTATA" del Riepilogo generale dipendente, un anno solare. */
export interface RiepilogoAnnuo {
  anno: number;
  nome: string;
  cf: string;
  matricola: string;
  voci: VoceLetta[];
  /** Ultimo valore non vuoto delle righe in fondo alla pagina (gg-mm-aaaa / testo). */
  assunzione: string;
  cessazione: string;
  posizione: string;
  partTime: string;
}

/** Un cedolino mensile (una pagina, un dipendente). */
export interface CedolinoMensile {
  anno: number;
  mese: number;  // 0-11
  nome: string;
  cf: string;
  matricola: string;
  /** Elaborazione supplementare (arretrati, determine): non ha voci di testata. */
  straordinaria: boolean;
  /** Voci di testata: etichetta e importo mensile. */
  voci: Array<{ etichetta: string; importo: number }>;
  assunzione: string;  // gg-mm-aaaa, '' se vuota
  cessazione: string;
  posizione: string;   // es. 'D1' dal campo Area/ex Pos./Diff./Rapp.
  partTime: string;
}

/** Mese della finestra PASSWEB: mese 0-11. */
export interface MeseFinestra {
  mese: number;
  anno: number;
}

export interface MeseCompilato extends MeseFinestra {
  tabellare: number | null;  // null = mese assente dai riepiloghi caricati
  ivc: number | null;
}

/** Quello che il lettore propone di inserire nel calcolatore. */
export interface Compilazione {
  nome: string;
  cf: string;
  assunzione: string;   // aaaa-mm-gg, '' se assente
  cessazione: string;   // aaaa-mm-gg, '' se assente
  posizione: string;    // es. 'C5', '' se non riconosciuta
  /** Voci 01-11 del calcolatore, mensili, dal mese indicato in meseVoci. */
  imp: Record<string, string>;
  meseVoci: MeseFinestra | null;
  /** Ultimi 12 mesi fino alla cessazione, nello stesso ordine del calcolatore. */
  mesi: MeseCompilato[];
  haPerequativo: boolean;
  nonRiconosciute: string[];
  avvisi: string[];
}
