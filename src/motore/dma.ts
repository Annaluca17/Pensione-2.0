// DMA previste della pratica di pensione (D9, D11, D12, D17, D19, R1-R5, C21-1…C21-4). Interno al
// motore: lo chiama solo calcolaPratica.
import {componi} from './composizione';
import {conIvcDaTabella} from './contratti';
import {data, giornoDellAnno, giornoDellaSettimana, giorniDelMese, leggiData, meseDi, spostaMese} from './date';
import type {
  Addendo,
  Avviso,
  Blocco,
  CampoDmaCalcolato,
  CodiceServizioDma,
  DataISO,
  DmaPreviste,
  MeseISO,
  Operazione,
  PartTime,
  PeriodoDma,
  RegimeFineServizio,
  Situazione,
  Tabelle,
  VociMese,
} from './tipi';

const FONTE_CODICI =
  'R3, C21-2: con codice servizio 83 (sospensione cautelare) o 49 (congedo L. 104) retribuzioni utili solo a CPDEL e Credito (prassi "Pensionamenti con situazioni particolari in corso"); teorica TFR compilata come da Circ. INPS 185/2021 §2.2.1';
const FONTE_TRATTENUTA =
  'D19, C21-2: con trattenuta 100% per malattia la DMA prevista non serve (prassi "Pensionamenti con situazioni particolari in corso")';
const FONTE_80 = 'D17, R4: 80% della base a precisione piena, un solo arrotondamento';

/** Campi che restano compilati con codice servizio 83 o 49 (R3, C21-2). */
const COMPILATI_CON_CODICE = new Set(['imponibile-pensionistico', 'imponibile-credito', 'retribuzione-teorica-tfr']);

interface Ingresso {
  dal: MeseISO;
  cessazione: DataISO;
  assunzione: DataISO;
  /** Giorni del mese di cessazione: quelli del mese parziale, forzabili (D9). */
  giorniCessazione: number;
  /** Voci a tempo pieno e part-time del mese, già espansi da base ed eccezioni. */
  mese: (m: MeseISO) => {voci: VociMese; partTime: PartTime};
  regime: RegimeFineServizio;
  situazione: Situazione;
  iscrittoCredito: boolean;
  posizione: string;
  tabelle: Tabelle;
}

/** Calcola le DMA previste; i blocchi oltre il limite non fermano la sezione. */
export function calcolaDmaPreviste(ingresso: Ingresso): {dma: DmaPreviste; blocchi: Blocco[]; avvisi: Avviso[]} {
  const {dal, cessazione, situazione, tabelle} = ingresso;
  if (situazione.tipo === 'trattenuta-malattia') {
    return {dma: {periodi: []}, blocchi: [], avvisi: [{tipo: 'avviso', codice: 'dma-non-prevista', situazione: situazione.tipo, fonte: FONTE_TRATTENUTA}]};
  }
  const mesi: MeseISO[] = [];
  for (let m = dal; m <= meseDi(cessazione); m = spostaMese(m, 1)) mesi.push(m);
  const limite = tabelle.parametri.limiteDmaPreviste;
  const avvisi: Avviso[] = [];
  const periodi = mesi.slice(0, limite.valore).map((m) => {
    const {periodo, avviso} = calcolaPeriodo(m, ingresso);
    if (avviso) avvisi.push(avviso);
    return periodo;
  });
  const blocchi = mesi
    .slice(limite.valore)
    .map((mese): Blocco => ({tipo: 'blocco', codice: 'dma-oltre-limite', mese, limite: limite.valore, fonte: limite.fonte}));
  return {dma: {periodi}, blocchi, avvisi};
}

