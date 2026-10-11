import {describe, expect, it} from 'vitest';
import {componi, totale} from './composizione';

// Seam provvisorio (concordato): il costruttore della composizione si testa qui finché nessuna
// sezione produce importi; dal ticket 08 lo copre calcolaPratica.
describe('componi', () => {
  it('somma le voci, applica le operazioni a precisione piena e arrotonda una volta sola', () => {
    const riga = componi({
      addendi: [
        {voce: '01', mese: '2026-03', importo: 123457},
        {voce: '03', mese: '2026-03', importo: 4321},
      ],
      operazioni: [
        {tipo: 'dividi', per: 26, motivo: 'giornaliera', fonte: 'CCNL 2019-21 art. 74 c. 4'},
        {tipo: 'moltiplica', per: 14, motivo: 'giorni del mese parziale'},
      ],
      fonte: 'prova',
    });
    // (123457 + 4321) / 26 × 14 = 68803,53846… cent
    expect(riga.pieno).toBeCloseTo(68803.538462, 5);
    expect(riga.arrotondato).toBe(68804);
    expect(riga.addendi).toHaveLength(2);
    expect(riga.operazioni.map((o) => o.motivo)).toEqual(['giornaliera', 'giorni del mese parziale']);
  });

  it('senza operazioni il valore pieno è la somma delle voci', () => {
    const riga = componi({addendi: [{voce: '01', mese: '2026-03', importo: 100}], operazioni: [], fonte: 'prova'});
    expect(riga.pieno).toBe(100);
    expect(riga.arrotondato).toBe(100);
  });
});

describe('totale', () => {
  it('è la somma delle righe già arrotondate, non l\'arrotondamento della somma (D17)', () => {
    // Tre righe da 1,004 €: arrotondate 1,00 € ciascuna → totale 3,00 €, non 3,01 €.
    const riga = () =>
      componi({
        addendi: [{voce: '01', mese: '2026-03', importo: 1004}],
        operazioni: [{tipo: 'dividi', per: 10, motivo: 'prova'}],
        fonte: 'prova',
      });
    expect(riga().arrotondato).toBe(100);
    expect(totale([riga(), riga(), riga()])).toBe(300);
  });

  it('di nessuna riga è zero', () => {
    expect(totale([])).toBe(0);
  });
});
