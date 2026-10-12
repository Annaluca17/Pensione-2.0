// Casi normativi dell'ultimo miglio di pensione, del TFS e delle situazioni (ticket 20; glossario:
// Caso normativo). Dati di fantasia (CF RSSMRA80A01H501U), voci 01, 02, 09 e 10 prese dalle tabelle
// CCNL vere di `src/tabelle`; le voci individuali (RIA, assegni, posizione, indennità degli asili,
// vigilanza) hanno importi di fantasia. Il risultato atteso è calcolato a mano dalle norme, senza il
// motore (ADR 0001): li useranno i ticket 23 e 25 dal seam `calcolaPratica(dati, tabelle)`, solo i
// casi con `validazione.stato === 'validato'`.
//
// Arrotondamento: le righe di pensione e quasi tutte quelle del TFS sono somme o multipli interi di
// centesimi; solo la 13ª TFS (Σ / 12) ha un valore pieno frazionario, scritto come frazione ridotta
// e arrotondato una volta, half-up al centesimo (D17). Ricontrollati in pensione-tfs.test.ts con
// BigInt. Nessun uso di `arrotonda` del motore.
//
// Decisioni: D-n = "Regole comuni" (ticket 06 del rifacimento); T-n = "Tabelle CCNL versionate"
// (ticket 09 del rifacimento); C20-n = decisioni prese con l'utente nel ticket 20 di costruzione:
// - C20-1: la situazione entra come {tipo, dal}, con `dal` = primo giorno di sospensione, trattenuta,
//   congedo o opzione; la cessazione in anagrafica è quella definitiva. Date proposte: sospensione
//   cautelare e trattenuta per malattia → pensione = fine servizio = dal − 1; congedo L. 104 e
//   optante TFR → pensione = cessazione, fine servizio (data di fine TFS) = dal − 1.
// - C20-2: se pensione e TFS chiudono in mesi diversi le voci coprono dai 12 mesi prima della data
//   di fine TFS fino al mese della pensione: il TFS prende i suoi 12 mesi, la pensione il suo mese.
// - C20-3: "un solo mese inserito" (D2) = voci con la sola base, senza eccezioni: il TFS annualizza
//   la base (× 12) e dà l'avviso `tfs-annualizzato`.
//
// `DatiPraticaPensione` aggiunge a `DatiPratica` regime e situazione, che il motore non ha ancora:
// entrano nel tipo del motore col ticket 23 (decisione del ticket 20: tipo locale).
import type {Centesimi, CodiceVoce, DataISO, DatiPratica, MeseISO, PartTime, VociMese} from '../motore';

export type Situazione =
  | {tipo: 'ordinaria'}
  | {tipo: 'sospensione-cautelare' | 'trattenuta-malattia' | 'congedo-104' | 'optante-tfr'; dal: DataISO};

export interface DatiPraticaPensione extends DatiPratica {
  regime: 'TFS' | 'TFR';
  situazione: Situazione;
}

/** Una riga dell'UM pensione: una per voce presente nel mese, mensile × mensilità. */
export interface RigaPensioneAttesa {
  voce: CodiceVoce;
  mensile: Centesimi;
  mensilita: 10 | 12;
  valore: Centesimi;
  decisioni: string[];
  fonte: string;
}

/** Le 9 righe dell'UM TFS (D16), nell'ordine della maschera. */
export type RigaTfs =
  | 'tab-e'
  | 'ria'
  | 'tredicesima'
  | 'assegno-assorbibile'
  | 'asili'
  | 'assegno-non-riassorbibile'
  | 'indennita-64-56'
  | 'vigilanza'
  | 'differenziali';

export interface RigaTfsAttesa {
  riga: RigaTfs;
  /** Voci sommate sui mesi della finestra TFS. */
  voci: CodiceVoce[];
  divisore: 1 | 12;
  /** Valore pieno in centesimi come frazione ridotta "n/d" (o intero). */
  pieno: string;
  valore: Centesimi;
  decisioni: string[];
  fonte: string;
}

/** Avviso atteso: il codice è un nome proposto, i ticket di motore lo fissano nel tipo `Avviso`. */
export interface AvvisoAtteso {
  codice: string;
  dati: Record<string, string | number>;
  fonte: string;
}

export interface AttesoPensioneTfs {
  dateRiferimento: {pensione: DataISO; fineServizio: DataISO};
  pensione: {
    mese: MeseISO;
    righe: RigaPensioneAttesa[];
    tredicesima: {voci: CodiceVoce[]; valore: Centesimi; decisioni: string[]; fonte: string};
    /** Somma delle righe annue arrotondate (D17). */
    totaleAnnui: Centesimi;
    /** Annui + 13ª. */
    totale: Centesimi;
  };
  tfs: {
    mesi: {dal: MeseISO; al: MeseISO};
    righe: RigaTfsAttesa[];
    totale: Centesimi;
  };
  avvisi: AvvisoAtteso[];
}

export interface CasoNormativoPensioneTfs {
  id: string;
  titolo: string;
  /** La regola che il caso esercita. */
  regola: string;
  dati: DatiPraticaPensione;
  /** Inquadramento dei mesi prima di un cambio di area (le voci seguono la vecchia posizione). */
  posizionePrecedente?: {fino: MeseISO; posizione: string};
  atteso: AttesoPensioneTfs;
  /** Il calcolo passo per passo, con decisione e fonte di ogni passo. */
  passi: string[];
  /** HITL: l'utente valida il risultato atteso prima che un ticket di motore lo usi. */
  validazione: {stato: 'da-validare'} | {stato: 'validato'; data: DataISO};
  /** Voci che si discostano apposta dalle tabelle (le controlla pensione-tfs.test.ts). */
  scostamentiVolutiDalleTabelle?: {mese: MeseISO; voce: string}[];
}

// --- Fonti -----------------------------------------------------------------------------------------

