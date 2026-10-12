// Regole singole del miglioramento contrattuale con tabelle di fantasia minime (ADR 0003, C21-5…C21-8).
// I casi con le tabelle vere stanno in src/casi-normativi/miglioramento-motore.test.ts.
// Importi attesi calcolati a mano dalle tabelle qui sotto.
import {describe, expect, it} from 'vitest';
import {pratica, tabelleDiProva} from './fixture';
import {calcolaPratica} from './index';
import type {Contratto, ContrattoDefinitivo, DatiPraticaPensione, Miglioramento, Risultato, Tabelle, VoceCatalogo} from './index';

const voce = (codice: string, tfs: boolean, tredicesima: boolean): VoceCatalogo => ({
  codice,
  descrizione: `voce ${codice}`,
  mensilita: 12,
  utile: {pensione: true, tredicesima, tfs, tfr: tfs},
  dal: '2019-01-01',
  fonte: 'prova',
});
const riga = (id: string, voci: string[]) => ({id, etichetta: `Riga ${id}`, voci, fonte: 'prova'});

// Contratti di fantasia:
// - vecchio: firmato prima, tabellare per posizione dal 2019 (C5 1.000,00), comparto 40,00 dal 2019; un
//   incremento per area e un comparto 45,00 dal 01/01/2021, dopo le cessazioni dei casi: non contano (solo ≤ cessazione).
// - nuovo: vigenza 2020-2021 firmato il 01/06/2023; incremento per posizione 10,00 dal 01/04/2020, tabellare
//   per area 1.100,00 dal 01/01/2021, 1.200,00 dal 01/01/2022 (fuori vigenza: non conta, C21-6); IVC 2020 8,00.
// - x: ipotesi 2022-2024.
const vecchio: ContrattoDefinitivo = {
  id: 'vecchio',
  nome: 'Vecchio',
  stato: 'definitivo',
  firma: '2018-12-01',
  vigenza: {dal: '2016-01-01', al: '2019-12-31'},
  fonte: 'prova',
  scaglionamenti: [
    {decorrenza: '2019-01-01', chiave: 'posizione', tipo: 'tabellare', importi: {C5: {mensile: 100000}, C1: {mensile: 90000}}, fonte: 'fonte tabellare vecchio'},
    {decorrenza: '2021-01-01', chiave: 'area', tipo: 'incremento', importi: {istruttori: {mensile: 5000}}, fonte: 'fonte incremento tardivo'},
  ],
  ivc: [],
  indennitaComparto: [
    {
      decorrenza: '2019-01-01',
      importi: {'funzionari-eq': {mensile: 5000}, istruttori: {mensile: 4000}, 'operatori-esperti': {mensile: 3000}, operatori: {mensile: 2000}},
      fonte: 'fonte comparto',
    },
    {
      decorrenza: '2021-01-01',
      importi: {'funzionari-eq': {mensile: 5500}, istruttori: {mensile: 4500}, 'operatori-esperti': {mensile: 3500}, operatori: {mensile: 2500}},
      fonte: 'comparto tardivo',
    },
  ],
};
const nuovo: ContrattoDefinitivo = {
  id: 'nuovo',
  nome: 'Nuovo',
  stato: 'definitivo',
  firma: '2023-06-01',
  vigenza: {dal: '2020-01-01', al: '2021-12-31'},
  fonte: 'prova',
  scaglionamenti: [
    {decorrenza: '2020-04-01', chiave: 'posizione', tipo: 'incremento', importi: {C5: {mensile: 1000}}, fonte: 'fonte incremento nuovo'},
    {decorrenza: '2021-01-01', chiave: 'area', tipo: 'tabellare', importi: {istruttori: {mensile: 110000}}, fonte: 'fonte tabellare nuovo'},
    {decorrenza: '2022-01-01', chiave: 'area', tipo: 'tabellare', importi: {istruttori: {mensile: 120000}}, fonte: 'fuori vigenza'},
  ],
  ivc: [{dal: '2020-01-01', al: '2020-12-31', chiave: 'posizione', percentuale: 0.8, anticipa: 'nuovo', importi: {C5: {mensile: 800}}, fonte: 'prova'}],
  indennitaComparto: [],
};
const ipotesiX: Contratto = {
  id: 'x',
  nome: 'X',
  stato: 'ipotesi',
  firma: '2026-07-01',
  vigenza: {dal: '2022-01-01', al: '2024-12-31'},
  fonte: 'prova',
  proposta: {scaglionamenti: [], indennitaComparto: []},
};

