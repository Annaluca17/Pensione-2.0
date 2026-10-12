// Casi normativi delle DMA previste (ticket 21; glossario: Caso normativo, DMA prevista). Dati di
// fantasia (CF RSSMRA80A01H501U), voci 01, 02, 09 e 10 prese dalle tabelle CCNL vere di `src/tabelle`
// per il 2026-27 (CCNL 2022-24 Tab. B col. 2, differenziale storico, IVC 2025 all'1%, comparto
// residuo); le voci individuali (RIA, assegni, posizione, vigilanza, assegno alimentare) sono di
// fantasia. Il risultato atteso è calcolato a mano dalle norme, senza il motore (ADR 0001): lo userà il
// ticket 26 dal seam `calcolaPratica(dati, tabelle)`, solo per i casi con `validazione.stato === 'validato'`.
//
// Arrotondamento: ogni campo ha un valore pieno frazionario (voci × % × giorni / 26 + voci 13ª × % ×
// giorni / 365, × 80% per gli imponibili TFS e TFR), scritto come frazione ridotta di centesimi e
// arrotondato una volta, half-up (D17). Ricontrollati in dma-previste.test.ts con BigInt.
//
// Decisioni: D-n = "Regole comuni" (ticket 06 del rifacimento); R-n = "Regole della DMA prevista in
// regime TFR" (ticket 19 del rifacimento); C20-n = ticket 20 di costruzione; C21-n = decisioni prese
// con l'utente in questo ticket (12/10/2026):
// - C21-1: i periodi vanno dal mese `dmaPreviste.dal` (il mese dopo l'ultima DMA vera) al mese di
//   cessazione; si preparano i primi 6, dal 7º un blocco `dma-oltre-limite` per mese (D12); le altre
//   sezioni si calcolano lo stesso. Il limite diventa un parametro con fonte nel ticket 26.
// - C21-2: la situazione (D19, C20-1) dà il codice servizio dai mesi dal mese di `dal`: sospensione
//   cautelare → 83, congedo L. 104 → 49; con 83 e 49 CPDEL e Credito dalle voci inserite (per l'83
//   l'assegno alimentare, inserito come eccezione), TFS e TFR a 0, in regime TFR teorica compilata e
//   valutabile e ulteriori a 0 (R3). Trattenuta 100% malattia → nessun periodo e avviso
//   `dma-non-prevista`. Optante → dai mesi dal mese di `dal` campi del regime TFR. Un `dal` non al 1°
//   del mese è fuori dai casi (blocco `situazione-non-gestita` nel ticket 26).
// - C21-3: 13ª = voci con 13ª del mese di pagamento × % part-time di quel mese × giorni / 365; giorni
//   di calendario dal 1/1 (o dall'assunzione) al 31/12 a dicembre e alla cessazione nel mese di
//   cessazione, con tetto 365 (anno bisestile intero = 13ª intera); cessazione a dicembre: un solo
//   rateo (D11).
// - C21-4: mese parziale = voce × % × giorni D9 / 26 più il rateo; la teorica TFR resta a mese pieno (R1).
// In regime TFR i sei campi ci sono sempre (Credito solo se iscritto): ulteriori elementi a 0 senza la
// voce 07 (validato dall'utente).
//
// La finestra delle voci del motore (C20-2) arriva al mese della pensione: per le DMA serve fino al
// mese di cessazione (DM-N08, N09, N12: pensione prima della cessazione). Vincolo per il ticket 26.
import type {Centesimi, DataISO, DatiPratica, DatiPraticaPensione, MeseISO, RegimeFineServizio, Situazione, VociMese} from '../motore';
import type {AvvisoAtteso} from './pensione-tfs';

/** Pratica di pensione con le DMA previste: il tipo entra nel motore col ticket 26. */
export type DatiPraticaDma = DatiPraticaPensione & {dmaPreviste: {dal: MeseISO}};

/** I campi della DMA prevista, come gli id di `righePassweb.dma`. */
export type CampoDmaId =
  | 'imponibile-pensionistico'
  | 'imponibile-credito'
  | 'imponibile-tfs'
  | 'imponibile-tfr'
  | 'retribuzione-teorica-tfr'
  | 'retribuzione-valutabile-tfr'
  | 'ulteriori-elementi-tfr';

export interface CampoDmaAtteso {
  campo: CampoDmaId;
  /** Valore pieno in centesimi come frazione ridotta "n/d" (o intero). */
  pieno: string;
  valore: Centesimi;
  decisioni: string[];
  fonte: string;
}

export interface PeriodoDmaAtteso {
  mese: MeseISO;
  dal: DataISO;
  al: DataISO;
  /** Giorni D9 (lun-sab, tetto 26; mese intero = 26). */
  giorni: number;
  /** 365esimi della 13ª: solo a dicembre e nel mese di cessazione, altrimenti 0 (D11). */
  giorniTredicesima: number;
  percentuale: number;
  regime: RegimeFineServizio;
  codiceServizio?: 83 | 49;
  campi: CampoDmaAtteso[];
}

export interface BloccoDmaAtteso {
  codice: 'dma-oltre-limite';
  mese: MeseISO;
  limite: number;
  fonte: string;
}

