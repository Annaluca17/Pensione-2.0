// Regole singole dell'UM pensione e della pratica di pensione con tabelle di fantasia minime (spec
// "Testing Decisions"). I casi con le tabelle vere stanno in src/casi-normativi.
import {describe, expect, it} from 'vitest';
import {pratica, tabelleDiProva} from './fixture';
import {conIvcDaTabella} from './contratti';
import {calcolaPratica} from './index';
import type {DatiPraticaPensione, Risultato, Situazione, Tabelle, UmPensione, VoceCatalogo} from './index';

const voce = (codice: string, mensilita: 10 | 12, tredicesima: boolean): VoceCatalogo => ({
  codice,
  descrizione: `voce ${codice}`,
  mensilita,
  utile: {pensione: true, tredicesima, tfs: false, tfr: false},
  dal: '2019-01-01',
  fonte: 'prova',
});

const tabelle: Tabelle = {
  ...tabelleDiProva,
  catalogoVoci: [voce('01', 12, true), voce('09', 12, true), voce('10', 12, false), voce('14', 10, false)],
  righeTfr: [{id: 'retribuzione-valutabile', etichetta: 'Mese pieno', voci: ['01', '09'], fonte: 'prova'}],
  righePassweb: {
    ...tabelleDiProva.righePassweb,
    pensione: {
      righe: ['01', '09', '10', '14'].map((v) => ({id: `voce-${v}`, etichetta: `Voce ${v}`, voci: [v], fonte: 'prova'})),
      tredicesima: {id: 'tredicesima', etichetta: '13ª', voci: ['01', '09'], fonte: 'prova'},
    },
  },
};

const pensione = (
  modifica: Partial<DatiPraticaPensione> = {},
  anagrafica: Partial<DatiPraticaPensione['anagrafica']> = {},
): DatiPraticaPensione => {
  const base = pratica({voci: {base: {'01': 200000, '10': 5000, '14': 9000}, eccezioni: {}}});
  return {
    ...base,
    regime: 'TFS',
    situazione: {tipo: 'ordinaria'},
    ...modifica,
    anagrafica: {...base.anagrafica, assunzione: '2001-03-01', cessazione: '2024-11-30', ...anagrafica},
  };
};

const umPensione = (r: Risultato): UmPensione => {
  const s = r.sezioni.umPensione;
  if (s?.esito !== 'calcolata') throw new Error(`UM pensione non calcolata: ${JSON.stringify(s)}`);
  return s;
};

describe('regime di fine servizio: TFS oppure TFR (ADR 0002, spec "Motore")', () => {
  it('pratica di pensione in regime TFS: UM pensione sì, sezione TFR assente', () => {
    const r = calcolaPratica(pensione({regime: 'TFS'}), tabelle);
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
    expect(r.sezioni).not.toHaveProperty('tfr');
  });

  it('pratica di pensione in regime TFR: UM pensione e sezione TFR', () => {
    const r = calcolaPratica(pensione({regime: 'TFR'}), tabelle);
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
    expect(r.sezioni.tfr?.esito).toBe('calcolata');
  });

  it('pratica di cessazione: solo TFR, nessuna UM pensione', () => {
    const r = calcolaPratica(pratica(), tabelle);
    expect(r.sezioni).not.toHaveProperty('umPensione');
    expect(r.sezioni.tfr?.esito).toBe('calcolata');
  });

  it('optante TFR in regime TFR: sezione TFR bloccata "situazione non gestita", la pensione si calcola', () => {
    const situazione: Situazione = {tipo: 'optante-tfr', dal: '2024-07-01'};
    const r = calcolaPratica(pensione({regime: 'TFR', situazione}), tabelle);
    expect(r.sezioni.tfr).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'situazione-non-gestita', situazione: 'optante-tfr', regime: 'TFR'}]});
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
  });
});