const tabelle: Tabelle = {
  ...tabelleDiProva,
  catalogoVoci: [voce('01', true, true), voce('02', true, true), voce('06', true, true), voce('09', true, true), voce('10', false, false)],
  contratti: [vecchio, nuovo, ipotesiX],
  trasposizione: ['C5', 'C1'].map((posizione) => ({
    posizione,
    area: 'istruttori' as const,
    ingresso: 'C1',
    differenzialeBase: 5000,
    differenzialeStorico: {mensile: 6000, fonte: 'fonte differenziale'},
  })),
  righePassweb: {
    ...tabelleDiProva.righePassweb,
    pensione: {
      righe: ['01', '02', '06', '09', '10'].map((v) => riga(`voce-${v}`, [v])),
      tredicesima: riga('tredicesima', ['01', '02', '06', '09']),
    },
    tfs: [riga('tab-e', ['01', '09']), riga('ria', ['06']), riga('tredicesima', ['01', '02', '06', '09']), riga('differenziali', ['02'])],
  },
};

const VOCI = {'01': 100000, '06': 2000, '09': 800, '10': 4000};

const pensione = (
  modifica: Partial<DatiPraticaPensione> = {},
  anagrafica: Partial<DatiPraticaPensione['anagrafica']> = {},
): DatiPraticaPensione => ({
  ...pratica({voci: {base: VOCI, eccezioni: {'2019-12': {'09': 0}}}}),
  regime: 'TFS',
  situazione: {tipo: 'ordinaria'},
  miglioramento: {contratto: 'nuovo'},
  ...modifica,
  anagrafica: {...pratica().anagrafica, cessazione: '2020-11-30', ...anagrafica},
});

const sezione = (r: Risultato) => {
  const s = r.sezioni.miglioramento;
  if (!s) throw new Error('sezione miglioramento assente');
  return s;
};
const definitivo = (r: Risultato): Extract<Miglioramento, {stato: 'definitivo'}> => {
  const s = sezione(r);
  if (s.esito !== 'calcolata' || s.stato !== 'definitivo') throw new Error(`miglioramento non calcolato: ${JSON.stringify(s)}`);
  return s;
};
const righe = (um: {righe: {voce: string; composizione: {arrotondato: number}}[]}) =>
  Object.fromEntries(um.righe.map((r) => [r.voce, r.composizione.arrotondato]));
const codici = (r: Risultato) => r.avvisi.map((a) => a.codice);

