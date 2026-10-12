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
  /** Divisore dei giorni (26 per la giornaliera D9, 365 per il rateo di 13ª); assente = 1. */
  divisore?: number;
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
  /** L'operatore ha scelto il regime: non segue più l'assunzione (fascicolo, ticket 30). Il motore lo ignora. */
  regimeScelto?: true;
  situazione: Situazione;
  /** DMA previste dal mese dopo l'ultima DMA vera (C21-1); assente = nessuna DMA prevista. */
  dmaPreviste?: {dal: MeseISO};
  /** Miglioramento contrattuale: il contratto scelto dall'operatore (C21-5); assente = nessun miglioramento. */
  miglioramento?: {contratto: string};
}

/** Pratica di pensione con le DMA previste. */
export type DatiPraticaDma = DatiPraticaPensione & {dmaPreviste: {dal: MeseISO}};

/** Pratica di pensione con il miglioramento contrattuale (ADR 0003, C21-5). */
export type DatiPraticaMiglioramento = DatiPraticaPensione & {miglioramento: {contratto: string}};

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
  /** Quante DMA previste accetta PASSWEB (D12): dal mese successivo un blocco. */
  limiteDmaPreviste: ParametroConFonte<number>;
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

/** Una delle 9 righe della maschera dell'UM TFS (D16), nell'ordine di PASSWEB. */
export interface RigaTfs {
  id: string;
  etichetta: string;
  campoPassweb?: string;
  composizione: Composizione;
}

/** Ultimo miglio TFS alla data di fine TFS: Σ dei 12 mesi effettivi, nessun ×13 (D3, D14). */
export interface Tfs {
  /** Primo e ultimo mese sommati. */
  dal: MeseISO;
  al: MeseISO;
  righe: RigaTfs[];
  /** Somma delle righe arrotondate (D17). */
  totale: Centesimi;
  /** Un solo mese inserito: il mese `al` × 12, semplificazione segnalata dall'avviso `tfs-annualizzato`. */
  annualizzato?: true;
}

/** Un campo di una DMA prevista (manuale PASSWEB v1.20 pp. 66-67). */
export interface CampoDmaCalcolato {
  id: string;
  etichetta: string;
  composizione: Composizione;
}

/** Codice servizio della DMA prevista dalla situazione (C21-2): 83 sospensione cautelare, 49 congedo L. 104. */
export type CodiceServizioDma = 83 | 49;

/** Una DMA prevista: un mese solare (D12), con i campi del suo regime (R1-R5). */
export interface PeriodoDma {
  mese: MeseISO;
  dal: DataISO;
  al: DataISO;
  /** Giorni D9 (lun-sab, tetto 26; mese intero = 26); nel mese di cessazione quelli del mese parziale. */
  giorni: number;
  /** 365esimi della 13ª: solo a dicembre e nel mese di cessazione, altrimenti 0 (D11, C21-3). */
  giorniTredicesima: number;
  percentuale: number;
  regime: RegimeFineServizio;
  codiceServizio?: CodiceServizioDma;
  campi: CampoDmaCalcolato[];
}

/** DMA previste della pratica di pensione: i primi mesi fino al limite (D12, C21-1). */
export interface DmaPreviste {
  periodi: PeriodoDma[];
}

/** Le voci che il miglioramento prende dalle tabelle (T12, C21-7). */
export type VoceSostituita = '01' | '02' | '09' | '10';

/** UM pensione migliorato a una decorrenza (ADR 0003, C21-6): Scenario B affiancato allo Scenario A (C21-7). */
export interface UmMigliorato extends UmPensione {
  decorrenza: DataISO;
  /** 01 (tabellare + incremento successivo), 02 (differenziale storico), 09 (0, riassorbita), 10 dalle tabelle. */
  sostituite: Record<VoceSostituita, Centesimi>;
  /** Migliorato − Scenario A. */
  differenza: {annui: Centesimi; tredicesima: Centesimi};
}

/** TFS migliorato mese per mese con gli scaglionamenti maturati alla cessazione (D13, C21-8). */
export interface TfsMigliorato {
  dal: MeseISO;
  al: MeseISO;
  righe: RigaTfs[];
  totale: Centesimi;
}

/**
 * Miglioramento contrattuale della pratica di pensione (ADR 0003): un'ipotesi non produce importi (T5);
 * un contratto definitivo dà lo Scenario A, un UM migliorato per decorrenza e, in regime TFS, il TFS
 * migliorato. Il TFR non si migliora (C21-8).
 */
export type Miglioramento =
  | {contratto: string; stato: 'ipotesi'}
  | {contratto: string; stato: 'definitivo'; scenarioA: UmPensione; migliorati: UmMigliorato[]; tfs?: TfsMigliorato};

