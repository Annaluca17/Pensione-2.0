// Miglioramento contrattuale della pratica di pensione (ADR 0003; D13, T4, T5, T12; C21-5…C21-8).
// Interno al motore: lo chiama solo calcolaPratica. Tutto dalla tabella dei contratti, nessun anno cablato:
// vigenza e firma decidono se il miglioramento vale, gli scaglionamenti le decorrenze e gli importi.
import {conIvcDaTabella} from './contratti';
import {giornoDopo, meseDi} from './date';
import {componiUm, umDaVoci} from './pensione';
import {righeTfs} from './tfs';
import {totale} from './composizione';
import type {
  Addendo,
  Avviso,
  Blocco,
  Centesimi,
  CodiceVoce,
  Contratto,
  ContrattoDefinitivo,
  DataISO,
  MeseRetribuzione,
  Miglioramento,
  Scaglionamento,
  Tabelle,
  Tfs,
  TfsMigliorato,
  UmMigliorato,
  UmPensione,
  VoceSostituita,
  VociMese,
} from './tipi';

export const FONTI_MIGLIORAMENTO = {
  regola:
    'CCNL Funzioni Locali 2022-24 art. 57 c. 2 (per i cessati nella vigenza gli incrementi hanno effetto integralmente sulla pensione; su TFS e TFR solo quelli maturati alla cessazione); CCNL 2019-21 art. 77 c. 2; ADR 0003, D13, C21-5',
  bloccato:
    'C21-5: il miglioramento vale solo per i cessati nella vigenza del contratto, firmato dopo la cessazione (CCNL 2022-24 art. 57 c. 2: "cessato … nel periodo di vigenza"; T3)',
  decorrenze: 'ADR 0003 (UM di miglioramento con la sua decorrenza), C21-6: scaglionamenti con decorrenza nella vigenza del contratto, un UM per decorrenza',
  sostituzione:
    'T12: nel migliorato si sostituiscono dalle tabelle 01, 02 e 10, la 09 secondo T6 (riassorbita: CCNL 2022-24 art. 56; CCNL 2019-21 art. 76 c. 4); le altre voci restano quelle inserite; C21-7',
  erogata:
    'T4: avviso se l\'UM ricalcolato differisce dalla pensione erogata; avviso forte "nessun miglioramento reale, non inserire la domanda" se fissi + 13ª migliorati non la superano (glossario: Pensione erogata)',
  tfs: 'D13, C21-8: TFS con i soli scaglionamenti con decorrenza fino alla cessazione, mese per mese, confrontato col TFS ordinario; Circ. INPS 125/2022 §3.2; D3, D16, D20 per le righe',
  ipotesi:
    "T5: un'ipotesi non produce importi; alla firma la pratica tornerà da rilavorare (ADR 0003, 0004); C21-5",
} as const;

/** Il contratto nella cui vigenza cade la cessazione, firmato dopo: la proposta del motore (C21-5). */
export function contrattoInVacanza(tabelle: Tabelle, cessazione: DataISO): Contratto | undefined {
  return tabelle.contratti.find((c) => applicabile(c, cessazione));
}

const applicabile = (c: Contratto, cessazione: DataISO) => c.vigenza.dal <= cessazione && cessazione <= c.vigenza.al && c.firma > cessazione;

interface Ingresso {
  contratto: string;
  cessazione: DataISO;
  /** Data di riferimento della pensione: lo Scenario A è sul suo mese, il primo migliorato il giorno dopo. */
  dataPensione: DataISO;
  /** Voci inserite del mese della pensione. */
  voci: VociMese;
  /** In regime TFS: i mesi del TFS ordinario e il suo risultato, per il confronto (C21-8). */
  tfs?: {mesi: MeseRetribuzione[]; ordinario?: Tfs};
  pensioneErogata?: {fissi: Centesimi; tredicesima: Centesimi};
  posizione: string;
  tabelle: Tabelle;
}

