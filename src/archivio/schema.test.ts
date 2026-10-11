// Lo schema dell'archivio deve corrispondere ai tipi del motore (spec "Persistenza"): se divergono,
// fallisce `tsc -b` (le asserzioni di tipo) oppure il test a runtime.
import {describe, expect, expectTypeOf, it} from 'vitest';
import type {z} from 'zod';
import {calcolaPratica} from '../motore';
import type {Congelato, DatiPratica, SezioneCalcolata} from '../motore';
import {tabelle} from '../tabelle';
import {schemaCongelato, schemaDatiPratica, schemaMeseParziale, schemaRetribuzione, schemaTfr} from './schema';

/** Assegnabili nei due versi (per l'unione intera, dove toEqualTypeOf non regge). */
type Equivalenti<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const dati: DatiPratica = {
  anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-06-20'},
  voci: {base: {'01': 192823, '02': 9019, '09': 1928, '10': 3206}, eccezioni: {'2025-12': {'01': 191555}}},
  partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {'2026-01': {percentuale: 100}}},
  forzature: {giorniMeseParziale: 18},
  iscrittoCredito: true,
  pensioneErogata: {fissi: 100, tredicesima: 10},
};

describe('schema ↔ tipi del motore', () => {
  it('DatiPratica: stesso tipo in entrambe le direzioni', () => {
    expectTypeOf<z.infer<typeof schemaDatiPratica>>().toEqualTypeOf<DatiPratica>();
  });

  it('Congelato: ogni sezione calcolata ha lo stesso tipo, e l\'unione è equivalente', () => {
    type Piatto<T> = {[K in keyof T]: T[K]};
    expectTypeOf<z.infer<typeof schemaTfr>>().toEqualTypeOf<Piatto<SezioneCalcolata<'tfr'>>>();
    expectTypeOf<z.infer<typeof schemaMeseParziale>>().toEqualTypeOf<Piatto<SezioneCalcolata<'meseParziale'>>>();
    expectTypeOf<z.infer<typeof schemaRetribuzione>>().toEqualTypeOf<Piatto<SezioneCalcolata<'retribuzione'>>>();
    expectTypeOf<Equivalenti<z.infer<typeof schemaCongelato>, Congelato>>().toEqualTypeOf<true>();
  });

  it('una DatiPratica completa passa la validazione e torna identica', () => {
    expect(schemaDatiPratica.parse(dati)).toEqual(dati);
  });

  it('un risultato congelato vero (sezione TFR, mese parziale e retribuzione) passa la validazione', () => {
    const r = calcolaPratica(dati, tabelle);
    for (const sezione of ['tfr', 'meseParziale', 'retribuzione'] as const) {
      const risultato = r.sezioni[sezione];
      expect(risultato.esito).toBe('calcolata');
      const congelato = {sezione, versioneTabelle: r.versioneTabelle, dati, risultato};
      expect(schemaCongelato.parse(congelato)).toEqual(congelato);
    }
  });

  it('una forzatura estranea (importo di riga) non entra (storia 38)', () => {
    const conEstranea = {...dati, forzature: {importoRiga: 1}};
    expect(schemaDatiPratica.parse(conEstranea).forzature).toEqual({});
  });
});
