// Casi normativi del TFR (ticket 07; glossario: Caso normativo). Dati di fantasia (CF
// RSSMRA80A01H501U), voci prese dalle tabelle CCNL vere di `src/tabelle`. Il risultato atteso è
// calcolato a mano dalle norme, senza il motore (ADR 0001): li userà il ticket 08 dal seam
// `calcolaPratica(dati, tabelle)`, solo i casi con `validazione.stato === 'validato'`.
//
// Arrotondamento: ogni valore pieno è una frazione esatta di centesimi (interi × giorni / 365),
// calcolata con frazioni Python e ricontrollata in tfr.test.ts con BigInt; si arrotonda una volta
// sola, half-up al centesimo, sul valore della riga (D17). Nessun uso di `arrotonda` del motore.
//
// Decisioni: D-n = "Regole comuni" (ticket 06 del rifacimento); C07-n = decisioni prese con
// l'utente nel ticket 07 di costruzione:
// - C07-1: rateo di 13ª del mese utile non intero = Σ voci TFR con 13ª × % × giorni di calendario
//   serviti nel mese / 365 (misura "Parziale").
// - C07-2: la riga "Retribuzione valutabile del mese pieno" (Σ voci TFR × %, mese intero) si emette
//   in ogni mese utile non intero, di assunzione o di cessazione.
// - C07-3: i ratei di 13ª pagati per cassa si calcolano mese per mese, con voci e % di ciascun mese.
// - C07-4: mese di assunzione non intero fuori dai 12 mesi di voci → avviso, campi iniziali vuoti.
import type {Blocco, Centesimi, DataISO, DatiPratica, MeseISO, VociMese} from '../motore';

/** Un mese sommato in una riga: Σ voci × percentuale / 100 × giorni (se ci sono). */
export interface TermineAtteso {
  mese: MeseISO;
  voci: VociMese;
  percentuale: number;
  /** Giorni di calendario del rateo; assente nella retribuzione del mese pieno. */
  giorni?: number;
}

export type RigaTfr = 'retribuzione-valutabile' | 'rateo-tredicesima-teorica' | 'tredicesima-emolumenti-cassa';

export interface RigaAttesa {
  /** Mese di assunzione (iniziale) o di cessazione (finale). */
  estremo: 'iniziale' | 'finale';
  riga: RigaTfr;
  termini: TermineAtteso[];
  divisore: 1 | 365;
  /** Valore pieno in centesimi come frazione ridotta "n/d" (o intero). */
  pieno: string;
  valore: Centesimi;
  decisioni: string[];
  fonte: string;
}

export interface MeseEstremoAtteso {
  mese: MeseISO;
  esito: 'intero' | 'utile' | 'non-utile';
  /** Giorni continuativi nel mese (assunzione → fine mese, oppure 1° → cessazione). */
  giorni?: {lavorativiLunSab: number; calendario: number};
  /** Mese in cui il rateo di 13ª è pagato (C185 §2.1), solo per un mese utile non intero. */
  pagamentoTredicesima?: 'dicembre' | 'cessazione';
  misura?: 'parziale';
}

/** Avviso atteso: il codice è un nome proposto, il ticket 08 lo fissa nel tipo `Avviso`. */
export interface AvvisoAtteso {
  codice: string;
  dati: Record<string, string | number>;
  fonte: string;
}

export type AttesoTfr =
  | {esito: 'bloccata'; blocchi: Blocco[]}
  | {
      esito: 'calcolata';
      decorrenzaGiuridica: DataISO;
      decorrenzaEconomica: DataISO;
      dataCessazione: DataISO;
      soglia: {giorni: 15; conteggio: 'lavorativi-lun-sab'};
      meseIniziale: MeseEstremoAtteso;
      meseFinale: MeseEstremoAtteso;
      righe: RigaAttesa[];
      avvisi: AvvisoAtteso[];
    };

export interface CasoNormativoTfr {
  id: string;
  titolo: string;
  /** La regola che il caso esercita. */
  regola: string;
  dati: DatiPratica;
  atteso: AttesoTfr;
  /** Il calcolo passo per passo, con decisione e fonte di ogni passo. */
  passi: string[];
  /** HITL: l'utente valida il risultato atteso prima che un ticket di motore lo usi. */
  validazione: {stato: 'da-validare'} | {stato: 'validato'; data: DataISO};
  /** Voci che si discostano apposta dalle tabelle (le controlla tfr.test.ts). */
  scostamentiVolutiDalleTabelle?: {mese: MeseISO; voce: string}[];
}

// --- Fonti -----------------------------------------------------------------------------------------

