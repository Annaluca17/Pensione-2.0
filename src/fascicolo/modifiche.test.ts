// Modifiche ai dati della pratica dal fascicolo (ticket 14). Dati di fantasia.
import {describe, expect, it} from 'vitest';
import type {DatiPratica} from '../motore';
import {
  impostaAnagrafica,
  impostaEccezionePartTime,
  impostaEccezioneVoce,
  impostaForzatura,
  impostaPartTimeBase,
  impostaVoceBase,
  leggiEuro,
  scriviEuro,
} from './modifiche';

const dati: DatiPratica = {
  anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-10-20'},
  voci: {base: {'01': 192823}, eccezioni: {}},
  partTime: {base: {percentuale: 100}, eccezioni: {}},
  forzature: {},
  iscrittoCredito: false,
};

describe('modifiche dei dati', () => {
  it('anagrafica: una data vuota toglie il campo', () => {
    expect(impostaAnagrafica(dati, 'cessazione', '').anagrafica).not.toHaveProperty('cessazione');
    expect(impostaAnagrafica(dati, 'posizione', 'D3').anagrafica.posizione).toBe('D3');
  });

  it('voci: base ed eccezioni per mese, che si tolgono senza lasciare mesi vuoti', () => {
    let d = impostaVoceBase(dati, '02', 9019);
    expect(d.voci.base).toEqual({'01': 192823, '02': 9019});
    d = impostaEccezioneVoce(d, '2025-12', '01', 191555);
    expect(d.voci.eccezioni).toEqual({'2025-12': {'01': 191555}});
    d = impostaEccezioneVoce(d, '2025-12', '01', undefined);
    expect(d.voci.eccezioni).toEqual({});
    expect(impostaVoceBase(d, '02', undefined).voci.base).toEqual({'01': 192823});
    expect(dati.voci.base).toEqual({'01': 192823}); // pure
  });

  it('part-time: base ed eccezioni', () => {
    let d = impostaPartTimeBase(dati, {percentuale: 50, tipo: 'O'});
    d = impostaEccezionePartTime(d, '2026-04', {percentuale: 80, tipo: 'M'});
    expect(d.partTime).toEqual({base: {percentuale: 50, tipo: 'O'}, eccezioni: {'2026-04': {percentuale: 80, tipo: 'M'}}});
    expect(impostaEccezionePartTime(d, '2026-04', undefined).partTime.eccezioni).toEqual({});
  });

  it('forzature: solo giorni e date di riferimento, che si tolgono', () => {
    const d = impostaForzatura(dati, 'giorniMeseParziale', 15);
    expect(d.forzature).toEqual({giorniMeseParziale: 15});
    expect(impostaForzatura(d, 'giorniMeseParziale', undefined).forzature).toEqual({});
  });
});

describe('importi in euro', () => {
  it('legge le forme italiane e quella col punto', () => {
    expect(leggiEuro('1.928,23')).toBe(192823);
    expect(leggiEuro('1928,2')).toBe(192820);
    expect(leggiEuro('1928.23')).toBe(192823);
    expect(leggiEuro(' 19 €')).toBe(1900);
    expect(leggiEuro('')).toBeUndefined();
    expect(leggiEuro('1,234')).toBeNull();
    expect(leggiEuro('abc')).toBeNull();
  });

  it('scrive all\'italiana', () => {
    expect(scriviEuro(192823)).toBe('1.928,23');
    expect(scriviEuro(5)).toBe('0,05');
    expect(scriviEuro(-12345678)).toBe('-123.456,78');
  });
});
