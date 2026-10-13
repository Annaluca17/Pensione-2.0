// Casi normativi del miglioramento contrattuale (ticket 21; glossario: Miglioramento contrattuale,
// Pensione erogata). Dati di fantasia (CF RSSMRA80A01H501U). Le voci inserite sono quelle del cedolino
// alla cessazione, prima della firma del contratto: 01, 02 e 10 dalle tabelle dei contratti firmati
// entro la cessazione (CCNL 2019-21 Tab. G, differenziale storico senza il ricalcolo IVC), 09 = IVC
// pagata allora (tabella IVC 2022-23 per posizione); per il cessato del 2021 (MC-N07) i valori del CCNL
// 2016-18 non sono nelle tabelle (copertura dal 2019) e sono di fantasia. Il risultato atteso è
// calcolato a mano dalle norme, senza il motore (ADR 0001): lo usa il ticket 27 dal seam
// `calcolaPratica(dati, tabelle)` (miglioramento-motore.test.ts), solo per i casi validati.
//
// Decisioni (ADR 0003, D13, T4, T12) e, prese con l'utente in questo ticket (12/10/2026):
// - C21-5: l'operatore sceglie il contratto (`miglioramento.contratto`); il motore lo propone quando la
//   cessazione cade in vacanza contrattuale. Vale se la cessazione è nella vigenza del contratto e la
//   firma è dopo la cessazione, altrimenti blocco `miglioramento-non-applicabile`. Chi è cessato dal
//   01/01/2025 ha solo il miglioramento 2025-27 (il 2022-24 gli arriva come arretrati in busta paga),
//   che è un'ipotesi: avviso `contratto-in-ipotesi`, nessun importo (T5). Il CCNL 2022-24 non si
//   applica ai cessati prima del 2022 (miglioramento 2019-21).
// - C21-6: per la pensione contano gli scaglionamenti del contratto con decorrenza dentro la sua
//   vigenza (2022-24: fino al 01/01/2024, il 2026 no; 2019-21: solo Tab. D 2019-2021). Un UM migliorato
//   per decorrenza: il giorno dopo la pensione con gli scaglionamenti fino alla cessazione, poi uno per
//   ogni scaglionamento successivo. Gli avvisi T4 per decorrenza, su fissi + 13ª.
// - C21-7: Scenario A = voci inserite così come sono, IVC inserita compresa (l'UM certificato col vecchio
//   contratto); con il miglioramento anche l'UM pensione ordinario è questo (ticket 01 delle prove
//   pratiche, 13/10/2026; prima restava quello dei ticket 20/23). Scenario B sostituisce dalle
//   tabelle della decorrenza 01 (tabellare + incremento successivo), 02 (differenziale storico rivisto,
//   0 finché il tabellare è per posizione), 09 (0, riassorbita) e 10; le altre voci restano inserite.
// - C21-8: il TFS si migliora mese per mese sulla finestra (le voci 01, 02, 09 come sopra, alla data del
//   mese) e si confronta col TFS ordinario sulle voci inserite: se cambia, avviso `tfs-da-modificare`.
//   Il TFR non si migliora: lo ricalcola INPS e lo comunica nella lettera dei miglioramenti.
// Gli avvisi qui sono quelli del miglioramento: le sezioni ordinarie hanno i loro (es. `ivc-incompatibile`
// del TFS e del TFR sui mesi con l'IVC pagata prima della firma, ticket 23 e 25; la pensione no, ticket 01).
import type {Centesimi, CodiceVoce, DataISO, DatiPratica, DatiPraticaMiglioramento, MeseISO, RegimeFineServizio} from '../motore';
import type {AvvisoAtteso} from './pensione-tfs';

export interface UmAtteso {
  mese: MeseISO;
  righe: {voce: CodiceVoce; mensile: Centesimi; valore: Centesimi}[];
  tredicesima: {voci: CodiceVoce[]; valore: Centesimi};
  totaleAnnui: Centesimi;
  totale: Centesimi;
}

export interface UmMiglioratoAtteso extends Omit<UmAtteso, 'mese'> {
  decorrenza: DataISO;
  sostituite: Record<'01' | '02' | '09' | '10', Centesimi>;
  /** Migliorato − Scenario A. */
  differenza: {annui: Centesimi; tredicesima: Centesimi};
  decisioni: string[];
  fonte: string;
}

