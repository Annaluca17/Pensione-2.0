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
  /** Valore della voce a tempo pieno. */
  importo: Centesimi;
  /** % di part-time del mese applicata alla voce (D4); assente = 100. */
  percentuale?: number;
  /** Giorni che moltiplicano la voce (es. 365esimi di un rateo); assente = 1. */
  giorni?: number;
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

/** Regime di fine servizio del dipendente: decide se la pratica di pensione ha TFS o TFR (ADR 0002). */
export type RegimeFineServizio = 'TFS' | 'TFR';

/**
 * Situazione del dipendente (D19, C20-1): propone le date di riferimento. `dal` = primo giorno di
 * sospensione, trattenuta, congedo o opzione; la cessazione in anagrafica è quella definitiva.
 */
export type Situazione =
  | {tipo: 'ordinaria'}
  | {tipo: 'sospensione-cautelare' | 'trattenuta-malattia' | 'congedo-104' | 'optante-tfr'; dal: DataISO};

/** Dati della pratica di cessazione (solo TFR, ADR 0002); la pratica di pensione li estende. */
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

/** Dati della pratica di pensione: UM pensione e, secondo il regime, TFS oppure TFR (ADR 0002). */
export interface DatiPraticaPensione extends DatiPratica {
  regime: RegimeFineServizio;
  situazione: Situazione;
}

// --- Tabelle ------------------------------------------------------------------------------------

/** Le quattro aree del CCNL Funzioni Locali 2019-21 (art. 12). */
export type Area = 'funzionari-eq' | 'istruttori' | 'operatori-esperti' | 'operatori';

/** Un importo mensile in centesimi, con l'annuo pubblicato dalla fonte quando esiste (T2). */
export interface Importo {
  mensile: Centesimi;
  /** Annuo della fonte in centesimi; `mensile` = `arrotonda(annuo / divisore)`. */
  annuo?: Centesimi;
  /** Fonte propria; se manca vale quella dell'insieme che lo contiene. */
  fonte?: string;
  /** Valore da riscontrare su un documento reale. */
  verifica?: {stato: 'da-verificare'; motivo: string};
}

/**
 * Un insieme di importi con la stessa decorrenza: il tabellare di quella data (`tabellare`) oppure
 * un aumento da sommare al tabellare in vigore (`incremento`). Le chiavi di `importi` sono posizioni
 * (D7, C5…) o aree secondo `chiave`.
 */
export interface Scaglionamento {
  decorrenza: DataISO;
  chiave: 'posizione' | 'area';
  tipo: 'tabellare' | 'incremento';
  /** Mensilità dell'annuo della fonte: 12 per i tabellari. Presente se gli importi hanno l'annuo. */
  divisoreAnnuo?: 12 | 13;
  importi: Readonly<Record<string, Importo>>;
  fonte: string;
}

/** IVC di un periodo. Vale 0 quando si applica il contratto in `anticipa` (T6, D8). */
export interface IvcPeriodo {
  dal: DataISO;
  al?: DataISO;
  chiave: 'posizione' | 'area';
  /** Percentuale del tabellare, solo informativa. */
  percentuale: number;
  /** Id del contratto che la riassorbe. */
  anticipa: string;
  importi: Readonly<Record<string, Importo>>;
  fonte: string;
}

/** Indennità di comparto (voce 10) per area dalla decorrenza indicata. */
export interface ScaglionamentoComparto {
  decorrenza: DataISO;
  importi: Readonly<Record<Area, Importo>>;
  /** Quota entrata nel tabellare con il conglobamento, divisa per carico (art. 60 CCNL 2022-24). */
  quotaConglobata?: Readonly<Record<Area, {bilancio: Centesimi; fondo: Centesimi}>>;
  fonte: string;
}

interface ContrattoComune {
  id: string;
  nome: string;
  firma: DataISO;
  vigenza: {dal: DataISO; al: DataISO};
  fonte: string;
}

/** Un contratto firmato in via definitiva: produce importi. */
export interface ContrattoDefinitivo extends ContrattoComune {
  stato: 'definitivo';
  scaglionamenti: readonly Scaglionamento[];
  ivc: readonly IvcPeriodo[];
  indennitaComparto: readonly ScaglionamentoComparto[];
}

/**
 * Un'ipotesi: i suoi valori stanno sotto `proposta`, e non sotto le chiavi che il motore legge per
 * gli importi. Alla firma si passa a `ContrattoDefinitivo` (T5).
 */
