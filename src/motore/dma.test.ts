// Regole singole delle DMA previste (ticket 26) dal seam calcolaPratica, con tabelle di fantasia:
// limite dal parametro (qui 2), validazione di `dmaPreviste.dal`, situazioni, giorni, 13ª, IVC, finestra.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from './calcolaPratica';
import {pratica, tabelleDiProva} from './fixture';
import type {Blocco, CampoDma, DatiPraticaPensione, DmaPreviste, PeriodoDma, Risultato, Situazione, Tabelle} from './tipi';

const campo = (id: string, voci: string[], altro: Partial<CampoDma> = {}): CampoDma => ({
  id,
  etichetta: id,
  voci,
  tredicesima: voci,
  percentuale: 100,
  fonte: `fonte ${id}`,
  ...altro,
});

const tabelle: Tabelle = {
  ...tabelleDiProva,
  righePassweb: {
    ...tabelleDiProva.righePassweb,
    dma: [
      campo('imponibile-pensionistico', ['01', '09', '10'], {tredicesima: ['01', '09']}),
      campo('imponibile-credito', ['01', '09', '10'], {tredicesima: ['01', '09'], condizione: 'iscritto-credito'}),
      campo('imponibile-tfs', ['01', '09'], {percentuale: 80, regime: 'TFS'}),
      campo('imponibile-tfr', ['01', '09'], {percentuale: 80, regime: 'TFR'}),
      campo('retribuzione-teorica-tfr', ['01', '07', '09'], {tredicesima: [], regime: 'TFR'}),
    ],
  },
};

/** Le stesse tabelle con un altro limite di DMA previste. */
const conLimite = (valore: number): Tabelle => ({...tabelle, parametri: {...tabelle.parametri, limiteDmaPreviste: {valore, fonte: 'prova'}}});

/** Pratica di pensione di fantasia: C5 assunto il 01/03/2001, cessato il 16/03/2026 (lunedì). */
function conDma(dal: string, altro: Partial<DatiPraticaPensione> = {}, anagrafica: Partial<DatiPraticaPensione['anagrafica']> = {}): DatiPraticaPensione {
  const base = pratica();
  return {
    ...base,
    voci: {base: {'01': 200000, '10': 5000}, eccezioni: {}},
    anagrafica: {...base.anagrafica, ...anagrafica},
    regime: 'TFS',
    situazione: {tipo: 'ordinaria'},
    dmaPreviste: {dal},
    ...altro,
  };
}

const dma = (r: Risultato): DmaPreviste => {
  const s = r.sezioni.dmaPreviste;
  if (s?.esito !== 'calcolata') throw new Error(`DMA previste non calcolate: ${JSON.stringify(s)}`);
  return s;
};
const motivi = (r: Risultato): Blocco[] => {
  const s = r.sezioni.dmaPreviste;
  if (s?.esito !== 'bloccata') throw new Error('DMA previste non bloccate');
  return s.motivi;
};
const valori = (p: PeriodoDma) => Object.fromEntries(p.campi.map((c) => [c.id, c.composizione.arrotondato]));
const periodo = (r: Risultato, mese: string) => dma(r).periodi.find((p) => p.mese === mese)!;

describe('DMA previste: quando la sezione c\'è', () => {
  it('pratica di cessazione e pratica di pensione senza `dmaPreviste`: nessuna sezione', () => {
    expect(calcolaPratica(pratica(), tabelle).sezioni.dmaPreviste).toBeUndefined();
    const {dmaPreviste: _d, ...senza} = conDma('2026-01');
    expect(calcolaPratica(senza, tabelle).sezioni.dmaPreviste).toBeUndefined();
  });

  it('dal mese di cessazione: un periodo solo', () => {
    expect(dma(calcolaPratica(conDma('2026-03'), tabelle)).periodi.map((p) => p.mese)).toEqual(['2026-03']);
  });
});