const F = {
  c185MesiInteri:
    'Circ. INPS 185/2021 §2.1: nessun dato retributivo se il periodo iniziale e quello finale sono mesi interi',
  c185Soglia:
    'Circ. INPS 185/2021 §2.1: mese utile se coperto da "almeno quindici giorni continuativi nel mese"; conteggio in lavorativi lun-sab (D10, prassi), festivi compresi e domeniche escluse (D9)',
  c185Rateo:
    'Circ. INPS 185/2021 §2.1: "valore retributivo mensile del rateo di tredicesima", pagato a dicembre o nel mese di cessazione, misura "parziale" = rapportato ai giorni di effettivo servizio; CCNL Funzioni Locali 2019-21 art. 75 c. 3 e 5: 13ª per 365esimi dei giorni di servizio (C07-1)',
  c185MesePieno:
    'Circ. INPS 185/2021 §2.1 (retribuzione "virtuale" dei giorni non coperti) e §2.2.1 (valutabile rapportata al part-time); riga della maschera "Dati retributivi utili al TFR" (D16, C07-2)',
  c185Cassa:
    'Circ. INPS 185/2021 §2.1: cessazione dal 1° al 14° giorno, "Tredicesima ed emolumenti valutabili arretrati per cassa" = sola somma dei ratei di 13ª dei mesi precedenti più gli arretrati per cassa del mese (qui nessuno: fuori perimetro); CCNL Funzioni Locali 2019-21 art. 75 c. 3 e 5 (365esimi di calendario); C07-3 (mese per mese)',
  decorrenze:
    'Circ. INPS 185/2021 §2.1 lett. a) e b) (decorrenza giuridica ed economica); economica = 1° del mese successivo se il primo mese non è utile: prassi APP, coerente con §2.1 (research/regole-ultimo-miglio.md §3)',
  partTime: 'Circ. INPS 185/2021 §2.2.1: valutabile "rapportata al tipo di orario o di servizio part-time prestato"; D4 (voce × % del mese, qualunque tipo O/V/M)',
  ivc: 'D8: IVC del mese = quella del contratto successivo a quello applicato; CCNL 2022-24 art. 56 (riassorbe le IVC 2022-23 nel tabellare 2024)',
} as const;

const SOGLIA = {giorni: 15, conteggio: 'lavorativi-lun-sab'} as const;
const CF = 'RSSMRA80A01H501U';
const NOME = 'Mario Rossi';

// --- Voci delle tabelle vere (centesimi, tempo pieno) ------------------------------------------
// C3 → area istruttori, differenziale storico 90,19 (trasposizione.ts). D3 → funzionari-eq, 279,84.
// 01: CCNL 2022-24 Tab. B col. 1 (dal 2024) e col. 2 (dal 2026). 09: IVC 2025 RGS, 0,6% apr-giu
// 2025 e 1% dal 07/2025 (anticipa l'Ipotesi 2025-27, non definitiva). 10: CCNL 2022-24 Tab. C.

/** C3 nel 2026. */
const C3_2026 = {'01': 192823, '02': 9019, '09': 1928, '10': 3206} as const;
/** C3 da luglio a dicembre 2025. */
const C3_2025 = {'01': 191555, '02': 9019, '09': 1928, '10': 4580} as const;
/** D3 nel 2026, con retribuzione di posizione di fantasia (07, importo dell'ente). */
const D3_2026 = {'01': 209284, '02': 27984, '07': 70000, '09': 2093, '10': 3633} as const;