const F = {
  pensione:
    'UM pensione: voci fisse e continuative del mese di riferimento, annuo = mensile × 12 (× 10 per le voci a 10 mensilità), voci intere anche per i part-time (Guida pratica UM pensione §2 regole 1 e 3 e fogli UM pensione, solo prassi: research/regole-ultimo-miglio.md §1); D2, D4, D15, D16',
  pensione13:
    'UM pensione: 13ª = somma dei mensili delle voci con 13ª (Guida pratica UM pensione §2 regola 2; CCNL Funzioni Locali 2019-21 art. 75 c. 2 e art. 74 c. 2 lett. c); D15',
  dieciMensilita: 'Voci 14 (tempo potenziato, 74) e 15 (accessorio asili, 84) a 10 mensilità, solo pensione, senza 13ª (Guida pratica UM pensione §2; fogli UM pensione); D15',
  comparto:
    'Indennità di comparto (quota residua): pensione sì a 12 mensilità senza 13ª, TFS no (CCNL 22/01/2004 art. 33 c. 3; Guida pratica UM pensione; research/comparto-tfs-tfr.md); D6',
  posizione:
    'Retribuzione di posizione: pensione sì con 13ª, TFS no (L. 152/1968 art. 11, elenco tassativo; Cass. ord. 9617/2025 e 29634/2021; prassi: research/posizione-tfs.md); D7',
  ivc: 'D8, T6: si applica l\'ultimo contratto definitivo (CCNL 2022-24) e le IVC che lo anticipano valgono 0 (CCNL 2022-24 art. 56); vale solo l\'IVC del contratto successivo (2025-27: 0,6% apr-giu 2025, 1% dal 07/2025)',
  tfs: 'Circ. INPS 125/2022 §3.2: per gli enti locali (ex INADEL) retribuzione utile degli ultimi dodici mesi di effettivo servizio, senza la 13ª, che va nel campo apposito; D3 (Σ dei 12 mesi effettivi, nessun × 13), D16 (righe della maschera)',
  tfs13:
    'D20 (riapre D5 e torna a D3): riga 13ª = Σ sui 12 mesi delle voci utili TFS con 13ª / 12, IVC compresa; fogli UM TFS Tab G/Tab E (Σ12/12, research/conferme-catalogo.md); Circ. INPS 125/2022 §3.2 (13ª nel campo apposito)',
  situazioni:
    'Prassi interna "Pensionamenti con situazioni particolari in corso" che cita il Msg INPS 1974/2018 §3 (research/regole-ultimo-miglio.md §4.1); D19 (solo prassi)',
  optante: 'Circ. INPS 125/2022 §3.2 punto 2: data di fine = ultimo giorno in TFS per chi ha optato per il TFR; D14, D19',
  ipotesi: 'T5: un\'ipotesi non produce importi; pratica nella vigenza dell\'Ipotesi CCNL 2025-27 (dal 01/01/2025) → avviso, alla firma la pratica tornerà da rilavorare (ADR 0003, 0004)',
} as const;

const CF = 'RSSMRA80A01H501U';
const NOME = 'Mario Rossi';

// --- Voci delle tabelle vere (centesimi, tempo pieno) ------------------------------------------
// 01: CCNL 2019-21 Tab. G (dal 04/2023) + incremento 2023 del CCNL 2022-24 per area (T6 precisato);
// CCNL 2022-24 Tab. B col. 1 (2024-2025) e col. 2 (dal 2026). 02: trasposizione.ts. 09: 0 fino a
// marzo 2025 (T6), IVC 2025 RGS dopo. 10: CCNL 2022-24 Tab. C col. 1, col. 4 dal 2026.
// Fantasia: 04 (assegno IIS), 06 (RIA), 07 (posizione), 12-15 (indennità degli asili).

/** B4 (operatori esperti, assunto in B1 = ex 4ª qualifica: indennità 5,38) nel 2024. */
const B4_2024 = {'01': 170438, '02': 11139, '04': 2500, '06': 3842, '08': 538, '10': 3931} as const;
/** B4 da aprile a dicembre 2023: Tab. G 1.586,21 + 7,93. */
const B4_2023 = {'01': 159414} as const;
/** C3 (istruttori) nel 2024, con RIA. */
const C3_2024 = {'01': 191555, '02': 9019, '06': 2950, '10': 4580} as const;
/** C3 e C1 da aprile a dicembre 2023: Tab. G 1.782,74 + 8,91. */
const ISTRUTTORI_2023 = {'01': 179165} as const;
/** C1 (istruttori, posizione d'ingresso: differenziale storico 0) nel 2024. */
const C1_2024 = {'01': 191555, '10': 4580} as const;
/** D1 (funzionari-eq, ingresso) nel 2024. */
const D1_2024 = {'01': 207847, '10': 5190} as const;
/** D3 (funzionari-eq) nel 2024 con retribuzione di posizione. */
const D3_2024 = {'01': 207847, '02': 27984, '07': 70000, '10': 5190} as const;
/** D3 da aprile a dicembre 2023: Tab. G 1.934,36 + 9,67. */
const D3_2023 = {'01': 194403} as const;

function mesiDa<T>(dal: MeseISO, al: MeseISO, valore: T): Partial<Record<MeseISO, T>> {
  const out: Partial<Record<MeseISO, T>> = {};
  let [a, m] = dal.split('-').map(Number);
  const [fa, fm] = al.split('-').map(Number);
  while (a < fa || (a === fa && m <= fm)) {
    out[`${a}-${String(m).padStart(2, '0')}`] = valore;
    m += 1;
    if (m > 12) {
      m = 1;
      a += 1;
    }
  }
  return out;
}

function pratica(
  anagrafica: Omit<DatiPratica['anagrafica'], 'nome' | 'codiceFiscale'>,
  voci: DatiPratica['voci'],
  situazione: Situazione = {tipo: 'ordinaria'},
  partTime: DatiPratica['partTime'] = {base: {percentuale: 100}, eccezioni: {}},
): DatiPraticaPensione {
  return {
    anagrafica: {nome: NOME, codiceFiscale: CF, ...anagrafica},
    voci,
    partTime,
    forzature: {},
    iscrittoCredito: true,
    regime: 'TFS',
    situazione,
  };
}

/** Decisioni e fonte di una riga di pensione secondo la voce. */
function rp(voce: CodiceVoce, mensile: Centesimi, valore: Centesimi): RigaPensioneAttesa {
  const dieci = voce === '14' || voce === '15';
  const extra: Partial<Record<CodiceVoce, [string, string]>> = {
    '07': ['D7', F.posizione],
    '09': ['D8', F.ivc],
    '10': ['D6', F.comparto],
    '14': ['D15', F.dieciMensilita],
    '15': ['D15', F.dieciMensilita],
  };
  const [d, f] = extra[voce] ?? [];
  return {
    voce,
    mensile,
    mensilita: dieci ? 10 : 12,
    valore,
    decisioni: ['D2', 'D15', 'D16', ...(d && d !== 'D15' ? [d] : [])],
    fonte: f ? `${F.pensione}; ${f}` : F.pensione,
  };
}

function tredicesimaPensione(voci: CodiceVoce[], valore: Centesimi) {
  return {voci, valore, decisioni: ['D15', 'D16'], fonte: F.pensione13};
}

