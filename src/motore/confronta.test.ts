// confronta (ADR 0004, ticket 09): righe cambiate fra risultato congelato e ricalcolo, con la causa.
import {describe, expect, it} from 'vitest';
import {conAnagrafica, tabelleDiProva} from './fixture';
import {calcolaPratica, confronta, spiega} from './index';
import type {Congelato, DatiPratica, Tabelle} from './index';

const v1: Tabelle = {
  ...tabelleDiProva,
  righeTfr: [
    {id: 'retribuzione-valutabile', etichetta: 'Retribuzione valutabile del mese pieno', voci: ['01', '03'], fonte: 'prova'},
    {id: 'rateo-tredicesima-teorica', etichetta: 'Rateo di 13ª teorica', voci: ['01'], fonte: 'prova'},
    {id: 'tredicesima-emolumenti-cassa', etichetta: 'Tredicesima ed emolumenti per cassa', voci: ['01'], fonte: 'prova'},
  ],
};

/** Una correzione delle tabelle: la voce 03 entra anche nel rateo di 13ª. */
const v2: Tabelle = {
  ...v1,
  versione: '2026-11-02.1',
  registro: [...v1.registro, {id: '2026-11-02.1', motivo: 'Voce 03 con 13ª nel TFR (valore di tabella corretto)'}],
  righeTfr: v1.righeTfr.map((r) => (r.id === 'rateo-tredicesima-teorica' ? {...r, voci: ['01', '03']} : r)),
};

// Cessato sabato 20/06/2026 (18 lavorativi): mese utile, 01 2.000,00 + 03 150,00.
const dati: DatiPratica = conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-20'});
const risultato = calcolaPratica(dati, v1);
/** Come lo salva la persistenza alla chiusura (ADR 0004). */
const sezioneTfr = risultato.sezioni.tfr;
if (sezioneTfr.esito !== 'calcolata') throw new Error('TFR bloccato');
const chiusa: Congelato = {sezione: 'tfr', versioneTabelle: risultato.versioneTabelle, dati, risultato: sezioneTfr};

describe('confronta', () => {
  it('congelato uguale al ricalcolo: nessuna riga', () => {
    expect(confronta(chiusa, {dati, tabelle: v1}).differenze).toEqual([]);
  });

  it('tabelle corrette con una nuova riga di registro: righe cambiate con la causa = motivo della versione', () => {
    const confronto = confronta(chiusa, {dati, tabelle: v2});
    expect(confronto.versioni).toEqual({congelata: '2026-10-11.1', attuale: '2026-11-02.1'});
    expect(confronto.differenze).toEqual([
      {
        campo: 'finale/rateo-tredicesima-teorica',
        etichetta: 'Rateo di 13ª teorica (mese di cessazione)',
        tipo: 'importo',
        congelato: 10959, // 2.000,00 × 20 / 365
        attuale: 11781, // 2.150,00 × 20 / 365
        cause: [{tipo: 'tabelle', versioni: [{id: '2026-11-02.1', motivo: 'Voce 03 con 13ª nel TFR (valore di tabella corretto)'}]}],
      },
    ]);
  });

  it('un dato modificato dopo la chiusura dà la causa "dati", non "tabelle"', () => {
    const modificati = {...dati, voci: {base: {'01': 210000, '03': 15000}, eccezioni: {}}};
    const {differenze} = confronta(chiusa, {dati: modificati, tabelle: v1});
    expect(differenze.map((d) => [d.campo, d.cause])).toEqual([
      ['finale/retribuzione-valutabile', [{tipo: 'dati'}]],
      ['finale/rateo-tredicesima-teorica', [{tipo: 'dati'}]],
    ]);
  });

  it('dati e tabelle cambiati: ogni riga dice quale delle due cause la tocca', () => {
    const modificati = {...dati, voci: {base: {'01': 200000, '03': 20000}, eccezioni: {}}};
    const {differenze} = confronta(chiusa, {dati: modificati, tabelle: v2});
    expect(differenze.map((d) => [d.campo, d.cause.map((c) => c.tipo)])).toEqual([
      ['finale/retribuzione-valutabile', ['dati']],
      ['finale/rateo-tredicesima-teorica', ['tabelle', 'dati']],
    ]);
  });

  it('una data della pratica cambiata sposta decorrenze e righe', () => {
    const modificati = conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-30'});
    const campi = confronta(chiusa, {dati: modificati, tabelle: v1}).differenze.map((d) => [d.campo, d.congelato, d.attuale]);
    expect(campi).toEqual([
      ['dataCessazione', '2026-06-20', '2026-06-30'],
      ['finale/retribuzione-valutabile', 215000, null],
      ['finale/rateo-tredicesima-teorica', 10959, null],
    ]);
  });

  it('una sezione chiusa che ora si blocca è una differenza', () => {
    const modificati = conAnagrafica({assunzione: undefined, cessazione: '2026-06-20'});
    const [diff] = confronta(chiusa, {dati: modificati, tabelle: v1}).differenze;
    expect(diff).toMatchObject({campo: 'esito', congelato: 'calcolata', attuale: 'bloccata', cause: [{tipo: 'dati'}]});
  });
});

describe('spiega: differenze del confronto', () => {
  it('importo cambiato per le tabelle', () => {
    const [diff] = confronta(chiusa, {dati, tabelle: v2}).differenze;
    expect(spiega(diff)).toBe(
      'Rateo di 13ª teorica (mese di cessazione): da 109,59 € a 117,81 €. ' +
        'Causa: tabelle aggiornate, versione 2026-11-02.1 «Voce 03 con 13ª nel TFR (valore di tabella corretto)».',
    );
  });

  it('data e riga sparita per i dati', () => {
    const modificati = conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-30'});
    const [data, riga] = confronta(chiusa, {dati: modificati, tabelle: v1}).differenze;
    expect(spiega(data)).toBe(
      'Data di cessazione: da 20/06/2026 a 30/06/2026. Causa: dati della pratica modificati dopo la chiusura.',
    );
    expect(spiega(riga)).toBe(
      'Retribuzione valutabile del mese pieno (mese di cessazione): da 2.150,00 € a nessun valore. ' +
        'Causa: dati della pratica modificati dopo la chiusura.',
    );
  });
});