function mesiDa(dal: MeseISO, al: MeseISO, voci: VociMese): Partial<Record<MeseISO, VociMese>> {
  const out: Partial<Record<MeseISO, VociMese>> = {};
  let [a, m] = dal.split('-').map(Number);
  const [fa, fm] = al.split('-').map(Number);
  while (a < fa || (a === fa && m <= fm)) {
    out[`${a}-${String(m).padStart(2, '0')}`] = voci;
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
  partTime: DatiPratica['partTime'] = {base: {percentuale: 100}, eccezioni: {}},
): DatiPratica {
  return {
    anagrafica: {nome: NOME, codiceFiscale: CF, ...anagrafica},
    voci,
    partTime,
    forzature: {},
    iscrittoCredito: true,
  };
}

/** Voci TFR del mese (flag TFR del catalogo): 10 fuori (D6). */
const tfr = ({['10']: _comparto, ...resto}: VociMese): VociMese => resto;
/** Voci TFR con 13ª (flag TFR e 13ª): fuori anche 08, 11, 12, 13 (D15). */
const tfr13 = ({['10']: _c, ['08']: _s, ['11']: _v, ['12']: _a, ['13']: _b, ...resto}: VociMese): VociMese => resto;

// HITL: tutti i casi validati dall'utente l'11/10/2026 (ticket 07, Comments).
const VALIDATO = {stato: 'validato', data: '2026-10-11'} as const;

// --- Casi --------------------------------------------------------------------------------------

export const casiNormativiTfr: CasoNormativoTfr[] = [
  {
    id: 'TFR-N01',
    titolo: 'Tempo pieno, assunto il 1° e cessato a fine mese',
    regola: 'Mesi interi alle due estremità: nessun dato retributivo; assunzione prima del 2019 non blocca',
    dati: pratica(
      {posizione: 'C3', assunzione: '2015-03-01', cessazione: '2026-10-31'},
      {base: C3_2026, eccezioni: mesiDa('2025-11', '2025-12', C3_2025)},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2015-03-01',
      decorrenzaEconomica: '2015-03-01',
      dataCessazione: '2026-10-31',
      soglia: SOGLIA,
      meseIniziale: {mese: '2015-03', esito: 'intero'},
      meseFinale: {mese: '2026-10', esito: 'intero'},
      righe: [],
      avvisi: [],
    },
    passi: [
      `Decorrenze: giuridica = economica = 01/03/2015 (assunzione il 1°, mese intero). Fonte: ${F.decorrenze}.`,
      `Marzo 2015 intero (dal 1°), ottobre 2026 intero (cessazione all'ultimo giorno): nessuna riga. Fonte: ${F.c185MesiInteri}.`,
      'Assunzione al 2015, prima della copertura delle tabelle (01/01/2019): nessun blocco, il blocco riguarda la cessazione (storia 57; ticket 04).',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N02',
    titolo: 'Tempo pieno, cessato a metà mese con almeno 15 giorni',
    regola: 'Mese finale utile non intero: retribuzione del mese pieno e rateo di 13ª in 365esimi; flag TFR/13ª',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-10-20'},
      {base: {...C3_2026, '11': 9257}, eccezioni: mesiDa('2025-11', '2025-12', C3_2025)},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-10-20',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {
        mese: '2026-10',
        esito: 'utile',
        giorni: {lavorativiLunSab: 17, calendario: 20},
        pagamentoTredicesima: 'cessazione',
        misura: 'parziale',
      },
      righe: [
        {
          estremo: 'finale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2026-10', voci: tfr({...C3_2026, '11': 9257}), percentuale: 100}],
          divisore: 1,
          pieno: '213027',
          valore: 213027,
          decisioni: ['C07-2', 'D1', 'D4', 'D6', 'D15'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'finale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2026-10', voci: tfr13(C3_2026), percentuale: 100, giorni: 20}],
          divisore: 365,
          pieno: '815080/73',
          valore: 11165,
          decisioni: ['C07-1', 'D10', 'D15', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Ottobre 2026: dal 01/10 (gio) al 20/10 (mar) 20 giorni di calendario, domeniche 4, 11, 18 → 17 lavorativi lun-sab ≥ 15: mese utile, non intero. Con il calendario (20) l\'esito è lo stesso: nessun avviso D10. Fonte: ' + F.c185Soglia + '.',
      'Retribuzione valutabile del mese pieno = voci con flag TFR di ottobre 2026 a tempo pieno: 01 1.928,23 + 02 90,19 + 09 19,28 + 11 (vigilanza, importo di fantasia) 92,57 = 2.130,27; la 10 (comparto, 32,06) non è utile al TFR (D6). Valore intero, nessun arrotondamento. Fonte: ' + F.c185MesePieno + '.',
      'Rateo di 13ª = voci TFR con 13ª (01 + 02 + 09 = 2.037,70; 11 senza 13ª, D15) × 20 giorni di calendario serviti / 365 = 815080/73 centesimi = 11.165,479… → 111,65 (half-up, D17). Pagato nel mese di cessazione, misura "Parziale". Fonte: ' + F.c185Rateo + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N03',
    titolo: 'Funzionario con posizione, cessato prima del 15',
    regola: 'Mese finale non utile: ratei di 13ª per cassa dal 1/1 in 365esimi; posizione (07) con 13ª, comparto (10) fuori',
    dati: pratica(
      {posizione: 'D3', assunzione: '2012-09-01', cessazione: '2026-10-10'},
      {base: D3_2026, eccezioni: mesiDa('2025-11', '2025-12', {'01': 207847, '10': 5190})},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-10-10',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {mese: '2026-10', esito: 'non-utile', giorni: {lavorativiLunSab: 9, calendario: 10}},
      righe: [
        {
          estremo: 'finale',
          riga: 'tredicesima-emolumenti-cassa',
          termini: [
            {mese: '2026-01', voci: tfr13(D3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-02', voci: tfr13(D3_2026), percentuale: 100, giorni: 28},
            {mese: '2026-03', voci: tfr13(D3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-04', voci: tfr13(D3_2026), percentuale: 100, giorni: 30},
            {mese: '2026-05', voci: tfr13(D3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-06', voci: tfr13(D3_2026), percentuale: 100, giorni: 30},
            {mese: '2026-07', voci: tfr13(D3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-08', voci: tfr13(D3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-09', voci: tfr13(D3_2026), percentuale: 100, giorni: 30},
          ],
          divisore: 365,
          pieno: '84455553/365',
          valore: 231385,
          decisioni: ['C07-3', 'D10', 'D15', 'D17'],
          fonte: F.c185Cassa,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Ottobre 2026: dal 01/10 (gio) al 10/10 (sab) 10 giorni di calendario, domenica 4 → 9 lavorativi < 15: mese non utile. Anche col calendario (10) non è utile: nessun avviso D10. Fonte: ' + F.c185Soglia + '.',
      'Voci TFR con 13ª di ogni mese gen-set 2026: 01 2.092,84 + 02 279,84 + 07 (posizione, di fantasia) 700,00 + 09 20,93 = 3.093,61; la 10 (comparto, 36,33) non ha né TFR né 13ª (D6, D15). Fonte: catalogo D15; posizione utile TFR e 13ª (D7).',
      'Ratei di 13ª dei mesi precedenti alla cessazione, mese per mese (C07-3): dal 01/01 (la 13ª dell\'anno prima è pagata a dicembre) al 30/09 sono 273 giorni di calendario, con le stesse voci: 3.093,61 × 273 / 365 = 84455553/365 centesimi = 231.385,076… → 2.313,85 (half-up, D17). Fonte: ' + F.c185Cassa + '.',
      'Nessuna retribuzione del mese pieno né rateo: il mese non utile è escluso (C185 §2.1).',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N04',
    titolo: 'Part-time orizzontale al 50%, cessato a metà mese con almeno 15 giorni',
    regola: 'Voci × % del mese nella retribuzione del mese pieno e nel rateo (D4)',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-06-20'},
      {base: C3_2026, eccezioni: mesiDa('2025-07', '2025-12', C3_2025)},
      {base: {percentuale: 50, tipo: 'O'}, eccezioni: {}},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-06-20',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {
        mese: '2026-06',
        esito: 'utile',
        giorni: {lavorativiLunSab: 18, calendario: 20},
        pagamentoTredicesima: 'cessazione',
        misura: 'parziale',
      },
      righe: [
        {
          estremo: 'finale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2026-06', voci: tfr(C3_2026), percentuale: 50}],
          divisore: 1,
          pieno: '101885',
          valore: 101885,
          decisioni: ['C07-2', 'D4', 'D6'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'finale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2026-06', voci: tfr13(C3_2026), percentuale: 50, giorni: 20}],
          divisore: 365,
          pieno: '407540/73',
          valore: 5583,
          decisioni: ['C07-1', 'D4', 'D10', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Giugno 2026: dal 01/06 (lun) al 20/06 (sab) 20 giorni di calendario, domeniche 7 e 14 → 18 lavorativi ≥ 15: utile, non intero; calendario concorde. Fonte: ' + F.c185Soglia + '.',
      'Voci TFR a tempo pieno 01 + 02 + 09 = 2.037,70 (10 esclusa, D6) × 50% = 1.018,85: retribuzione del mese pieno. Fonte: ' + F.partTime + '; ' + F.c185MesePieno + '.',
      'Rateo = 2.037,70 × 50% × 20 / 365 = 407540/73 centesimi = 5.582,739… → 55,83 (half-up, D17). Fonte: ' + F.c185Rateo + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N05',
    titolo: 'Part-time verticale che cambia nell\'anno, cessato prima del 15',
    regola: 'Ratei per cassa mese per mese con la % di ciascun mese (C07-3, D4)',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-07-08'},
      {base: C3_2026, eccezioni: mesiDa('2025-08', '2025-12', C3_2025)},
      {
        base: {percentuale: 100},
        eccezioni: {
          '2026-04': {percentuale: 50, tipo: 'V'},
          '2026-05': {percentuale: 50, tipo: 'V'},
          '2026-06': {percentuale: 50, tipo: 'V'},
          '2026-07': {percentuale: 50, tipo: 'V'},
        },
      },
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-07-08',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {mese: '2026-07', esito: 'non-utile', giorni: {lavorativiLunSab: 7, calendario: 8}},
      righe: [
        {
          estremo: 'finale',
          riga: 'tredicesima-emolumenti-cassa',
          termini: [
            {mese: '2026-01', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-02', voci: tfr13(C3_2026), percentuale: 100, giorni: 28},
            {mese: '2026-03', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-04', voci: tfr13(C3_2026), percentuale: 50, giorni: 30},
            {mese: '2026-05', voci: tfr13(C3_2026), percentuale: 50, giorni: 31},
            {mese: '2026-06', voci: tfr13(C3_2026), percentuale: 50, giorni: 30},
          ],
          divisore: 365,
          pieno: '5522167/73',
          valore: 75646,
          decisioni: ['C07-3', 'D4', 'D10', 'D17'],
          fonte: F.c185Cassa,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Luglio 2026: dal 01/07 (mer) all\'08/07 (mer) 8 giorni di calendario, domenica 5 → 7 lavorativi < 15: non utile; calendario concorde. Fonte: ' + F.c185Soglia + '.',
      'Gen-mar 2026 a tempo pieno: 2.037,70 × 100% × 90 giorni / 365 = 3667860/73 centesimi. Fonte: ' + F.c185Cassa + '.',
      'Apr-giu 2026 in part-time verticale al 50% (il tipo non cambia la regola, D4): 2.037,70 × 50% × 91 giorni / 365 = 1854307/73 centesimi. Fonte: ' + F.partTime + '.',
      'Somma = 5522167/73 centesimi = 75.646,123… → 756,46, un solo arrotondamento sulla riga (D17).',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N06',
    titolo: 'Part-time misto con % che cambia nei 12 mesi, cessato con almeno 15 giorni',
    regola: 'Nel mese utile conta solo la % del mese di cessazione; le % precedenti non entrano',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-09-19'},
      {base: C3_2026, eccezioni: mesiDa('2025-10', '2025-12', C3_2025)},
      {
        base: {percentuale: 100},
        eccezioni: {
          '2026-03': {percentuale: 80, tipo: 'M'},
          '2026-04': {percentuale: 80, tipo: 'M'},
          '2026-05': {percentuale: 80, tipo: 'M'},
          '2026-06': {percentuale: 80, tipo: 'M'},
          '2026-07': {percentuale: 80, tipo: 'M'},
          '2026-08': {percentuale: 60, tipo: 'M'},
          '2026-09': {percentuale: 60, tipo: 'M'},
        },
      },
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-09-19',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {
        mese: '2026-09',
        esito: 'utile',
        giorni: {lavorativiLunSab: 17, calendario: 19},
        pagamentoTredicesima: 'cessazione',
        misura: 'parziale',
      },
      righe: [
        {
          estremo: 'finale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2026-09', voci: tfr(C3_2026), percentuale: 60}],
          divisore: 1,
          pieno: '122262',
          valore: 122262,
          decisioni: ['C07-2', 'D4'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'finale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2026-09', voci: tfr13(C3_2026), percentuale: 60, giorni: 19}],
          divisore: 365,
          pieno: '2322978/365',
          valore: 6364,
          decisioni: ['C07-1', 'D4', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Settembre 2026: dal 01/09 (mar) al 19/09 (sab) 19 giorni di calendario, domeniche 6 e 13 → 17 lavorativi ≥ 15: utile; calendario concorde. Fonte: ' + F.c185Soglia + '.',
      'La % del mese di cessazione è 60% (misto); 80% di mar-lug e 100% di prima non entrano: il TFR del mese parziale usa solo quel mese (C185 §2.1, D4).',
      'Retribuzione del mese pieno = 2.037,70 × 60% = 1.222,62. Fonte: ' + F.c185MesePieno + '.',
      'Rateo = 2.037,70 × 60% × 19 / 365 = 2322978/365 centesimi = 6.364,323… → 63,64 (half-up, D17). Fonte: ' + F.c185Rateo + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N07',
    titolo: 'Cessato martedì 16: 14 lavorativi, 16 di calendario',
    regola: 'Soglia dei 15 giorni dove le due regole divergono (D10): vale lavorativi, con avviso',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-06-16'},
      {base: C3_2026, eccezioni: mesiDa('2025-07', '2025-12', C3_2025)},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2026-06-16',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {mese: '2026-06', esito: 'non-utile', giorni: {lavorativiLunSab: 14, calendario: 16}},
      righe: [
        {
          estremo: 'finale',
          riga: 'tredicesima-emolumenti-cassa',
          termini: [
            {mese: '2026-01', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-02', voci: tfr13(C3_2026), percentuale: 100, giorni: 28},
            {mese: '2026-03', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-04', voci: tfr13(C3_2026), percentuale: 100, giorni: 30},
            {mese: '2026-05', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
          ],
          divisore: 365,
          pieno: '6153854/73',
          valore: 84299,
          decisioni: ['D10', 'C07-3', 'D17'],
          fonte: F.c185Cassa,
        },
      ],
      avvisi: [
        {
          codice: 'soglia-quindici-giorni-altra-regola',
          dati: {estremo: 'finale', mese: '2026-06', lavorativiLunSab: 14, calendario: 16, esitoUsato: 'non-utile', esitoAltraRegola: 'utile'},
          fonte: F.c185Soglia,
        },
      ],
    },
    passi: [
      'Giugno 2026: dal 01/06 (lun) al 16/06 (mar) 16 giorni di calendario, domeniche 7 e 14 → 14 lavorativi lun-sab < 15: non utile con la regola di default (D10). Fonte: ' + F.c185Soglia + '.',
      'Con il calendario (16 ≥ 15) il mese sarebbe utile e PassWeb chiederebbe il rateo: avviso con le due conte e i due esiti (D10, storia 43).',
      'Ratei di 13ª gen-mag 2026 = 2.037,70 × 151 giorni / 365 = 6153854/73 centesimi = 84.299,369… → 842,99 (half-up, D17). Fonte: ' + F.c185Cassa + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N08',
    titolo: 'Cessato martedì 18/11/2025, con sabato 1° novembre festivo',
    regola: 'D9 alla lettera: il sabato festivo conta fra i lavorativi lun-sab e rende il mese utile; voci 2025',
    dati: pratica(
      {posizione: 'C3', assunzione: '2012-09-01', cessazione: '2025-11-18'},
      {
        base: C3_2025,
        eccezioni: {
          ...mesiDa('2024-12', '2025-03', {'09': 0}),
          ...mesiDa('2025-04', '2025-06', {'09': 1157}),
        },
      },
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2025-11-18',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {
        mese: '2025-11',
        esito: 'utile',
        giorni: {lavorativiLunSab: 15, calendario: 18},
        pagamentoTredicesima: 'cessazione',
        misura: 'parziale',
      },
      righe: [
        {
          estremo: 'finale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2025-11', voci: tfr(C3_2025), percentuale: 100}],
          divisore: 1,
          pieno: '202502',
          valore: 202502,
          decisioni: ['C07-2', 'D8', 'D6'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'finale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2025-11', voci: tfr13(C3_2025), percentuale: 100, giorni: 18}],
          divisore: 365,
          pieno: '49932/5',
          valore: 9986,
          decisioni: ['C07-1', 'D9', 'D10', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Novembre 2025: dal 01/11 (sab, Ognissanti) al 18/11 (mar) 18 giorni di calendario, domeniche 2, 9, 16 → 15 lavorativi lun-sab, sabato festivo compreso (D9 alla lettera, ticket 04) ≥ 15: utile. Senza contare il festivo sarebbero 14 (non utile). Calendario 18: concorde, nessun avviso D10. Fonte: ' + F.c185Soglia + '.',
      'Voci di novembre 2025: 01 1.915,55 (CCNL 2022-24 Tab. B col. 1, dal 2024) + 02 90,19 + 09 19,28 (IVC 2025 all\'1% dal 07/2025, contratto successivo 2025-27 non definitivo: D8) = 2.025,02; 10 (45,80) esclusa (D6). Fonte: ' + F.ivc + '.',
      'Retribuzione del mese pieno = 2.025,02. Fonte: ' + F.c185MesePieno + '.',
      'Rateo = 2.025,02 × 18 / 365 = 49932/5 centesimi = 9.986,4 → 99,86 (half-up, D17). Fonte: ' + F.c185Rateo + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N09',
    titolo: 'Assunto il 01/03/2026 in corso d\'anno, cessato prima del 15',
    regola: 'Ratei per cassa dall\'assunzione, non dal 1/1; mesi prima dell\'assunzione fuori dalla finestra',
    dati: pratica(
      {posizione: 'C3', assunzione: '2026-03-01', cessazione: '2026-09-08'},
      {base: C3_2026, eccezioni: {}},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2026-03-01',
      decorrenzaEconomica: '2026-03-01',
      dataCessazione: '2026-09-08',
      soglia: SOGLIA,
      meseIniziale: {mese: '2026-03', esito: 'intero'},
      meseFinale: {mese: '2026-09', esito: 'non-utile', giorni: {lavorativiLunSab: 7, calendario: 8}},
      righe: [
        {
          estremo: 'finale',
          riga: 'tredicesima-emolumenti-cassa',
          termini: [
            {mese: '2026-03', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-04', voci: tfr13(C3_2026), percentuale: 100, giorni: 30},
            {mese: '2026-05', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-06', voci: tfr13(C3_2026), percentuale: 100, giorni: 30},
            {mese: '2026-07', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
            {mese: '2026-08', voci: tfr13(C3_2026), percentuale: 100, giorni: 31},
          ],
          divisore: 365,
          pieno: '7498736/73',
          valore: 102722,
          decisioni: ['C07-3', 'D10', 'D17'],
          fonte: F.c185Cassa,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Marzo 2026 intero (assunto il 1°): decorrenze giuridica ed economica 01/03/2026. Fonte: ' + F.decorrenze + '.',
      'Settembre 2026: dal 01/09 (mar) all\'08/09 (mar) 8 giorni di calendario, domenica 6 → 7 lavorativi < 15: non utile; calendario concorde. Fonte: ' + F.c185Soglia + '.',
      'Ratei di 13ª dall\'assunzione (giorni di servizio, CCNL art. 75 c. 5), non dal 1/1: dal 01/03 al 31/08 sono 184 giorni → 2.037,70 × 184 / 365 = 7498736/73 centesimi = 102.722,410… → 1.027,22 (half-up, D17). Fonte: ' + F.c185Cassa + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N10',
    titolo: 'Assunto martedì 10/06/2025 (18 lavorativi), cessato a fine maggio 2026',
    regola: 'Mese iniziale utile non intero: rateo pagato a dicembre con le voci di quel mese; decorrenza economica = giuridica',
    dati: pratica(
      {posizione: 'C3', assunzione: '2025-06-10', cessazione: '2026-05-31'},
      {
        base: C3_2026,
        eccezioni: {
          '2025-06': {...C3_2025, '09': 1157},
          ...mesiDa('2025-07', '2025-12', C3_2025),
        },
      },
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2025-06-10',
      decorrenzaEconomica: '2025-06-10',
      dataCessazione: '2026-05-31',
      soglia: SOGLIA,
      meseIniziale: {
        mese: '2025-06',
        esito: 'utile',
        giorni: {lavorativiLunSab: 18, calendario: 21},
        pagamentoTredicesima: 'dicembre',
        misura: 'parziale',
      },
      meseFinale: {mese: '2026-05', esito: 'intero'},
      righe: [
        {
          estremo: 'iniziale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2025-06', voci: tfr({...C3_2025, '09': 1157}), percentuale: 100}],
          divisore: 1,
          pieno: '201731',
          valore: 201731,
          decisioni: ['C07-2', 'D8'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'iniziale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2025-06', voci: tfr13({...C3_2025, '09': 1157}), percentuale: 100, giorni: 21}],
          divisore: 365,
          pieno: '4236351/365',
          valore: 11606,
          decisioni: ['C07-1', 'C07-3', 'D10', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [],
    },
    passi: [
      'Giugno 2025: dal 10/06 (mar) al 30/06 (lun) 21 giorni di calendario, domeniche 15, 22, 29 → 18 lavorativi ≥ 15: mese iniziale utile, non intero; calendario concorde. Decorrenza economica = giuridica = 10/06/2025. Fonte: ' + F.c185Soglia + '; ' + F.decorrenze + '.',
      'Voci di giugno 2025: 01 1.915,55 + 02 90,19 + 09 11,57 (IVC 2025 allo 0,6% apr-giu, D8) = 2.017,31: retribuzione del mese pieno. Fonte: ' + F.ivc + '; ' + F.c185MesePieno + '.',
      'Rateo = 2.017,31 × 21 / 365 = 4236351/365 centesimi = 11.606,441… → 116,06 (half-up, D17), con le voci del mese stesso (C07-3, come per i ratei per cassa); pagato a dicembre 2025, misura "Parziale". Fonte: ' + F.c185Rateo + '.',
      'Maggio 2026 intero (cessazione al 31): nessun dato finale. Fonte: ' + F.c185MesiInteri + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N11',
    titolo: 'Assunto lunedì 16/03/2026: 14 lavorativi, 16 di calendario',
    regola: 'Soglia D10 dal lato dell\'assunzione: mese non utile, decorrenza economica al 1° del mese dopo, avviso',
    dati: pratica(
      {posizione: 'C3', assunzione: '2026-03-16', cessazione: '2026-09-30'},
      {base: C3_2026, eccezioni: {}},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2026-03-16',
      decorrenzaEconomica: '2026-04-01',
      dataCessazione: '2026-09-30',
      soglia: SOGLIA,
      meseIniziale: {mese: '2026-03', esito: 'non-utile', giorni: {lavorativiLunSab: 14, calendario: 16}},
      meseFinale: {mese: '2026-09', esito: 'intero'},
      righe: [],
      avvisi: [
        {
          codice: 'soglia-quindici-giorni-altra-regola',
          dati: {estremo: 'iniziale', mese: '2026-03', lavorativiLunSab: 14, calendario: 16, esitoUsato: 'non-utile', esitoAltraRegola: 'utile'},
          fonte: F.c185Soglia,
        },
      ],
    },
    passi: [
      'Marzo 2026: dal 16/03 (lun) al 31/03 (mar) 16 giorni di calendario, domeniche 22 e 29 → 14 lavorativi < 15: mese iniziale non utile (D10). Fonte: ' + F.c185Soglia + '.',
      'Decorrenza giuridica 16/03/2026, economica 01/04/2026. Fonte: ' + F.decorrenze + '.',
      'Col calendario (16) sarebbe utile, con decorrenza economica 16/03 e rateo iniziale: avviso (D10, storia 43).',
      'Nessun dato retributivo del mese iniziale non utile (C185 §2.1 li chiede solo per il mese utile); settembre intero. Nessuna riga.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N12',
    titolo: 'Cessato il 20/12/2024 con l\'IVC del 2023 digitata',
    regola: 'D8: col tabellare 2024 del CCNL 2022-24 l\'IVC vale 0; l\'IVC digitata dà un avviso e non si somma',
    dati: pratica(
      {posizione: 'C1', assunzione: '2012-09-01', cessazione: '2024-12-20'},
      {base: {'01': 191555, '10': 4580}, eccezioni: {'2024-12': {'09': 891}}},
    ),
    scostamentiVolutiDalleTabelle: [{mese: '2024-12', voce: '09'}],
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2012-09-01',
      decorrenzaEconomica: '2012-09-01',
      dataCessazione: '2024-12-20',
      soglia: SOGLIA,
      meseIniziale: {mese: '2012-09', esito: 'intero'},
      meseFinale: {
        mese: '2024-12',
        esito: 'utile',
        giorni: {lavorativiLunSab: 17, calendario: 20},
        pagamentoTredicesima: 'cessazione',
        misura: 'parziale',
      },
      righe: [
        {
          estremo: 'finale',
          riga: 'retribuzione-valutabile',
          termini: [{mese: '2024-12', voci: {'01': 191555, '09': 0}, percentuale: 100}],
          divisore: 1,
          pieno: '191555',
          valore: 191555,
          decisioni: ['C07-2', 'D8'],
          fonte: F.c185MesePieno,
        },
        {
          estremo: 'finale',
          riga: 'rateo-tredicesima-teorica',
          termini: [{mese: '2024-12', voci: {'01': 191555, '09': 0}, percentuale: 100, giorni: 20}],
          divisore: 365,
          pieno: '766220/73',
          valore: 10496,
          decisioni: ['C07-1', 'D8', 'D17'],
          fonte: F.c185Rateo,
        },
      ],
      avvisi: [
        {
          codice: 'ivc-incompatibile',
          dati: {mese: '2024-12', inserita: 891, daTabella: 0, contrattoApplicato: 'ccnl-2022-24'},
          fonte: F.ivc,
        },
      ],
    },
    passi: [
      'Dicembre 2024: dal 01/12 (dom) al 20/12 (ven) 20 giorni di calendario, domeniche 1, 8, 15 → 17 lavorativi ≥ 15: utile; calendario concorde. La 13ª del 2024 si paga a dicembre, che è anche il mese di cessazione: pagamento "nel mese di cessazione". Fonte: ' + F.c185Soglia + '.',
      'Contratto applicato a dicembre 2024: CCNL 2022-24 (definitivo), tabellare Tab. B col. 1 per istruttori 1.915,55; C1 è la posizione d\'ingresso, differenziale storico 0. Le IVC 2022-23 anticipano questo contratto e valgono 0; l\'IVC del contratto successivo (2025-27) parte da aprile 2025: a dicembre 2024 l\'IVC utile è 0. Fonte: ' + F.ivc + '.',
      'L\'IVC digitata (8,91, valore 2023 di C1) è incompatibile: avviso, e non si somma (D8, storia 50).',
      'Retribuzione del mese pieno = 1.915,55 (10, comparto 45,80, esclusa: D6).',
      'Rateo = 1.915,55 × 20 / 365 = 766220/73 centesimi = 10.496,164… → 104,96 (half-up, D17). Fonte: ' + F.c185Rateo + '.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N13',
    titolo: 'Cessato il 20/10/2018, prima della copertura delle tabelle',
    regola: 'Data prima del 01/01/2019: sezione TFR bloccata',
    dati: pratica({posizione: 'C3', assunzione: '2010-01-01', cessazione: '2018-10-20'}, {base: {'01': 180000}, eccezioni: {}}),
    atteso: {
      esito: 'bloccata',
      blocchi: [
        {tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'cessazione', data: '2018-10-20', coperturaDal: '2019-01-01'},
      ],
    },
    passi: [
      'Cessazione 20/10/2018 prima del 01/01/2019, da cui partono le tabelle: il sito non inventa importi, la sezione TFR è bloccata con "tabelle non disponibili per la data" (storia 57; blocco del ticket 04). Voce 01 di fantasia: non viene letta.',
    ],
    validazione: VALIDATO,
  },
  {
    id: 'TFR-N14',
    titolo: 'Assunto giovedì 10/06/2021 (mese utile), fuori dai 12 mesi di voci',
    regola: 'C07-4: mese di assunzione utile non intero fuori dalla finestra → avviso, nessun campo iniziale',
    dati: pratica(
      {posizione: 'C3', assunzione: '2021-06-10', cessazione: '2026-10-31'},
      {base: C3_2026, eccezioni: mesiDa('2025-11', '2025-12', C3_2025)},
    ),
    atteso: {
      esito: 'calcolata',
      decorrenzaGiuridica: '2021-06-10',
      decorrenzaEconomica: '2021-06-10',
      dataCessazione: '2026-10-31',
      soglia: SOGLIA,
      meseIniziale: {
        mese: '2021-06',
        esito: 'utile',
        giorni: {lavorativiLunSab: 18, calendario: 21},
        pagamentoTredicesima: 'dicembre',
        misura: 'parziale',
      },
      meseFinale: {mese: '2026-10', esito: 'intero'},
      righe: [],
      avvisi: [
        {
          codice: 'mese-iniziale-fuori-finestra',
          dati: {mese: '2021-06', finestraDal: '2025-11', finestraAl: '2026-10'},
          fonte: 'C07-4; Circ. INPS 185/2021 §2.1 (il rateo del mese iniziale va inserito, ma le voci di quel mese non sono nella pratica)',
        },
      ],
    },
    passi: [
      'Giugno 2021: dal 10/06 (gio) al 30/06 (mer) 21 giorni di calendario, domeniche 13, 20, 27 → 18 lavorativi ≥ 15: mese iniziale utile, decorrenza economica = giuridica = 10/06/2021. Fonte: ' + F.c185Soglia + '; ' + F.decorrenze + '.',
      'Le voci inserite coprono solo nov 2025 - ott 2026: per giugno 2021 non ci sono, quindi niente retribuzione del mese pieno né rateo iniziale, e un avviso che li chiede a parte (C07-4).',
      'Ottobre 2026 intero: nessun dato finale. Fonte: ' + F.c185MesiInteri + '.',
    ],
    validazione: VALIDATO,
  },
];