describe('DMA previste: limite dal parametro delle tabelle (D12)', () => {
  it('oltre il limite un blocco per mese con limite e fonte del parametro; la sezione e le altre restano calcolate', () => {
    const r = calcolaPratica(conDma('2025-12'), tabelle);
    expect(dma(r).periodi.map((p) => p.mese)).toEqual(['2025-12', '2026-01']);
    expect(r.blocchi.filter((b) => b.codice === 'dma-oltre-limite')).toEqual([
      {tipo: 'blocco', codice: 'dma-oltre-limite', mese: '2026-02', limite: 2, fonte: 'prova'},
      {tipo: 'blocco', codice: 'dma-oltre-limite', mese: '2026-03', limite: 2, fonte: 'prova'},
    ]);
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
    expect(r.sezioni.tfs?.esito).toBe('calcolata');
  });
});

describe('DMA previste: validazione di `dal` (blocca solo le DMA)', () => {
  it.each([
    ['2026-13', {tipo: 'blocco', codice: 'data-non-valida', campo: 'dmaPreviste', valore: '2026-13'}],
    ['2026-3', {tipo: 'blocco', codice: 'data-non-valida', campo: 'dmaPreviste', valore: '2026-3'}],
    [
      '2026-04',
      {tipo: 'blocco', codice: 'date-incoerenti', campo: 'dmaPreviste', data: '2026-04-01', regola: 'non-dopo', rispetto: 'cessazione', dataRispetto: '2026-03-16'},
    ],
    [
      '2001-02',
      {tipo: 'blocco', codice: 'date-incoerenti', campo: 'dmaPreviste', data: '2001-02-01', regola: 'non-prima-di', rispetto: 'assunzione', dataRispetto: '2001-03-01'},
    ],
  ] as const)('%s', (dal, blocco) => {
    const r = calcolaPratica(conDma(dal), tabelle);
    expect(motivi(r)).toEqual([blocco]);
    expect(r.sezioni.umPensione?.esito).toBe('calcolata');
  });

  it('assunzione mancante: la 13ª non si può contare, DMA bloccate', () => {
    const r = calcolaPratica(conDma('2026-01', {}, {assunzione: undefined}), tabelle);
    expect(motivi(r)).toEqual([{tipo: 'blocco', codice: 'assunzione-mancante'}]);
  });
});

describe('DMA previste: situazioni (C21-2)', () => {
  const sit = (situazione: Situazione) => calcolaPratica(conDma('2026-01', {situazione}), tabelle);

  it('sospensione, congedo e optante che non iniziano il 1° del mese: blocco situazione-non-gestita solo sulle DMA', () => {
    for (const tipo of ['sospensione-cautelare', 'congedo-104', 'optante-tfr'] as const) {
      const r = sit({tipo, dal: '2026-02-10'});
      expect(motivi(r), tipo).toEqual([
        {tipo: 'blocco', codice: 'situazione-non-gestita', situazione: tipo, dal: '2026-02-10', motivo: 'non-al-primo-del-mese'},
      ]);
      expect(r.sezioni.umPensione?.esito, tipo).toBe('calcolata');
    }
  });

  it('trattenuta per malattia, anche a metà mese: nessun periodo e avviso dma-non-prevista', () => {
    const r = sit({tipo: 'trattenuta-malattia', dal: '2026-02-10'});
    expect(dma(r).periodi).toEqual([]);
    expect(r.avvisi.filter((a) => a.codice === 'dma-non-prevista')).toHaveLength(1);
  });

  it('sospensione dal 1° febbraio: gennaio ordinario, da febbraio codice 83 col solo CPDEL e Credito', () => {
    const r = sit({tipo: 'sospensione-cautelare', dal: '2026-02-01'});
    expect(dma(r).periodi.map((p) => p.codiceServizio)).toEqual([undefined, 83]);
    expect(valori(periodo(r, '2026-02'))).toEqual({'imponibile-pensionistico': 205000, 'imponibile-credito': 205000, 'imponibile-tfs': 0});
  });

  it('congedo L. 104 in regime TFR: codice 49, teorica compilata, imponibile TFR a 0', () => {
    const r = calcolaPratica(conDma('2026-01', {regime: 'TFR', situazione: {tipo: 'congedo-104', dal: '2026-02-01'}}), tabelle);
    const febbraio = periodo(r, '2026-02');
    expect(febbraio.codiceServizio).toBe(49);
    expect(valori(febbraio)).toMatchObject({'imponibile-tfr': 0, 'retribuzione-teorica-tfr': 200000});
  });

  it('optante TFR in regime TFS: dal mese dell\'opzione i campi del TFR', () => {
    const r = sit({tipo: 'optante-tfr', dal: '2026-02-01'});
    expect(dma(r).periodi.map((p) => p.regime)).toEqual(['TFS', 'TFR']);
    expect(Object.keys(valori(periodo(r, '2026-02')))).toEqual(['imponibile-pensionistico', 'imponibile-credito', 'imponibile-tfr', 'retribuzione-teorica-tfr']);
  });

  it('optante TFR in regime TFR: la sezione TFR resta bloccata (storia 58), le DMA si calcolano in TFR', () => {
    const r = calcolaPratica(conDma('2026-01', {regime: 'TFR', situazione: {tipo: 'optante-tfr', dal: '2025-11-01'}}), tabelle);
    expect(r.sezioni.tfr?.esito).toBe('bloccata');
    expect(dma(r).periodi.map((p) => p.regime)).toEqual(['TFR', 'TFR']);
  });
});

