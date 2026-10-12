// Chiusura e "da rilavorare" (ticket 15) con le tabelle vere e una correzione di prova. Dati di fantasia.
import {describe, expect, it} from 'vitest';
import {applicaImport, esporta, preparaImport} from '../archivio';
import type {Archivio, Pratica} from '../archivio';
import type {Tabelle} from '../motore';
import {casiNormativiTfr} from '../casi-normativi/tfr';
import {casiNormativiPensioneTfs} from '../casi-normativi/pensione-tfs';
import {casiNormativiDma} from '../casi-normativi/dma-previste';
import {casiNormativiMiglioramento} from '../casi-normativi/miglioramento';
import {tabelle} from '../tabelle';
import {causaInBreve, chiudiSezione, chiusure, ipotesiInBreve, riapriSezione} from './chiusura';

const ADESSO = '2026-10-12T10:00:00.000Z';
const n02 = casiNormativiTfr.find((c) => c.id === 'TFR-N02')!;
const pratica = {id: 'p1', enteId: 'e1', tipo: 'cessazione', dati: n02.dati, congelati: [], creata: ADESSO, modificata: ADESSO} satisfies Pratica;

/** Una correzione di prova delle tabelle, con la sua riga di registro. */
const corrette: Tabelle = {
  ...tabelle,
  versione: '2099-01-01.1',
  registro: [...tabelle.registro, {id: '2099-01-01.1', motivo: 'Correzione di prova del divisore del rateo'}],
  parametri: {...tabelle.parametri, divisoreRateoTredicesima: {valore: 366, fonte: 'prova'}},
};

describe('chiudere la sezione TFR', () => {
  const chiusa = chiudiSezione(pratica, 'tfr', tabelle, ADESSO);

  it('congela il risultato con l\'id della versione delle tabelle', () => {
    expect(chiusa.congelati).toHaveLength(1);
    expect(chiusa.congelati[0]).toMatchObject({sezione: 'tfr', versioneTabelle: tabelle.versione, dati: pratica.dati});
    expect(chiusure(chiusa, tabelle).tfr?.daRilavorare).toBe(false);
  });

  it('con tabelle corrette e una riga di registro nuova la sezione è da rilavorare, con la causa', () => {
    const tfr = chiusure(chiusa, corrette).tfr!;
    expect(tfr.daRilavorare).toBe(true);
    expect(tfr.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale])).toEqual([
      ['finale/rateo-tredicesima-teorica', 11165, 11135], // 2.037,70 × 20 / 366
    ]);
    expect(causaInBreve(chiusa, corrette)).toBe('Correzione di prova del divisore del rateo');
  });

  it('un dato cambiato dopo la chiusura dà la causa "dati"', () => {
    const modificata = {...chiusa, dati: {...chiusa.dati, voci: {...chiusa.dati.voci, base: {...chiusa.dati.voci.base, '01': 200000}}}};
    expect(causaInBreve(modificata, tabelle)).toBe('dati modificati dopo la chiusura');
  });

  it('riaprire riporta la sezione a calcolata senza perdere i dati', () => {
    const riaperta = riapriSezione(chiusa, 'tfr', ADESSO);
    expect(riaperta.congelati).toEqual([]);
    expect(riaperta.dati).toEqual(pratica.dati);
  });

  it('una sezione bloccata non si chiude', () => {
    const senzaCessazione = {...pratica, dati: {...pratica.dati, anagrafica: {...pratica.dati.anagrafica, cessazione: undefined}}};
    expect(() => chiudiSezione(senzaCessazione, 'tfr', tabelle, ADESSO)).toThrow();
  });

  it('il risultato congelato sopravvive a export e import', () => {
    const archivio: Archivio = {versioneSchema: 1, enti: [{id: 'e1', nome: 'Comune di Prova'}], pratiche: [chiusa], ultimoExport: null};
    const vuoto: Archivio = {versioneSchema: 1, enti: [], pratiche: [], ultimoExport: null};
    const esito = preparaImport(vuoto, esporta(archivio, ADESSO).file);
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    const reimportata = applicaImport(vuoto, esito.riepilogo).pratiche[0];
    expect(reimportata.congelati).toEqual(chiusa.congelati);
    expect(chiusure(reimportata, corrette).tfr?.daRilavorare).toBe(true);
  });
});