describe('date di riferimento proposte dalla situazione (D19, C20-1)', () => {
  const date = (situazione: Situazione) => {
    const r = calcolaPratica(pensione({situazione}), tabelle);
    return [r.dateRiferimento?.pensione.proposto, r.dateRiferimento?.fineServizio.proposto];
  };

  it('ordinaria: entrambe alla cessazione', () => {
    expect(date({tipo: 'ordinaria'})).toEqual(['2024-11-30', '2024-11-30']);
  });

  it('sospensione cautelare e trattenuta per malattia: entrambe al giorno prima di "dal"', () => {
    expect(date({tipo: 'sospensione-cautelare', dal: '2024-10-16'})).toEqual(['2024-10-15', '2024-10-15']);
    expect(date({tipo: 'trattenuta-malattia', dal: '2024-09-01'})).toEqual(['2024-08-31', '2024-08-31']);
  });

  it('congedo L. 104 e optante TFR: pensione alla cessazione, fine servizio al giorno prima di "dal"', () => {
    expect(date({tipo: 'congedo-104', dal: '2024-07-01'})).toEqual(['2024-11-30', '2024-06-30']);
    expect(date({tipo: 'optante-tfr', dal: '2024-03-01'})).toEqual(['2024-11-30', '2024-02-29']);
  });

  it('le date proposte restano forzabili', () => {
    const r = calcolaPratica(
      pensione({situazione: {tipo: 'sospensione-cautelare', dal: '2024-10-16'}, forzature: {dataRiferimentoPensione: '2024-09-30'}}),
      tabelle,
    );
    expect(r.dateRiferimento?.pensione).toEqual({proposto: '2024-10-15', usato: '2024-09-30', forzato: '2024-09-30'});
    expect(umPensione(r).mese).toBe('2024-09');
  });

  it('la pensione prende le voci del suo mese, anche dopo la fine del TFS, senza avviso di eccezioni fuori periodo (C20-2)', () => {
    const r = calcolaPratica(
      pensione({
        situazione: {tipo: 'congedo-104', dal: '2024-07-01'},
        voci: {base: {'01': 200000}, eccezioni: {'2024-11': {'01': 210000}}},
      }),
      tabelle,
    );
    expect(umPensione(r).righe[0].composizione.addendi).toEqual([{voce: '01', mese: '2024-11', importo: 210000}]);
    expect(r.avvisi).toEqual([]);
  });

  it('"dal" non valido o fuori dal rapporto: blocco su pensione e fine servizio, il mese parziale si calcola', () => {
    const non = calcolaPratica(pensione({situazione: {tipo: 'congedo-104', dal: '2024-02-30'}}), tabelle);
    expect(non.sezioni.umPensione).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'data-non-valida', campo: 'situazione', valore: '2024-02-30'}],
    });
    expect(non.sezioni.retribuzione.esito).toBe('bloccata');
    expect(non.sezioni.meseParziale.esito).toBe('calcolata');

    const dopo = calcolaPratica(pensione({situazione: {tipo: 'sospensione-cautelare', dal: '2024-12-01'}}), tabelle);
    expect(dopo.blocchi).toEqual([
      {tipo: 'blocco', codice: 'date-incoerenti', campo: 'situazione', data: '2024-12-01', regola: 'non-dopo', rispetto: 'cessazione', dataRispetto: '2024-11-30'},
    ]);
    const prima = calcolaPratica(pensione({situazione: {tipo: 'trattenuta-malattia', dal: '2001-02-15'}}), tabelle);
    expect(prima.blocchi).toEqual([
      {tipo: 'blocco', codice: 'date-incoerenti', campo: 'situazione', data: '2001-02-15', regola: 'non-prima-di', rispetto: 'assunzione', dataRispetto: '2001-03-01'},
    ]);
  });
});

describe('UM pensione sul mese della data di riferimento (storia 39)', () => {
  it('mensile × 12, × 10 per le voci a 10 mensilità; 13ª dai mensili delle voci con 13ª', () => {
    const um = umPensione(calcolaPratica(pensione(), tabelle));
    expect(um.righe.map((x) => [x.voce, x.composizione.arrotondato])).toEqual([
      ['01', 2400000],
      ['10', 60000],
      ['14', 90000],
    ]);
    expect(um.tredicesima.composizione.arrotondato).toBe(200000);
    expect([um.totaleAnnui, um.totale]).toEqual([2550000, 2750000]);
  });

  it('voci intere anche per i part-time (D4)', () => {
    const um = umPensione(calcolaPratica(pensione({partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {}}}), tabelle));
    expect(um.righe[0].composizione.arrotondato).toBe(2400000);
  });
});