describe('miglioramento contrattuale: applicabilità e proposta dalla tabella dei contratti (C21-5)', () => {
  it('senza miglioramento nei dati nessuna sezione; la proposta c\'è se la cessazione cade in vacanza contrattuale', () => {
    const r = calcolaPratica({...pensione(), miglioramento: undefined}, tabelle);
    expect(r.sezioni.miglioramento).toBeUndefined();
    expect(r.miglioramentoProposto).toBe('nuovo');
  });

  it('proposta: il contratto (anche un\'ipotesi) nella cui vigenza cade la cessazione, firmato dopo; nessuno altrimenti', () => {
    expect(calcolaPratica(pensione({}, {cessazione: '2023-05-31'}), tabelle).miglioramentoProposto).toBe('x');
    expect(calcolaPratica(pensione({}, {cessazione: '2025-03-31'}), tabelle).miglioramentoProposto).toBeUndefined();
    // Vecchio: cessazione nella vigenza ma firmato prima.
    expect(calcolaPratica(pensione({}, {cessazione: '2019-06-30'}), tabelle).miglioramentoProposto).toBeUndefined();
    // Pratica di cessazione: nessuna proposta.
    expect(calcolaPratica(pratica(), tabelle).miglioramentoProposto).toBeUndefined();
  });

  it('cessazione prima della vigenza → blocco miglioramento-non-applicabile; le altre sezioni si calcolano', () => {
    const r = calcolaPratica(pensione({}, {cessazione: '2019-06-30'}), tabelle);
    const blocco = {
      tipo: 'blocco',
      codice: 'miglioramento-non-applicabile',
      contratto: 'nuovo',
      vigenzaDal: '2020-01-01',
      vigenzaAl: '2021-12-31',
      firma: '2023-06-01',
      cessazione: '2019-06-30',
      fonte: expect.stringContaining('C21-5'),
    };
    expect(sezione(r)).toEqual({esito: 'bloccata', motivi: [blocco]});
    expect(r.blocchi).toEqual([blocco]);
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
    expect(r.sezioni.tfs?.esito).toBe('calcolata');
  });

  it('contratto firmato prima della cessazione → blocco miglioramento-non-applicabile', () => {
    const r = calcolaPratica(pensione({miglioramento: {contratto: 'vecchio'}}, {cessazione: '2019-06-30'}), tabelle);
    expect(sezione(r)).toMatchObject({esito: 'bloccata', motivi: [{codice: 'miglioramento-non-applicabile', firma: '2018-12-01'}]});
  });

  it('contratto inesistente → blocco contratto-inesistente', () => {
    const r = calcolaPratica(pensione({miglioramento: {contratto: 'boh'}}), tabelle);
    expect(sezione(r)).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'contratto-inesistente', contratto: 'boh'}]});
  });

  it('i blocchi della pratica fermano anche il miglioramento (cessazione mancante, posizione non valida)', () => {
    expect(sezione(calcolaPratica(pensione({}, {cessazione: undefined}), tabelle))).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'cessazione-mancante'}],
    });
    expect(sezione(calcolaPratica(pensione({}, {posizione: 'Z9'}), tabelle))).toMatchObject({esito: 'bloccata', motivi: [{codice: 'posizione-non-valida'}]});
  });

  it('ipotesi → senza importi, avviso contratto-in-ipotesi una volta sola (T5)', () => {
    const r = calcolaPratica(pensione({miglioramento: {contratto: 'x'}}, {cessazione: '2023-05-31'}), tabelle);
    expect(sezione(r)).toEqual({esito: 'calcolata', contratto: 'x', stato: 'ipotesi'});
    // La pensione cade già nella vigenza di x: l'avviso dell'UM ordinario basta.
    expect(r.avvisi.filter((a) => a.codice === 'contratto-in-ipotesi')).toEqual([expect.objectContaining({contratto: 'x', vigenzaDal: '2022-01-01'})]);
  });

  it('ipotesi con la pensione fuori dalla sua vigenza (sospensione cautelare): l\'avviso lo dà il miglioramento', () => {
    const r = calcolaPratica(
      pensione({miglioramento: {contratto: 'x'}, situazione: {tipo: 'sospensione-cautelare', dal: '2021-12-01'}}, {cessazione: '2023-05-31'}),
      tabelle,
    );
    expect(r.avvisi.filter((a) => a.codice === 'contratto-in-ipotesi')).toEqual([expect.objectContaining({contratto: 'x', fonte: expect.stringContaining('C21-5')})]);
  });
});

