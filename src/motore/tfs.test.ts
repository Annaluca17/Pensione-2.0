// Regole singole dell'UM TFS con tabelle di fantasia minime (spec "Testing Decisions"). I casi con le
// tabelle vere stanno in src/casi-normativi/tfs-motore.test.ts.
import {describe, expect, it} from 'vitest';
import {pratica, tabelleDiProva} from './fixture';
import {calcolaPratica} from './index';
import type {DatiPraticaPensione, Risultato, Tabelle, Tfs, VoceCatalogo} from './index';

const voce = (codice: string, tfs: boolean, tredicesima: boolean): VoceCatalogo => ({
  codice,
  descrizione: `voce ${codice}`,
  mensilita: 12,
  utile: {pensione: true, tredicesima, tfs, tfr: false},
  dal: '2019-01-01',
  fonte: 'prova',
});

const riga = (id: string, voci: string[], campoPassweb?: string) => ({
  id,
  etichetta: `Riga ${id}`,
  voci,
  fonte: 'prova',
  ...(campoPassweb && {campoPassweb}),
});

// Contratti: A definitivo; B ipotesi dal 2025 (T5). L'IVC 2023-24 anticipa B: vale 10,00 (B non è definitivo).
const importi = {C5: {mensile: 1000}};
const tabelle: Tabelle = {
  ...tabelleDiProva,
  catalogoVoci: [voce('01', true, true), voce('07', false, true), voce('09', true, true), voce('10', false, false)],
  righeTfr: [{id: 'retribuzione-valutabile', etichetta: 'Mese pieno', voci: ['01', '09'], fonte: 'prova'}],
  contratti: [
    {
      id: 'a',
      nome: 'A',
      stato: 'definitivo',
      firma: '2022-01-01',
      vigenza: {dal: '2019-01-01', al: '2024-12-31'},
      fonte: 'prova',
      scaglionamenti: [],
      ivc: [{dal: '2023-01-01', al: '2024-12-31', chiave: 'posizione', percentuale: 0.5, anticipa: 'b', importi, fonte: 'prova'}],
      indennitaComparto: [],
    },
    {
      id: 'b',
      nome: 'B',
      stato: 'ipotesi',
      firma: '2026-07-01',
      vigenza: {dal: '2025-01-01', al: '2027-12-31'},
      fonte: 'prova',
      proposta: {scaglionamenti: [], indennitaComparto: []},
    },
  ],
  righePassweb: {
    ...tabelleDiProva.righePassweb,
    pensione: {righe: [riga('voce-01', ['01'])], tredicesima: {id: 'tredicesima', etichetta: '13ª', voci: ['01'], fonte: 'prova'}},
    tfs: [
      riga('tab-e', ['01', '09'], 'Tab. G'),
      riga('tredicesima', ['01', '09'], '13^'),
      riga('posizione-prova', ['07']),
      riga('comparto-prova', ['10']),
    ],
  },
};

const pensione = (
  modifica: Partial<DatiPraticaPensione> = {},
  anagrafica: Partial<DatiPraticaPensione['anagrafica']> = {},
): DatiPraticaPensione => ({
  ...pratica({voci: {base: {'01': 120000}, eccezioni: {'2024-10': {'01': 120000}}}}),
  regime: 'TFS',
  situazione: {tipo: 'ordinaria'},
  ...modifica,
  anagrafica: {...pratica().anagrafica, assunzione: '2001-03-01', cessazione: '2024-11-30', ...anagrafica},
});

const tfsDi = (r: Risultato): Tfs => {
  const s = r.sezioni.tfs;
  if (s?.esito !== 'calcolata') throw new Error(`TFS non calcolata: ${JSON.stringify(s)}`);
  return s;
};
const valori = (t: Tfs) => Object.fromEntries(t.righe.map((r) => [r.id, r.composizione.arrotondato]));

describe('regime di fine servizio (ADR 0002)', () => {
  it('regime TFS: sezione TFS, nessuna sezione TFR', () => {
    const r = calcolaPratica(pensione(), tabelle);
    expect(r.sezioni.tfs?.esito).toBe('calcolata');
    expect(r.sezioni).not.toHaveProperty('tfr');
  });

  it('regime TFR: la sezione TFS manca', () => {
    expect(calcolaPratica(pensione({regime: 'TFR'}), tabelle).sezioni).not.toHaveProperty('tfs');
  });

  it('pratica di cessazione: la sezione TFS manca', () => {
    expect(calcolaPratica(pratica(), tabelle).sezioni).not.toHaveProperty('tfs');
  });
});