type Esito = {blocchi: Blocco[]} | {miglioramento: Miglioramento; avvisi: Avviso[]};

export function calcolaMiglioramento(ingresso: Ingresso): Esito {
  const {contratto: id, cessazione, dataPensione, voci, tfs, pensioneErogata, posizione, tabelle} = ingresso;
  const scelto = tabelle.contratti.find((c) => c.id === id);
  if (!scelto) return {blocchi: [{tipo: 'blocco', codice: 'contratto-inesistente', contratto: id}]};
  if (!applicabile(scelto, cessazione)) {
    const {dal: vigenzaDal, al: vigenzaAl} = scelto.vigenza;
    return {
      blocchi: [
        {tipo: 'blocco', codice: 'miglioramento-non-applicabile', contratto: id, vigenzaDal, vigenzaAl, firma: scelto.firma, cessazione, fonte: FONTI_MIGLIORAMENTO.bloccato},
      ],
    };
  }
  if (scelto.stato === 'ipotesi') {
    return {
      miglioramento: {contratto: id, stato: 'ipotesi'},
      avvisi: [{tipo: 'avviso', codice: 'contratto-in-ipotesi', contratto: id, vigenzaDal: scelto.vigenza.dal, fonte: FONTI_MIGLIORAMENTO.ipotesi}],
    };
  }

  const tabelleScelto = {scelto, cessazione, posizione, tabelle};
  // Scenario A: le voci inserite così come sono, IVC compresa (C21-7).
  const scenarioA = umDaVoci(meseDi(dataPensione), voci, tabelle);
  const migliorati: UmMigliorato[] = [];
  for (const decorrenza of decorrenze(scelto, dataPensione)) {
    const s = sostituite(decorrenza, tabelleScelto);
    if ('blocco' in s) return {blocchi: [s.blocco]};
    const um = componiUm(meseDi(decorrenza), (voce) => s.addendi[voce as VoceSostituita] ?? inserita(voci, voce, meseDi(dataPensione)), tabelle, (voce) => s.fonti[voce as VoceSostituita]);
    migliorati.push({
      ...um,
      decorrenza,
      sostituite: s.valori,
      differenza: {annui: um.totaleAnnui - scenarioA.totaleAnnui, tredicesima: tredicesima(um) - tredicesima(scenarioA)},
    });
  }

  const avvisi: Avviso[] = pensioneErogata ? avvisiErogata(pensioneErogata, scenarioA, migliorati) : [];
  let tfsMigliorato: TfsMigliorato | undefined;
  if (tfs && tfs.mesi.length > 0) {
    const calcolo = calcolaTfsMigliorato(tfs.mesi, tabelleScelto);
    if ('blocco' in calcolo) return {blocchi: [calcolo.blocco]};
    tfsMigliorato = calcolo;
    const diverse = tfs.ordinario ? calcolo.righe.filter((r, i) => r.composizione.arrotondato !== tfs.ordinario!.righe[i]?.composizione.arrotondato).map((r) => r.id) : [];
    if (diverse.length > 0) avvisi.push({tipo: 'avviso', codice: 'tfs-da-modificare', righe: diverse, fonte: FONTI_MIGLIORAMENTO.tfs});
  }
  return {
    miglioramento: {contratto: id, stato: 'definitivo', scenarioA, migliorati, ...(tfsMigliorato && {tfs: tfsMigliorato})},
    avvisi,
  };
}

const tredicesima = (um: UmPensione) => um.tredicesima.composizione.arrotondato;
const inserita = (voci: VociMese, voce: CodiceVoce, mese: string): Addendo[] => ((voci[voce] ?? 0) !== 0 ? [{voce, mese, importo: voci[voce]!}] : []);