// Contratti di fantasia: A (2019-21) e B (2022-24) definitivi, C (2025-27) ipotesi. L'IVC 2023 anticipa B
// (riassorbita, vale 0); l'IVC 2025 anticipa C, che non è definitivo (vale).
const importi = (mensile: number) => ({'C5': {mensile}});
const contratti: Tabelle['contratti'] = [
  {id: 'a', nome: 'A', stato: 'definitivo', firma: '2022-01-01', vigenza: {dal: '2019-01-01', al: '2021-12-31'}, fonte: 'prova', scaglionamenti: [], ivc: [], indennitaComparto: []},
  {
    id: 'b',
    nome: 'B',
    stato: 'definitivo',
    firma: '2026-02-01',
    vigenza: {dal: '2022-01-01', al: '2024-12-31'},
    fonte: 'prova',
    scaglionamenti: [],
    ivc: [
      {dal: '2023-01-01', al: '2024-12-31', chiave: 'posizione', percentuale: 0.5, anticipa: 'b', importi: importi(1000), fonte: 'prova'},
      {dal: '2025-04-01', chiave: 'posizione', percentuale: 1, anticipa: 'c', importi: importi(1500), fonte: 'prova'},
    ],
    indennitaComparto: [],
  },
  {id: 'c', nome: 'C', stato: 'ipotesi', firma: '2026-07-01', vigenza: {dal: '2025-01-01', al: '2027-12-31'}, fonte: 'prova', proposta: {scaglionamenti: [], indennitaComparto: []}},
];
const conContratti: Tabelle = {...tabelle, contratti};
const conIvc = (cessazione: string, ivc?: number) =>
  pensione({voci: {base: {'01': 200000, ...(ivc !== undefined && {'09': ivc})}, eccezioni: {}}}, {cessazione});

/** Gli avvisi della pensione: il regime TFS con la sola base aggiunge `tfs-annualizzato` (ticket 25). */
const avvisiPensione = (r: Risultato) => r.avvisi.filter((a) => a.codice !== 'tfs-annualizzato');

describe('IVC del mese della pensione (D8, T6, storie 49-50)', () => {
  it('riassorbita: col contratto definitivo che anticipa vale 0, l\'IVC inserita non si somma e dà avviso', () => {
    const r = calcolaPratica(conIvc('2023-06-30', 1000), conContratti);
    const um = umPensione(r);
    expect(um.righe.map((x) => x.voce)).toEqual(['01']);
    expect(um.tredicesima.composizione.arrotondato).toBe(200000);
    expect(avvisiPensione(r)).toEqual([
      expect.objectContaining({codice: 'ivc-incompatibile', mese: '2023-06', inserita: 1000, daTabella: 0, contrattoApplicato: 'b'}),
    ]);
  });

  it('ultimo contratto definitivo: vale solo l\'IVC del contratto successivo non definitivo', () => {
    const r = calcolaPratica(conIvc('2025-06-30', 1500), conContratti);
    const um = umPensione(r);
    expect(um.righe.find((x) => x.voce === '09')?.composizione.arrotondato).toBe(18000);
    expect(um.tredicesima.composizione.arrotondato).toBe(201500);
    expect(r.avvisi.filter((a) => a.codice === 'ivc-incompatibile')).toEqual([]);
  });

  it('IVC inserita diversa dalla tabella: riga col valore della tabella e avviso', () => {
    const r = calcolaPratica(conIvc('2025-06-30', 1200), conContratti);
    expect(umPensione(r).righe.find((x) => x.voce === '09')?.composizione.addendi).toEqual([{voce: '09', mese: '2025-06', importo: 1500}]);
    expect(r.avvisi).toContainEqual(expect.objectContaining({codice: 'ivc-incompatibile', inserita: 1200, daTabella: 1500, contrattoApplicato: 'b'}));
  });

  it('IVC non inserita: nessuna riga, il motore non aggiunge importi (ticket 08)', () => {
    const r = calcolaPratica(conIvc('2025-06-30'), conContratti);
    expect(umPensione(r).righe.map((x) => x.voce)).toEqual(['01']);
  });

  it('col miglioramento (firmatiEntro = cessazione) il contratto firmato dopo non conta: la IVC inserita vale, senza avviso (ticket 01)', () => {
    const {voci, avviso} = conIvcDaTabella({'09': 1000}, '2023-06', 'C5', conContratti, '2023-06-30');
    expect(voci['09']).toBe(1000);
    expect(avviso).toBeUndefined();
  });

  it('firmatiEntro dopo la firma di B: la riassorbita torna a 0 e dà avviso', () => {
    const {voci, avviso} = conIvcDaTabella({'09': 1000}, '2023-06', 'C5', conContratti, '2026-03-01');
    expect(voci['09']).toBe(0);
    expect(avviso).toEqual(expect.objectContaining({codice: 'ivc-incompatibile', daTabella: 0, contrattoApplicato: 'b'}));
  });
});