describe('chiudere UM pensione e TFS della pratica di pensione (ticket 30)', () => {
  const n01 = casiNormativiPensioneTfs.find((c) => c.id === 'PT-N01')!;
  const pensione = {id: 'p2', enteId: 'e1', tipo: 'pensione', dati: n01.dati, congelati: [], creata: ADESSO, modificata: ADESSO} satisfies Pratica;
  const chiusa = chiudiSezione(chiudiSezione(pensione, 'umPensione', tabelle, ADESSO), 'tfs', tabelle, ADESSO);

  it('congela le due sezioni coi dati della pensione, regime e situazione compresi', () => {
    expect(chiusa.congelati.map((c) => c.sezione)).toEqual(['umPensione', 'tfs']);
    for (const c of chiusa.congelati) expect(c).toMatchObject({versioneTabelle: tabelle.versione, dati: n01.dati});
    const stato = chiusure(chiusa, tabelle);
    expect([stato.umPensione?.daRilavorare, stato.tfs?.daRilavorare]).toEqual([false, false]);
  });

  it('una voce cambiata dopo la chiusura rende da rilavorare le righe che la usano, con la causa "dati"', () => {
    // 04 (assegno IIS) da 25,00 a 30,00 in tutti i mesi: riga 04 e 13ª della pensione, assegno non riassorbibile e 13ª del TFS.
    const base = {...chiusa.dati.voci.base, '04': 3000};
    const eccezioni = Object.fromEntries(Object.entries(chiusa.dati.voci.eccezioni).map(([m, v]) => [m, {...v, '04': 3000}]));
    const modificata = {...chiusa, dati: {...chiusa.dati, voci: {base, eccezioni}}};
    const stato = chiusure(modificata, tabelle);
    expect(stato.umPensione?.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale, d.cause])).toEqual([
      ['voce-04', 30000, 36000, [{tipo: 'dati'}]],
      ['tredicesima', 187919, 188419, [{tipo: 'dati'}]],
    ]);
    expect(stato.tfs?.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale])).toEqual([
      ['tredicesima', 187000, 187500],
      ['assegno-non-riassorbibile', 30000, 36000],
    ]);
    expect(causaInBreve(modificata, tabelle)).toBe('dati modificati dopo la chiusura');
  });

  it('passare al regime TFR rende da rilavorare la sezione TFS chiusa: il ricalcolo non la ha più', () => {
    const inTfr = {...chiusa, dati: {...n01.dati, regime: 'TFR' as const}};
    const stato = chiusure(inTfr, tabelle);
    expect(stato.tfs?.daRilavorare).toBe(true);
    expect(stato.tfs?.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale, d.cause])).toEqual([
      ['esito', 'calcolata', 'bloccata', [{tipo: 'dati'}]],
    ]);
    expect(stato.umPensione?.daRilavorare).toBe(false);
  });

  it('i risultati congelati della pensione sopravvivono a export e import, coi dati della pensione', () => {
    const archivio: Archivio = {versioneSchema: 1, enti: [{id: 'e1', nome: 'Comune di Prova'}], pratiche: [chiusa], ultimoExport: null};
    const vuoto: Archivio = {versioneSchema: 1, enti: [], pratiche: [], ultimoExport: null};
    const esito = preparaImport(vuoto, esporta(archivio, ADESSO).file);
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    expect(applicaImport(vuoto, esito.riepilogo).pratiche[0]).toEqual(chiusa);
  });
});