export interface TfsMiglioramentoAtteso {
  mesi: {dal: MeseISO; al: MeseISO};
  /** Le 9 righe di D16 col TFS migliorato; 13ª come frazione ridotta. */
  righe: {riga: string; pieno: string; valore: Centesimi}[];
  totale: Centesimi;
  /** Il TFS ordinario sulle voci inserite, per il confronto. */
  ordinario: {riga: string; valore: Centesimi}[];
}

export interface BloccoMiglioramentoAtteso {
  codice: 'miglioramento-non-applicabile';
  contratto: string;
  vigenzaDal: DataISO;
  vigenzaAl: DataISO;
  firma: DataISO;
  cessazione: DataISO;
  fonte: string;
}

export interface CasoNormativoMiglioramento {
  id: string;
  titolo: string;
  regola: string;
  dati: DatiPraticaMiglioramento;
  /** Voci di prima della firma che le tabelle non coprono (CCNL 2016-18): niente controllo. */
  vociPreFirmaFuoriTabelle?: true;
  atteso: {
    esito: 'calcolato' | 'senza-importi' | 'bloccato';
    scenarioA?: UmAtteso;
    migliorati?: UmMiglioratoAtteso[];
    /** Solo in regime TFS: il TFR non si migliora (C21-8). */
    tfs?: TfsMiglioramentoAtteso;
    blocchi: BloccoMiglioramentoAtteso[];
    avvisi: AvvisoAtteso[];
  };
  passi: string[];
  validazione: {stato: 'da-validare'} | {stato: 'validato'; data: DataISO};
}

// --- Fonti -----------------------------------------------------------------------------------------

const F = {
  regola:
    'CCNL Funzioni Locali 2022-24 art. 57 c. 2 (per i cessati nella vigenza gli incrementi hanno effetto integralmente sulla pensione; su TFS e TFR solo quelli maturati alla cessazione); CCNL 2019-21 art. 77 c. 2; ADR 0003, D13, C21-5',
  decorrenze: 'ADR 0003 (UM di miglioramento con la sua decorrenza), C21-6: scaglionamenti con decorrenza nella vigenza del contratto, un UM per decorrenza',
  sostituzione: 'T12: nel migliorato si sostituiscono dalle tabelle 01, 02 e 10, la 09 secondo T6 (riassorbita: CCNL 2022-24 art. 56; CCNL 2019-21 art. 76 c. 4); le altre voci restano quelle inserite; C21-7',
  erogata: 'T4: avviso se l\'UM ricalcolato differisce dalla pensione erogata; avviso forte "nessun miglioramento reale, non inserire la domanda" se fissi + 13ª migliorati non la superano (glossario: Pensione erogata)',
  tfs: 'D13, C21-8: TFS con i soli scaglionamenti con decorrenza fino alla cessazione, mese per mese; Circ. INPS 125/2022 §3.2; D3, D16, D20 per le righe',
  tfr: 'C21-8: il TFR non si migliora, lo ricalcola INPS e lo comunica (PEC o cassetto) nella lettera dei miglioramenti',
  ipotesi: 'T5: un\'ipotesi non produce importi; alla firma la pratica tornerà da rilavorare (ADR 0003, 0004); C21-5',
  bloccato: 'C21-5: il miglioramento vale solo per i cessati nella vigenza del contratto, firmato dopo la cessazione (CCNL 2022-24 art. 57 c. 2: "cessato … nel periodo di vigenza"; T3)',
} as const;

const CF = 'RSSMRA80A01H501U';
const NOME = 'Mario Rossi';
// HITL: tutti i casi validati dall'utente il 12/10/2026 (ticket 21, Comments).
const VALIDAZIONE = {stato: 'validato', data: '2026-10-12'} as const;
const DECISIONI = ['D13', 'T12', 'C21-5', 'C21-6', 'C21-7'];
const FONTE_UM = `${F.regola}; ${F.decorrenze}; ${F.sostituzione}`;

function pratica(
  anagrafica: Omit<DatiPratica['anagrafica'], 'nome' | 'codiceFiscale'>,
  contratto: string,
  voci: DatiPratica['voci'],
  altro: {regime?: RegimeFineServizio; pensioneErogata?: DatiPratica['pensioneErogata']} = {},
): DatiPraticaMiglioramento {
  return {
    anagrafica: {nome: NOME, codiceFiscale: CF, ...anagrafica},
    voci,
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
    ...(altro.pensioneErogata && {pensioneErogata: altro.pensioneErogata}),
    regime: altro.regime ?? 'TFS',
    situazione: {tipo: 'ordinaria'},
    miglioramento: {contratto},
  };
}

