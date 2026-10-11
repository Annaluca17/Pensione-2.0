// Tipi pubblici del motore. Confine numerico (spec "Motore"): importi in centesimi interi,
// date ISO aaaa-mm-gg come stringhe, niente Date né librerie decimali.

/** Importo in centesimi di euro, intero. */
export type Centesimi = number;

/** Data ISO aaaa-mm-gg. */
export type DataISO = string;

/** Mese ISO aaaa-mm. */
export type MeseISO = string;

/** Codice di una voce del catalogo (es. '01' tabellare); il catalogo sta nelle tabelle. */
export type CodiceVoce = string;

// --- Composizione -------------------------------------------------------------------------------

/** Una voce di un mese sommata nella riga. */
export interface Addendo {
  voce: CodiceVoce;
  mese: MeseISO;
  importo: Centesimi;
}

/** Un'operazione applicata, in ordine, alla somma degli addendi. */
export interface Operazione {
  tipo: 'moltiplica' | 'dividi';
  per: number;
  motivo: string;
  fonte?: string;
}

/** Come si arriva al valore di una riga PASSWEB o di un campo DMA (glossario: Composizione). */
export interface Composizione {
  addendi: Addendo[];
  operazioni: Operazione[];
  /** Valore a precisione piena, in centesimi non interi. */
  pieno: number;
  /** Valore della riga: `arrotonda(pieno)`, una volta sola (D17). */
  arrotondato: Centesimi;
  fonte: string;
}

// --- Ingresso: DatiPratica ----------------------------------------------------------------------

/** Tipo di part-time: orizzontale, verticale, misto. */
export type TipoPartTime = 'O' | 'V' | 'M';

/** % di part-time di un mese; 100 = tempo pieno. */
export interface PartTime {
  percentuale: number;
  tipo?: TipoPartTime;
}

/** Valori sempre a tempo pieno di un mese, per voce del catalogo. */
export type VociMese = Partial<Record<CodiceVoce, Centesimi>>;

/**
 * Un valore di base valido per tutti i mesi e le eccezioni dei mesi diversi (storie 16-17):
 * il motore espande i 12 mesi.
 */
export interface PerMese<T> {
  base: T;
  eccezioni: Partial<Record<MeseISO, T>>;
}

/**
 * Le sole forzature ammesse (glossario: Forzatura): giorni del mese parziale e date di riferimento.
 * Gli importi delle righe PASSWEB non si forzano: si correggono le voci (storia 38).
 */
export interface Forzature {
  giorniMeseParziale?: number;
  dataRiferimentoPensione?: DataISO;
  /** Data di riferimento di TFS o TFR (per il TFS è la data di fine TFS). */
  dataRiferimentoFineServizio?: DataISO;
}

export type ChiaveForzatura = keyof Forzature;

export interface DatiPratica {
  anagrafica: {
    nome: string;
    codiceFiscale: string;
    posizione: string;
    assunzione?: DataISO;
    cessazione?: DataISO;
  };
  /** Voci a tempo pieno; un'eccezione sostituisce solo le voci che elenca. */
  voci: PerMese<VociMese>;
  /** % e tipo di part-time; un'eccezione sostituisce il part-time di quel mese. */
  partTime: PerMese<PartTime>;
  forzature: Forzature;
  /** Iscrizione al Fondo Credito (storia 18). */
  iscrittoCredito: boolean;
  /** Totali facoltativi della pensione erogata (storia 19). */
  pensioneErogata?: {fissi: Centesimi; tredicesima: Centesimi};
}

// --- Tabelle ------------------------------------------------------------------------------------

/**
 * Le tabelle iniettate nel motore. Per ora solo ciò che serve al nucleo; contratti, catalogo voci,
 * righe PASSWEB e parametri arrivano col modulo `tabelle` (ticket 05).
 */
export interface Tabelle {
  /** Id della versione nel registro versioni (`aaaa-mm-gg.n`). */
  versione: string;
  /** Prima data coperta dalle tabelle (spec: dal 01/01/2019). */
  coperturaDal: DataISO;
  /** Posizioni economiche esistenti. */
  posizioni: readonly string[];
}

// --- Uscita: Risultato --------------------------------------------------------------------------

/** Un valore che il sito propone e l'operatore può correggere. */
export interface ValoreForzabile<T> {
  proposto: T;
  usato: T;
  forzato?: T;
}

/** Una forzatura applicata, per la scheda e il fascicolo. */
export interface ForzaturaApplicata {
  chiave: ChiaveForzatura;
  proposto: number | DataISO;
  forzato: number | DataISO;
}

export type Sezione<T> = ({esito: 'calcolata'} & T) | {esito: 'bloccata'; motivi: Blocco[]};

export interface MeseParziale {
  mese: MeseISO;
  dal: DataISO;
  al: DataISO;
  giorni: ValoreForzabile<number>;
}

/** Un mese della finestra, con le voci e il part-time già espansi da base ed eccezioni. */
export interface MeseRetribuzione {
  mese: MeseISO;
  voci: VociMese;
  partTime: PartTime;
}

export interface Retribuzione {
  /** I 12 mesi fino al mese della data di riferimento di TFS/TFR, dal mese di assunzione se dopo. */
  mesi: MeseRetribuzione[];
}

export interface Risultato {
  versioneTabelle: string;
  /** Tutti i blocchi di dominio trovati; ogni sezione bloccata elenca i suoi. */
  blocchi: Blocco[];
  avvisi: Avviso[];
  forzature: ForzaturaApplicata[];
  dateRiferimento?: {pensione: ValoreForzabile<DataISO>; fineServizio: ValoreForzabile<DataISO>};
  sezioni: {
    retribuzione: Sezione<Retribuzione>;
    meseParziale: Sezione<MeseParziale>;
  };
}

// --- Blocchi e avvisi ---------------------------------------------------------------------------

/** I campi data di una pratica, come li nominano blocchi e avvisi. */
export type CampoData = 'assunzione' | 'cessazione' | ChiaveDataRiferimento;
export type ChiaveDataRiferimento = 'dataRiferimentoPensione' | 'dataRiferimentoFineServizio';

/** Glossario: Blocco. Il motivo codificato per cui una sezione non si può calcolare. */
export type Blocco =
  | {tipo: 'blocco'; codice: 'cessazione-mancante'}
  | {tipo: 'blocco'; codice: 'data-non-valida'; campo: CampoData; valore: string}
  | {
      tipo: 'blocco';
      codice: 'date-incoerenti';
      campo: CampoData;
      data: DataISO;
      regola: 'non-prima-di' | 'non-dopo';
      rispetto: CampoData;
      dataRispetto: DataISO;
    }
  | {tipo: 'blocco'; codice: 'part-time-fuori-range'; mese: MeseISO | 'base'; percentuale: number}
  | {tipo: 'blocco'; codice: 'posizione-non-valida'; posizione: string; motivo: 'inesistente' | 'fuori-aree-a-d'}
  | {tipo: 'blocco'; codice: 'tabelle-non-disponibili'; campo: CampoData; data: DataISO; coperturaDal: DataISO}
  | {tipo: 'blocco'; codice: 'giorni-forzati-non-validi'; giorni: number; massimo: number};

export type Avviso = {
  tipo: 'avviso';
  codice: 'eccezioni-fuori-periodo';
  /** Mesi con eccezioni (di voce o di part-time) fuori dalla finestra, ignorate. */
  mesi: MeseISO[];
  dal: MeseISO;
  al: MeseISO;
};
