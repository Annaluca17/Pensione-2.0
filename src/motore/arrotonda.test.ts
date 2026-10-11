import {describe, expect, it} from 'vitest';
import {arrotonda} from './index';

// arrotonda riceve centesimi a precisione piena e restituisce centesimi interi (D17).
describe('arrotonda', () => {
  it('arrotonda al centesimo half-up', () => {
    expect(arrotonda(1234.4)).toBe(1234);
    expect(arrotonda(1234.5)).toBe(1235);
    expect(arrotonda(1234.6)).toBe(1235);
    expect(arrotonda(1234)).toBe(1234);
  });

  it('tratta i casi x,xx5 che in virgola mobile cadono appena sotto la metà', () => {
    // 1,005 € e 2,675 € in double valgono 1,00499999… e 2,67499999…: Math.round darebbe 100 e 267.
    expect(1.005 * 100).toBeLessThan(100.5);
    expect(arrotonda(1.005 * 100)).toBe(101);
    expect(arrotonda(2.675 * 100)).toBe(268);
    // 1.234,565 € × 1 dopo un /26 e un ×26: il giro di andata e ritorno sporca l'ultima cifra.
    expect(arrotonda((123456.5 / 26) * 26)).toBe(123457);
    // 80% di 1.234,56 € = 987,648 € → 987,65 €
    expect(arrotonda(123456 * 0.8)).toBe(98765);
  });

  it('non arrotonda per eccesso ciò che è davvero sotto la metà', () => {
    expect(arrotonda(100.4999)).toBe(100);
    expect(arrotonda(98764.8 - 0.3)).toBe(98765);
    expect(arrotonda(98764.49)).toBe(98764);
  });

  it('sui negativi arrotonda la metà lontano da zero', () => {
    expect(arrotonda(-1234.5)).toBe(-1235);
    expect(arrotonda(-1.005 * 100)).toBe(-101);
    expect(arrotonda(-1234.4)).toBe(-1234);
  });

  it('lancia solo per un valore non finito (errore di programmazione)', () => {
    expect(() => arrotonda(Number.NaN)).toThrow();
    expect(() => arrotonda(Number.POSITIVE_INFINITY)).toThrow();
  });
});
