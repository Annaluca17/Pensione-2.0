import {describe, expect, it} from 'vitest';
import {cedolinoHalley, paginaTestata, per, testoPer} from './halley/fixture';
import {leggiProposte} from './index';

describe('leggiProposte (seam S1)', () => {
  it('un cedolino Halley diventa una Proposta con le voci in centesimi', () => {
    const [p] = leggiProposte([
      cedolinoHalley({
        mese: 'Settembre', anno: 2026, area: 'FUN/D1/0/TI', assunzione: '09-12-1997', cessazione: '30-09-2026',
        testata: [['STIPENDIO BASE', 2092.84], ['IND.VACANZA CONT.', 20.93]],
      }),
    ]);
    expect(p.cf).toBe('RSSMRA80A01H501U');
    expect(p.dati.anagrafica).toEqual({
      nome: 'ROSSI MARIO', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'D1',
      assunzione: '1997-12-09', cessazione: '2026-09-30',
    });
    expect(p.dati.voci).toEqual({base: {'01': 209284, '09': 2093}, eccezioni: {}});
  });

  const mese = (m: string, tab: number, extra: Partial<Parameters<typeof cedolinoHalley>[0]> = {}) =>
    cedolinoHalley({
      mese: m, anno: 2026, area: 'IST/C6/0/TI',
      testata: [['STIPENDIO BASE', tab], ['IND.COMPARTO Q.F.', 32.06], ['IND.COMPARTO Q.B.', 3.09]],
      ...extra,
    });

  it('base = ultimo mese; eccezione = ogni mese diverso, con le sole voci che cambiano', () => {
    const [p] = leggiProposte([mese('Gennaio', 1900), mese('Febbraio', 1900), mese('Marzo', 1928.23)]);
    expect(p.dati.voci.base).toEqual({'01': 192823, '10': 3515});
    expect(p.dati.voci.eccezioni).toEqual({'2026-01': {'01': 190000}, '2026-02': {'01': 190000}});
  });

  it('una voce presente nella base e assente in un mese va a zero in quel mese', () => {
    const [p] = leggiProposte([
      mese('Gennaio', 1900, {testata: [['STIPENDIO BASE', 1900]]}), mese('Febbraio', 1900),
    ]);
    expect(p.dati.voci.eccezioni).toEqual({'2026-01': {'10': 0}});
  });

  it('legge la % di part-time per ogni mese e lascia il tipo O/V/M all operatore, con avviso', () => {
    const [p] = leggiProposte([
      mese('Gennaio', 1900), mese('Febbraio', 1900, {partTime: '75'}), mese('Marzo', 1900, {partTime: '50'}),
    ]);
    expect(p.dati.partTime).toEqual({
      base: {percentuale: 50},
      eccezioni: {'2026-01': {percentuale: 100}, '2026-02': {percentuale: 75}},
    });
    expect(p.avvisi).toEqual([expect.stringContaining('tipo (O/V/M)')]);
  });

  it('legge % e tipo quando il cedolino li porta insieme ("50,00-O"), senza avviso sul tipo', () => {
    const [p] = leggiProposte([mese('Gennaio', 1900, {partTime: '50,00-V'}), mese('Febbraio', 1900, {partTime: '50,00-O'})]);
    expect(p.dati.partTime).toEqual({
      base: {percentuale: 50, tipo: 'O'},
      eccezioni: {'2026-01': {percentuale: 50, tipo: 'V'}},
    });
    expect(p.avvisi).toEqual([]);
  });

  it('avvisa sul tipo solo per i mesi in cui manca', () => {
    const [p] = leggiProposte([mese('Gennaio', 1900, {partTime: '75'}), mese('Febbraio', 1900, {partTime: '50,00-O'})]);
    expect(p.avvisi).toEqual([
      "Part-time sotto il 100% senza tipo (gennaio 2026 75%): il tipo (O/V/M) lo indica l'operatore.",
    ]);
  });

  it('a tempo pieno non dà avvisi di part-time', () => {
    const [p] = leggiProposte([mese('Gennaio', 1900)]);
    expect(p.dati.partTime).toEqual({base: {percentuale: 100}, eccezioni: {}});
    expect(p.avvisi).toEqual([]);
  });

  it('non somma l elemento perequativo e avvisa mese per mese con importo e somma tabellare + perequativo', () => {
    const conPerequativo = (m: string) => mese(m, 1523.61, {
      testata: [['STIPENDIO BASE', 1523.61], ['ELEMENTO PEREQUATIVO', 23]],
    });
    const [p] = leggiProposte([conPerequativo('Febbraio'), conPerequativo('Marzo')]);
    expect(p.dati.voci).toEqual({base: {'01': 152361}, eccezioni: {}});
    expect(p.avvisi).toEqual([
      'febbraio 2026: elemento perequativo 23,00 non sommato al tabellare (tabellare + perequativo = 1.546,61).',
      'marzo 2026: elemento perequativo 23,00 non sommato al tabellare (tabellare + perequativo = 1.546,61).',
    ]);
  });

  describe('finestra di 12 mesi fino al mese di fine TFS', () => {
    const NOMI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const cedolino = (anno: number, m: number, tab: number, extra: Partial<Parameters<typeof cedolinoHalley>[0]> = {}) =>
      cedolinoHalley({mese: NOMI[m], anno, testata: [['STIPENDIO BASE', tab]], ...extra});
    // aprile 2025 … marzo 2026
    const finestra = [[2025, 3], [2025, 4], [2025, 5], [2025, 6], [2025, 7], [2025, 8], [2025, 9], [2025, 10], [2025, 11],
      [2026, 0], [2026, 1], [2026, 2]] as const;

    it('ignora i mesi fuori finestra e segnala i mesi mancanti, che valgono la base', () => {
      const pagine = [
        cedolino(2024, 11, 1500),                                     // fuori finestra
        ...finestra.filter(([a, m]) => !(a === 2025 && m === 6)).map(([a, m]) => cedolino(a, m, 1900)),
      ];
      const [p] = leggiProposte(pagine, {fineTfs: '2026-03-31'});
      expect(p.dati.voci).toEqual({base: {'01': 190000}, eccezioni: {}});
      expect(p.avvisi).toEqual(['Mancano i cedolini di 1 mese (valgono come la base): luglio 2025.']);
    });

    it('nessun cedolino nella finestra: voci vuote e avviso con i mesi letti e quelli che servono', () => {
      // Il cedolino di maggio dopo una cessazione al 30 aprile (tredicesima, conguagli).
      const [p] = leggiProposte([cedolino(2022, 4, 1421.75, {cessazione: '30-04-2022'})]);
      expect(p.dati.voci).toEqual({base: {}, eccezioni: {}});
      expect(p.avvisi).toEqual([
        'Nessun cedolino nei 12 mesi fino alla fine TFS (maggio 2021 - aprile 2022): letto solo maggio 2022. '
          + 'Carica i cedolini di quei mesi.',
      ]);
    });

    it('senza fine TFS la finestra arriva al mese di cessazione letto dai PDF', () => {
      const pagine = finestra.map(([a, m]) => cedolino(a, m, 1900, m === 2 ? {cessazione: '31-03-2026'} : {}));
      const [p] = leggiProposte([cedolino(2025, 2, 1500), ...pagine]);
      expect(p.dati.voci.eccezioni).toEqual({});
      expect(p.avvisi).toEqual([]);
    });
  });

  describe('cessazione non a fine mese', () => {
    it('legge la testata del mese di cessazione come gli altri e avvisa se le voci differiscono dal mese prima', () => {
      const [p] = leggiProposte([
        mese('Agosto', 1600),
        mese('Settembre', 800, {cessazione: '15-09-2026'}),
      ]);
      expect(p.dati.voci.base).toEqual({'01': 80000, '10': 3515});
      expect(p.dati.voci.eccezioni).toEqual({'2026-08': {'01': 160000}});
      expect(p.avvisi).toContain(
        'Cessazione non a fine mese (15-09-2026): le voci di settembre 2026 differiscono da quelle di agosto 2026 (voci: 01).',
      );
    });

    it('niente avviso se le voci sono uguali al mese prima', () => {
      const [p] = leggiProposte([mese('Agosto', 1600), mese('Settembre', 1600, {cessazione: '15-09-2026'})]);
      expect(p.avvisi.filter(a => a.startsWith('Cessazione'))).toEqual([]);
    });
  });

  describe('errori di lettura', () => {
    it('scarta le elaborazioni supplementari e lo dice', () => {
      const [p] = leggiProposte([
        mese('Aprile', 1900), mese('Aprile', 0, {straordinaria: true, testata: []}),
      ]);
      expect(p.dati.voci.base).toEqual({'01': 190000, '10': 3515});
      expect(p.avvisi).toEqual([
        '1 cedolino di elaborazioni supplementari (arretrati, determine) senza voci di testata: non usato.',
      ]);
    });

    it('mese caricato due volte: vale l ultimo file e avvisa solo se gli importi differiscono', () => {
      const [p] = leggiProposte([mese('Luglio', 1900), mese('Luglio', 1928.23)]);
      expect(p.dati.voci.base).toEqual({'01': 192823, '10': 3515});
      expect(p.dati.voci.eccezioni).toEqual({});
      expect(p.avvisi).toEqual(["luglio 2026: cedolino caricato due volte con importi diversi; tenuto quello dell'ultimo file."]);
      expect(leggiProposte([mese('Luglio', 1900), mese('Luglio', 1900)])[0].avvisi).toEqual([]);
    });

    it('due righe per la stessa voce: avvisa se gli importi differiscono e tiene la prima', () => {
      const [p] = leggiProposte([mese('Marzo', 1900, {testata: [['STIPENDIO BASE', 1900], ['IND.SPECIFICA', 5.38], ['VARIE PENSION.', 6]]})]);
      expect(p.dati.voci.base['08']).toBe(538);
      expect(p.avvisi).toEqual(['marzo 2026: due righe per la voce 08 con importi diversi (5,38 e 6,00); tenuto il primo.']);
      const [q] = leggiProposte([mese('Marzo', 1900, {testata: [['STIPENDIO BASE', 1900], ['IND.SPECIFICA', 5.38], ['VARIE PENSION.', 5.38]]})]);
      expect(q.avvisi).toEqual([]);
    });

    it('elenca le etichette non riconosciute, senza metterle fra le voci', () => {
      const [p] = leggiProposte([
        mese('Febbraio', 1900, {testata: [['STIPENDIO BASE', 1900], ['IND.DI RISCHIO', 30]]}),
        mese('Marzo', 1900, {testata: [['STIPENDIO BASE', 1900], ['IND.DI RISCHIO', 30], ['TREDICESIMA', 1900]]}),
      ]);
      expect(p.nonRiconosciute).toEqual(['IND.DI RISCHIO']);
      expect(p.dati.voci).toEqual({base: {'01': 190000}, eccezioni: {}});
    });
  });

  describe('più dipendenti e confine con il motore', () => {
    it('una Proposta per ogni CF, in ordine di comparsa', () => {
      const props = leggiProposte([
        mese('Marzo', 1900), mese('Marzo', 1700, {cf: 'VRDLGU75B02F205X', nome: 'VERDI LUIGI'}), mese('Aprile', 1900),
      ]);
      expect(props.map(p => [p.cf, p.dati.anagrafica.nome, p.dati.voci.base['01']])).toEqual([
        ['RSSMRA80A01H501U', 'ROSSI MARIO', 190000], ['VRDLGU75B02F205X', 'VERDI LUIGI', 170000],
      ]);
    });

    it('non giudica IVC, segretari né date incoerenti: le riporta e basta', () => {
      const [p] = leggiProposte([cedolinoHalley({
        mese: 'Maggio', anno: 2026, area: '/SEGRETARIO C/0/TI', assunzione: '01-06-2026', cessazione: '31-05-2026',
        testata: [['STIPENDIO BASE', 3077.28], ['IND.VACANZA CONT.', 30.77]],
      })]);
      expect(p.dati.anagrafica).toMatchObject({posizione: 'SEGRETARIO C', assunzione: '2026-06-01', cessazione: '2026-05-31'});
      expect(p.dati.voci.base).toEqual({'01': 307728, '09': 3077});
      expect(p.avvisi.filter(a => !a.startsWith('Mancano'))).toEqual([]);
    });
  });

  describe('riepilogo annuo VOCI DI TESTATA', () => {
    const riepilogo = paginaTestata({
      anno: 2026,
      voci: [
        ['Stipendio tabellare', [1900, 1900, 1928.23, null, null, null, null, null, null, null, null, null]],
        ['Indennita` di Comparto', per(3.09, 0, 2)],
        ['Tredicesima', [null, null, null, null, null, null, null, null, null, null, null, 1900]],
      ],
      assunzione: testoPer('09-12-1997', 0, 2),
      posizione: testoPer('EX-C5', 0, 2),
      partTime: ['100', '50', '50', null, null, null, null, null, null, null, null, null],
    });

    it('un anno di voci e di % part-time diventa una Proposta mese per mese', () => {
      const [p] = leggiProposte([riepilogo]);
      expect(p.dati.anagrafica).toMatchObject({nome: 'ROSSI MARIO', posizione: 'C5', assunzione: '1997-12-09'});
      expect(p.dati.voci).toEqual({
        base: {'01': 192823, '10': 309},
        eccezioni: {'2026-01': {'01': 190000}, '2026-02': {'01': 190000}},
      });
      expect(p.dati.partTime).toEqual({base: {percentuale: 50}, eccezioni: {'2026-01': {percentuale: 100}}});
      expect(p.nonRiconosciute).toEqual([]);
    });

    it('riepilogo e cedolini dello stesso anno si completano mese per mese', () => {
      const [p] = leggiProposte([riepilogo, mese('Aprile', 2000, {testata: [['STIPENDIO BASE', 2000]]})]);
      expect(p.dati.voci.base).toEqual({'01': 200000});
      expect(Object.keys(p.dati.voci.eccezioni)).toEqual(['2026-01', '2026-02', '2026-03']);
    });
  });
});
