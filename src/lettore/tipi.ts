// Tipi del modulo lettore. Il lettore lavora su pagine di testo già estratte (pdf.js resta fuori):
// una pagina è un elenco di frammenti con coordinate, così si prova con pagine costruite a mano.
import type {Centesimi, DatiPratica} from '../motore';

/** Un frammento di testo della pagina, in punti PDF, origine in alto a sinistra. */
export interface TestoPdf {
  testo: string;
  x: number;
  x1: number;
  top: number;
}

export type PaginaPdf = TestoPdf[];

/** Un cedolino mensile (una pagina, un dipendente). Importi in centesimi dalla stringa del PDF. */
export interface CedolinoMensile {
  formato: 'cedolino';
  anno: number;
  mese: number; // 0-11
  nome: string;
  cf: string;
  /** Elaborazione supplementare (arretrati, determine): senza voci di testata. */
  straordinaria: boolean;
  voci: Array<{etichetta: string; importo: Centesimi}>;
  assunzione: string; // gg-mm-aaaa, '' se vuota
  cessazione: string;
  posizione: string;
  partTime: string; // '' = non indicata
}

/** Pagina di riepilogo annuo: le voci di testata di un anno, mese per mese (null = cella vuota). */
export interface RiepilogoAnnuo {
  formato: 'riepilogo';
  anno: number;
  nome: string;
  cf: string;
  voci: Array<{etichetta: string; mesi: Array<Centesimi | null>}>;
  /** Ultimo valore non vuoto delle righe anagrafiche in fondo (gg-mm-aaaa / testo). */
  assunzione: string;
  cessazione: string;
  posizione: string;
  /** % part-time di ciascun mese, '' = non indicata. */
  partTime: string[];
}

export type Lettura = CedolinoMensile | RiepilogoAnnuo;

/** Un'etichetta del gestionale e la sua destinazione nel catalogo voci. */
export type Destinazione = string; // codice del catalogo ('01'…), oppure 'perequativo' | 'ignora'

export interface RegolaEtichetta {
  /** Si applica all'etichetta normalizzata (minuscole, senza accenti né punteggiatura). */
  se: RegExp;
  destinazione: Destinazione;
}

/** Interfaccia di un gestionale: lettori di pagina e regole etichetta → voce del catalogo. */
export interface Gestionale {
  nome: string;
  lettori: Array<(pagina: PaginaPdf) => Lettura | null>;
  regole: RegolaEtichetta[];
  /** Voci che il cedolino spezza su più righe da sommare (es. comparto, fino al 2025). */
  daSommare: string[];
}

/** Quello che il lettore ricava dai PDF per un dipendente; l'operatore la conferma. */
export interface Proposta {
  cf: string;
  dati: Pick<DatiPratica, 'voci' | 'partTime'> & {
    anagrafica: Partial<DatiPratica['anagrafica']>;
  };
  avvisi: string[];
  nonRiconosciute: string[];
}

export interface OpzioniLettura {
  /** Data di fine TFS (aaaa-mm-gg): chiude la finestra di 12 mesi. Default: la cessazione letta dai PDF. */
  fineTfs?: string;
}