export interface ContrattoIpotesi extends ContrattoComune {
  stato: 'ipotesi';
  proposta: {
    scaglionamenti: readonly Scaglionamento[];
    indennitaComparto: readonly ScaglionamentoComparto[];
  };
}

export type Contratto = ContrattoDefinitivo | ContrattoIpotesi;

/** Da vecchia posizione economica ad area, con il differenziale storico (voce 02). */
export interface Trasposizione {
  posizione: string;
  area: Area;
  /** Posizione d'ingresso della categoria (A1, B1, C1, D1): base del differenziale. */
  ingresso: string;
  /** Valore prima del parere ARAN 37607: tabellare 2023 della posizione meno quello d'ingresso. */
  differenzialeBase: Centesimi;
  /** Valore da usare dal 01/04/2023: base + IVC 2023 posizione - IVC 2023 d'ingresso. */
  differenzialeStorico: Importo;
}

/** Differenziale stipendiale dell'art. 14, tabulato solo per il controllo della voce 03 (T9). */
export interface DifferenzialeArt14 {
  /** Misura annua lorda su 13 mensilità, in centesimi. */
  annuo: Centesimi;
  mensile: Centesimi;
  massimo: number;
  fonte: string;
}

/** Utilità di una voce del catalogo per le prestazioni (D1). */
export interface UtilitaVoce {
  pensione: boolean;
  tredicesima: boolean;
  tfs: boolean;
  tfr: boolean;
}

export interface VoceCatalogo {
  codice: CodiceVoce;
  descrizione: string;
  mensilita: 10 | 12;
  utile: UtilitaVoce;
  /** Validità: dal 01/01/2019 se non diversamente fissato. */
  dal: DataISO;
  al?: DataISO;
  fonte: string;
}

/** Una riga della maschera PASSWEB e le voci che vi finiscono (D1, D16). */
export interface RigaPassweb {
  id: string;
  etichetta: string;
  voci: readonly CodiceVoce[];
  fonte: string;
}

/** Riga con il nome del campo nella maschera di PASSWEB, dove la maschera ne ha uno proprio. */
export interface RigaConCampo extends RigaPassweb {
  campoPassweb?: string;
}

/** Un campo della DMA prevista (manuale PASSWEB v1.20 pp. 66-67; D1, D6, D11, R1-R5). */
export interface CampoDma extends RigaPassweb {
  /** Voci del rateo di 13ª che entra nel campo (solo nel mese di dicembre e di cessazione, D11). */
  tredicesima: readonly CodiceVoce[];
  /** Quota della base che il campo dichiara: 80 per gli imponibili TFS e TFR (D17, R4). */
  percentuale: 80 | 100;
  /** Il campo c'è solo con quel regime di fine servizio (un periodo dichiara TFS o TFR, mai entrambi). */
  regime?: RegimeFineServizio;
  /** Il campo c'è solo se il dipendente è iscritto al Credito (R5). */
  condizione?: 'iscritto-credito';
}

/** Mappe voce → riga PASSWEB di pensione, TFS e DMA previste (D1, D16); il TFR ha `righeTfr`. */
export interface RighePassweb {
  /** UM pensione: una riga per voce (mensile × mensilità) e la riga della 13ª. */
  pensione: {righe: readonly RigaPassweb[]; tredicesima: RigaPassweb};
  /** UM TFS: le 9 righe della maschera, nell'ordine di PASSWEB. */
  tfs: readonly RigaConCampo[];
  /** Campi delle DMA previste. */
  dma: readonly CampoDma[];
}

export interface ParametroConFonte<T> {
  valore: T;
  fonte: string;
}

export interface Parametri {
  /** Soglia dei giorni del mese iniziale/finale del TFR e come si contano (D10). */
  sogliaGiorniTfr: ParametroConFonte<{giorni: number; conteggio: 'lavorativi-lun-sab' | 'calendario'}>;
  divisoreGiornaliera: ParametroConFonte<number>;
  tettoGiorniMeseParziale: ParametroConFonte<number>;
  /** Giorni dell'anno per il rateo di 13ª: di calendario. */
  divisoreRateoTredicesima: ParametroConFonte<number>;
}

/** Il riferimento normativo e l'oggetto predefinito di una lettera (spec "Uscite"). */
export interface TestoLettera {
  oggetto: string;
  riferimentoNormativo: string;
  fonte: string;
}

/**
 * Le tabelle iniettate nel motore: contratti, catalogo voci, righe PASSWEB del TFR, parametri.
 * I dati stanno in `src/tabelle`; il motore non li importa mai.
 */