describe('DMA previste: giorni D9 e 13ª (D11, C21-3)', () => {
  it('mese di cessazione: giorni del mese parziale (1-16/03/2026, domeniche 1, 8, 15 → 13) e rateo 75/365', () => {
    const marzo = periodo(calcolaPratica(conDma('2026-03'), tabelle), '2026-03');
    expect(marzo).toMatchObject({dal: '2026-03-01', al: '2026-03-16', giorni: 13, giorniTredicesima: 75});
    // CPDEL = (2.000,00 + 50,00) × 13/26 + 2.000,00 × 75/365 = 1.025,00 + 410,9589… = 1.435,96
    expect(valori(marzo)['imponibile-pensionistico']).toBe(143596);
  });

  it('la forzatura dei giorni del mese parziale vale anche per la DMA di cessazione', () => {
    const r = calcolaPratica(conDma('2026-03', {forzature: {giorniMeseParziale: 10}}), tabelle);
    expect(periodo(r, '2026-03').giorni).toBe(10);
  });

  it('giorni forzati non validi: DMA bloccate col mese parziale', () => {
    const r = calcolaPratica(conDma('2026-03', {forzature: {giorniMeseParziale: 27}}), tabelle);
    expect(motivi(r)).toEqual([{tipo: 'blocco', codice: 'giorni-forzati-non-validi', giorni: 27, massimo: 26}]);
  });

  it('assunto nel mese della DMA: periodo dall\'assunzione, giorni lun-sab; dicembre con 13ª dall\'assunzione', () => {
    // Assunto lunedì 16/11/2026, cessato il 31/01/2027: novembre 16-30 = 13 lun-sab; dicembre 46/365.
    const r = calcolaPratica(conDma('2026-11', {}, {assunzione: '2026-11-16', cessazione: '2027-01-31'}), conLimite(3));
    expect(periodo(r, '2026-11')).toMatchObject({dal: '2026-11-16', al: '2026-11-30', giorni: 13, giorniTredicesima: 0});
    expect(periodo(r, '2026-12')).toMatchObject({giorni: 26, giorniTredicesima: 46});
    expect(periodo(r, '2027-01')).toMatchObject({giorni: 26, giorniTredicesima: 31});
  });

  it('anno bisestile intero: 366 giorni ma tetto 365, cioè la 13ª intera', () => {
    const r = calcolaPratica(conDma('2028-12', {}, {cessazione: '2028-12-31'}), tabelle);
    const dicembre = periodo(r, '2028-12');
    expect(dicembre.giorniTredicesima).toBe(365);
    // CPDEL = 2.050,00 + 2.000,00 = 4.050,00
    expect(valori(dicembre)['imponibile-pensionistico']).toBe(405000);
  });

  it('teorica TFR a mese pieno anche nel mese di cessazione (R1), × % part-time', () => {
    const r = calcolaPratica(conDma('2026-03', {regime: 'TFR', partTime: {base: {percentuale: 50}, eccezioni: {}}}), tabelle);
    expect(valori(periodo(r, '2026-03'))['retribuzione-teorica-tfr']).toBe(100000);
  });

  it('non iscritto al Credito: nessun campo Credito (R5)', () => {
    const r = calcolaPratica(conDma('2026-03', {iscrittoCredito: false}), tabelle);
    expect(Object.keys(valori(periodo(r, '2026-03')))).toEqual(['imponibile-pensionistico', 'imponibile-tfs']);
  });
});

