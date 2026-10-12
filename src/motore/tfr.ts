// Ultimo miglio TFR (Circ. INPS 185/2021 §2.1; storie 42-43; decisioni D4, D8, D9, D10, D17 e C07-1…4
// del ticket 07). Interno al motore: lo chiama solo calcolaPratica.
import {componi} from './composizione';
import {conIvcDaTabella} from './contratti';
import {data, giornoDellaSettimana, giorniDelMese, leggiData, meseDi, spostaMese} from './date';
import type {
  Addendo,
  Avviso,
  CodiceVoce,
  DataISO,
  EstremoTfr,
  IdRigaTfr,
  MeseISO,
  MeseRetribuzione,
  RigaTfr,
  Tabelle,
  Tfr,
} from './tipi';

const FONTE_SOGLIA = 'Circ. INPS 185/2021 §2.1 ("almeno quindici giorni continuativi nel mese"); conteggio D10, giorni D9';
const FONTE_DECORRENZE =
  'Circ. INPS 185/2021 §2.1 lett. a) e b); economica al 1° del mese successivo se il primo mese non è utile (prassi APP, coerente con §2.1)';
const FONTE_MESE_PIENO =
  'Circ. INPS 185/2021 §2.1 e §2.2.1: voci utili al TFR del mese intero, rapportate al part-time (D4; C07-2)';
const FONTE_RATEO =
  'Circ. INPS 185/2021 §2.1, misura "parziale"; CCNL Funzioni Locali 2019-21 art. 75 c. 3 e 5: 365esimi dei giorni di servizio (C07-1)';
const FONTE_CASSA =
  'Circ. INPS 185/2021 §2.1: somma dei ratei di 13ª dei mesi precedenti la cessazione (arretrati per cassa fuori perimetro); CCNL Funzioni Locali 2019-21 art. 75 c. 3 e 5; mese per mese (C07-3)';
const FONTE_FUORI_FINESTRA =
  'C07-4; Circ. INPS 185/2021 §2.1: il rateo del mese iniziale va inserito, ma le voci di quel mese non sono nella pratica';

interface Ingresso {
  assunzione: DataISO;
  cessazione: DataISO;
  posizione: string;
  /** I mesi della finestra, già espansi. */
  mesi: MeseRetribuzione[];
  tabelle: Tabelle;
}