export interface Tabelle {
  /** Id della versione nel registro versioni (`aaaa-mm-gg.n`). */
  versione: string;
  /** Il registro versioni in ordine (T7): il motivo è la causa quando una sezione chiusa cambia (ADR 0004). */
  registro: readonly {id: string; motivo: string}[];
  /** Prima data coperta dalle tabelle (spec: dal 01/01/2019). */
  coperturaDal: DataISO;
  /** Posizioni economiche esistenti. */
  posizioni: readonly string[];
  contratti: readonly Contratto[];
  trasposizione: readonly Trasposizione[];
  differenzialiArt14: Readonly<Record<Area, DifferenzialeArt14>>;
  catalogoVoci: readonly VoceCatalogo[];
  /** Mappa voce → riga PASSWEB del TFR. */
  righeTfr: readonly RigaPassweb[];
  /** Mappe voce → riga PASSWEB di pensione, TFS e DMA previste. */
  righePassweb: RighePassweb;
  parametri: Parametri;
  lettere: {tfr: TestoLettera};
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

/** Mese di assunzione o di cessazione per l'ultimo miglio TFR (glossario: Mese utile). */
export interface EstremoTfr {
  mese: MeseISO;
  esito: 'intero' | 'utile' | 'non-utile';
  /** Giorni continuativi nel mese, con le due conte (D10); assente se il mese è intero. */
  giorni?: {lavorativiLunSab: number; calendario: number};
  /** Mese in cui si paga il rateo di 13ª (C185 §2.1), per un mese utile non intero. */
  pagamentoTredicesima?: 'dicembre' | 'cessazione';
  misura?: 'parziale';
}

export type IdRigaTfr = 'retribuzione-valutabile' | 'rateo-tredicesima-teorica' | 'tredicesima-emolumenti-cassa';

export interface RigaTfr {
  estremo: 'iniziale' | 'finale';
  id: IdRigaTfr;
  etichetta: string;
  composizione: Composizione;
}

/** Ultimo miglio TFR (C185 §2.1): dati utili e dati retributivi dei mesi non interi. */
export interface Tfr {
  decorrenzaGiuridica: DataISO;
  decorrenzaEconomica: DataISO;
  dataCessazione: DataISO;
  soglia: {giorni: number; conteggio: 'lavorativi-lun-sab' | 'calendario'; fonte: string};
  meseIniziale: EstremoTfr;
  meseFinale: EstremoTfr;
  righe: RigaTfr[];
}

/** Una riga dell'UM pensione: una voce del mese × mensilità (D16). */
export interface RigaPensione {
  id: string;
  etichetta: string;
  voce: CodiceVoce;
  composizione: Composizione;
}

/** Ultimo miglio di pensione sul mese della data di riferimento della pensione (storia 39). */
export interface UmPensione {
  mese: MeseISO;
  righe: RigaPensione[];
  /** 13ª = somma dei mensili delle voci con 13ª. */
  tredicesima: {id: string; etichetta: string; composizione: Composizione};
  /** Somma delle righe annue arrotondate (D17). */
  totaleAnnui: Centesimi;
  /** Annui + 13ª. */
  totale: Centesimi;
}

export interface Retribuzione {
  /**
   * I 12 mesi fino al mese della data di riferimento di TFS/TFR, dal mese di assunzione se dopo; nella
   * pratica di pensione fino al mese della pensione, se dopo (C20-2).
   */
  mesi: MeseRetribuzione[];
}

export interface Risultato {
  versioneTabelle: string;
  /** Tutti i blocchi di dominio trovati; ogni sezione bloccata elenca i suoi. */
  blocchi: Blocco[];
  avvisi: Avviso[];
  forzature: ForzaturaApplicata[];
  dateRiferimento?: {pensione: ValoreForzabile<DataISO>; fineServizio: ValoreForzabile<DataISO>};
  /** Le sezioni non pertinenti alla pratica mancano (spec "Motore"; ADR 0002). */
  sezioni: {
    retribuzione: Sezione<Retribuzione>;
    meseParziale: Sezione<MeseParziale>;
    /** Solo nella pratica di pensione. */
    umPensione?: Sezione<UmPensione>;
    /** Pratica di cessazione, o pratica di pensione in regime TFR. */
    tfr?: Sezione<Tfr>;
  };
}

// --- Blocchi e avvisi ---------------------------------------------------------------------------

/** I campi data di una pratica, come li nominano blocchi e avvisi. */
export type CampoData = 'assunzione' | 'cessazione' | 'situazione' | ChiaveDataRiferimento;
export type ChiaveDataRiferimento = 'dataRiferimentoPensione' | 'dataRiferimentoFineServizio';

/** Glossario: Blocco. Il motivo codificato per cui una sezione non si può calcolare. */
export type Blocco =
  | {tipo: 'blocco'; codice: 'cessazione-mancante'}
  | {tipo: 'blocco'; codice: 'assunzione-mancante'}
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
  | {tipo: 'blocco'; codice: 'giorni-forzati-non-validi'; giorni: number; massimo: number}
  /** Storia 58: una situazione che il calcolo della sezione non gestisce (deciso nel ticket 23). */
  | {tipo: 'blocco'; codice: 'situazione-non-gestita'; situazione: 'optante-tfr'; regime: 'TFR'};

export type Avviso =
  | {
      tipo: 'avviso';
      codice: 'eccezioni-fuori-periodo';
      /** Mesi con eccezioni (di voce o di part-time) fuori dalla finestra, ignorate. */
      mesi: MeseISO[];
      dal: MeseISO;
      al: MeseISO;
    }
  | {
      tipo: 'avviso';
      /** Con l'altra conta dei giorni il mese avrebbe un esito diverso (D10). */
      codice: 'soglia-quindici-giorni-altra-regola';
      estremo: 'iniziale' | 'finale';
      mese: MeseISO;
      lavorativiLunSab: number;
      calendario: number;
      esitoUsato: 'utile' | 'non-utile';
      esitoAltraRegola: 'utile' | 'non-utile';
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** IVC inserita diversa da quella del contratto applicato: si usa la tabella, non la somma (D8). */
      codice: 'ivc-incompatibile';
      mese: MeseISO;
      inserita: Centesimi;
      daTabella: Centesimi;
      /** Id dell'ultimo contratto definitivo in vigore nel mese. */
      contrattoApplicato: string;
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** Mese di assunzione utile non intero senza voci nella pratica: rateo iniziale da fare a parte (C07-4). */
      codice: 'mese-iniziale-fuori-finestra';
      mese: MeseISO;
      finestraDal: MeseISO;
      finestraAl: MeseISO;
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** La pensione cade nella vigenza di un'ipotesi: nessun importo, alla firma la pratica torna da rilavorare (T5). */
      codice: 'contratto-in-ipotesi';
      /** Id dell'ipotesi. */
      contratto: string;
      vigenzaDal: DataISO;
      fonte: string;
    };

// --- Risultato congelato e confronto (ADR 0004) -------------------------------------------------

/**
 * Le sezioni che si chiudono oggi. L'UM pensione ne resta fuori finché la persistenza non conserva la
 * pratica di pensione (regime e situazione): la chiusura arriva col suo fascicolo.
 */
export type NomeSezione = Exclude<keyof Risultato['sezioni'], 'umPensione'>;

/** Una sezione calcolata del risultato: si chiude solo una sezione calcolata. */
export type SezioneCalcolata<S extends NomeSezione> = Extract<NonNullable<Risultato['sezioni'][S]>, {esito: 'calcolata'}>;

/**
 * Glossario: Risultato congelato. Ciò che la persistenza salva alla chiusura di una sezione;
 * un'unione per sezione, così che `risultato` corrisponda a `sezione`.
 */
export type Congelato = {
  [S in NomeSezione]: {
    sezione: S;
    versioneTabelle: string;
    /** I dati della pratica alla chiusura: servono a distinguere la causa "dati" da "tabelle". */
    dati: DatiPratica;
    risultato: SezioneCalcolata<S>;
  };
}[NomeSezione];

export type CausaDifferenza = {tipo: 'dati'} | {tipo: 'tabelle'; versioni: {id: string; motivo: string}[]};

/** Un campo PASSWEB (o l'esito) di una sezione chiusa che il ricalcolo cambia. */
export interface Differenza {
  /** Es. `decorrenzaEconomica`, `finale/rateo-tredicesima-teorica`, `esito`. */
  campo: string;
  etichetta: string;
  tipo: 'importo' | 'data' | 'numero' | 'esito';
  /** `null` = il campo non c'è (riga sparita o nuova). */
  congelato: Centesimi | DataISO | string | null;
  attuale: Centesimi | DataISO | string | null;
  cause: CausaDifferenza[];
}

export interface Confronto {
  sezione: NomeSezione;
  versioni: {congelata: string; attuale: string};
  /** Vuoto: la sezione chiusa è ancora valida; altrimenti è da rilavorare. */
  differenze: Differenza[];
}