describe('DMA previste: IVC (D8) e part-time', () => {
  it('IVC inserita diversa dalla tabella: si usa la tabella, un avviso per mese senza doppioni', () => {
    const r = calcolaPratica(conDma('2026-01', {voci: {base: {'01': 200000, '09': 1500}, eccezioni: {}}}), tabelle);
    expect(valori(periodo(r, '2026-01'))['imponibile-pensionistico']).toBe(200000);
    const mesi = r.avvisi.flatMap((a) => (a.codice === 'ivc-incompatibile' ? [a.mese] : []));
    expect(new Set(mesi).size).toBe(mesi.length);
    for (const m of ['2026-01', '2026-02', '2026-03']) expect(mesi).toContain(m);
  });

  it('con codice servizio 83 le voci restano come inserite: nessuna IVC di tabella né avviso nel mese', () => {
    const voci = {base: {'01': 200000}, eccezioni: {'2026-02': {'01': 100000, '09': 700}, '2026-03': {'01': 100000, '09': 700}}};
    const r = calcolaPratica(conDma('2026-02', {voci, situazione: {tipo: 'sospensione-cautelare', dal: '2026-02-01'}}), tabelle);
    expect(valori(periodo(r, '2026-02'))['imponibile-pensionistico']).toBe(100700);
    expect(r.avvisi.filter((a) => a.codice === 'ivc-incompatibile')).toEqual([]);
  });

  it('part-time fuori range in un mese DMA blocca le DMA; prima di `dal` no', () => {
    const fuori = (mese: string) => conDma('2026-02', {partTime: {base: {percentuale: 100}, eccezioni: {[mese]: {percentuale: 120}}}});
    expect(motivi(calcolaPratica(fuori('2026-02'), tabelle))).toEqual([
      {tipo: 'blocco', codice: 'part-time-fuori-range', mese: '2026-02', percentuale: 120},
    ]);
    expect(calcolaPratica(fuori('2026-01'), tabelle).sezioni.dmaPreviste?.esito).toBe('calcolata');
  });
});

describe('DMA previste: finestra delle voci (C20-2, C21-1)', () => {
  it('fino al mese di cessazione anche se la pensione cade prima: eccezioni dei mesi DMA usate, nessun avviso fuori periodo', () => {
    const voci = {base: {'01': 200000}, eccezioni: {'2026-03': {'01': 100000}}};
    const r = calcolaPratica(conDma('2026-02', {voci, situazione: {tipo: 'sospensione-cautelare', dal: '2026-02-01'}}), tabelle);
    expect(r.avvisi.filter((a) => a.codice === 'eccezioni-fuori-periodo')).toEqual([]);
    expect(periodo(r, '2026-03').campi[0].composizione.addendi[0].importo).toBe(100000);
  });

  it('dal prima dei 12 mesi del TFS: le DMA leggono quei mesi, il TFS resta sui 12 mesi a ritroso', () => {
    const voci = {base: {'01': 200000}, eccezioni: {'2024-01': {'01': 150000}}};
    // Sospeso dal 01/03/2025: fine TFS 28/02/2025, TFS da 03/2024 a 02/2025; DMA da 01/2024, prima.
    const r = calcolaPratica(
      conDma('2024-01', {voci, situazione: {tipo: 'sospensione-cautelare', dal: '2025-03-01'}}),
      conLimite(30),
    );
    expect(periodo(r, '2024-01').campi[0].composizione.addendi[0].importo).toBe(150000);
    expect(r.avvisi.filter((a) => a.codice === 'eccezioni-fuori-periodo')).toEqual([]);
    const tfs = r.sezioni.tfs;
    expect(tfs?.esito === 'calcolata' && [tfs.dal, tfs.al]).toEqual(['2024-03', '2025-02']);
  });
});