/** C21-6: il giorno dopo la pensione se c'è uno scaglionamento nella vigenza fino ad allora, poi uno per decorrenza successiva. */
function decorrenze(scelto: ContrattoDefinitivo, dataPensione: DataISO): DataISO[] {
  const nella = scelto.scaglionamenti.map((s) => s.decorrenza).filter((d) => d >= scelto.vigenza.dal && d <= scelto.vigenza.al);
  // Uno scaglionamento il giorno dopo la pensione (es. cessazione al 31/12) coincide col primo UM: una decorrenza sola.
  const dopo = nella.filter((d) => d > dataPensione);
  return [...new Set([...(nella.some((d) => d <= dataPensione) ? [giornoDopo(dataPensione)] : []), ...dopo])].sort();
}

interface TabelleScelto {
  scelto: ContrattoDefinitivo;
  cessazione: DataISO;
  posizione: string;
  tabelle: Tabelle;
}

const definitivi = (tabelle: Tabelle) => tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');

/** Del contratto scelto contano le decorrenze nella vigenza (C21-6); degli altri quelle già in vigore alla cessazione. */
const conta = (c: ContrattoDefinitivo, decorrenza: DataISO, {scelto, cessazione}: TabelleScelto) =>
  c.id === scelto.id ? decorrenza >= c.vigenza.dal && decorrenza <= c.vigenza.al : decorrenza <= cessazione;

const ultimo = <T extends {decorrenza: string}>(lista: readonly T[]) => [...lista].sort((a, b) => a.decorrenza.localeCompare(b.decorrenza)).at(-1);

type Sostituite = {valori: Record<VoceSostituita, Centesimi>; addendi: Record<VoceSostituita, Addendo[]>; fonti: Record<VoceSostituita, string>} | {blocco: Blocco};

/**
 * Le voci 01, 02, 09, 10 dalle tabelle alla data (T12, C21-7): 01 = ultimo tabellare in vigore + ultimo
 * incremento successivo; 02 = differenziale storico rivisto se il tabellare è per area, 0 se per posizione;
 * 09 = 0 (riassorbita); 10 = indennità di comparto in vigore.
 */
function sostituite(alla: DataISO, t: TabelleScelto): Sostituite {
  const {posizione, tabelle, scelto} = t;
  const trasposizione = tabelle.trasposizione.find((x) => x.posizione === posizione);
  if (!trasposizione) throw new Error(`miglioramento: posizione ${posizione} assente dalla trasposizione`);
  const area = trasposizione.area;
  const mese = meseDi(alla);
  const inVigore = definitivi(tabelle).flatMap((c) => c.scaglionamenti.filter((s) => s.decorrenza <= alla && conta(c, s.decorrenza, t)));
  const tabellare = ultimo(inVigore.filter((s) => s.tipo === 'tabellare'));
  if (!tabellare) return {blocco: {tipo: 'blocco', codice: 'importo-non-in-tabella', decorrenza: alla, chiave: '01', fonte: `nessun tabellare in vigore alla data (${scelto.id})`}};
  const incremento = ultimo(inVigore.filter((s) => s.tipo === 'incremento' && s.decorrenza >= tabellare.decorrenza));
  const comparto = ultimo(
    definitivi(tabelle).flatMap((c) =>
      c.indennitaComparto.filter((x) => x.decorrenza <= alla && (c.id === scelto.id ? x.decorrenza <= c.vigenza.al : x.decorrenza <= t.cessazione)),
    ),
  );
  if (!comparto) return {blocco: {tipo: 'blocco', codice: 'importo-non-in-tabella', decorrenza: alla, chiave: area, fonte: `nessuna indennità di comparto in vigore alla data (${scelto.id})`}};

  const addendi01: Addendo[] = [];
  for (const s of [tabellare, ...(incremento ? [incremento] : [])] as Scaglionamento[]) {
    const chiave = s.chiave === 'area' ? area : posizione;
    const importo = s.importi[chiave];
    if (!importo) return {blocco: {tipo: 'blocco', codice: 'importo-non-in-tabella', decorrenza: s.decorrenza, chiave, fonte: s.fonte}};
    addendi01.push({voce: '01', mese, importo: importo.mensile});
  }
  const differenziale = tabellare.chiave === 'area' ? trasposizione.differenzialeStorico.mensile : 0;
  const valori = {
    '01': addendi01.reduce((s, a) => s + a.importo, 0),
    '02': differenziale,
    '09': 0,
    '10': comparto.importi[area].mensile,
  };
  const addendo = (voce: VoceSostituita): Addendo[] => (valori[voce] !== 0 ? [{voce, mese, importo: valori[voce]}] : []);
  const sost = FONTI_MIGLIORAMENTO.sostituzione;
  return {
    valori,
    addendi: {'01': addendi01, '02': addendo('02'), '09': [], '10': addendo('10')},
    fonti: {
      '01': [tabellare.fonte, ...(incremento ? [incremento.fonte] : []), sost].join('; '),
      '02': `${trasposizione.differenzialeStorico.fonte ?? 'differenziale storico della trasposizione (parere ARAN 37607)'}; ${sost}`,
      '09': sost,
      '10': `${comparto.fonte}; ${sost}`,
    },
  };
}