/** Calcola la sezione TFR; gli avvisi vanno nel risultato. */
export function calcolaTfr({assunzione, cessazione, posizione, mesi, tabelle}: Ingresso): {tfr: Tfr; avvisi: Avviso[]} {
  const avvisi: Avviso[] = [];
  const {giorni: sogliaGiorni, conteggio} = tabelle.parametri.sogliaGiorniTfr.valore;
  const soglia = {giorni: sogliaGiorni, conteggio, fonte: `${FONTE_SOGLIA}. ${tabelle.parametri.sogliaGiorniTfr.fonte}`};
  const divisoreRateo = tabelle.parametri.divisoreRateoTredicesima;

  // Voci del mese. Un'IVC inserita diversa da quella del contratto applicato non si somma: si usa la
  // tabella, con avviso (D8, storia 50). Un'IVC non inserita resta 0: il motore non aggiunge importi
  // (decisione del ticket 08; l'avviso sulle voci mancanti è del ticket 24).
  const ivcVista = new Set<MeseISO>();
  const vociDel = (mese: MeseISO): [CodiceVoce, number][] | undefined => {
    const m = mesi.find((x) => x.mese === mese);
    if (!m) return undefined;
    const {voci, avviso} = conIvcDaTabella(m.voci, mese, posizione, tabelle);
    if (avviso && !ivcVista.has(mese)) avvisi.push(avviso);
    ivcVista.add(mese);
    return Object.entries(voci).filter((e): e is [CodiceVoce, number] => e[1] !== undefined);
  };
  const percentualeDel = (mese: MeseISO) => mesi.find((x) => x.mese === mese)!.partTime.percentuale;

  const vociRiga = (id: IdRigaTfr) => tabelle.righeTfr.find((r) => r.id === id);
  const riga = (
    estremo: RigaTfr['estremo'],
    id: IdRigaTfr,
    termini: {mese: MeseISO; giorni?: number}[],
    fonte: string,
  ): RigaTfr | undefined => {
    const definizione = vociRiga(id);
    if (!definizione) return undefined;
    const addendi: Addendo[] = [];
    for (const {mese, giorni} of termini) {
      const percentuale = percentualeDel(mese);
      for (const [voce, importo] of vociDel(mese) ?? []) {
        if (!definizione.voci.includes(voce)) continue;
        addendi.push({voce, mese, importo, ...(percentuale !== 100 && {percentuale}), ...(giorni !== undefined && {giorni})});
      }
    }
    const operazioni = termini.some((t) => t.giorni !== undefined)
      ? [{tipo: 'dividi' as const, per: divisoreRateo.valore, motivo: 'rateo di 13ª in 365esimi di calendario', fonte: divisoreRateo.fonte}]
      : [];
    return {estremo, id, etichetta: definizione.etichetta, composizione: componi({addendi, operazioni, fonte})};
  };

  // Estremi: giorni continuativi nel mese, soglia, esito (C185 §2.1; D9, D10).
  const a = leggiData(assunzione)!;
  const c = leggiData(cessazione)!;
  const stessoMese = meseDi(assunzione) === meseDi(cessazione);
  const estremo = (quale: 'iniziale' | 'finale'): EstremoTfr => {
    const {anno, mese} = quale === 'iniziale' ? a : c;
    const dal = quale === 'iniziale' || stessoMese ? a.giorno : 1;
    const al = quale === 'finale' || stessoMese ? c.giorno : giorniDelMese(anno, mese);
    const meseIso = meseDi(data(anno, mese, 1));
    if (dal === 1 && al === giorniDelMese(anno, mese)) return {mese: meseIso, esito: 'intero'};
    let lavorativi = 0;
    for (let g = dal; g <= al; g++) if (giornoDellaSettimana(anno, mese, g) !== 0) lavorativi++;
    const calendario = al - dal + 1;
    const esitoCon = (n: number) => (n >= sogliaGiorni ? 'utile' : 'non-utile') as 'utile' | 'non-utile';
    const [usati, altri] = conteggio === 'lavorativi-lun-sab' ? [lavorativi, calendario] : [calendario, lavorativi];
    const esito = esitoCon(usati);
    if (esitoCon(altri) !== esito) {
      avvisi.push({
        tipo: 'avviso',
        codice: 'soglia-quindici-giorni-altra-regola',
        estremo: quale,
        mese: meseIso,
        lavorativiLunSab: lavorativi,
        calendario,
        esitoUsato: esito,
        esitoAltraRegola: esitoCon(altri),
        fonte: soglia.fonte,
      });
    }
    const giorni = {lavorativiLunSab: lavorativi, calendario};
    if (esito === 'non-utile') return {mese: meseIso, esito, giorni};
    const pagamentoTredicesima = quale === 'iniziale' && anno < c.anno ? 'dicembre' : 'cessazione';
    return {mese: meseIso, esito, giorni, pagamentoTredicesima, misura: 'parziale'};
  };

  const meseIniziale = estremo('iniziale');
  const meseFinale = estremo('finale');
  const righe: RigaTfr[] = [];
  const aggiungi = (r: RigaTfr | undefined) => r && righe.push(r);

  // Mese utile non intero: retribuzione del mese pieno (C07-2) e rateo in 365esimi dei giorni serviti (C07-1).
  const mesePieno = (quale: 'iniziale' | 'finale', e: EstremoTfr) => {
    if (e.esito !== 'utile' || !e.giorni) return;
    if (!mesi.some((m) => m.mese === e.mese)) {
      avvisi.push({
        tipo: 'avviso',
        codice: 'mese-iniziale-fuori-finestra',
        mese: e.mese,
        finestraDal: mesi[0]?.mese ?? e.mese,
        finestraAl: mesi.at(-1)?.mese ?? e.mese,
        fonte: FONTE_FUORI_FINESTRA,
      });
      return;
    }
    aggiungi(riga(quale, 'retribuzione-valutabile', [{mese: e.mese}], FONTE_MESE_PIENO));
    aggiungi(riga(quale, 'rateo-tredicesima-teorica', [{mese: e.mese, giorni: e.giorni.calendario}], FONTE_RATEO));
  };
  mesePieno('iniziale', meseIniziale);
  mesePieno('finale', meseFinale);

  // Cessazione in un mese non utile: ratei di 13ª dei mesi precedenti, dal 1/1 o dall'assunzione (C07-3).
  if (meseFinale.esito === 'non-utile') {
    const inizioAnno = `${c.anno}-01`;
    const primo = meseDi(assunzione) > inizioAnno ? meseDi(assunzione) : inizioAnno;
    const termini: {mese: MeseISO; giorni: number}[] = [];
    for (let m = primo; m < meseDi(cessazione); m = spostaMese(m, 1)) {
      const [anno, mese] = [Number(m.slice(0, 4)), Number(m.slice(5, 7))];
      const dal = m === meseDi(assunzione) ? a.giorno : 1;
      termini.push({mese: m, giorni: giorniDelMese(anno, mese) - dal + 1});
    }
    aggiungi(riga('finale', 'tredicesima-emolumenti-cassa', termini, FONTE_CASSA));
  }

  const decorrenzaEconomica =
    meseIniziale.esito === 'non-utile' ? `${spostaMese(meseDi(assunzione), 1)}-01` : assunzione;
  return {
    tfr: {
      decorrenzaGiuridica: assunzione,
      decorrenzaEconomica,
      dataCessazione: cessazione,
      soglia,
      meseIniziale,
      meseFinale,
      righe,
    },
    avvisi,
  };
}
