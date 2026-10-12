import {describe, expect, it} from 'vitest';
import {scegliProposta} from './scegli';
import type {Proposta} from './tipi';

const con = (cf: string): Proposta => ({
  cf,
  dati: {anagrafica: {codiceFiscale: cf}, voci: {base: {}, eccezioni: {}}, partTime: {base: {percentuale: 100}, eccezioni: {}}},
  avvisi: [],
  nonRiconosciute: [],
});
const proposte = [con('RSSMRA80A01H501U'), con('VRDLGI75B02F205Z')];

describe('scegliProposta (seam S2)', () => {
  it('con il CF nella pratica prende la Proposta di quel CF, anche fra i dipendenti di un ente intero', () => {
    expect(scegliProposta(proposte, 'VRDLGI75B02F205Z')).toEqual({esito: 'scelta', proposta: proposte[1]});
  });

  it('il CF della pratica si confronta senza spazi né differenze di maiuscole', () => {
    expect(scegliProposta(proposte, ' rssmra80a01h501u ')).toEqual({esito: 'scelta', proposta: proposte[0]});
  });

  it('se il CF della pratica non è nei PDF non c\'è nessuna Proposta applicabile, ma i CF trovati si elencano', () => {
    expect(scegliProposta(proposte, 'BNCGNN70C03L219X')).toEqual({esito: 'assente', trovati: ['RSSMRA80A01H501U', 'VRDLGI75B02F205Z']});
  });

  it('senza CF nella pratica si sceglie da un elenco', () => {
    expect(scegliProposta(proposte, '')).toEqual({esito: 'elenco', proposte});
  });

  it('senza nessun dipendente letto non c\'è niente da scegliere', () => {
    expect(scegliProposta([], 'RSSMRA80A01H501U')).toEqual({esito: 'vuoto'});
  });
});