describe('miglioramento contrattuale: pensione (C21-6, C21-7)', () => {
  it('Scenario A = voci inserite così come sono, IVC compresa', () => {
    const {scenarioA} = definitivo(calcolaPratica(pensione(), tabelle));
    expect(scenarioA.mese).toBe('2020-11');
    expect(righe(scenarioA)).toEqual({'01': 1200000, '06': 24000, '09': 9600, '10': 48000});
    expect(scenarioA.totaleAnnui).toBe(1281600);
    expect(scenarioA.tredicesima.composizione.arrotondato).toBe(102800);
  });

  it('un UM per decorrenza: il giorno dopo la pensione, poi gli scaglionamenti successivi nella vigenza (non il 2022)', () => {
    const m = definitivo(calcolaPratica(pensione(), tabelle));
    expect(m.migliorati.map((b) => b.decorrenza)).toEqual(['2020-12-01', '2021-01-01']);
  });

  it('01 = tabellare + incremento successivo, 02 = 0 col tabellare per posizione, 09 = 0, 10 dalle tabelle; differenza su A', () => {
    const [primo] = definitivo(calcolaPratica(pensione(), tabelle)).migliorati;
    expect(primo.sostituite).toEqual({'01': 101000, '02': 0, '09': 0, '10': 4000});
    expect(righe(primo)).toEqual({'01': 1212000, '06': 24000, '10': 48000});
    expect(primo.totaleAnnui).toBe(1284000);
    expect(primo.tredicesima.composizione.arrotondato).toBe(103000);
    expect(primo.differenza).toEqual({annui: 2400, tredicesima: 200});
    const r01 = primo.righe.find((r) => r.voce === '01')!.composizione;
    expect(r01.addendi.map((a) => [a.mese, a.importo])).toEqual([['2020-12', 100000], ['2020-12', 1000]]);
    expect(r01.fonte).toContain('fonte tabellare vecchio');
    expect(r01.fonte).toContain('fonte incremento nuovo');
    expect(r01.fonte).toContain('C21-7');
  });

  it('tabellare per area: 02 = differenziale storico; gli scaglionamenti degli altri contratti dopo la cessazione non contano', () => {
    const [, secondo] = definitivo(calcolaPratica(pensione(), tabelle)).migliorati;
    // L'incremento (+50,00) e il comparto (45,00) del vecchio dal 01/01/2021 sono dopo la cessazione: esclusi.
    expect(secondo.sostituite).toEqual({'01': 110000, '02': 6000, '09': 0, '10': 4000});
    expect(righe(secondo)).toEqual({'01': 1320000, '02': 72000, '06': 24000, '10': 48000});
    expect(secondo.totale).toBe(1464000 + 118000);
  });

  it('cessazione al 31/12 con uno scaglionamento al 01/01: una sola decorrenza', () => {
    const m = definitivo(calcolaPratica(pensione({}, {cessazione: '2020-12-31'}), tabelle));
    expect(m.migliorati.map((b) => b.decorrenza)).toEqual(['2021-01-01']);
  });

  it('situazione: Scenario A sul mese della data di pensione, primo migliorato il giorno dopo (decisione 3)', () => {
    const m = definitivo(calcolaPratica(pensione({situazione: {tipo: 'sospensione-cautelare', dal: '2020-10-01'}}), tabelle));
    expect(m.scenarioA.mese).toBe('2020-09');
    expect(m.migliorati.map((b) => b.decorrenza)).toEqual(['2020-10-01', '2021-01-01']);
  });

  it('importo che manca in tabella per la chiave → blocco importo-non-in-tabella (decisione 5)', () => {
    const r = calcolaPratica(pensione({}, {posizione: 'C1'}), {...tabelle, posizioni: [...tabelle.posizioni, 'C1']});
    expect(sezione(r)).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'importo-non-in-tabella', decorrenza: '2020-04-01', chiave: 'C1', fonte: 'fonte incremento nuovo'}],
    });
  });

  it('un contratto aggiunto come dato cambia il comportamento senza toccare il codice (ADR 0003)', () => {
    const firmata: ContrattoDefinitivo = {
      ...ipotesiX,
      stato: 'definitivo',
      scaglionamenti: [
        {decorrenza: '2023-01-01', chiave: 'area', tipo: 'tabellare', importi: {istruttori: {mensile: 130000}}, fonte: 'x firmato'},
        {decorrenza: '2024-01-01', chiave: 'area', tipo: 'tabellare', importi: {istruttori: {mensile: 140000}}, fonte: 'x firmato'},
      ],
      ivc: [],
      indennitaComparto: [],
    };
    const dati = pensione({miglioramento: {contratto: 'x'}}, {cessazione: '2023-05-31'});
    expect(sezione(calcolaPratica(dati, tabelle))).toMatchObject({stato: 'ipotesi'});
    const m = definitivo(calcolaPratica(dati, {...tabelle, contratti: [vecchio, nuovo, firmata]}));
    expect(m.migliorati.map((b) => [b.decorrenza, b.sostituite['01'], b.sostituite['02']])).toEqual([
      ['2023-06-01', 130000, 6000],
      ['2024-01-01', 140000, 6000],
    ]);
  });
});

