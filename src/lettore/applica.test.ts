import {describe, expect, it} from 'vitest';
import type {DatiPratica} from '../motore';
import {applicaProposta} from './applica';
import type {Proposta} from './tipi';

const vuota = (anagrafica: Partial<DatiPratica['anagrafica']> = {}): DatiPratica => ({
  anagrafica: {nome: '', codiceFiscale: '', posizione: '', ...anagrafica},
  voci: {base: {}, eccezioni: {}},
  partTime: {base: {percentuale: 100}, eccezioni: {}},
  forzature: {},
  iscrittoCredito: true,
});

const proposta = (p: Partial<Proposta['dati']> = {}): Proposta => ({
  cf: 'RSSMRA80A01H501U',
  dati: {
    anagrafica: {nome: 'ROSSI MARIO', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C5', assunzione: '1997-12-09', cessazione: '2026-09-30'},
    voci: {base: {'01': 192823}, eccezioni: {'2026-01': {'01': 190000}}},
    partTime: {base: {percentuale: 80}, eccezioni: {'2026-01': {percentuale: 90}}},
    ...p,
  },
  avvisi: [],
  nonRiconosciute: [],
});

describe('applicaProposta (seam S1)', () => {
  it('sostituisce voci e % part-time con quelli della Proposta, conservando il tipo O/V/M già indicato', () => {
    const prima = vuota();
    prima.voci = {base: {'01': 1, '12': 5000}, eccezioni: {'2025-05': {'01': 2}}};
    prima.partTime = {base: {percentuale: 100, tipo: 'O'}, eccezioni: {'2026-01': {percentuale: 100, tipo: 'V'}}};

    const {dati} = applicaProposta(prima, proposta());

    expect(dati.voci).toEqual({base: {'01': 192823}, eccezioni: {'2026-01': {'01': 190000}}});
    expect(dati.partTime).toEqual({
      base: {percentuale: 80, tipo: 'O'},
      eccezioni: {'2026-01': {percentuale: 90, tipo: 'V'}},
    });
  });

  it("riempie l'anagrafica solo nei campi vuoti", () => {
    const {dati, avvisi} = applicaProposta(vuota({nome: 'ROSSI MARIO'}), proposta());
    expect(dati.anagrafica).toEqual({
      nome: 'ROSSI MARIO', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C5', assunzione: '1997-12-09', cessazione: '2026-09-30',
    });
    expect(avvisi).toEqual([]);
  });

  it("un campo pieno e diverso non si sovrascrive e produce l'avviso; uno pieno e uguale no", () => {
    const {dati, avvisi} = applicaProposta(
      vuota({nome: 'ROSSI MARIO', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'D1', cessazione: '2026-10-31'}),
      proposta(),
    );
    expect(dati.anagrafica.posizione).toBe('D1');
    expect(dati.anagrafica.cessazione).toBe('2026-10-31');
    expect(dati.anagrafica.assunzione).toBe('1997-12-09');
    expect(avvisi).toEqual([
      "Posizione: nella pratica c'è D1, nei PDF C5; tenuto D1.",
      "Cessazione: nella pratica c'è 2026-10-31, nei PDF 2026-09-30; tenuto 2026-10-31.",
    ]);
  });

  it("avvisa delle voci della pratica che i PDF non contengono e che l'Applica toglie", () => {
    const prima = vuota();
    prima.voci = {base: {'01': 1, '12': 5000}, eccezioni: {'2025-05': {'13': 700}}};
    const {avvisi} = applicaProposta(prima, proposta());
    expect(avvisi).toEqual(['Voci della pratica non presenti nei PDF e tolte: 12, 13.']);
    expect(applicaProposta(vuota(), proposta()).avvisi).toEqual([]);
  });
});