export interface CasoNormativoDma {
  id: string;
  titolo: string;
  regola: string;
  dati: DatiPraticaDma;
  atteso: {periodi: PeriodoDmaAtteso[]; blocchi: BloccoDmaAtteso[]; avvisi: AvvisoAtteso[]};
  passi: string[];
  validazione: {stato: 'da-validare'} | {stato: 'validato'; data: DataISO};
  scostamentiVolutiDalleTabelle?: {mese: MeseISO; voce: string}[];
}

// --- Fonti -----------------------------------------------------------------------------------------

const F = {
  periodo:
    'Manuale PASSWEB v1.20 pp. 60-61 (Inserimento Anticipo DMA: un periodo per mese solare, al massimo sei mesi dopo l\'ultimo periodo); research/regole-dma-previste.md §1; D12, C21-1',
  giorni: 'CCNL Funzioni Locali 2019-21 art. 74 c. 4 (giornaliera = mensile / 26); D9 (lun-sab, domeniche escluse, tetto 26, prassi); C21-4',
  tredicesima:
    'CCNL Funzioni Locali 2019-21 art. 75 c. 1, 3 e 5 (13ª pagata a dicembre o alla cessazione, in 365esimi dei giorni di servizio, sull\'ultimo mese); Msg INPS 1974/2018 §2 (mese di erogazione); D11, C21-3',
  partTime: 'D4: nelle DMA previste voce × % part-time del mese (C185 §2.2.1; manuale PASSWEB); C21-3 per la 13ª',
  cpdel: 'Imponibile pensionistico CPDEL = voci utili alla pensione, comparto compreso (CCNL 2019-21 art. 74 c. 2 lett. d; research/regole-dma-previste.md §2.1); D6, D15',
  credito: 'R5: imponibile Credito = imponibile CPDEL se iscritto (Msg INPS 1974/2018 §2, research/campi-dma-tfr.md §4), altrimenti campo non emesso',
  tfs: 'Imponibile TFS = 80% della retribuzione utile ex INADEL dal 01/01/1993 (research/regole-dma-previste.md §2.3); voci utili al TFS, posizione e comparto fuori (D6, D7)',
  tfr: 'R4: imponibile TFR = arrotonda(0,8 × base delle voci utili al TFS, 13ª se dovuta); Circ. INPS 105/2012 §6.4.2, Circ. INPS 185/2021 §2.2.1',
  teorica:
    'R1: retribuzione teorica tabellare TFR = Σ voci con TFR sì × %, a mese pieno, senza 13ª né 80% (Circ. INPS 105/2012 §6.5, Circ. INPS 185/2021 §2.2.1: "sempre valorizzata")',
  valutabile: 'R4: valutabile = arrotonda(base al 100% + ulteriori elementi), senza il coefficiente 1,25 (Circ. INPS 105/2012 §6.5)',
  ulteriori: 'R2: ulteriori elementi TFR = voci con TFR sì e TFS no (oggi la 07, posizione) al 100% (Msg INPS 2440/2019)',
  codici:
    'R3, C21-2: con codice servizio 83 (sospensione cautelare) o 49 (congedo L. 104) retribuzioni utili solo a CPDEL e Credito (prassi "Pensionamenti con situazioni particolari in corso"); teorica TFR compilata come da Circ. INPS 185/2021 §2.2.1',
  trattenuta: 'D19, C21-2: con trattenuta 100% per malattia la DMA prevista non serve (prassi "Pensionamenti con situazioni particolari in corso")',
  optante: 'Circ. INPS 125/2022 §3.2 punto 2 (l\'optante è in TFR dall\'opzione); D14, D19, C21-2',
  limite: 'D12: PASSWEB accetta al massimo 6 DMA previste (manuale PASSWEB v1.20 p. 60, prassi dell\'utente); gli 8 mesi della Circ. INPS 26/2019 non si usano; C21-1',
} as const;

const CF = 'RSSMRA80A01H501U';
const NOME = 'Mario Rossi';
// HITL: tutti i casi validati dall'utente il 12/10/2026 (ticket 21, Comments).
const VALIDAZIONE = {stato: 'validato', data: '2026-10-12'} as const;

// --- Voci delle tabelle vere 2026-27 (centesimi, tempo pieno) ---------------------------------------
// 01: CCNL 2022-24 Tab. B col. 2 (dal 01/01/2026, comparto parzialmente conglobato); 02: trasposizione.ts
// (differenziale storico dal 04/2023); 09: IVC 2025 RGS all'1% per area (dal 07/2025, anticipa l'Ipotesi
// 2025-27 che non è definitiva: T5, T6); 10: comparto residuo Tab. C col. 4 (dal 2026). L'Ipotesi
// 2025-27 non produce importi (T5). Fantasia: 04, 06, 07, 11, assegno alimentare.