/** Le 9 righe del TFS: valori interi tranne la 13ª (pieno come frazione). */
function righeTfs(v: {
  tabE: Centesimi;
  ria?: Centesimi;
  tredicesima: {voci: CodiceVoce[]; pieno: string; valore: Centesimi};
  assegnoAssorbibile?: Centesimi;
  asili?: Centesimi;
  assegnoNonRiassorbibile?: Centesimi;
  ind6456?: Centesimi;
  vigilanza?: Centesimi;
  differenziali?: Centesimi;
}): RigaTfsAttesa[] {
  const intera = (riga: RigaTfs, voci: CodiceVoce[], valore = 0): RigaTfsAttesa => ({
    riga,
    voci,
    divisore: 1,
    pieno: String(valore),
    valore,
    decisioni: ['D3', 'D16'],
    fonte: F.tfs,
  });
  return [
    {...intera('tab-e', ['01', '09'], v.tabE), decisioni: ['D3', 'D8', 'D16']},
    intera('ria', ['06'], v.ria),
    {
      riga: 'tredicesima',
      voci: v.tredicesima.voci,
      divisore: 12,
      pieno: v.tredicesima.pieno,
      valore: v.tredicesima.valore,
      decisioni: ['D20', 'D3', 'D17'],
      fonte: F.tfs13,
    },
    intera('assegno-assorbibile', ['05'], v.assegnoAssorbibile),
    intera('asili', ['12', '13'], v.asili),
    intera('assegno-non-riassorbibile', ['04'], v.assegnoNonRiassorbibile),
    intera('indennita-64-56', ['08'], v.ind6456),
    intera('vigilanza', ['11'], v.vigilanza),
    intera('differenziali', ['02', '03'], v.differenziali),
  ];
}

// HITL: tutti i casi validati dall'utente il 12/10/2026 (ticket 20, Comments).
const VALIDATO = {stato: 'validato', data: '2026-10-12'} as const;

const ORDINARIA = (data: DataISO) => ({pensione: data, fineServizio: data});

// --- Casi --------------------------------------------------------------------------------------