function calcolaPeriodo(m: MeseISO, ingresso: Ingresso): {periodo: PeriodoDma; avviso?: Avviso} {
  const {cessazione, assunzione, situazione, tabelle} = ingresso;
  const [anno, numero] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
  const c = leggiData(cessazione)!;
  const a = leggiData(assunzione)!;
  const diCessazione = m === meseDi(cessazione);
  const primo = meseDi(assunzione) === m ? a.giorno : 1;
  const ultimo = diCessazione ? c.giorno : giorniDelMese(anno, numero);

  // Giorni D9: nel mese di cessazione quelli del mese parziale; altrimenti 26, o i lun-sab dall'assunzione.
  const tetto = tabelle.parametri.tettoGiorniMeseParziale.valore;
  let giorni = ingresso.giorniCessazione;
  if (!diCessazione) {
    let lunSab = 0;
    for (let g = primo; g <= ultimo; g++) if (giornoDellaSettimana(anno, numero, g) !== 0) lunSab++;
    giorni = primo === 1 ? tetto : Math.min(lunSab, tetto);
  }

  // 13ª (D11, C21-3): a dicembre e nel mese di cessazione, dal 1/1 (o dall'assunzione) in 365esimi, tetto 365.
  const anno365 = tabelle.parametri.divisoreRateoTredicesima.valore;
  let giorniTredicesima = 0;
  if (numero === 12 || diCessazione) {
    const inizio = a.anno === anno ? giornoDellAnno(assunzione) : 1;
    const fine = giornoDellAnno(diCessazione ? cessazione : data(anno, 12, 31));
    giorniTredicesima = Math.min(fine - inizio + 1, anno365);
  }

  // Situazione dal mese del suo inizio (C21-2): codice servizio 83/49, optante in TFR.
  const dalSituazione = situazione.tipo !== 'ordinaria' && m >= meseDi(situazione.dal);
  const codiceServizio: CodiceServizioDma | undefined = !dalSituazione
    ? undefined
    : situazione.tipo === 'sospensione-cautelare'
      ? 83
      : situazione.tipo === 'congedo-104'
        ? 49
        : undefined;
  const regime: RegimeFineServizio = dalSituazione && situazione.tipo === 'optante-tfr' ? 'TFR' : ingresso.regime;

  // IVC dalla tabella (D8), salvo con codice 83/49: lì le voci sono quelle inserite (assegno alimentare).
  const {voci: inserite, partTime} = ingresso.mese(m);
  const {voci, avviso} = codiceServizio ? {voci: inserite, avviso: undefined} : conIvcDaTabella(inserite, m, ingresso.posizione, tabelle);
  const percentuale = partTime.percentuale;
  const divisore26 = tabelle.parametri.divisoreGiornaliera.valore;

  const addendi = (codici: readonly string[], quota?: {giorni: number; divisore: number}): Addendo[] =>
    codici
      .filter((voce) => (voci[voce] ?? 0) !== 0)
      .map((voce) => ({
        voce,
        mese: m,
        importo: voci[voce]!,
        ...(percentuale !== 100 && {percentuale}),
        ...quota,
      }));

  const campi: CampoDmaCalcolato[] = tabelle.righePassweb.dma
    .filter((def) => (!def.regime || def.regime === regime) && (!def.condizione || ingresso.iscrittoCredito))
    .map((def) => {
      if (codiceServizio && !COMPILATI_CON_CODICE.has(def.id)) {
        return {id: def.id, etichetta: def.etichetta, composizione: componi({addendi: [], operazioni: [], fonte: `${def.fonte}; ${FONTE_CODICI}`})};
      }
      const teorica = def.id === 'retribuzione-teorica-tfr';
      const operazioni: Operazione[] = def.percentuale === 80 ? [{tipo: 'moltiplica', per: 0.8, motivo: '80% della base', fonte: FONTE_80}] : [];
      const lista = teorica
        ? addendi(def.voci) // R1: sempre a mese pieno, senza 13ª
        : [
            // Mese intero = 26/26: la voce entra intera, senza quota.
            ...addendi(def.voci, giorni === divisore26 ? undefined : {giorni, divisore: divisore26}),
            ...(giorniTredicesima > 0 ? addendi(def.tredicesima, {giorni: giorniTredicesima, divisore: anno365}) : []),
          ];
      const fonte = codiceServizio ? `${def.fonte}; ${FONTE_CODICI}` : def.fonte;
      return {id: def.id, etichetta: def.etichetta, composizione: componi({addendi: lista, operazioni, fonte})};
    });

  return {
    periodo: {
      mese: m,
      dal: data(anno, numero, primo),
      al: data(anno, numero, ultimo),
      giorni,
      giorniTredicesima,
      percentuale,
      regime,
      ...(codiceServizio && {codiceServizio}),
      campi,
    },
    ...(avviso && {avviso}),
  };
}