describe('chiudere DMA previste e miglioramento della pratica di pensione (ticket 31)', () => {
  const dma = casiNormativiDma.find((c) => c.id === 'DM-N02')!;
  const mc = casiNormativiMiglioramento.find((c) => c.id === 'MC-N01')!;
  const ipotesi = casiNormativiMiglioramento.find((c) => c.id === 'MC-N05')!;
  const nuova = (id: string, dati: Pratica['dati']): Pratica => ({id, enteId: 'e1', tipo: 'pensione', dati: dati as never, congelati: [], creata: ADESSO, modificata: ADESSO});
  /** Una voce in più di 100,00 € (o 5,00 €) in ogni mese, base ed eccezioni. */
  const conVoce = <P extends Pratica>(p: P, voce: string, importo: number): P => {
    const eccezioni = Object.fromEntries(Object.entries(p.dati.voci.eccezioni).map(([m, v]) => [m, {...v, [voce]: importo}]));
    return {...p, dati: {...p.dati, voci: {base: {...p.dati.voci.base, [voce]: importo}, eccezioni}}};
  };

  it('chiude le DMA previste coi dati della pratica, senza differenze finché nulla cambia', () => {
    const chiusa = chiudiSezione(nuova('p3', dma.dati), 'dmaPreviste', tabelle, ADESSO);
    expect(chiusa.congelati[0]).toMatchObject({sezione: 'dmaPreviste', versioneTabelle: tabelle.versione, dati: dma.dati});
    expect(chiusure(chiusa, tabelle).dmaPreviste?.daRilavorare).toBe(false);
  });

  it('una voce cambiata dopo la chiusura rende da rilavorare i campi del mese che la usano (DM-N02, novembre 2026)', () => {
    const chiusa = chiudiSezione(nuova('p3', dma.dati), 'dmaPreviste', tabelle, ADESSO);
    // 01 da 1.928,23 a 2.028,23 (+100,00): imponibile pensionistico 2.099,26 → 2.199,26; TFS = 0,8 × (2.067,20 + 100,00) − 1.653,76 = +80,00.
    const stato = chiusure(conVoce(chiusa, '01', 202823), tabelle).dmaPreviste!;
    expect(stato.daRilavorare).toBe(true);
    const di = (campo: string) => stato.confronto.differenze.find((d) => d.campo === campo);
    expect([di('2026-11/imponibile-pensionistico')?.congelato, di('2026-11/imponibile-pensionistico')?.attuale]).toEqual([209926, 219926]);
    expect([di('2026-11/imponibile-tfs')?.congelato, di('2026-11/imponibile-tfs')?.attuale]).toEqual([165376, 173376]);
    expect(di('2026-11/imponibile-tfs')?.cause).toEqual([{tipo: 'dati'}]);
  });

  it('chiude il miglioramento definitivo (MC-N01) e lo rilavora su una voce cambiata, per Scenario A e per decorrenza', () => {
    const chiusa = chiudiSezione(nuova('p4', mc.dati), 'miglioramento', tabelle, ADESSO);
    expect(chiusure(chiusa, tabelle).miglioramento?.daRilavorare).toBe(false);
    // 04 (assegno IIS) da 25,00 a 30,00: riga annua 300,00 → 360,00, 13ª A 1.768,95 → 1.773,95.
    const stato = chiusure(conVoce(chiusa, '04', 3000), tabelle).miglioramento!;
    const di = (campo: string) => stato.confronto.differenze.find((d) => d.campo === campo);
    expect([di('scenarioA/voce-04')?.congelato, di('scenarioA/voce-04')?.attuale]).toEqual([30000, 36000]);
    expect([di('scenarioA/tredicesima')?.congelato, di('scenarioA/tredicesima')?.attuale]).toEqual([176895, 177395]);
    expect([di('migliorato-2024-01-01/voce-04')?.congelato, di('migliorato-2024-01-01/voce-04')?.attuale]).toEqual([30000, 36000]);
    expect(di('scenarioA/voce-04')?.cause).toEqual([{tipo: 'dati'}]);
  });

  it('il miglioramento in ipotesi non ha importi: non si chiude', () => {
    expect(() => chiudiSezione(nuova('p5', ipotesi.dati), 'miglioramento', tabelle, ADESSO)).toThrow(/ipotesi/);
  });

  it('i risultati congelati di DMA e miglioramento sopravvivono a export e import', () => {
    const pratiche = [
      chiudiSezione(nuova('p6', dma.dati), 'dmaPreviste', tabelle, ADESSO),
      chiudiSezione(nuova('p7', mc.dati), 'miglioramento', tabelle, ADESSO),
    ];
    const archivio: Archivio = {versioneSchema: 1, enti: [{id: 'e1', nome: 'Comune di Prova'}], pratiche, ultimoExport: null};
    const vuoto: Archivio = {versioneSchema: 1, enti: [], pratiche: [], ultimoExport: null};
    const esito = preparaImport(vuoto, esporta(archivio, ADESSO).file);
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    expect(applicaImport(vuoto, esito.riepilogo).pratiche).toEqual(pratiche);
  });
});