function mesiDa<T>(dal: MeseISO, al: MeseISO, valore: T): Partial<Record<MeseISO, T>> {
  const out: Partial<Record<MeseISO, T>> = {};
  let [a, m] = dal.split('-').map(Number);
  for (;;) {
    const mese = `${a}-${String(m).padStart(2, '0')}`;
    if (mese > al) return out;
    out[mese] = valore;
    m += 1;
    if (m > 12) [a, m] = [a + 1, 1];
  }
}

/** Un UM: righe [voce, mensile] (× 12, nessuna voce a 10 mensilità nei casi), voci della 13ª. */
function um(righe: [CodiceVoce, Centesimi][], voci13: CodiceVoce[], tredicesima: Centesimi, totaleAnnui: Centesimi, totale: Centesimi) {
  return {
    righe: righe.map(([voce, mensile]) => ({voce, mensile, valore: mensile * 12})),
    tredicesima: {voci: voci13, valore: tredicesima},
    totaleAnnui,
    totale,
  };
}

function migliorato(
  decorrenza: DataISO,
  sostituite: UmMiglioratoAtteso['sostituite'],
  u: ReturnType<typeof um>,
  differenza: UmMiglioratoAtteso['differenza'],
): UmMiglioratoAtteso {
  return {decorrenza, sostituite, ...u, differenza, decisioni: DECISIONI, fonte: FONTE_UM};
}

/** Le 9 righe del TFS (D16) nell'ordine della maschera; solo la 13ª ha un pieno frazionario. */
function nove(v: {tabE: Centesimi; ria?: Centesimi; tredicesima: [string, Centesimi]; assegnoNonRiassorbibile?: Centesimi; ind6456?: Centesimi; differenziali?: Centesimi}) {
  const r = (riga: string, valore = 0) => ({riga, pieno: String(valore), valore});
  return [
    r('tab-e', v.tabE),
    r('ria', v.ria),
    {riga: 'tredicesima', pieno: v.tredicesima[0], valore: v.tredicesima[1]},
    r('assegno-assorbibile'),
    r('asili'),
    r('assegno-non-riassorbibile', v.assegnoNonRiassorbibile),
    r('indennita-64-56', v.ind6456),
    r('vigilanza'),
    r('differenziali', v.differenziali),
  ];
}
const soloValori = (righe: {riga: string; valore: Centesimi}[]) => righe.map(({riga, valore}) => ({riga, valore}));

const daModificare = (righe: string) => ({codice: 'tfs-da-modificare', dati: {righe}, fonte: F.tfs});
const nessunMiglioramento = (decorrenza: DataISO, migliorato_: Centesimi, erogata: Centesimi) => ({
  codice: 'nessun-miglioramento-reale',
  dati: {decorrenza, migliorato: migliorato_, erogata},
  fonte: F.erogata,
});
const erogataDiversa = (fissi: Centesimi, tredicesima: Centesimi, ricalcolatoFissi: Centesimi, ricalcolato13: Centesimi) => ({
  codice: 'pensione-erogata-diversa',
  dati: {fissi, tredicesima, ricalcolatoFissi, ricalcolato13},
  fonte: F.erogata,
});

/** B4 nel 2023 prima della firma del CCNL 2022-24: Tab. G 1.586,21, differenziale 110,83, IVC 2023 8,49. */
const B4_PRE_2023 = {'01': 158621, '02': 11083, '04': 2500, '06': 3842, '08': 538, '09': 849, '10': 3931} as const;

// --- Casi --------------------------------------------------------------------------------------