export interface Retribuzione {
  /**
   * I 12 mesi fino al mese della data di riferimento di TFS/TFR, dal mese di assunzione se dopo; nella
   * pratica di pensione fino al mese di cessazione e dal primo mese delle DMA previste, se prima (C20-2, C21-1).
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
  /**
   * Pratica di pensione con la cessazione in vacanza contrattuale: il contratto (definitivo o ipotesi) nella
   * cui vigenza cade la cessazione, firmato dopo. È la proposta per `miglioramento.contratto` (C21-5).
   */
  miglioramentoProposto?: string;
  /** Le sezioni non pertinenti alla pratica mancano (spec "Motore"; ADR 0002). */
  sezioni: {
    retribuzione: Sezione<Retribuzione>;
    meseParziale: Sezione<MeseParziale>;
    /** Solo nella pratica di pensione. */
    umPensione?: Sezione<UmPensione>;
    /** Pratica di cessazione, o pratica di pensione in regime TFR. */
    tfr?: Sezione<Tfr>;
    /** Solo nella pratica di pensione in regime TFS (ADR 0002). */
    tfs?: Sezione<Tfs>;
    /** Solo nella pratica di pensione con `dmaPreviste`. */
    dmaPreviste?: Sezione<DmaPreviste>;
    /** Solo nella pratica di pensione con `miglioramento`. */
    miglioramento?: Sezione<Miglioramento>;
  };
}

// --- Blocchi e avvisi ---------------------------------------------------------------------------

/** I campi data di una pratica, come li nominano blocchi e avvisi. */
export type CampoData = 'assunzione' | 'cessazione' | 'situazione' | 'dmaPreviste' | ChiaveDataRiferimento;
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
  | {tipo: 'blocco'; codice: 'situazione-non-gestita'; situazione: 'optante-tfr'; regime: 'TFR'}
  /** Situazione che non inizia il 1° del mese: le DMA previste non sanno da quale periodo cambiare (C21-2). */
  | {
      tipo: 'blocco';
      codice: 'situazione-non-gestita';
      situazione: 'sospensione-cautelare' | 'congedo-104' | 'optante-tfr';
      dal: DataISO;
      motivo: 'non-al-primo-del-mese';
    }
  /** D12: PASSWEB accetta al massimo `limite` DMA previste; il mese non si prepara, le altre sezioni sì. */
  | {tipo: 'blocco'; codice: 'dma-oltre-limite'; mese: MeseISO; limite: number; fonte: string}
  /** C21-5: il miglioramento vale se la cessazione è nella vigenza del contratto e la firma è dopo. */
  | {
      tipo: 'blocco';
      codice: 'miglioramento-non-applicabile';
      contratto: string;
      vigenzaDal: DataISO;
      vigenzaAl: DataISO;
      firma: DataISO;
      cessazione: DataISO;
      fonte: string;
    }
  /** Il contratto scelto per il miglioramento non è nelle tabelle. */
  | {tipo: 'blocco'; codice: 'contratto-inesistente'; contratto: string}
  /** Uno scaglionamento (o il comparto) che il miglioramento deve applicare non ha l'importo per la chiave. */
  | {tipo: 'blocco'; codice: 'importo-non-in-tabella'; decorrenza: DataISO; chiave: string; fonte: string};

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
      /** Un solo mese inserito (nessuna eccezione nelle voci): il TFS moltiplica quel mese per `mesi` (D2, C20-3). */
      codice: 'tfs-annualizzato';
      mese: MeseISO;
      mesi: number;
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
    }
  | {
      tipo: 'avviso';
      /** Con questa situazione la DMA prevista non serve: nessun periodo (D19, C21-2). */
      codice: 'dma-non-prevista';
      situazione: 'trattenuta-malattia';
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** T4: la pensione erogata (fissi e 13ª) differisce dallo Scenario A; la vecchia domanda non si tocca. */
      codice: 'pensione-erogata-diversa';
      fissi: Centesimi;
      tredicesima: Centesimi;
      ricalcolatoFissi: Centesimi;
      ricalcolato13: Centesimi;
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** T4, avviso forte: a questa decorrenza fissi + 13ª migliorati non superano l'erogata, non inserire la domanda. */
      codice: 'nessun-miglioramento-reale';
      decorrenza: DataISO;
      migliorato: Centesimi;
      erogata: Centesimi;
      fonte: string;
    }
  | {
      tipo: 'avviso';
      /** C21-8: il TFS migliorato cambia queste righe dell'UM TFS ordinario: va modificato. */
      codice: 'tfs-da-modificare';
      righe: string[];
      fonte: string;
    };

// --- Risultato congelato e confronto (ADR 0004) -------------------------------------------------

/** Le sezioni che si chiudono: tutte quelle del risultato (DMA previste e miglioramento dal ticket 31). */
export type NomeSezione = keyof Risultato['sezioni'];

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
    /**
     * I dati della pratica alla chiusura: servono a distinguere la causa "dati" da "tabelle". Per la pratica di
     * pensione sono `DatiPraticaPensione` (regime e situazione), che il ricalcolo deve rileggere.
     */
    dati: DatiPratica | DatiPraticaPensione;
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