describe('miglioramento contrattuale: pensione erogata (T4)', () => {
  const A = {fissi: 1281600, tredicesima: 102800};

  it('pensione erogata non inserita → nessun avviso di confronto', () => {
    const r = calcolaPratica(pensione(), tabelle);
    expect(codici(r)).not.toContain('pensione-erogata-diversa');
    expect(codici(r)).not.toContain('nessun-miglioramento-reale');
  });

  it('erogata uguale ad A e inferiore ai migliorati → nessun avviso', () => {
    const r = calcolaPratica(pensione({pensioneErogata: A}), tabelle);
    expect(codici(r)).not.toContain('pensione-erogata-diversa');
    expect(codici(r)).not.toContain('nessun-miglioramento-reale');
  });

  it('erogata con i fissi di A e una 13ª diversa → avviso pensione-erogata-diversa', () => {
    const r = calcolaPratica(pensione({pensioneErogata: {...A, tredicesima: A.tredicesima + 1}}), tabelle);
    expect(codici(r)).toContain('pensione-erogata-diversa');
  });

  it('erogata diversa da A → avviso; nessun miglioramento reale per ogni decorrenza che non la supera (anche se uguale)', () => {
    // Totale del primo migliorato: 12.840,00 + 1.030,00 = 13.870,00.
    const erogata = {fissi: 1284000, tredicesima: 103000};
    const r = calcolaPratica(pensione({pensioneErogata: erogata}), tabelle);
    const avvisi = r.avvisi.filter((a) => a.codice === 'pensione-erogata-diversa' || a.codice === 'nessun-miglioramento-reale');
    expect(avvisi).toEqual([
      {tipo: 'avviso', codice: 'pensione-erogata-diversa', ...erogata, ricalcolatoFissi: A.fissi, ricalcolato13: A.tredicesima, fonte: expect.stringContaining('T4')},
      {tipo: 'avviso', codice: 'nessun-miglioramento-reale', decorrenza: '2020-12-01', migliorato: 1387000, erogata: 1387000, fonte: expect.stringContaining('T4')},
    ]);
  });
});

describe('miglioramento contrattuale: TFS mese per mese (C21-8), TFR mai', () => {
  it('mesi prima del primo scaglionamento come nel TFS ordinario, poi voci dalle tabelle al 1° del mese; mai annualizzato', () => {
    const {tfs} = definitivo(calcolaPratica(pensione({voci: {base: VOCI, eccezioni: {}}}), tabelle));
    expect({dal: tfs!.dal, al: tfs!.al}).toEqual({dal: '2019-12', al: '2020-11'});
    // TAB E = 4 × 1.000,00 + 8 × 1.010,00; 13ª = (12.080,00 + 240,00) / 12.
    expect(Object.fromEntries(tfs!.righe.map((r) => [r.id, r.composizione.arrotondato]))).toEqual({'tab-e': 1208000, ria: 24000, tredicesima: 102667, differenziali: 0});
    expect(tfs!.totale).toBe(1334667);
    expect(tfs!.righe[0].composizione.operazioni).toEqual([]);
  });

  it('diverso dal TFS ordinario → avviso tfs-da-modificare con le righe che cambiano', () => {
    const r = calcolaPratica(pensione(), tabelle);
    expect(r.avvisi.filter((a) => a.codice === 'tfs-da-modificare')).toEqual([
      {tipo: 'avviso', codice: 'tfs-da-modificare', righe: ['tab-e', 'tredicesima'], fonte: expect.stringContaining('C21-8')},
    ]);
  });

  it('uguale al TFS ordinario → nessun avviso', () => {
    const eccezioni = Object.fromEntries(['2020-04', '2020-05', '2020-06', '2020-07', '2020-08', '2020-09', '2020-10', '2020-11'].map((m) => [m, {'01': 101000}]));
    const r = calcolaPratica(pensione({voci: {base: {'01': 100000, '06': 2000, '10': 4000}, eccezioni}}), tabelle);
    expect(definitivo(r).tfs?.totale).toBe(1334667);
    expect(codici(r)).not.toContain('tfs-da-modificare');
  });

  it('regime TFR: nessun TFS e nessun TFR di miglioramento; la sezione TFR resta quella ordinaria', () => {
    const r = calcolaPratica(pensione({regime: 'TFR'}), tabelle);
    const m = definitivo(r);
    expect(m.tfs).toBeUndefined();
    expect(Object.keys(m).sort()).toEqual(['contratto', 'esito', 'migliorati', 'scenarioA', 'stato']);
    expect(r.sezioni.tfs).toBeUndefined();
    expect(codici(r)).not.toContain('tfs-da-modificare');
  });
});
