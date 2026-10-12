// Mappe voce → riga PASSWEB per pensione, TFS e DMA previste (D1, D16). Le righe sono i campi della
// maschera di Nuova PassWeb com'è, anche se la nomenclatura è vecchia; quali voci vi finiscono lo
// decidono i flag del catalogo (D15), e righe-passweb.test.ts li confronta con le liste scritte a
// mano dalle decisioni. Il TFR ha la sua mappa in `righe-tfr.ts`.
//
// Fuori dal motore: i tipi di questo file stanno qui e non in `src/motore/tipi.ts` (ticket 22: il
// motore non si tocca). Le sezioni di motore dei ticket 23-26 li porteranno in `Tabelle`.
import type {CodiceVoce, RigaPassweb} from '../motore';

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
  regime?: 'TFS' | 'TFR';
  /** Il campo c'è solo se il dipendente è iscritto al Credito (R5). */
  condizione?: 'iscritto-credito';
}

export interface RighePassweb {
  /** UM pensione: una riga per voce (mensile × mensilità) e la riga della 13ª. */
  pensione: {righe: readonly RigaPassweb[]; tredicesima: RigaPassweb};
  /** UM TFS: le 9 righe della maschera, nell'ordine di PASSWEB. */
  tfs: readonly RigaConCampo[];
  /** Campi delle DMA previste. */
  dma: readonly CampoDma[];
}

const fontePensione =
  'D16 (righe di Nuova PassWeb: UM pensione per voce) e D15 (flag di utilità) di "Regole comuni"; Guida pratica UM pensione §2 regole 1-3; maschera "Calcolo unificato ultimo miglio" (CalcoloUnificatoUltimoMiglio.tsx)';
const fonteTfs =
  'D16 (UM TFS a 9 righe: tabellare "TAB E" con IVC, RIA, 13ª, assegno assorbibile, asili 72+78, assegno non riassorbibile, ind. 64,56, vigilanza, differenziali 02+03), D3 (Σ dei 12 mesi effettivi, nessun ×13), D20 (13ª = Σ12/12, IVC compresa); Circ. INPS 125/2022 §3.2';
const fonteDma =
  'Manuale PASSWEB v1.20 pp. 60-67 (Inserimento Anticipo DMA); research/regole-dma-previste.md §2-3; D1, D6, D11, D15';
const fonteDmaTfr =
  `${fonteDma}; research/campi-dma-tfr.md e ticket 19 del rifacimento (R1-R5); Circ. INPS 105/2012 §6.4-6.5, Msg INPS 2440/2019, Circ. INPS 185/2021 §2.2.1`;

// Voci per flag del catalogo (D15). Scritte per esteso e non calcolate dal catalogo: il test le
// confronta con i flag, così un cambio al catalogo che non aggiorna le mappe fa fallire il test.
const vociPensione = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', 'UT'] as const;
const vociPensione13 = ['01', '02', '03', '04', '05', '06', '07', '09', 'UT'] as const;
const vociTfsTfr = ['01', '02', '03', '04', '05', '06', '08', '09', '11', '12', '13'] as const;
const vociTfsTfr13 = ['01', '02', '03', '04', '05', '06', '09'] as const;
const vociTfr = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '11', '12', '13'] as const;
const vociTfr13 = ['01', '02', '03', '04', '05', '06', '07', '09'] as const;

const etichettePensione: Record<(typeof vociPensione)[number], string> = {
  '01': 'Stipendio tabellare',
  '02': 'Differenziale storico (ex PEO)',
  '03': 'Differenziale stipendiale CCNL 2019-2021',
  '04': 'Assegno ad personam non riassorbibile IIS (art. 29 c.4 CCNL 2004)',
  '05': 'Assegno ad personam assorbibile prog. verticale',
  '06': 'Salario Individuale di Anzianità (ex R.I.A.)',
  '07': 'Retribuzione di Posizione',
  '08': 'Indennità specifica ex art.4 CCNL (€ 5,38/mese)',
  '09': 'Indennità di Vacanza Contrattuale (IVC)',
  '10': 'Indennità di Comparto',
  '11': 'Indennità di vigilanza',
  '12': 'Ind. Professionale asili nido (€ 55,40/mese)',
  '13': 'Ind. Aggiuntiva asili nido (€ 28,41/mese)',
  '14': 'Ind. Tempo potenziato scolastico (× 10 mesi)',
  '15': 'Trattamento accessorio asili nido (× 10 mesi)',
  UT: 'Una Tantum 1,5% (solo 2023)',
};