describe('IVC letta da pensione e TFR nello stesso mese', () => {
  it('regime TFR: un solo avviso IVC per mese', () => {
    // Martedì 20/06/2023: 17 giorni lavorativi, mese utile → il TFR legge le voci di giugno.
    const r = calcolaPratica({...conIvc('2023-06-20', 1000), regime: 'TFR'}, conContratti);
    const tfr = r.sezioni.tfr;
    expect(tfr?.esito === 'calcolata' && tfr.righe.map((x) => x.id)).toContain('retribuzione-valutabile');
    expect(r.avvisi.filter((a) => a.codice === 'ivc-incompatibile')).toHaveLength(1);
  });
});

describe('contratto in ipotesi (T5)', () => {
  // L'ipotesi C propone un tabellare: non deve produrre importi.
  const conProposta: Tabelle = {
    ...conContratti,
    contratti: conContratti.contratti.map((c) =>
      c.stato === 'ipotesi'
        ? {...c, proposta: {...c.proposta, scaglionamenti: [{decorrenza: '2025-01-01', chiave: 'posizione', tipo: 'tabellare', importi: importi(999999), fonte: 'prova'}]}}
        : c,
    ),
  };

  it('pensione nella vigenza di un\'ipotesi: avviso, e gli importi restano quelli delle voci', () => {
    const r = calcolaPratica(conIvc('2025-06-30'), conProposta);
    expect(avvisiPensione(r)).toEqual([
      {tipo: 'avviso', codice: 'contratto-in-ipotesi', contratto: 'c', vigenzaDal: '2025-01-01', fonte: expect.stringContaining('T5')},
    ]);
    expect(umPensione(r).righe.map((x) => [x.voce, x.composizione.arrotondato])).toEqual([['01', 2400000]]);
  });

  it('fuori dalla vigenza dell\'ipotesi nessun avviso', () => {
    expect(avvisiPensione(calcolaPratica(conIvc('2024-11-30'), conProposta))).toEqual([]);
  });

  it('la pratica di cessazione non ha l\'avviso (deciso nel ticket 23)', () => {
    const r = calcolaPratica(pratica({voci: {base: {'01': 200000}, eccezioni: {}}}), conProposta);
    expect(r.avvisi.filter((a) => a.codice === 'contratto-in-ipotesi')).toEqual([]);
  });
});

describe('UM pensione bloccata (storie 36, 57)', () => {
  it('cessazione mancante: UM pensione bloccata, il risultato porta l\'id delle tabelle', () => {
    const r = calcolaPratica(pensione({}, {cessazione: undefined}), tabelle);
    expect(r.versioneTabelle).toBe(tabelle.versione);
    expect(r.sezioni.umPensione).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'cessazione-mancante'}]});
  });

  it('cessazione prima del 01/01/2019: tabelle non disponibili', () => {
    const r = calcolaPratica(pensione({}, {cessazione: '2018-12-31'}), tabelle);
    expect(r.sezioni.umPensione).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'cessazione', data: '2018-12-31', coperturaDal: '2019-01-01'}],
    });
  });

  it('data proposta dalla situazione prima del 01/01/2019: tabelle non disponibili sulla data di riferimento', () => {
    const r = calcolaPratica(pensione({situazione: {tipo: 'sospensione-cautelare', dal: '2019-01-01'}}), tabelle);
    expect(r.sezioni.umPensione).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'dataRiferimentoPensione', data: '2018-12-31', coperturaDal: '2019-01-01'}],
    });
  });

  it('posizione inesistente: UM pensione bloccata (serve a scegliere l\'IVC)', () => {
    const r = calcolaPratica(pensione({}, {posizione: 'C9'}), tabelle);
    expect(r.sezioni.umPensione).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'posizione-non-valida', posizione: 'C9', motivo: 'inesistente'}],
    });
  });
});