export const casiNormativiMiglioramento: CasoNormativoMiglioramento[] = [
  {
    id: 'MC-N01',
    titolo: 'Operatore esperto B4 cessato il 30/06/2023, CCNL 2022-24: due decorrenze, pensione erogata uguale ad A, TFS da modificare',
    regola: 'Pensione: UM migliorato al 01/07/2023 (uguale ad A: l\'incremento 2023 è l\'IVC riassorbita) e al 01/01/2024; TFS mese per mese',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2023-06-30'},
      'ccnl-2022-24',
      {
        base: B4_PRE_2023,
        eccezioni: {
          ...mesiDa('2022-07', '2022-12', {'01': 167564, '02': 0, '09': 838}),
          ...mesiDa('2023-01', '2023-03', {'01': 169703, '02': 0, '09': 849}),
        },
      },
      {pensioneErogata: {fissi: 2176368, tredicesima: 176895}},
    ),
    atteso: {
      esito: 'calcolato',
      scenarioA: {mese: '2023-06', ...um([['01', 158621], ['02', 11083], ['04', 2500], ['06', 3842], ['08', 538], ['09', 849], ['10', 3931]], ['01', '02', '04', '06', '09'], 176895, 2176368, 2353263)},
      migliorati: [
        migliorato('2023-07-01', {'01': 159414, '02': 11139, '09': 0, '10': 3931}, um([['01', 159414], ['02', 11139], ['04', 2500], ['06', 3842], ['08', 538], ['10', 3931]], ['01', '02', '04', '06'], 176895, 2176368, 2353263), {annui: 0, tredicesima: 0}),
        migliorato('2024-01-01', {'01': 170438, '02': 11139, '09': 0, '10': 3931}, um([['01', 170438], ['02', 11139], ['04', 2500], ['06', 3842], ['08', 538], ['10', 3931]], ['01', '02', '04', '06'], 187919, 2308656, 2496575), {annui: 132288, tredicesima: 11024}),
      ],
      tfs: {
        mesi: {dal: '2022-07', al: '2023-06'},
        righe: nove({tabE: 2000310, ria: 46104, tredicesima: ['703277/4', 175819], assegnoNonRiassorbibile: 30000, ind6456: 6456, differenziali: 33417}),
        totale: 2292106,
        ordinario: soloValori(nove({tabE: 1990356, ria: 46104, tredicesima: ['', 174976], assegnoNonRiassorbibile: 30000, ind6456: 6456, differenziali: 33249})),
      },
      blocchi: [],
      avvisi: [nessunMiglioramento('2023-07-01', 2353263, 2353263), daModificare('tab-e,tredicesima,differenziali')],
    },
    passi: [
      `Cessazione 30/06/2023 nella vigenza del CCNL 2022-24 (2022-2024), firmato il 23/02/2026 dopo la cessazione: miglioramento applicabile. Fonte: ${F.regola}.`,
      `Scaglionamenti nella vigenza: 01/04/2022, 01/07/2022, 01/01/2023 (incrementi per posizione = IVC), 01/04/2023 (+7,93 per area), 01/01/2024 (Tab. B col. 1). Il 01/01/2026 è fuori vigenza (C21-6). Fino alla cessazione → UM al 01/07/2023; dopo → UM al 01/01/2024. Fonte: ${F.decorrenze}.`,
      'Scenario A (voci di giugno 2023 come pagate): 01 1.586,21, 02 110,83, 04 25,00, 06 38,42, 08 5,38, 09 8,49, 10 39,31 → annui 21.763,68, 13ª 1.768,95, totale 23.532,63.',
      `UM al 01/07/2023: 01 = Tab. G 1.586,21 + 7,93 = 1.594,14; 02 = differenziale storico rivisto 111,39 (parere ARAN 37607); 09 = 0. 01 + 02 = 1.705,53 = 1.586,21 + 110,83 + 8,49: il miglioramento è l'IVC riassorbita, annui e 13ª identici ad A. Pensione erogata = A → "nessun miglioramento reale" per questa decorrenza. Fonte: ${F.erogata}.`,
      'UM al 01/01/2024: 01 = Tab. B col. 1 1.704,38 → annui 23.086,56 (+1.322,88), 13ª 1.879,19 (+110,24), totale 24.965,75 > erogata.',
      `TFS migliorato, luglio 2022 - giugno 2023: lug-dic 2022 01 = 1.675,64 + incremento 01/07/2022 8,38 = 1.684,02; gen-mar 2023 1.697,03 + 8,49 = 1.705,52; apr-giu 2023 1.594,14 con 02 111,39; IVC 0. TAB E = 6 × 1.684,02 + 3 × 1.705,52 + 3 × 1.594,14 = 20.003,10; differenziali = 3 × 111,39 = 334,17; 13ª = Σ12 (01, 02, 04, 06) / 12 = 703277/4 → 1.758,19. Fonte: ${F.tfs}.`,
      'TFS ordinario sulle voci inserite: l\'IVC pagata (8,38 / 8,49) vale 0 con le tabelle di oggi (D8, T6) → TAB E 19.903,56, 13ª 1.749,76, differenziali 332,49. Cambiano tab-e, 13ª e differenziali → avviso "UM TFS da modificare".',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N02',
    titolo: 'Istruttore C3 cessato il 31/03/2024: una sola decorrenza, pensione erogata diversa (RIA dimenticata nel vecchio UM)',
    regola: 'Tutti gli scaglionamenti fino alla cessazione → UM al 01/04/2024; avviso pensione erogata diversa da A; il migliorato la supera',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2024-03-31'},
      'ccnl-2022-24',
      {base: {'01': 178274, '02': 8974, '06': 2950, '09': 936, '10': 4580}, eccezioni: {}},
      {pensioneErogata: {fissi: 2313168, tredicesima: 188184}},
    ),
    atteso: {
      esito: 'calcolato',
      scenarioA: {mese: '2024-03', ...um([['01', 178274], ['02', 8974], ['06', 2950], ['09', 936], ['10', 4580]], ['01', '02', '06', '09'], 191134, 2348568, 2539702)},
      migliorati: [
        migliorato('2024-04-01', {'01': 191555, '02': 9019, '09': 0, '10': 4580}, um([['01', 191555], ['02', 9019], ['06', 2950], ['10', 4580]], ['01', '02', '06'], 203524, 2497248, 2700772), {annui: 148680, tredicesima: 12390}),
      ],
      tfs: {
        mesi: {dal: '2023-04', al: '2024-03'},
        righe: nove({tabE: 2187150, ria: 35400, tredicesima: ['388463/2', 194232], differenziali: 108228}),
        totale: 2525010,
        ordinario: soloValori(nove({tabE: 2139288, ria: 35400, tredicesima: ['', 190198], differenziali: 107688})),
      },
      blocchi: [],
      avvisi: [erogataDiversa(2313168, 188184, 2348568, 191134), daModificare('tab-e,tredicesima,differenziali')],
    },
    passi: [
      'Voci del cedolino pagate fino a marzo 2024, prima della firma: 01 Tab. G 1.782,74, 02 89,74, 06 (RIA) 29,50, 09 IVC 2023 9,36 (pagata anche nel 2024), 10 45,80.',
      `Tutti gli scaglionamenti nella vigenza (fino al 01/01/2024) sono entro la cessazione: un solo UM al 01/04/2024 con 01 1.915,55, 02 90,19, 09 0. Fonte: ${F.decorrenze}.`,
      `Pensione erogata 23.131,68 + 1.881,84: senza la RIA (354,00 e 29,50), diversa da A (23.485,68 + 1.911,34) → avviso; la vecchia domanda non si tocca. Il migliorato 24.972,48 + 2.035,24 la supera: nessun avviso forte. Fonte: ${F.erogata}.`,
      'TFS migliorato: apr-dic 2023 01 = 1.782,74 + 8,91 = 1.791,65, gen-mar 2024 1.915,55, 02 90,19, IVC 0: TAB E 21.871,50; 13ª = 23.307,78 / 12 = 388463/2 centesimi = 1.942,315 esatti → 1.942,32 (half-up sulla metà); differenziali 1.082,28. Ordinario (IVC 0, voci inserite): 21.392,88; 1.901,98; 1.076,88 → da modificare.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N03',
    titolo: 'Funzionario D3 con posizione cessato il 31/12/2024: pensione erogata più alta del migliorato',
    regola: 'T4: avviso forte "nessun miglioramento reale, non inserire la domanda" e avviso pensione erogata diversa',
    dati: pratica(
      {posizione: 'D3', assunzione: '1998-05-01', cessazione: '2024-12-31'},
      'ccnl-2022-24',
      {base: {'01': 193436, '02': 27845, '07': 70000, '09': 1106, '10': 5190}, eccezioni: {}},
      {pensioneErogata: {fissi: 3810924, tredicesima: 312387}},
    ),
    atteso: {
      esito: 'calcolato',
      scenarioA: {mese: '2024-12', ...um([['01', 193436], ['02', 27845], ['07', 70000], ['09', 1106], ['10', 5190]], ['01', '02', '07', '09'], 292387, 3570924, 3863311)},
      migliorati: [
        migliorato('2025-01-01', {'01': 207847, '02': 27984, '09': 0, '10': 5190}, um([['01', 207847], ['02', 27984], ['07', 70000], ['10', 5190]], ['01', '02', '07'], 305831, 3732252, 4038083), {annui: 161328, tredicesima: 13444}),
      ],
      tfs: {
        mesi: {dal: '2024-01', al: '2024-12'},
        righe: nove({tabE: 2494164, tredicesima: ['235831', 235831], differenziali: 335808}),
        totale: 3065803,
        ordinario: soloValori(nove({tabE: 2321232, tredicesima: ['', 221281], differenziali: 334140})),
      },
      blocchi: [],
      avvisi: [erogataDiversa(3810924, 312387, 3570924, 292387), nessunMiglioramento('2025-01-01', 4038083, 4123311), daModificare('tab-e,tredicesima,differenziali')],
    },
    passi: [
      'Scenario A (voci di dicembre 2024 prima della firma): 01 1.934,36, 02 278,45, 07 700,00, 09 11,06, 10 51,90 → annui 35.709,24, 13ª 2.923,87.',
      'UM al 01/01/2025: 01 2.078,47, 02 279,84, 09 0 → annui 37.322,52, 13ª 3.058,31, totale 40.380,83 (+1.613,28 e +134,44).',
      `Pensione erogata 38.109,24 + 3.123,87 = 41.233,11 (vecchio UM con una posizione di 900,00): diversa da A, e il migliorato (40.380,83) non la supera → avviso forte "nessun miglioramento reale, non inserire la domanda". Fonte: ${F.erogata}.`,
      'TFS migliorato 2024: 01 2.078,47 tutto l\'anno, 02 279,84, IVC 0 → TAB E 24.941,64, 13ª 2.358,31, differenziali 3.358,08; posizione fuori (D7). Ordinario: 23.212,32; 2.212,81; 3.341,40 → da modificare.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N04',
    titolo: 'Istruttore C1 in regime TFR cessato il 30/09/2023, senza pensione erogata',
    regola: 'Solo la pensione si migliora (due decorrenze); il TFR no (C21-8); nessun avviso di confronto senza pensione erogata',
    dati: pratica(
      {posizione: 'C1', assunzione: '2010-02-01', cessazione: '2023-09-30'},
      'ccnl-2022-24',
      {base: {'01': 178274, '09': 891, '10': 4580}, eccezioni: {}},
      {regime: 'TFR'},
    ),
    atteso: {
      esito: 'calcolato',
      scenarioA: {mese: '2023-09', ...um([['01', 178274], ['09', 891], ['10', 4580]], ['01', '09'], 179165, 2204940, 2384105)},
      migliorati: [
        migliorato('2023-10-01', {'01': 179165, '02': 0, '09': 0, '10': 4580}, um([['01', 179165], ['10', 4580]], ['01'], 179165, 2204940, 2384105), {annui: 0, tredicesima: 0}),
        migliorato('2024-01-01', {'01': 191555, '02': 0, '09': 0, '10': 4580}, um([['01', 191555], ['10', 4580]], ['01'], 191555, 2353620, 2545175), {annui: 148680, tredicesima: 12390}),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      'Scenario A (settembre 2023): 01 Tab. G 1.782,74, 09 IVC 2023 C1 8,91, 10 45,80; differenziale storico 0 (posizione d\'ingresso).',
      'UM al 01/10/2023: 01 1.782,74 + 8,91 = 1.791,65, 09 0 → uguale ad A. UM al 01/01/2024: 01 1.915,55 → annui 23.536,20 (+1.486,80), 13ª 1.915,55 (+123,90).',
      `Regime TFR: nessuna sezione TFS e nessun TFR di miglioramento. Fonte: ${F.tfr}. Senza pensione erogata nessun avviso di confronto (T4).`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N05',
    titolo: 'Operatore esperto B4 cessato il 31/10/2025: miglioramento 2025-27, ancora un\'ipotesi',
    regola: 'C21-5, T5: cessato dal 2025 → solo il 2025-27; ipotesi non firmata → avviso, nessun importo',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2025-10-31'},
      'ccnl-2025-27',
      {base: {'01': 170438, '02': 11139, '09': 1715, '10': 3931}, eccezioni: {}},
    ),
    atteso: {
      esito: 'senza-importi',
      blocchi: [],
      avvisi: [{codice: 'contratto-in-ipotesi', dati: {contratto: 'ccnl-2025-27', vigenzaDal: '2025-01-01'}, fonte: F.ipotesi}],
    },
    passi: [
      `Cessazione 31/10/2025 nella vigenza dell'Ipotesi 2025-27 (2025-2027, firmata il 21/07/2026, non definitiva): il miglioramento c'è ma non ha importi finché il contratto non è definitivo; alla firma la pratica torna da rilavorare. Il 2022-24 gli arriva come arretrati in busta paga. Fonte: ${F.ipotesi}.`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N06',
    titolo: 'Operatore esperto B4 cessato il 31/10/2025 con il CCNL 2022-24 scelto per errore',
    regola: 'C21-5: cessazione fuori dalla vigenza 2022-2024 → blocco `miglioramento-non-applicabile`',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2025-10-31'},
      'ccnl-2022-24',
      {base: {'01': 170438, '02': 11139, '09': 1715, '10': 3931}, eccezioni: {}},
    ),
    atteso: {
      esito: 'bloccato',
      blocchi: [
        {codice: 'miglioramento-non-applicabile', contratto: 'ccnl-2022-24', vigenzaDal: '2022-01-01', vigenzaAl: '2024-12-31', firma: '2026-02-23', cessazione: '2025-10-31', fonte: F.bloccato},
      ],
      avvisi: [],
    },
    passi: [`La cessazione (31/10/2025) è dopo la vigenza del CCNL 2022-24 (fino al 31/12/2024): il contratto le si applicava in servizio e i suoi aumenti arrivano come arretrati; nessun miglioramento. Fonte: ${F.bloccato}.`],
    validazione: VALIDAZIONE,
  },
  {
    id: 'MC-N07',
    titolo: 'Istruttore C3 cessato il 30/06/2021: miglioramento CCNL 2019-21, il 2022-24 non si applica',
    regola: 'C21-6: solo Tab. D 2019-2021 (decorrenze nella vigenza); tabellare per posizione, differenziale storico 0; TFS mese per mese',
    dati: pratica(
      {posizione: 'C3', assunzione: '2004-09-01', cessazione: '2021-06-30'},
      'ccnl-2019-21',
      {base: {'01': 176332, '06': 2950, '09': 1234, '10': 4580}, eccezioni: {}},
    ),
    vociPreFirmaFuoriTabelle: true,
    atteso: {
      esito: 'calcolato',
      scenarioA: {mese: '2021-06', ...um([['01', 176332], ['06', 2950], ['09', 1234], ['10', 4580]], ['01', '06', '09'], 180516, 2221152, 2401668)},
      migliorati: [
        migliorato('2021-07-01', {'01': 185465, '02': 0, '09': 0, '10': 4580}, um([['01', 185465], ['06', 2950], ['10', 4580]], ['01', '06'], 188415, 2315940, 2504355), {annui: 94788, tredicesima: 7899}),
      ],
      tfs: {
        mesi: {dal: '2020-07', al: '2021-06'},
        righe: nove({tabE: 2198520, ria: 35400, tredicesima: ['186160', 186160]}),
        totale: 2420080,
        ordinario: soloValori(nove({tabE: 2115984, ria: 35400, tredicesima: ['', 179282]})),
      },
      blocchi: [],
      avvisi: [daModificare('tab-e,tredicesima')],
    },
    passi: [
      'Voci pagate a giugno 2021, prima della firma del 16/11/2022 (fantasia, CCNL 2016-18 fuori dalle tabelle): 01 1.763,32 (progressione compresa: tabellare per posizione), 06 29,50, 09 IVC 2019-21 12,34, 10 45,80.',
      `Cessato nella vigenza del 2019-21 (2019-2021): scaglionamenti 01/01/2019, 2020, 2021 di Tab. D, tutti entro la cessazione → un UM al 01/07/2021 con 01 = 1.854,65, 09 = 0 (anticipazioni IVC comprese in Tab. D, art. 76 c. 4). EP e Tab. G del 2023 sono fuori vigenza; il 2022-24 non si applica (T3). Fonte: ${F.decorrenze}.`,
      'Migliorato: annui 23.159,40 (+947,88), 13ª 1.884,15 (+78,99).',
      'TFS migliorato luglio 2020 - giugno 2021: 6 × 1.809,55 + 6 × 1.854,65 = 21.985,20; 13ª = (21.985,20 + 354,00) / 12 = 1.861,60; ordinario (IVC 0): 21.159,84 e 1.792,82 → da modificare.',
    ],
    validazione: VALIDAZIONE,
  },
];