export const righePassweb = {
  pensione: {
    righe: vociPensione.map((codice) => ({
      id: `voce-${codice}`,
      etichetta: etichettePensione[codice],
      voci: [codice],
      fonte: fontePensione,
    })),
    tredicesima: {
      id: 'tredicesima',
      etichetta: '13^ MENSILITÀ (→ "Tredicesima" PASSWEB)',
      voci: vociPensione13,
      fonte: `${fontePensione}; 13ª = somma dei mensili delle voci con 13ª (CCNL 2019-21 art. 75 c. 2 e art. 74 c. 2 lett. c)`,
    },
  },
  tfs: [
    {
      id: 'tab-e',
      etichetta: 'Stipendio tabellare nuove Aree TAB G (compreso IVC)',
      campoPassweb: 'Tab. G (TAB E PASSWEB)',
      voci: ['01', '09'],
      fonte: `${fonteTfs}; l'IVC sta sulla riga del tabellare (D1, D8)`,
    },
    {
      id: 'ria',
      etichetta: 'Retribuzione Ind. di Anzianità (R.I.A.)',
      campoPassweb: 'R.I.A.',
      voci: ['06'],
      fonte: fonteTfs,
    },
    {
      id: 'tredicesima',
      etichetta: 'Tredicesima mensilità',
      campoPassweb: '13^ Mensilità',
      voci: vociTfsTfr13,
      fonte: `${fonteTfs}; posizione (07) e comparto (10) fuori (D6, D7)`,
    },
    {
      id: 'assegno-assorbibile',
      etichetta: 'Assegno ad personam assorbibile progressione verticale',
      campoPassweb: 'Ass. assorbibile (annuo)',
      voci: ['05'],
      fonte: `${fonteTfs}; niente ×13 (D3 corregge il vecchio)`,
    },
    {
      id: 'asili',
      etichetta: 'Indennità Aggiuntive personale asili nido e scolastico',
      campoPassweb: 'Ind. asili nido',
      voci: ['12', '13'],
      fonte: fonteTfs,
    },
    {
      id: 'assegno-non-riassorbibile',
      etichetta: 'Assegno personale non riassorbibile IIS Cat. B e D (art. 29 c.4)',
      campoPassweb: 'Ass. non riassorbibile (annuo)',
      voci: ['04'],
      fonte: fonteTfs,
    },
    {
      id: 'indennita-64-56',
      etichetta: 'Indennità EUR 64,56 lorde annue (ex 3^/4^ Qualifica) × 12 mesi',
      campoPassweb: 'Ind. specifica 64,56',
      voci: ['08'],
      fonte: fonteTfs,
    },
    {
      id: 'vigilanza',
      etichetta: 'Indennità di vigilanza × 12 mensilità',
      campoPassweb: 'Ind. vigilanza',
      voci: ['11'],
      fonte: fonteTfs,
    },
    {
      id: 'differenziali',
      etichetta: 'Differenziali stipendiali (voce 02 + voce 03)',
      campoPassweb: 'Differenziali',
      voci: ['02', '03'],
      fonte: fonteTfs,
    },
  ],
  dma: [
    {
      id: 'imponibile-pensionistico',
      etichetta: 'Imponibile pensionistico (CPDEL)',
      voci: vociPensione,
      tredicesima: vociPensione13,
      percentuale: 100,
      fonte: `${fonteDma}; tutte le voci utili alla pensione, comparto compreso (CCNL 2019-21 art. 74 c. 2 lett. d)`,
    },
    {
      id: 'imponibile-credito',
      etichetta: 'Imponibile Fondo Credito',
      voci: vociPensione,
      tredicesima: vociPensione13,
      percentuale: 100,
      condizione: 'iscritto-credito',
      fonte: `${fonteDma}; R5: stesso imponibile della CPDEL (Msg INPS 1974/2018 §2), zero e non emesso se il dipendente non è iscritto`,
    },
    {
      id: 'imponibile-tfs',
      etichetta: 'Imponibile TFS (80%)',
      voci: vociTfsTfr,
      tredicesima: vociTfsTfr13,
      percentuale: 80,
      regime: 'TFS',
      fonte: `${fonteDma}; 80% della retribuzione utile (INADEL dal 01/01/1993), voci utili al TFS`,
    },
    {
      id: 'imponibile-tfr',
      etichetta: 'Imponibile TFR (80%)',
      voci: vociTfsTfr,
      tredicesima: vociTfsTfr13,
      percentuale: 80,
      regime: 'TFR',
      fonte: `${fonteDmaTfr}; R4: base = voci utili al TFS, le voci solo-TFR vanno negli ulteriori elementi`,
    },
    {
      id: 'retribuzione-teorica-tfr',
      etichetta: 'Retribuzione teorica tabellare TFR',
      voci: vociTfr,
      tredicesima: [],
      percentuale: 100,
      regime: 'TFR',
      fonte: `${fonteDmaTfr}; R1: Σ voci con TFR sì, posizione e IVC comprese, comparto escluso, senza 13ª né 80%, sempre a mese pieno`,
    },
    {
      id: 'retribuzione-valutabile-tfr',
      etichetta: 'Retribuzione valutabile ai fini TFR',
      voci: vociTfr,
      tredicesima: vociTfr13,
      percentuale: 100,
      regime: 'TFR',
      fonte: `${fonteDmaTfr}; R4: base al 100% (voci utili al TFS e 13ª se dovuta) più gli ulteriori elementi`,
    },
    {
      id: 'ulteriori-elementi-tfr',
      etichetta: 'Ulteriori elementi imponibili TFR',
      voci: ['07'],
      tredicesima: ['07'],
      percentuale: 100,
      regime: 'TFR',
      fonte: `${fonteDmaTfr}; R2: voci con TFR sì e TFS no (oggi la sola retribuzione di posizione), al 100%, contributo 6,91% (Msg INPS 2440/2019)`,
    },
  ],
} as const satisfies RighePassweb;