export const casiNormativiPensioneTfs: CasoNormativoPensioneTfs[] = [
  {
    id: 'PT-N01',
    titolo: 'Operatore esperto B4 a tempo pieno, cessato a fine mese, situazione ordinaria',
    regola: 'UM pensione per voce × 12 e 13ª dai mensili; UM TFS in 9 righe su Σ 12 mesi; comparto solo pensione',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2024-11-30'},
      {base: B4_2024, eccezioni: {'2023-12': B4_2023}},
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-11-30'),
      pensione: {
        mese: '2024-11',
        righe: [
          rp('01', 170438, 2045256),
          rp('02', 11139, 133668),
          rp('04', 2500, 30000),
          rp('06', 3842, 46104),
          rp('08', 538, 6456),
          rp('10', 3931, 47172),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '04', '06'], 187919),
        totaleAnnui: 2308656,
        totale: 2496575,
      },
      tfs: {
        mesi: {dal: '2023-12', al: '2024-11'},
        righe: righeTfs({
          tabE: 2034232,
          ria: 46104,
          tredicesima: {voci: ['01', '02', '04', '06'], pieno: '561001/3', valore: 187000},
          assegnoNonRiassorbibile: 30000,
          ind6456: 6456,
          differenziali: 133668,
        }),
        totale: 2437460,
      },
      avvisi: [],
    },
    passi: [
      `Situazione ordinaria: data di riferimento di pensione e di fine TFS = cessazione 30/11/2024 (D19). Fonte: ${F.situazioni}.`,
      `Novembre 2024, contratto applicato CCNL 2022-24 (definitivo): 01 Tab. B col. 1 operatori esperti 1.704,38; 02 differenziale storico B4 111,39; 10 comparto Tab. C 39,31; IVC 0 (le IVC 2022-23 anticipano il CCNL 2022-24, l'IVC 2025 parte ad aprile 2025). Fonte: ${F.ivc}.`,
      `UM pensione, mensile × 12: 01 20.452,56; 02 1.336,68; 04 (assegno IIS, fantasia) 300,00; 06 (RIA, fantasia) 461,04; 08 (indennità specifica) 64,56; 10 (comparto) 471,72. Totale annui 23.086,56. Fonte: ${F.pensione}.`,
      `13ª pensione = 01 + 02 + 04 + 06 = 1.704,38 + 111,39 + 25,00 + 38,42 = 1.879,19 (08 e 10 senza 13ª, D15). Totale UM 23.086,56 + 1.879,19 = 24.965,75. Fonte: ${F.pensione13}.`,
      `Finestra TFS: dicembre 2023 - novembre 2024 (12 mesi alla data di fine TFS). Dicembre 2023: 01 = Tab. G 1.586,21 + incremento 2023 del CCNL 2022-24 7,93 = 1.594,14 (T6 precisato); gli altri 11 mesi 1.704,38. Fonte: ${F.tfs}.`,
      'TAB E = Σ (01 + 09) = 1.594,14 + 11 × 1.704,38 = 20.342,32. RIA = 12 × 38,42 = 461,04. Assegno non riassorbibile = 12 × 25,00 = 300,00. Ind. 64,56 = 12 × 5,38 = 64,56. Differenziali (02 + 03) = 12 × 111,39 = 1.336,68. Nessun × 13 (D3). Comparto fuori (D6).',
      `13ª TFS = Σ 12 mesi (01 + 02 + 04 + 06 + 09) / 12 = (1.768,95 + 11 × 1.879,19) / 12 = 22.440,04 / 12 = 561001/3 centesimi = 187.000,33… → 1.870,00 (half-up, D17). Fonte: ${F.tfs13}.`,
      'Totale TFS (somma delle righe arrotondate, D17) = 24.374,60.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N02',
    titolo: 'Come PT-N01, cessato a metà mese (giovedì 14/11/2024)',
    regola: 'Pensione e TFS non dipendono dal giorno di cessazione: voci intere del mese e stessa finestra',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2024-11-14'},
      {base: B4_2024, eccezioni: {'2023-12': B4_2023}},
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-11-14'),
      pensione: {
        mese: '2024-11',
        righe: [
          rp('01', 170438, 2045256),
          rp('02', 11139, 133668),
          rp('04', 2500, 30000),
          rp('06', 3842, 46104),
          rp('08', 538, 6456),
          rp('10', 3931, 47172),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '04', '06'], 187919),
        totaleAnnui: 2308656,
        totale: 2496575,
      },
      tfs: {
        mesi: {dal: '2023-12', al: '2024-11'},
        righe: righeTfs({
          tabE: 2034232,
          ria: 46104,
          tredicesima: {voci: ['01', '02', '04', '06'], pieno: '561001/3', valore: 187000},
          assegnoNonRiassorbibile: 30000,
          ind6456: 6456,
          differenziali: 133668,
        }),
        totale: 2437460,
      },
      avvisi: [],
    },
    passi: [
      `Cessazione giovedì 14/11/2024: date di riferimento = 14/11/2024 (D19). Fonte: ${F.situazioni}.`,
      `UM pensione: voci fisse e continuative del mese di cessazione, intere (la testata del cedolino è sempre intera): il mese parziale non riduce nulla. Stessi importi di PT-N01. Fonte: ${F.pensione}.`,
      `UM TFS: finestra = 12 mesi fino al mese della data di fine TFS, dicembre 2023 - novembre 2024, come PT-N01; il mese di cessazione entra con le voci intere (D2, D3). Fonte: ${F.tfs}.`,
      'I giorni del mese parziale (12 lun-sab dal 01/11 al 14/11, D9) servono solo a TFR e DMA previste, non a queste due sezioni.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N03',
    titolo: 'Istruttore C3 cessato il 30/06/2024: nuovo tabellare a metà dei 12 mesi',
    regola: 'D20: 13ª TFS = Σ dei 12 mesi effettivi / 12 con due tabellari diversi; IVC 0 su tutta la finestra',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-06-30'},
      {base: C3_2024, eccezioni: mesiDa('2023-07', '2023-12', ISTRUTTORI_2023)},
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-06-30'),
      pensione: {
        mese: '2024-06',
        righe: [rp('01', 191555, 2298660), rp('02', 9019, 108228), rp('06', 2950, 35400), rp('10', 4580, 54960)],
        tredicesima: tredicesimaPensione(['01', '02', '06'], 203524),
        totaleAnnui: 2497248,
        totale: 2700772,
      },
      tfs: {
        mesi: {dal: '2023-07', al: '2024-06'},
        righe: righeTfs({
          tabE: 2224320,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '197329', valore: 197329},
          differenziali: 108228,
        }),
        totale: 2565277,
      },
      avvisi: [],
    },
    passi: [
      `Contratti nella finestra luglio 2023 - giugno 2024: luglio-dicembre 2023 tabellare d'area CCNL 2019-21 Tab. G istruttori 1.782,74 + incremento 2023 del CCNL 2022-24 8,91 = 1.791,65 nella voce 01, voce 09 = 0 (T6 precisato); gennaio-giugno 2024 Tab. B col. 1 1.915,55, che riassorbe gli incrementi 2022-23 (art. 56). Differenziale storico C3 90,19 dal 04/2023. Fonte: ${F.ivc}.`,
      `UM pensione sul mese di cessazione, giugno 2024: 01 22.986,60; 02 1.082,28; 06 (RIA, fantasia) 354,00; 10 549,60 → annui 24.972,48; 13ª = 1.915,55 + 90,19 + 29,50 = 2.035,24; totale 27.007,72. Fonte: ${F.pensione}.`,
      `TAB E = 6 × 1.791,65 + 6 × 1.915,55 = 10.749,90 + 11.493,30 = 22.243,20 (nessuna IVC). RIA 354,00, differenziali 1.082,28. Fonte: ${F.tfs}.`,
      `13ª TFS = [6 × (1.791,65 + 90,19 + 29,50) + 6 × (1.915,55 + 90,19 + 29,50)] / 12 = (11.468,04 + 12.211,44) / 12 = 23.679,48 / 12 = 1.973,29 esatto. Con la sola regola "ultimo mese" (D5, superata) sarebbe 2.035,24. Fonte: ${F.tfs13}.`,
      'Totale TFS = 22.243,20 + 354,00 + 1.973,29 + 1.082,28 = 25.652,77.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N04',
    titolo: 'Istruttore C3 part-time O, poi V, poi M, con % che cambia nei 12 mesi',
    regola: 'D4: pensione e TFS usano la voce intera, qualunque tipo e % di part-time',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-10-31'},
      {base: C3_2024, eccezioni: mesiDa('2023-11', '2023-12', ISTRUTTORI_2023)},
      {tipo: 'ordinaria'},
      {
        base: {percentuale: 50, tipo: 'O'},
        eccezioni: {
          ...mesiDa<PartTime>('2024-03', '2024-06', {percentuale: 66.67, tipo: 'V'}),
          ...mesiDa<PartTime>('2024-07', '2024-10', {percentuale: 83.33, tipo: 'M'}),
        },
      },
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-10-31'),
      pensione: {
        mese: '2024-10',
        righe: [rp('01', 191555, 2298660), rp('02', 9019, 108228), rp('06', 2950, 35400), rp('10', 4580, 54960)],
        tredicesima: tredicesimaPensione(['01', '02', '06'], 203524),
        totaleAnnui: 2497248,
        totale: 2700772,
      },
      tfs: {
        mesi: {dal: '2023-11', al: '2024-10'},
        righe: righeTfs({
          tabE: 2273880,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '201459', valore: 201459},
          differenziali: 108228,
        }),
        totale: 2618967,
      },
      avvisi: [],
    },
    passi: [
      'Part-time: orizzontale 50% da novembre 2023 a febbraio 2024, verticale 66,67% da marzo a giugno 2024, misto 83,33% da luglio a ottobre 2024. Le voci sono inserite a tempo pieno (voci di testata).',
      `UM pensione: voci intere, la % non si applica (D4, solo prassi: Guida UM, "importi annualizzati e riportati a tempo pieno"). Ottobre 2024 come un tempo pieno: annui 24.972,48, 13ª 2.035,24, totale 27.007,72. Fonte: ${F.pensione}.`,
      `UM TFS: voci intere anche per i part-time (D4; fogli Tab G e Tab E: "annualizzate e a tempo pieno anche in caso di dipendente part-time"). Finestra novembre 2023 - ottobre 2024: TAB E = 2 × 1.791,65 + 10 × 1.915,55 = 22.738,80; RIA 354,00; differenziali 1.082,28. Fonte: ${F.tfs}.`,
      `13ª TFS = [2 × 1.911,34 + 10 × 2.035,24] / 12 = 24.175,08 / 12 = 2.014,59 esatto. Fonte: ${F.tfs13}.`,
      'Totale TFS = 26.189,67. Nessun avviso: il tipo e la % servono solo a TFR e DMA previste.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N05',
    titolo: 'Istruttore C3 cessato il 31/12/2024 con un solo mese inserito',
    regola: 'C20-3 (D2): voci senza eccezioni → il TFS annualizza la base × 12 e avvisa della semplificazione',
    dati: pratica({posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-12-31'}, {base: C3_2024, eccezioni: {}}),
    atteso: {
      dateRiferimento: ORDINARIA('2024-12-31'),
      pensione: {
        mese: '2024-12',
        righe: [rp('01', 191555, 2298660), rp('02', 9019, 108228), rp('06', 2950, 35400), rp('10', 4580, 54960)],
        tredicesima: tredicesimaPensione(['01', '02', '06'], 203524),
        totaleAnnui: 2497248,
        totale: 2700772,
      },
      tfs: {
        mesi: {dal: '2024-01', al: '2024-12'},
        righe: righeTfs({
          tabE: 2298660,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '203524', valore: 203524},
          differenziali: 108228,
        }),
        totale: 2645812,
      },
      avvisi: [
        {
          codice: 'tfs-annualizzato',
          dati: {mese: '2024-12', mesi: 12},
          fonte: 'D2: con un solo mese inserito il TFS annualizza e lo segnala come semplificazione; C20-3 (un solo mese = nessuna eccezione nelle voci)',
        },
      ],
    },
    passi: [
      'Voci inserite: solo la base (dicembre 2024), nessuna eccezione → "un solo mese inserito" (C20-3).',
      `UM pensione su dicembre 2024: annui 24.972,48, 13ª 2.035,24, totale 27.007,72. Fonte: ${F.pensione}.`,
      `UM TFS annualizzato: ogni riga = mensile della base × 12. TAB E 22.986,60; RIA 354,00; 13ª = 12 × 2.035,24 / 12 = 2.035,24; differenziali 1.082,28; totale 26.458,12. In questo caso la finestra gennaio-dicembre 2024 ha davvero lo stesso tabellare, quindi l'importo coincide con Σ 12 mesi: l'avviso dice solo che i 12 mesi non sono stati verificati. Fonte: ${F.tfs}; ${F.tfs13}.`,
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N06',
    titolo: 'Da istruttore C1 a funzionario dal 01/07/2024, cessato il 31/12/2024',
    regola: 'Cambio di area nei 12 mesi: il TFS somma i mesi com\'erano, la pensione prende l\'ultimo mese',
    dati: pratica(
      {posizione: 'D1', assunzione: '2004-09-01', cessazione: '2024-12-31'},
      {base: D1_2024, eccezioni: mesiDa('2024-01', '2024-06', C1_2024)},
    ),
    posizionePrecedente: {fino: '2024-06', posizione: 'C1'},
    atteso: {
      dateRiferimento: ORDINARIA('2024-12-31'),
      pensione: {
        mese: '2024-12',
        righe: [rp('01', 207847, 2494164), rp('10', 5190, 62280)],
        tredicesima: tredicesimaPensione(['01'], 207847),
        totaleAnnui: 2556444,
        totale: 2764291,
      },
      tfs: {
        mesi: {dal: '2024-01', al: '2024-12'},
        righe: righeTfs({
          tabE: 2396412,
          tredicesima: {voci: ['01'], pieno: '199701', valore: 199701},
        }),
        totale: 2596113,
      },
      avvisi: [],
    },
    passi: [
      'Gennaio-giugno 2024 istruttore C1 (posizione d\'ingresso, differenziale storico 0): 01 1.915,55, 10 45,80. Da luglio 2024 funzionario (area funzionari-eq, ingresso D1): 01 2.078,47, 10 51,90. CCNL 2022-24 Tab. B col. 1 e Tab. C. La posizione in anagrafica è quella alla cessazione (D1). Le voci sono importi d\'ingresso, quindi nessuna regola di progressione entra nel caso.',
      `UM pensione su dicembre 2024: 01 24.941,64; 10 622,80; annui 25.564,44; 13ª 2.078,47; totale 27.642,91. Fonte: ${F.pensione}.`,
      `UM TFS sui 12 mesi effettivi: TAB E = 6 × 1.915,55 + 6 × 2.078,47 = 11.493,30 + 12.470,82 = 23.964,12. Fonte: ${F.tfs}.`,
      `13ª TFS = 23.964,12 / 12 = 1.997,01 esatto (la regola "ultimo mese" darebbe 2.078,47). Fonte: ${F.tfs13}.`,
      'Totale TFS = 25.961,13.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N07',
    titolo: 'Educatrice degli asili C1 con voci a 10 mensilità',
    regola: 'Voci 14 e 15 × 10 solo pensione; 12 e 13 nella riga asili del TFS; comparto solo pensione',
    dati: pratica(
      {posizione: 'C1', assunzione: '2010-09-01', cessazione: '2024-11-30'},
      {base: {...C1_2024, '12': 5165, '13': 2840, '14': 9000, '15': 4500}, eccezioni: {'2023-12': ISTRUTTORI_2023}},
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-11-30'),
      pensione: {
        mese: '2024-11',
        righe: [
          rp('01', 191555, 2298660),
          rp('10', 4580, 54960),
          rp('12', 5165, 61980),
          rp('13', 2840, 34080),
          rp('14', 9000, 90000),
          rp('15', 4500, 45000),
        ],
        tredicesima: tredicesimaPensione(['01'], 191555),
        totaleAnnui: 2584680,
        totale: 2776235,
      },
      tfs: {
        mesi: {dal: '2023-12', al: '2024-11'},
        righe: righeTfs({
          tabE: 2286270,
          tredicesima: {voci: ['01'], pieno: '381045/2', valore: 190523},
          asili: 96060,
        }),
        totale: 2572853,
      },
      avvisi: [],
    },
    passi: [
      'Voci di fantasia (indennità dell\'ente non tabulate in src/tabelle): 12 (ind. professionale asili, 72) 51,65; 13 (ind. aggiuntiva asili, 78) 28,40; 14 (tempo potenziato, 74) 90,00; 15 (accessorio asili, 84) 45,00. Tabellari veri: 01 1.915,55 (2024), 1.791,65 (dicembre 2023); 10 45,80.',
      `UM pensione su novembre 2024: 01 22.986,60; 10 549,60; 12 619,80; 13 340,80 (× 12); 14 900,00 e 15 450,00 (× 10). Annui 25.846,80. Fonte: ${F.pensione}; ${F.dieciMensilita}.`,
      `13ª pensione = solo 01 = 1.915,55 (10, 12, 13, 14, 15 senza 13ª, D15). Totale 27.762,35. Fonte: ${F.pensione13}.`,
      `UM TFS: TAB E = 1.791,65 + 11 × 1.915,55 = 22.862,70; asili (12 + 13) = 12 × 80,05 = 960,60; 14, 15 e 10 fuori (TFS no, D6, D15). Fonte: ${F.tfs}.`,
      `13ª TFS = 22.862,70 / 12 = 381045/2 centesimi = 190.522,5 → 1.905,23 (half-up sulla metà, D17). Fonte: ${F.tfs13}.`,
      'Totale TFS = 22.862,70 + 1.905,23 + 960,60 = 25.728,53.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N08',
    titolo: 'Funzionario D3 con retribuzione di posizione',
    regola: 'D7: la posizione (07) entra nella pensione con la 13ª e resta fuori dal TFS, riga e 13ª',
    dati: pratica(
      {posizione: 'D3', assunzione: '2001-04-01', cessazione: '2024-11-30'},
      {base: D3_2024, eccezioni: {'2023-12': D3_2023}},
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2024-11-30'),
      pensione: {
        mese: '2024-11',
        righe: [rp('01', 207847, 2494164), rp('02', 27984, 335808), rp('07', 70000, 840000), rp('10', 5190, 62280)],
        tredicesima: tredicesimaPensione(['01', '02', '07'], 305831),
        totaleAnnui: 3732252,
        totale: 4038083,
      },
      tfs: {
        mesi: {dal: '2023-12', al: '2024-11'},
        righe: righeTfs({
          tabE: 2480720,
          tredicesima: {voci: ['01', '02'], pieno: '704132/3', valore: 234711},
          differenziali: 335808,
        }),
        totale: 3051239,
      },
      avvisi: [],
    },
    passi: [
      'D3 → area funzionari-eq: 01 2.078,47 (2024), 1.944,03 (dicembre 2023: Tab. G 1.934,36 + 9,67); 02 279,84; 10 51,90; 07 retribuzione di posizione di fantasia 700,00.',
      `UM pensione su novembre 2024: 01 24.941,64; 02 3.358,08; 07 8.400,00; 10 622,80; annui 37.322,52; 13ª = 2.078,47 + 279,84 + 700,00 = 3.058,31; totale 40.380,83. Fonte: ${F.pensione}; ${F.posizione}.`,
      `UM TFS: la 07 non ha riga e non entra nella 13ª (TFS no). TAB E = 1.944,03 + 11 × 2.078,47 = 24.807,20; differenziali = 12 × 279,84 = 3.358,08. Fonte: ${F.tfs}; ${F.posizione}.`,
      `13ª TFS = (2.223,87 + 11 × 2.358,31) / 12 = 28.165,28 / 12 = 704132/3 centesimi = 234.710,66… → 2.347,11. Fonte: ${F.tfs13}.`,
      'Totale TFS = 30.512,39.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N09',
    titolo: 'Istruttore C3 cessato il 30/11/2024 con l\'IVC 2023 digitata su tutti i mesi',
    regola: 'D8: col CCNL 2022-24 applicato l\'IVC vale 0; l\'IVC digitata dà un avviso per mese e non si somma',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-11-30'},
      {base: {...C3_2024, '09': 936}, eccezioni: {'2023-12': ISTRUTTORI_2023}},
    ),
    scostamentiVolutiDalleTabelle: mesiDaElenco('2023-12', '2024-11').map((mese) => ({mese, voce: '09'})),
    atteso: {
      dateRiferimento: ORDINARIA('2024-11-30'),
      pensione: {
        mese: '2024-11',
        righe: [rp('01', 191555, 2298660), rp('02', 9019, 108228), rp('06', 2950, 35400), rp('10', 4580, 54960)],
        tredicesima: tredicesimaPensione(['01', '02', '06'], 203524),
        totaleAnnui: 2497248,
        totale: 2700772,
      },
      tfs: {
        mesi: {dal: '2023-12', al: '2024-11'},
        righe: righeTfs({
          tabE: 2286270,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '404983/2', valore: 202492},
          differenziali: 108228,
        }),
        totale: 2632390,
      },
      avvisi: mesiDaElenco('2023-12', '2024-11').map((mese) => ({
        codice: 'ivc-incompatibile',
        dati: {mese, inserita: 936, daTabella: 0, contrattoApplicato: 'ccnl-2022-24'},
        fonte: F.ivc,
      })),
    },
    passi: [
      'Voce 09 digitata 9,36 (IVC 2023 di C3) su tutti i 12 mesi. Dicembre 2023: contratto applicato CCNL 2022-24 (01 = Tab. G + 0,5%, T6 precisato), IVC 2023 riassorbita → 0. 2024: Tab. B col. 1 riassorbe le IVC 2022-23; l\'IVC del contratto successivo parte ad aprile 2025 → 0.',
      `Avviso "IVC incompatibile" per ciascuno dei 12 mesi, e la 09 non si somma in nessuna riga (D8, storia 50). Fonte: ${F.ivc}.`,
      `UM pensione: nessuna riga 09; annui 24.972,48, 13ª 2.035,24, totale 27.007,72. Fonte: ${F.pensione}.`,
      `UM TFS: TAB E = 1.791,65 + 11 × 1.915,55 = 22.862,70 senza IVC; RIA 354,00; differenziali 1.082,28. 13ª = (1.911,34 + 11 × 2.035,24) / 12 = 24.298,98 / 12 = 404983/2 centesimi = 202.491,5 → 2.024,92. Fonte: ${F.tfs}; ${F.tfs13}.`,
      'Totale TFS = 26.323,90. Con l\'IVC sommata (vecchio Unificato) TAB E e 13ª sarebbero più alti di 112,32 e 9,36.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N10',
    titolo: 'Istruttore C3 cessato il 31/10/2026: IVC 2025 e conglobamento del comparto nei 12 mesi',
    regola: 'D8/T6: l\'IVC 2025 vale ed entra in TAB E e nella 13ª TFS (D20); comparto conglobato dal 2026; avviso Ipotesi 2025-27 (T5)',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2026-10-31'},
      {
        base: {'01': 192823, '02': 9019, '06': 2950, '09': 1928, '10': 3206},
        eccezioni: mesiDa('2025-11', '2025-12', {'01': 191555, '10': 4580}),
      },
    ),
    atteso: {
      dateRiferimento: ORDINARIA('2026-10-31'),
      pensione: {
        mese: '2026-10',
        righe: [
          rp('01', 192823, 2313876),
          rp('02', 9019, 108228),
          rp('06', 2950, 35400),
          rp('09', 1928, 23136),
          rp('10', 3206, 38472),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '06', '09'], 206720),
        totaleAnnui: 2519112,
        totale: 2725832,
      },
      tfs: {
        mesi: {dal: '2025-11', al: '2026-10'},
        righe: righeTfs({
          tabE: 2334476,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06', '09'], pieno: '619526/3', valore: 206509},
          differenziali: 108228,
        }),
        totale: 2684613,
      },
      avvisi: [{codice: 'contratto-in-ipotesi', dati: {contratto: 'ccnl-2025-27', vigenzaDal: '2025-01-01'}, fonte: F.ipotesi}],
    },
    passi: [
      'Novembre-dicembre 2025: 01 Tab. B col. 1 1.915,55, 10 45,80. Da gennaio 2026: 01 Tab. B col. 2 1.928,23 (con la quota di comparto conglobata, art. 60), 10 quota residua 32,06. Su tutta la finestra 09 = IVC 2025 1% istruttori 19,28 (anticipa l\'Ipotesi 2025-27, non definitiva: vale, T6). 02 = 90,19.',
      `UM pensione su ottobre 2026: 01 23.138,76; 02 1.082,28; 06 354,00; 09 231,36; 10 384,72; annui 25.191,12; 13ª = 1.928,23 + 90,19 + 29,50 + 19,28 = 2.067,20; totale 27.258,32. Fonte: ${F.pensione}; ${F.ivc}.`,
      `UM TFS: TAB E = Σ (01 + 09) = 2 × (1.915,55 + 19,28) + 10 × (1.928,23 + 19,28) = 3.869,66 + 19.475,10 = 23.344,76. La quota conglobata è tabellare e entra così com'è; il comparto residuo resta fuori (D6, research/comparto-tfs-tfr.md: "pro-rata" dell'art. 60 non definito da nessuna fonte). Fonte: ${F.tfs}.`,
      `13ª TFS = [2 × 2.054,52 + 10 × 2.067,20] / 12 = 24.781,04 / 12 = 619526/3 centesimi = 206.508,66… → 2.065,09, IVC compresa. Fonte: ${F.tfs13}.`,
      `Totale TFS = 23.344,76 + 354,00 + 2.065,09 + 1.082,28 = 26.846,13. Avviso: la cessazione cade nella vigenza dell'Ipotesi CCNL 2025-27, che non produce importi; alla firma la pratica tornerà da rilavorare. Fonte: ${F.ipotesi}.`,
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N11',
    titolo: 'Sospensione cautelare dal 16/10/2024, cessazione definitiva il 31/12/2024',
    regola: 'D19, C20-1: pensione e TFS all\'ultimo giorno di servizio prima della sospensione',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-12-31'},
      {base: C3_2024, eccezioni: mesiDa('2023-11', '2023-12', ISTRUTTORI_2023)},
      {tipo: 'sospensione-cautelare', dal: '2024-10-16'},
    ),
    atteso: {
      dateRiferimento: {pensione: '2024-10-15', fineServizio: '2024-10-15'},
      pensione: {
        mese: '2024-10',
        righe: [rp('01', 191555, 2298660), rp('02', 9019, 108228), rp('06', 2950, 35400), rp('10', 4580, 54960)],
        tredicesima: tredicesimaPensione(['01', '02', '06'], 203524),
        totaleAnnui: 2497248,
        totale: 2700772,
      },
      tfs: {
        mesi: {dal: '2023-11', al: '2024-10'},
        righe: righeTfs({
          tabE: 2273880,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '201459', valore: 201459},
          differenziali: 108228,
        }),
        totale: 2618967,
      },
      avvisi: [],
    },
    passi: [
      `Sospensione cautelare dal 16/10/2024: UM pensione e UM TFS all'ultimo giorno di servizio prima della sospensione, 15/10/2024 (C20-1). La cessazione definitiva 31/12/2024 resta in anagrafica. Fonte: ${F.situazioni}.`,
      `UM pensione sulle voci di ottobre 2024: annui 24.972,48, 13ª 2.035,24, totale 27.007,72. Fonte: ${F.pensione}.`,
      `UM TFS sui 12 mesi fino a ottobre 2024 (novembre 2023 - ottobre 2024): TAB E 22.738,80; RIA 354,00; 13ª 2.014,59 (24.175,08 / 12, esatto); differenziali 1.082,28; totale 26.189,67. Fonte: ${F.tfs}; ${F.tfs13}.`,
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N12',
    titolo: 'Trattenuta del 100% per malattia dal 01/09/2024, cessazione definitiva il 31/12/2024',
    regola: 'D19, C20-1: pensione e TFS all\'ultimo giorno prima della trattenuta',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2024-12-31'},
      {base: B4_2024, eccezioni: mesiDa('2023-09', '2023-12', B4_2023)},
      {tipo: 'trattenuta-malattia', dal: '2024-09-01'},
    ),
    atteso: {
      dateRiferimento: {pensione: '2024-08-31', fineServizio: '2024-08-31'},
      pensione: {
        mese: '2024-08',
        righe: [
          rp('01', 170438, 2045256),
          rp('02', 11139, 133668),
          rp('04', 2500, 30000),
          rp('06', 3842, 46104),
          rp('08', 538, 6456),
          rp('10', 3931, 47172),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '04', '06'], 187919),
        totaleAnnui: 2308656,
        totale: 2496575,
      },
      tfs: {
        mesi: {dal: '2023-09', al: '2024-08'},
        righe: righeTfs({
          tabE: 2001160,
          ria: 46104,
          tredicesima: {voci: ['01', '02', '04', '06'], pieno: '552733/3', valore: 184244},
          assegnoNonRiassorbibile: 30000,
          ind6456: 6456,
          differenziali: 133668,
        }),
        totale: 2401632,
      },
      avvisi: [],
    },
    passi: [
      `Trattenuta del 100% per malattia dal 01/09/2024: UM pensione e UM TFS all'ultimo giorno prima della sospensione dello stipendio, 31/08/2024 (C20-1). Fonte: ${F.situazioni}.`,
      `UM pensione sulle voci di agosto 2024: come PT-N01, annui 23.086,56, 13ª 1.879,19, totale 24.965,75. Fonte: ${F.pensione}.`,
      `UM TFS su settembre 2023 - agosto 2024: TAB E = 4 × 1.594,14 + 8 × 1.704,38 = 6.376,56 + 13.635,04 = 20.011,60; RIA 461,04; assegno non riassorbibile 300,00; ind. 64,56; differenziali 1.336,68. Fonte: ${F.tfs}.`,
      `13ª TFS = (4 × 1.768,95 + 8 × 1.879,19) / 12 = 22.109,32 / 12 = 552733/3 centesimi = 184.244,33… → 1.842,44. Totale 24.016,32. Fonte: ${F.tfs13}.`,
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N13',
    titolo: 'Congedo L. 104 dal 01/07/2024 fino alla cessazione del 31/12/2024',
    regola: 'D19, C20-1, C20-2: pensione alla cessazione, TFS all\'ultimo giorno utile INADEL prima del congedo; voci da luglio 2023 a dicembre 2024',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-12-31'},
      {
        base: C3_2024,
        eccezioni: {...mesiDa('2023-07', '2023-12', ISTRUTTORI_2023), ...mesiDa('2024-10', '2024-12', {'03': 5769})},
      },
      {tipo: 'congedo-104', dal: '2024-07-01'},
    ),
    atteso: {
      dateRiferimento: {pensione: '2024-12-31', fineServizio: '2024-06-30'},
      pensione: {
        mese: '2024-12',
        righe: [
          rp('01', 191555, 2298660),
          rp('02', 9019, 108228),
          rp('03', 5769, 69228),
          rp('06', 2950, 35400),
          rp('10', 4580, 54960),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '03', '06'], 209293),
        totaleAnnui: 2566476,
        totale: 2775769,
      },
      tfs: {
        mesi: {dal: '2023-07', al: '2024-06'},
        righe: righeTfs({
          tabE: 2224320,
          ria: 35400,
          tredicesima: {voci: ['01', '02', '06'], pieno: '197329', valore: 197329},
          differenziali: 108228,
        }),
        totale: 2565277,
      },
      avvisi: [],
    },
    passi: [
      `Congedo straordinario L. 104 dal 01/07/2024 fino alla pensione: UM pensione all'ultimo giorno di servizio (= cessazione 31/12/2024), UM TFS all'ultimo giorno utile INADEL prima del congedo, 30/06/2024 (C20-1). Fonte: ${F.situazioni}.`,
      'Le due date cadono in mesi diversi: le voci coprono luglio 2023 - dicembre 2024 (C20-2). Da ottobre 2024 c\'è un differenziale art. 14 (03) di 57,69, una misura degli istruttori (Tab. A CCNL 2019-21, 750,00 / 13): entra nella pensione, non nel TFS che chiude a giugno.',
      `UM pensione su dicembre 2024: 01 22.986,60; 02 1.082,28; 03 692,28; 06 354,00; 10 549,60; annui 25.664,76; 13ª = 1.915,55 + 90,19 + 57,69 + 29,50 = 2.092,93; totale 27.757,69. Fonte: ${F.pensione}.`,
      `UM TFS su luglio 2023 - giugno 2024, come PT-N03: TAB E 22.243,20; RIA 354,00; 13ª 1.973,29; differenziali 1.082,28; totale 25.652,77. Fonte: ${F.tfs}; ${F.tfs13}.`,
    ],
    validazione: VALIDATO,
  },
  {
    id: 'PT-N14',
    titolo: 'Funzionario D3 optante TFR dal 01/07/2024, cessato il 31/12/2024',
    regola: 'D14, D19, C20-1, C20-2: TFS alla data di fine TFS (ultimo giorno in TFS), pensione alla cessazione',
    dati: pratica(
      {posizione: 'D3', assunzione: '2001-04-01', cessazione: '2024-12-31'},
      {
        base: D3_2024,
        eccezioni: {...mesiDa('2023-07', '2023-12', D3_2023), ...mesiDa('2024-09', '2024-12', {'03': 12308})},
      },
      {tipo: 'optante-tfr', dal: '2024-07-01'},
    ),
    atteso: {
      dateRiferimento: {pensione: '2024-12-31', fineServizio: '2024-06-30'},
      pensione: {
        mese: '2024-12',
        righe: [
          rp('01', 207847, 2494164),
          rp('02', 27984, 335808),
          rp('03', 12308, 147696),
          rp('07', 70000, 840000),
          rp('10', 5190, 62280),
        ],
        tredicesima: tredicesimaPensione(['01', '02', '03', '07'], 318139),
        totaleAnnui: 3879948,
        totale: 4198087,
      },
      tfs: {
        mesi: {dal: '2023-07', al: '2024-06'},
        righe: righeTfs({
          tabE: 2413500,
          tredicesima: {voci: ['01', '02'], pieno: '229109', valore: 229109},
          differenziali: 335808,
        }),
        totale: 2978417,
      },
      avvisi: [],
    },
    passi: [
      `Opzione per il TFR dal 01/07/2024: data di fine TFS = ultimo giorno in TFS, 30/06/2024; pensione alla cessazione 31/12/2024 (C20-1). Stesso calcolo TFS, data diversa (D14). Fonte: ${F.optante}; ${F.situazioni}.`,
      'Voci da luglio 2023 a dicembre 2024 (C20-2): 01 1.944,03 nel 2023, 2.078,47 nel 2024; 02 279,84; 07 700,00 (fantasia); 10 51,90; da settembre 2024 differenziale art. 14 (03) 123,08, una misura dei funzionari (Tab. A CCNL 2019-21, 1.600,00 / 13). La sezione TFR dell\'optante (dopo il 01/07/2024) non è di questo ticket.',
      `UM pensione su dicembre 2024: 01 24.941,64; 02 3.358,08; 03 1.476,96; 07 8.400,00; 10 622,80; annui 38.799,48; 13ª = 2.078,47 + 279,84 + 123,08 + 700,00 = 3.181,39; totale 41.980,87. Fonte: ${F.pensione}; ${F.posizione}.`,
      `UM TFS su luglio 2023 - giugno 2024: TAB E = 6 × 1.944,03 + 6 × 2.078,47 = 11.664,18 + 12.470,82 = 24.135,00; differenziali 3.358,08; 07 fuori (D7), 03 non ancora attribuito. Fonte: ${F.tfs}; ${F.posizione}.`,
      `13ª TFS = [6 × 2.223,87 + 6 × 2.358,31] / 12 = 27.493,08 / 12 = 2.291,09 esatto. Totale 29.784,17. Fonte: ${F.tfs13}.`,
    ],
    validazione: VALIDATO,
  },
];

function mesiDaElenco(dal: MeseISO, al: MeseISO): MeseISO[] {
  return Object.keys(mesiDa(dal, al, {}));
}