/** B4 (operatori esperti, assunto in B1 = ex 4ª qualifica: indennità 5,38). */
const B4 = {'01': 171527, '02': 11139, '04': 2500, '06': 3842, '08': 538, '09': 1715, '10': 2752} as const;
/** C3 (istruttori) con RIA. */
const C3 = {'01': 192823, '02': 9019, '06': 2950, '09': 1928, '10': 3206} as const;
/** C1 (istruttori, posizione d'ingresso: differenziale storico 0). */
const C1 = {'01': 192823, '09': 1928, '10': 3206} as const;
/** D3 (funzionari-eq) con retribuzione di posizione. */
const D3 = {'01': 209284, '02': 27984, '07': 70000, '09': 2093, '10': 3633} as const;

function pratica(
  anagrafica: Omit<DatiPratica['anagrafica'], 'nome' | 'codiceFiscale'>,
  dal: MeseISO,
  voci: DatiPratica['voci'],
  altro: {
    regime?: RegimeFineServizio;
    situazione?: Situazione;
    partTime?: DatiPratica['partTime'];
    iscrittoCredito?: boolean;
  } = {},
): DatiPraticaDma {
  return {
    anagrafica: {nome: NOME, codiceFiscale: CF, ...anagrafica},
    voci,
    partTime: altro.partTime ?? {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: altro.iscrittoCredito ?? true,
    regime: altro.regime ?? 'TFS',
    situazione: altro.situazione ?? {tipo: 'ordinaria'},
    dmaPreviste: {dal},
  };
}

const solo = (base: VociMese): DatiPratica['voci'] => ({base, eccezioni: {}});

/** Decisioni e fonte di un campo secondo il suo id e il codice servizio. */
function campo(id: CampoDmaId, pieno: string, valore: Centesimi, codice?: 83 | 49): CampoDmaAtteso {
  const comuni = ['D9', 'D11', 'D17', 'C21-3', 'C21-4'];
  const base: Record<CampoDmaId, [string[], string]> = {
    'imponibile-pensionistico': [['D4', 'D15', ...comuni], `${F.cpdel}; ${F.giorni}; ${F.tredicesima}; ${F.partTime}`],
    'imponibile-credito': [['R5', 'D15', ...comuni], `${F.credito}; ${F.giorni}; ${F.tredicesima}`],
    'imponibile-tfs': [['D4', 'D6', 'D7', ...comuni], `${F.tfs}; ${F.giorni}; ${F.tredicesima}; ${F.partTime}`],
    'imponibile-tfr': [['R4', 'D4', ...comuni], `${F.tfr}; ${F.giorni}; ${F.tredicesima}; ${F.partTime}`],
    'retribuzione-teorica-tfr': [['R1', 'D4', 'D17'], `${F.teorica}; ${F.partTime}`],
    'retribuzione-valutabile-tfr': [['R4', 'R2', ...comuni], `${F.valutabile}; ${F.giorni}; ${F.tredicesima}`],
    'ulteriori-elementi-tfr': [['R2', ...comuni], `${F.ulteriori}; ${F.giorni}; ${F.tredicesima}`],
  };
  const [decisioni, fonte] = base[id];
  return codice ? {campo: id, pieno, valore, decisioni: [...decisioni, 'R3', 'C21-2'], fonte: `${fonte}; ${F.codici}`} : {campo: id, pieno, valore, decisioni, fonte};
}

function periodo(
  p: Omit<PeriodoDmaAtteso, 'campi'>,
  campi: [CampoDmaId, string, Centesimi][],
): PeriodoDmaAtteso {
  return {...p, campi: campi.map(([id, pieno, valore]) => campo(id, pieno, valore, p.codiceServizio))};
}

const bloccato = (mese: MeseISO): BloccoDmaAtteso => ({codice: 'dma-oltre-limite', mese, limite: 6, fonte: F.limite});

// --- Casi --------------------------------------------------------------------------------------

export const casiNormativiDma: CasoNormativoDma[] = [
  {
    id: 'DM-N01',
    titolo: 'Operatore esperto B4, regime TFS: due mesi interi e cessazione a fine mese (31/03/2027)',
    regola: 'Mesi interi senza 13ª; mese di cessazione intero (26) con rateo dal 1/1 in 365esimi; Credito = CPDEL; TFS all\'80%',
    dati: pratica({posizione: 'B4', assunzione: '1999-03-01', cessazione: '2027-03-31'}, '2027-01', solo(B4)),
    atteso: {
      periodi: [
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '194013', 194013], ['imponibile-credito', '194013', 194013], ['imponibile-tfs', '765044/5', 153009]]),
        periodo({mese: '2027-02', dal: '2027-02-01', al: '2027-02-28', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '194013', 194013], ['imponibile-credito', '194013', 194013], ['imponibile-tfs', '765044/5', 153009]]),
        periodo({mese: '2027-03', dal: '2027-03-01', al: '2027-03-31', giorni: 26, giorniTredicesima: 90, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '17595963/73', 241041], ['imponibile-credito', '17595963/73', 241041], ['imponibile-tfs', '69580268/365', 190631]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Periodi: gennaio, febbraio e marzo 2027 (dal mese dopo l'ultima DMA alla cessazione, 3 ≤ 6). Fonte: ${F.periodo}.`,
      `Voci 2026-27 dalle tabelle: 01 1.715,27 (Tab. B col. 2 operatori esperti), 02 111,39, 09 17,15 (IVC 2025 1%), 10 27,52 (comparto residuo); fantasia 04 25,00, 06 38,42; 08 5,38. Fonte: ${F.cpdel}.`,
      `CPDEL mese intero = Σ voci pensione = 1.940,13 (comparto compreso); nessuna 13ª nei mesi interi diversi da dicembre (D11). Credito = CPDEL (R5). TFS = 80% × Σ voci TFS (01, 02, 04, 06, 08, 09 = 1.912,61) = 1.530,088 → 1.530,09.`,
      `Marzo: cessazione il 31, mese intero → 26/26 (D9). 13ª = voci con 13ª dell'ultimo mese (01, 02, 04, 06, 09 = 1.907,23) × 90/365 (1/1-31/3) = 470,28. CPDEL = 1.940,13 + 470,28 = 17595963/73 centesimi → 2.410,41. TFS = 0,8 × (1.912,61 + 470,28) = 69580268/365 → 1.906,31. Fonte: ${F.tredicesima}.`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N02',
    titolo: 'Istruttore C3, regime TFS: novembre, dicembre con 13ª intera, cessazione a metà gennaio (venerdì 15/01/2027)',
    regola: 'Dicembre = 13ª dell\'anno (365/365); mese parziale su 26 con giorni D9 (Capodanno contato) e rateo dal 1/1',
    dati: pratica({posizione: 'C3', assunzione: '2004-09-01', cessazione: '2027-01-15'}, '2026-11', solo(C3)),
    atteso: {
      periodi: [
        periodo({mese: '2026-11', dal: '2026-11-01', al: '2026-11-30', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '209926', 209926], ['imponibile-credito', '209926', 209926], ['imponibile-tfs', '165376', 165376]]),
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '416646', 416646], ['imponibile-credito', '416646', 416646], ['imponibile-tfs', '330752', 330752]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-15', giorni: 13, giorniTredicesima: 15, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '8282459/73', 113458], ['imponibile-credito', '8282459/73', 113458], ['imponibile-tfs', '6532352/73', 89484]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Voci: 01 1.928,23, 02 90,19, 06 (RIA) 29,50, 09 19,28, 10 32,06. Σ pensione 2.099,26; Σ con 13ª 2.067,20; Σ TFS 2.067,20 (06 compresa, 10 fuori). Fonte: ${F.cpdel}.`,
      'Novembre: CPDEL 2.099,26; TFS 0,8 × 2.067,20 = 1.653,76.',
      `Dicembre: 13ª dell'anno intera (dal 1/1 al 31/12 = 365/365) = 2.067,20. CPDEL = 2.099,26 + 2.067,20 = 4.166,46; TFS = 0,8 × 4.134,40 = 3.307,52. Fonte: ${F.tredicesima}.`,
      `Gennaio 2027: dal 1° (venerdì, Capodanno contato: D9 conta i festivi) al 15, domeniche 3 e 10 escluse = 13 giorni. CPDEL = 2.099,26 × 13/26 + 2.067,20 × 15/365 = 1.049,63 + 84,953… = 8282459/73 → 1.134,58. TFS = 0,8 × (1.033,60 + 84,953…) = 6532352/73 → 894,84. Fonte: ${F.giorni}.`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N03',
    titolo: 'Istruttore C1 assunto il 16/03/2026: 13ª di dicembre dall\'assunzione, cessazione il 31/01/2027',
    regola: 'Assunzione in corso d\'anno: 13ª di dicembre in 365esimi dall\'assunzione; nel nuovo anno il rateo riparte dal 1/1',
    dati: pratica({posizione: 'C1', assunzione: '2026-03-16', cessazione: '2027-01-31'}, '2026-12', solo(C1)),
    atteso: {
      periodi: [
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 291, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '128926846/365', 353224], ['imponibile-credito', '128926846/365', 353224], ['imponibile-tfs', '511026624/1825', 280015]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 31, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '78291586/365', 214497], ['imponibile-credito', '78291586/365', 214497], ['imponibile-tfs', '308485584/1825', 169033]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      'Voci C1: 01 1.928,23, 09 19,28, 10 32,06 (differenziale storico 0: posizione d\'ingresso). Σ pensione 1.979,57; Σ con 13ª e Σ TFS 1.947,51.',
      `Dicembre 2026: giorni di servizio dell'anno dal 16/03 al 31/12 = 16 + 275 = 291. 13ª = 1.947,51 × 291/365 = 1.552,67…; CPDEL = 1.979,57 + 1.552,67… = 128926846/365 → 3.532,24; TFS = 0,8 × (1.947,51 + 1.552,67…) = 511026624/1825 → 2.800,15. Fonte: ${F.tredicesima}.`,
      'Gennaio 2027: mese intero di cessazione (26/26); rateo dal 1/1 al 31/1 = 31/365 (la 13ª 2026 è già pagata a dicembre): 1.947,51 × 31/365 = 165,40…; CPDEL → 2.144,97; TFS → 1.690,33.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N04',
    titolo: 'Funzionario D3 con posizione, regime TFS: otto mesi alla cessazione, il 7º e l\'8º bloccati',
    regola: 'Limite 6 (D12): si preparano agosto 2026-gennaio 2027, febbraio e marzo 2027 sono bloccati; posizione in CPDEL e nella 13ª, fuori dal TFS',
    dati: pratica({posizione: 'D3', assunzione: '1998-05-01', cessazione: '2027-03-31'}, '2026-08', solo(D3)),
    atteso: {
      periodi: [
        periodo({mese: '2026-08', dal: '2026-08-01', al: '2026-08-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfs', '957444/5', 191489]]),
        periodo({mese: '2026-09', dal: '2026-09-01', al: '2026-09-30', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfs', '957444/5', 191489]]),
        periodo({mese: '2026-10', dal: '2026-10-01', al: '2026-10-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfs', '957444/5', 191489]]),
        periodo({mese: '2026-11', dal: '2026-11-01', al: '2026-11-30', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfs', '957444/5', 191489]]),
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '622355', 622355], ['imponibile-credito', '622355', 622355], ['imponibile-tfs', '1914888/5', 382978]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfs', '957444/5', 191489]]),
      ],
      blocchi: [bloccato('2027-02'), bloccato('2027-03')],
      avvisi: [],
    },
    passi: [
      `Mesi da agosto 2026 a marzo 2027 = 8; PASSWEB ne accetta 6: si preparano agosto-gennaio, febbraio e marzo hanno un blocco con la spiegazione (il periodo di cessazione si inserirà quando la DMA vera di agosto avrà fatto scorrere la finestra). Fonte: ${F.limite}.`,
      'Voci D3: 01 2.092,84, 02 279,84, 07 (posizione, fantasia) 700,00, 09 20,93, 10 36,33. CPDEL = 3.129,94; voci con 13ª (posizione compresa) 3.093,61; TFS = 0,8 × (01 + 02 + 09 = 2.393,61) = 1.914,888 → 1.914,89 (posizione fuori, D7).',
      'Dicembre: CPDEL = 3.129,94 + 3.093,61 = 6.223,55; TFS = 0,8 × (2.393,61 × 2) = 3.829,776 → 3.829,78.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N05',
    titolo: 'Istruttore C3 vigile, part-time: 50% O a dicembre, 75% V da gennaio, cessazione venerdì 12/02/2027',
    regola: 'Voce × % del mese (D4); 13ª alla % del mese di pagamento (C21-3); mese parziale; valore pieno a x,xx5 (half-up)',
    dati: pratica({posizione: 'C3', assunzione: '2004-09-01', cessazione: '2027-02-12'}, '2026-12', solo({...C3, '11': 7801}), {
      partTime: {
        base: {percentuale: 50, tipo: 'O'},
        eccezioni: {'2027-01': {percentuale: 75, tipo: 'V'}, '2027-02': {percentuale: 75, tipo: 'V'}},
      },
    }),
    atteso: {
      periodi: [
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 50, regime: 'TFS'}, [['imponibile-pensionistico', '424447/2', 212224], ['imponibile-credito', '424447/2', 212224], ['imponibile-tfs', '842482/5', 168496]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 75, regime: 'TFS'}, [['imponibile-pensionistico', '653181/4', 163295], ['imponibile-credito', '653181/4', 163295], ['imponibile-tfs', '643563/5', 128713]]),
        periodo({mese: '2027-02', dal: '2027-02-01', al: '2027-02-12', giorni: 11, giorniTredicesima: 43, percentuale: 75, regime: 'TFS'}, [['imponibile-pensionistico', '663172119/7592', 87351], ['imponibile-credito', '663172119/7592', 87351], ['imponibile-tfs', '131089773/1898', 69067]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      'Voci a tempo pieno: C3 come DM-N02 più 11 (indennità di vigilanza, fantasia) 78,01: Σ pensione 2.177,27; Σ con 13ª 2.067,20; Σ TFS 2.145,21 (vigilanza utile TFS, senza 13ª).',
      `Dicembre al 50%: CPDEL = 0,5 × (2.177,27 + 2.067,20) = 2.122,235 esatti (424447/2 centesimi) → 2.122,24, half-up sulla metà (D17); TFS = 0,8 × 0,5 × 4.212,41 = 1.684,964 → 1.684,96. Fonte: ${F.partTime}.`,
      'Gennaio al 75%: CPDEL = 0,75 × 2.177,27 = 1.632,9525 → 1.632,95; TFS = 0,6 × 2.145,21 = 1.287,126 → 1.287,13. Il tipo V non cambia la regola (D4).',
      'Febbraio: dal 1° (lunedì) al 12, domenica 7 esclusa = 11 giorni; rateo 1/1-12/2 = 43/365 alla % di febbraio (75%, C21-3). CPDEL = 0,75 × (2.177,27 × 11/26 + 2.067,20 × 43/365) = 663172119/7592 → 873,51; TFS = 0,6 × (2.145,21 × 11/26 + 2.067,20 × 43/365) = 131089773/1898 → 690,67.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N06',
    titolo: 'Operatore esperto B4 non iscritto al Credito: una sola DMA, cessazione il 30/04/2027',
    regola: 'R5: senza iscrizione il campo Credito non si emette; mese intero di cessazione con rateo 120/365',
    dati: pratica({posizione: 'B4', assunzione: '1999-03-01', cessazione: '2027-04-30'}, '2027-04', solo(B4), {iscrittoCredito: false}),
    atteso: {
      periodi: [
        periodo({mese: '2027-04', dal: '2027-04-01', al: '2027-04-30', giorni: 26, giorniTredicesima: 120, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '18740301/73', 256716], ['imponibile-tfs', '14831524/73', 203172]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Non iscritto al Credito: nessun campo Credito (R5). Fonte: ${F.credito}.`,
      'Aprile 2027 intero (26/26), rateo 1/1-30/4 = 120/365: 1.907,23 × 120/365 = 627,03…; CPDEL = 1.940,13 + 627,03… = 18740301/73 → 2.567,16; TFS = 0,8 × (1.912,61 + 627,03…) = 14831524/73 → 2.031,72.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N07',
    titolo: 'Istruttore C3 cessato il 31/12/2026: dicembre è anche il mese di cessazione',
    regola: 'D11, C21-3: un solo rateo di 13ª (365/365), non due',
    dati: pratica({posizione: 'C3', assunzione: '2004-09-01', cessazione: '2026-12-31'}, '2026-11', solo(C3)),
    atteso: {
      periodi: [
        periodo({mese: '2026-11', dal: '2026-11-01', al: '2026-11-30', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '209926', 209926], ['imponibile-credito', '209926', 209926], ['imponibile-tfs', '165376', 165376]]),
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '416646', 416646], ['imponibile-credito', '416646', 416646], ['imponibile-tfs', '330752', 330752]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Dicembre è insieme il mese della 13ª e quello di cessazione: rateo dal 1/1 al 31/12 = 365/365, cioè la 13ª intera una volta sola. CPDEL 4.166,46; TFS 3.307,52 (come dicembre di DM-N02). Fonte: ${F.tredicesima}.`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N08',
    titolo: 'Operatore esperto B4 sospeso dal 01/02/2027 (codice servizio 83), cessazione il 31/03/2027',
    regola: 'C21-2: dal mese della sospensione codice 83, CPDEL e Credito sull\'assegno alimentare inserito, TFS 0',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2027-03-31'},
      '2027-01',
      {
        base: B4,
        eccezioni: {
          '2027-02': {'01': 85764, '02': 0, '04': 0, '06': 0, '08': 0, '09': 0, '10': 0},
          '2027-03': {'01': 85764, '02': 0, '04': 0, '06': 0, '08': 0, '09': 0, '10': 0},
        },
      },
      {situazione: {tipo: 'sospensione-cautelare', dal: '2027-02-01'}},
    ),
    atteso: {
      periodi: [
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS'}, [['imponibile-pensionistico', '194013', 194013], ['imponibile-credito', '194013', 194013], ['imponibile-tfs', '765044/5', 153009]]),
        periodo({mese: '2027-02', dal: '2027-02-01', al: '2027-02-28', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFS', codiceServizio: 83}, [['imponibile-pensionistico', '85764', 85764], ['imponibile-credito', '85764', 85764], ['imponibile-tfs', '0', 0]]),
        periodo({mese: '2027-03', dal: '2027-03-01', al: '2027-03-31', giorni: 26, giorniTredicesima: 90, percentuale: 100, regime: 'TFS', codiceServizio: 83}, [['imponibile-pensionistico', '7804524/73', 106911], ['imponibile-credito', '7804524/73', 106911], ['imponibile-tfs', '0', 0]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    scostamentiVolutiDalleTabelle: ['2027-02', '2027-03'].flatMap((mese) => ['01', '02', '09', '10'].map((voce) => ({mese, voce}))),
    passi: [
      `Sospensione cautelare dal 01/02/2027: date di riferimento di pensione e fine servizio 31/01/2027 (C20-1); gennaio è una DMA ordinaria (come DM-N01). Fonte: ${F.codici}.`,
      'Febbraio e marzo: codice servizio 83; l\'operatore inserisce l\'assegno alimentare (fantasia: 857,64, metà del tabellare) come eccezione della voce 01 e azzera le altre. CPDEL = Credito = 857,64; TFS 0.',
      'Marzo, cessazione: rateo 90/365 sulle voci con 13ª dell\'ultimo mese, cioè sull\'assegno: 857,64 × 90/365 = 211,47…; CPDEL = 7804524/73 → 1.069,11. Validato (12/10/2026): la 13ª matura sull\'assegno; un importo che non la matura va inserito su una voce senza 13ª.',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N09',
    titolo: 'Operatore esperto B4 con trattenuta 100% per malattia dal 01/02/2027: nessuna DMA prevista',
    regola: 'D19, C21-2: nessun periodo e avviso `dma-non-prevista`',
    dati: pratica({posizione: 'B4', assunzione: '1999-03-01', cessazione: '2027-03-31'}, '2027-01', solo(B4), {
      situazione: {tipo: 'trattenuta-malattia', dal: '2027-02-01'},
    }),
    atteso: {
      periodi: [],
      blocchi: [],
      avvisi: [{codice: 'dma-non-prevista', dati: {situazione: 'trattenuta-malattia'}, fonte: F.trattenuta}],
    },
    passi: [`Trattenuta 100% per malattia: la DMA prevista non serve; il motore non prepara periodi e lo dice con un avviso. Fonte: ${F.trattenuta}.`],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N10',
    titolo: 'Funzionario D3 con posizione, regime TFR: gennaio intero e cessazione domenica 28/02/2027',
    regola: 'R1-R4: teorica a mese pieno, posizione negli ulteriori elementi, imponibile TFR all\'80% e valutabile dalla stessa base; fine febbraio = 26',
    dati: pratica({posizione: 'D3', assunzione: '2001-02-01', cessazione: '2027-02-28'}, '2027-01', solo(D3), {regime: 'TFR'}),
    atteso: {
      periodi: [
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFR'}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfr', '957444/5', 191489], ['retribuzione-teorica-tfr', '309361', 309361], ['retribuzione-valutabile-tfr', '309361', 309361], ['ulteriori-elementi-tfr', '70000', 70000]]),
        periodo({mese: '2027-02', dal: '2027-02-01', al: '2027-02-28', giorni: 26, giorniTredicesima: 59, percentuale: 100, regime: 'TFR'}, [['imponibile-pensionistico', '132495109/365', 363000], ['imponibile-credito', '132495109/365', 363000], ['imponibile-tfr', '405956256/1825', 222442], ['retribuzione-teorica-tfr', '309361', 309361], ['retribuzione-valutabile-tfr', '131169064/365', 359367], ['ulteriori-elementi-tfr', '5936000/73', 81315]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Regime TFR: CPDEL, Credito, imponibile TFR, teorica, valutabile e ulteriori elementi; niente TFS (un periodo dichiara TFS o TFR). Fonte: ${F.tfr}.`,
      `Gennaio: teorica = Σ voci TFR (01 + 02 + 07 + 09) = 3.093,61 (comparto escluso). Imponibile TFR = 0,8 × base TFS (01 + 02 + 09 = 2.393,61) = 1.914,89. Ulteriori = posizione al 100% = 700,00. Valutabile = 2.393,61 + 700,00 = 3.093,61 (= teorica nei mesi senza ratei). Fonte: ${F.teorica}; ${F.ulteriori}.`,
      'Febbraio: cessazione l\'ultimo giorno → mese intero, 26/26 anche se i lun-sab sono 24 (D9). Rateo 59/365 (1/1-28/2). CPDEL = 3.129,94 + 3.093,61 × 59/365 = 132495109/365 → 3.630,00; imponibile TFR = 0,8 × (2.393,61 + 2.393,61 × 59/365) = 405956256/1825 → 2.224,42; valutabile = 3.093,61 × (1 + 59/365) = 131169064/365 → 3.593,67; ulteriori = 700,00 × (1 + 59/365) = 5936000/73 → 813,15; teorica a mese pieno 3.093,61 (R1).',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N11',
    titolo: 'Istruttore C3 in regime TFR part-time al 60%, cessazione mercoledì 10/03/2027',
    regola: 'Teorica proporzionata al part-time ma a mese pieno; imponibile e valutabile su 9/26 più rateo 69/365; ulteriori 0 senza posizione',
    dati: pratica({posizione: 'C3', assunzione: '2004-09-01', cessazione: '2027-03-10'}, '2027-03', solo(C3), {
      regime: 'TFR',
      partTime: {base: {percentuale: 60, tipo: 'O'}, eccezioni: {}},
    }),
    atteso: {
      periodi: [
        periodo({mese: '2027-03', dal: '2027-03-01', al: '2027-03-10', giorni: 9, giorniTredicesima: 69, percentuale: 60, regime: 'TFR'}, [['imponibile-pensionistico', '318138777/4745', 67047], ['imponibile-credito', '318138777/4745', 67047], ['imponibile-tfr', '1259917056/23725', 53105], ['retribuzione-teorica-tfr', '124032', 124032], ['retribuzione-valutabile-tfr', '314979264/4745', 66381], ['ulteriori-elementi-tfr', '0', 0]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      'Marzo 2027: dal 1° (lunedì) al 10, domenica 7 esclusa = 9 giorni; rateo 1/1-10/3 = 69/365; % 60.',
      `Teorica = 0,6 × (01 + 02 + 06 + 09 = 2.067,20) = 1.240,32, a mese pieno (R1). Fonte: ${F.teorica}.`,
      'CPDEL = 0,6 × (2.099,26 × 9/26 + 2.067,20 × 69/365) = 318138777/4745 → 670,47; imponibile TFR = 0,8 × 0,6 × 2.067,20 × (9/26 + 69/365) = 1259917056/23725 → 531,05; valutabile = 0,6 × 2.067,20 × (9/26 + 69/365) = 314979264/4745 → 663,81; ulteriori 0 (nessuna voce 07).',
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N12',
    titolo: 'Funzionario D3 in regime TFR in congedo L. 104 dal 01/01/2027 (codice 49), cessazione il 28/02/2027',
    regola: 'R3: dicembre ordinario; gennaio e febbraio con codice 49, teorica compilata, imponibile TFR, valutabile e ulteriori a 0',
    dati: pratica({posizione: 'D3', assunzione: '2001-02-01', cessazione: '2027-02-28'}, '2026-12', solo(D3), {
      regime: 'TFR',
      situazione: {tipo: 'congedo-104', dal: '2027-01-01'},
    }),
    atteso: {
      periodi: [
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 100, regime: 'TFR'}, [['imponibile-pensionistico', '622355', 622355], ['imponibile-credito', '622355', 622355], ['imponibile-tfr', '1914888/5', 382978], ['retribuzione-teorica-tfr', '309361', 309361], ['retribuzione-valutabile-tfr', '618722', 618722], ['ulteriori-elementi-tfr', '140000', 140000]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 0, percentuale: 100, regime: 'TFR', codiceServizio: 49}, [['imponibile-pensionistico', '312994', 312994], ['imponibile-credito', '312994', 312994], ['imponibile-tfr', '0', 0], ['retribuzione-teorica-tfr', '309361', 309361], ['retribuzione-valutabile-tfr', '0', 0], ['ulteriori-elementi-tfr', '0', 0]]),
        periodo({mese: '2027-02', dal: '2027-02-01', al: '2027-02-28', giorni: 26, giorniTredicesima: 59, percentuale: 100, regime: 'TFR', codiceServizio: 49}, [['imponibile-pensionistico', '132495109/365', 363000], ['imponibile-credito', '132495109/365', 363000], ['imponibile-tfr', '0', 0], ['retribuzione-teorica-tfr', '309361', 309361], ['retribuzione-valutabile-tfr', '0', 0], ['ulteriori-elementi-tfr', '0', 0]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      'Congedo L. 104 dal 01/01/2027: pensione alla cessazione 28/02/2027, fine servizio 31/12/2026 (C20-1).',
      'Dicembre 2026 ordinario in regime TFR con 13ª intera: CPDEL 6.223,55; imponibile TFR 0,8 × 4.787,22 = 3.829,78; teorica 3.093,61; valutabile 4.787,22 + 1.400,00 = 6.187,22; ulteriori 700,00 × 2 = 1.400,00.',
      `Gennaio e febbraio con codice 49: CPDEL e Credito dalle voci (febbraio con rateo 59/365: 3.630,00); imponibile TFR, valutabile e ulteriori 0; teorica compilata 3.093,61. Fonte: ${F.codici}.`,
    ],
    validazione: VALIDAZIONE,
  },
  {
    id: 'DM-N13',
    titolo: 'Operatore esperto B4 optante TFR dal 01/11/2026: DMA di dicembre e gennaio coi campi del TFR',
    regola: 'C21-2: la pratica è in regime TFS (C20, PT-N14), ma i mesi dall\'opzione sono TFR',
    dati: pratica(
      {posizione: 'B4', assunzione: '1999-03-01', cessazione: '2027-01-31'},
      '2026-12',
      {base: B4, eccezioni: {'2025-11': {'01': 170438, '10': 3931}, '2025-12': {'01': 170438, '10': 3931}}},
      {situazione: {tipo: 'optante-tfr', dal: '2026-11-01'}},
    ),
    atteso: {
      periodi: [
        periodo({mese: '2026-12', dal: '2026-12-01', al: '2026-12-31', giorni: 26, giorniTredicesima: 365, percentuale: 100, regime: 'TFR'}, [['imponibile-pensionistico', '384736', 384736], ['imponibile-credito', '384736', 384736], ['imponibile-tfr', '1527936/5', 305587], ['retribuzione-teorica-tfr', '191261', 191261], ['retribuzione-valutabile-tfr', '381984', 381984], ['ulteriori-elementi-tfr', '0', 0]]),
        periodo({mese: '2027-01', dal: '2027-01-01', al: '2027-01-31', giorni: 26, giorniTredicesima: 31, percentuale: 100, regime: 'TFR'}, [['imponibile-pensionistico', '76727158/365', 210211], ['imponibile-credito', '76727158/365', 210211], ['imponibile-tfr', '302890712/1825', 165968], ['retribuzione-teorica-tfr', '191261', 191261], ['retribuzione-valutabile-tfr', '75722678/365', 207459], ['ulteriori-elementi-tfr', '0', 0]]),
      ],
      blocchi: [],
      avvisi: [],
    },
    passi: [
      `Optante dal 01/11/2026: fine TFS 31/10/2026 (D14), pensione alla cessazione; le eccezioni di novembre-dicembre 2025 (01 1.704,38 Tab. B col. 1, comparto 39,31) servono solo alla finestra del TFS. Le DMA di dicembre e gennaio sono dopo l'opzione: campi del regime TFR. Fonte: ${F.optante}.`,
      'Dicembre: teorica = Σ voci TFR (01, 02, 04, 06, 08, 09) = 1.912,61; imponibile TFR = 0,8 × (1.912,61 + 1.907,23) = 3.055,872 → 3.055,87; valutabile 3.819,84; CPDEL 1.940,13 + 1.907,23 = 3.847,36.',
      'Gennaio, cessazione a fine mese: rateo 31/365; CPDEL = 76727158/365 → 2.102,11; imponibile TFR → 1.659,68; valutabile → 2.074,59; teorica 1.912,61.',
    ],
    validazione: VALIDAZIONE,
  },
];