describe('Σ dei 12 mesi effettivi, nessun ×13 (D3)', () => {
  it('ogni riga è la Σ delle sue voci sui 12 mesi fino al mese di fine TFS; la 13ª è Σ12/12', () => {
    const t = tfsDi(calcolaPratica(pensione({voci: {base: {'01': 100000}, eccezioni: {'2024-11': {'01': 112000}}}}), tabelle));
    expect([t.dal, t.al]).toEqual(['2023-12', '2024-11']);
    expect(t.righe[0].composizione.addendi).toHaveLength(12);
    expect(valori(t)['tab-e']).toBe(11 * 100000 + 112000);
    expect(valori(t).tredicesima).toBe(Math.round((11 * 100000 + 112000) / 12));
    expect(t.totale).toBe(valori(t)['tab-e'] + valori(t).tredicesima);
  });

  it('voce di posizione (07) e comparto (10) fuori: nelle righe del TFS non entrano', () => {
    const t = tfsDi(calcolaPratica(pensione({voci: {base: {'01': 100000, '07': 50000, '10': 4000}, eccezioni: {'2024-10': {}}}}), tabelle));
    expect(valori(t)['tab-e']).toBe(12 * 100000);
    expect(valori(t).tredicesima).toBe(100000);
  });

  it('voci intere anche per i part-time (D4)', () => {
    const t = tfsDi(calcolaPratica(pensione({partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {}}}), tabelle));
    expect(valori(t)['tab-e']).toBe(12 * 120000);
  });

  it('meno di 12 mesi di servizio: Σ dei mesi esistenti, 13ª = Σ/12, nessun avviso', () => {
    const r = calcolaPratica(pensione({}, {assunzione: '2024-08-01'}), tabelle);
    const t = tfsDi(r);
    expect([t.dal, t.al]).toEqual(['2024-08', '2024-11']);
    expect(valori(t)['tab-e']).toBe(4 * 120000);
    expect(valori(t).tredicesima).toBe(Math.round((4 * 120000) / 12));
    expect(r.avvisi.filter((a) => a.codice === 'tfs-annualizzato')).toEqual([]);
  });
});

describe('un solo mese inserito: annualizza (D2, C20-3)', () => {
  it('nessuna eccezione nelle voci: mese di fine TFS × 12 e avviso', () => {
    const r = calcolaPratica(pensione({voci: {base: {'01': 100000}, eccezioni: {}}}), tabelle);
    const t = tfsDi(r);
    expect(t.annualizzato).toBe(true);
    expect(valori(t)['tab-e']).toBe(1200000);
    expect(valori(t).tredicesima).toBe(100000);
    expect(r.avvisi).toContainEqual(expect.objectContaining({codice: 'tfs-annualizzato', mese: '2024-11', mesi: 12}));
  });

  it("con un'eccezione in un solo mese non annualizza", () => {
    const r = calcolaPratica(pensione(), tabelle);
    expect(tfsDi(r).annualizzato).toBeUndefined();
    expect(r.avvisi.filter((a) => a.codice === 'tfs-annualizzato')).toEqual([]);
  });
});

describe('IVC dalla tabella mese per mese (D8, T6)', () => {
  const conIvc = (inserita: number) => pensione({voci: {base: {'01': 100000, '09': inserita}, eccezioni: {'2024-10': {}}}});

  it('IVC diversa dalla tabella: vale la tabella su ogni mese, un avviso per mese', () => {
    const r = calcolaPratica(conIvc(500), tabelle);
    const t = tfsDi(r);
    expect(valori(t)['tab-e']).toBe(12 * (100000 + 1000));
    const avvisi = r.avvisi.filter((a) => a.codice === 'ivc-incompatibile');
    expect(avvisi).toHaveLength(12);
    expect(new Set(avvisi.map((a) => a.mese)).size).toBe(12);
  });

  it('IVC uguale alla tabella: nessun avviso', () => {
    expect(calcolaPratica(conIvc(1000), tabelle).avvisi.filter((a) => a.codice === 'ivc-incompatibile')).toEqual([]);
  });
});

describe('contratto in ipotesi sulla data di fine TFS (T5)', () => {
  const ipotesi = (r: Risultato) => r.avvisi.filter((a) => a.codice === 'contratto-in-ipotesi');

  it('pensione e fine TFS nella stessa ipotesi: un solo avviso', () => {
    expect(ipotesi(calcolaPratica(pensione({}, {cessazione: '2025-02-28'}), tabelle))).toHaveLength(1);
  });

  it("pensione fuori dalla vigenza e fine TFS dentro: l'avviso c'è per la data di fine TFS", () => {
    const r = calcolaPratica(
      pensione({forzature: {dataRiferimentoPensione: '2024-10-31'}}, {cessazione: '2025-02-28'}),
      tabelle,
    );
    expect(ipotesi(r)).toHaveLength(1);
    expect(tfsDi(r).al).toBe('2025-02');
  });

  it('pensione dentro e fine TFS fuori: un avviso, quello della pensione', () => {
    const r = calcolaPratica(pensione({situazione: {tipo: 'congedo-104', dal: '2025-01-01'}}, {cessazione: '2025-02-28'}), tabelle);
    expect(ipotesi(r)).toHaveLength(1);
  });
});

describe('blocchi', () => {
  it('cessazione mancante: sezione bloccata', () => {
    const r = calcolaPratica(pensione({}, {cessazione: undefined}), tabelle);
    expect(r.sezioni.tfs).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'cessazione-mancante'}]});
  });

  it('posizione inesistente: sezione bloccata', () => {
    expect(calcolaPratica(pensione({}, {posizione: 'C9'}), tabelle).sezioni.tfs?.esito).toBe('bloccata');
  });

  it('data di fine TFS prima del 2019: tabelle non disponibili', () => {
    const r = calcolaPratica(pensione({situazione: {tipo: 'congedo-104', dal: '2018-06-01'}}, {assunzione: '2001-03-01'}), tabelle);
    expect(r.sezioni.tfs).toEqual({
      esito: 'bloccata',
      motivi: [{tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'dataRiferimentoFineServizio', data: '2018-05-31', coperturaDal: '2019-01-01'}],
    });
  });

  it('part-time fuori range: la TFS usa la voce intera, non si blocca', () => {
    const r = calcolaPratica(pensione({partTime: {base: {percentuale: 0}, eccezioni: {}}}), tabelle);
    expect(r.sezioni.tfs?.esito).toBe('calcolata');
  });
});
