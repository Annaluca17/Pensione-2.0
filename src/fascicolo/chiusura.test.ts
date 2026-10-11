// Chiusura e "da rilavorare" (ticket 15) con le tabelle vere e una correzione di prova. Dati di fantasia.
import {describe, expect, it} from 'vitest';
import {applicaImport, esporta, preparaImport} from '../archivio';
import type {Archivio, Pratica} from '../archivio';
import type {Tabelle} from '../motore';
import {casiNormativiTfr} from '../casi-normativi/tfr';
import {tabelle} from '../tabelle';
import {causaInBreve, chiudiSezione, chiusure, riapriSezione} from './chiusura';

const ADESSO = '2026-10-12T10:00:00.000Z';
const n02 = casiNormativiTfr.find((c) => c.id === 'TFR-N02')!;
const pratica: Pratica = {id: 'p1', enteId: 'e1', tipo: 'cessazione', dati: n02.dati, congelati: [], creata: ADESSO, modificata: ADESSO};

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