/**
 * TFS migliorato (C21-8): mese per mese sui mesi del TFS ordinario, mai annualizzato; nei mesi con uno
 * scaglionamento del contratto in vigore le voci 01, 02, 09, 10 dalle tabelle al 1° del mese, negli altri
 * le voci come nel TFS ordinario (IVC dalla tabella, D8).
 */
function calcolaTfsMigliorato(mesi: MeseRetribuzione[], t: TabelleScelto): TfsMigliorato | {blocco: Blocco} {
  const perMese: {mese: string; addendiDi: (voce: CodiceVoce) => Addendo[]}[] = [];
  for (const m of mesi) {
    const primo = `${m.mese}-01`;
    const migliorato = t.scelto.scaglionamenti.some((s) => s.decorrenza <= primo && conta(t.scelto, s.decorrenza, t));
    const ordinarie = conIvcDaTabella(m.voci, m.mese, t.posizione, t.tabelle).voci;
    if (!migliorato) {
      perMese.push({mese: m.mese, addendiDi: (voce) => inserita(ordinarie, voce, m.mese)});
      continue;
    }
    const s = sostituite(primo, t);
    if ('blocco' in s) return s;
    perMese.push({mese: m.mese, addendiDi: (voce) => s.addendi[voce as VoceSostituita] ?? inserita(m.voci, voce, m.mese)});
  }
  const righe = righeTfs(perMese, [], t.tabelle, FONTI_MIGLIORAMENTO.tfs);
  return {dal: mesi[0].mese, al: mesi[mesi.length - 1].mese, righe, totale: totale(righe.map((r) => r.composizione))};
}

/** T4: pensione erogata diversa dallo Scenario A; per decorrenza, nessun miglioramento reale se migliorato ≤ erogata. */
function avvisiErogata(erogata: {fissi: Centesimi; tredicesima: Centesimi}, a: UmPensione, migliorati: UmMigliorato[]): Avviso[] {
  const fonte = FONTI_MIGLIORAMENTO.erogata;
  const avvisi: Avviso[] = [];
  if (erogata.fissi !== a.totaleAnnui || erogata.tredicesima !== tredicesima(a)) {
    avvisi.push({
      tipo: 'avviso',
      codice: 'pensione-erogata-diversa',
      fissi: erogata.fissi,
      tredicesima: erogata.tredicesima,
      ricalcolatoFissi: a.totaleAnnui,
      ricalcolato13: tredicesima(a),
      fonte,
    });
  }
  const totaleErogata = erogata.fissi + erogata.tredicesima;
  for (const b of migliorati) {
    if (b.totale <= totaleErogata) {
      avvisi.push({tipo: 'avviso', codice: 'nessun-miglioramento-reale', decorrenza: b.decorrenza, migliorato: b.totale, erogata: totaleErogata, fonte});
    }
  }
  return avvisi;
}