describe("contratto in ipotesi e passaggio a definitivo (ticket 32, storie 11 e 88)", () => {
  const n10 = casiNormativiPensioneTfs.find((c) => c.id === 'PT-N10')!;
  const n01 = casiNormativiPensioneTfs.find((c) => c.id === 'PT-N01')!;
  const pensione = (id: string, dati: Pratica['dati']): Pratica => ({id, enteId: 'e1', tipo: 'pensione', dati: dati as never, congelati: [], creata: ADESSO, modificata: ADESSO});

  it("la pratica toccata da un'ipotesi porta l'avviso col nome del contratto e l'inizio della vigenza", () => {
    expect(ipotesiInBreve(pensione('p8', n10.dati), tabelle)).toBe("l'Ipotesi CCNL Funzioni Locali 2025-2027 si applicherà dal 01/01/2025");
  });

  it("una pratica fuori dalla vigenza di ogni ipotesi non ha l'avviso", () => {
    expect(ipotesiInBreve(pensione('p9', n01.dati), tabelle)).toBeUndefined();
  });

  it("anche un miglioramento scelto su un'ipotesi porta l'avviso (MC-N05)", () => {
    const mc = casiNormativiMiglioramento.find((c) => c.id === 'MC-N05')!;
    expect(ipotesiInBreve(pensione('p10', mc.dati), tabelle)).toBe("l'Ipotesi CCNL Funzioni Locali 2025-2027 si applicherà dal 01/01/2025");
  });

  /**
   * Il passaggio di prova a definitivo come lo farà il manutentore (storia 88): solo dati e registro. Stato
   * 'definitivo', i valori di `proposta` sotto le chiavi lette dal motore, nessuna IVC propria, una riga nuova.
   */
  const ipotesi = tabelle.contratti.find((c) => c.id === 'ccnl-2025-27')!;
  if (ipotesi.stato !== 'ipotesi') throw new Error('atteso ipotesi');
  const {proposta, ...comune} = ipotesi;
  const firmate: Tabelle = {
    ...tabelle,
    versione: '2099-01-01.1',
    registro: [...tabelle.registro, {id: '2099-01-01.1', motivo: 'CCNL 2025-27 definitivo (prova)'}],
    contratti: tabelle.contratti.map((c) => (c.id === comune.id ? {...comune, stato: 'definitivo', ...proposta, ivc: []} : c)),
  };

  it("alla firma la pratica chiusa torna da rilavorare con la causa del registro, e l'avviso sparisce (PT-N10)", () => {
    const chiusa = chiudiSezione(chiudiSezione(pensione('p11', n10.dati), 'umPensione', tabelle, ADESSO), 'tfs', tabelle, ADESSO);
    const stato = chiusure(chiusa, firmate);
    // L'IVC 2025 di 19,28 € anticipava il 2025-27: firmato, è riassorbita (D8).
    expect(stato.umPensione?.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale])).toEqual([
      ['voce-09', 23136, null],
      ['tredicesima', 206720, 204792],
    ]);
    expect(stato.tfs?.confronto.differenze.map((d) => [d.campo, d.congelato, d.attuale])).toEqual([
      ['tab-e', 2334476, 2311340],
      ['tredicesima', 206509, 204581],
    ]);
    expect(causaInBreve(chiusa, firmate)).toBe('CCNL 2025-27 definitivo (prova)');
    expect(ipotesiInBreve(chiusa, firmate)).toBeUndefined();
  });

  it('alla firma il miglioramento in ipotesi ha importi e si chiude (MC-N05)', () => {
    const mc = pensione('p12', casiNormativiMiglioramento.find((c) => c.id === 'MC-N05')!.dati);
    expect(() => chiudiSezione(mc, 'miglioramento', tabelle, ADESSO)).toThrow(/ipotesi/);
    const chiusa = chiudiSezione(mc, 'miglioramento', firmate, ADESSO);
    expect(chiusa.congelati[0]).toMatchObject({sezione: 'miglioramento', versioneTabelle: '2099-01-01.1', risultato: {stato: 'definitivo'}});
    expect(chiusure(chiusa, firmate).miglioramento?.daRilavorare).toBe(false);
  });
});
