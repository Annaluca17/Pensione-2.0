// La guida PASSWEB dal fascicolo (ticket 18): la sezione TFR del motore diventa l'ingresso della guida.
import {describe, expect, it} from 'vitest';
import {casiNormativiTfr} from '../casi-normativi/tfr';
import {calcolaPratica} from '../motore';
import type {Tfr} from '../motore';
import {tabelle} from '../tabelle';
import {casoDaTfr} from './caso';
import {buildPasswebGuide} from './costruttore';
import type {CasoGuida} from './costruttore';
import fotografia from '../reperti/tfr/fotografia.json';

const tfr = (id: string): Tfr => {
  const s = calcolaPratica(casiNormativiTfr.find((c) => c.id === id)!.dati, tabelle).sezioni.tfr;
  if (s.esito !== 'calcolata') throw new Error('bloccata');
  return s;
};
const fmt = {eur: (n?: number) => `${n?.toFixed(2)} €`, data: (s: string) => s};

describe('casoDaTfr', () => {
  it('mese finale utile: rateo di cessazione in euro (N02)', () => {
    expect(casoDaTfr(tfr('TFR-N02'))).toMatchObject({casoIniziale: 'PIENO', casoFinale: 'PARZIALE_GE15', rateoCessazione: 111.65});
  });

  it('mese finale non utile: 13ª ed emolumenti per cassa (N03)', () => {
    expect(casoDaTfr(tfr('TFR-N03'))).toMatchObject({casoFinale: 'PARZIALE_LT15', tredicesimaEmolumentiCassa: 2313.85});
  });

  it('mese iniziale utile e non utile, con la decorrenza economica (N10, N11)', () => {
    expect(casoDaTfr(tfr('TFR-N10'))).toMatchObject({casoIniziale: 'PARZIALE_GE15', rateoPrimoAnno: 116.06});
    expect(casoDaTfr(tfr('TFR-N11'))).toMatchObject({casoIniziale: 'PARZIALE_LT15', decorrenzaEconomica: '2026-04-01'});
  });

  it('i risultati del vecchio modulo TFR (fotografia) aprono ancora la guida', () => {
    for (const caso of fotografia.casi) {
      const passi = buildPasswebGuide(caso.uscite as CasoGuida, fmt);
      expect(passi.map((p) => p.id)).toContain('dati-retributivi');
      expect(passi).toHaveLength(11);
    }
  });

  it('la guida usa i valori: undici passi, dati retributivi adattati', () => {
    const passi = buildPasswebGuide(casoDaTfr(tfr('TFR-N02')), fmt);
    expect(passi).toHaveLength(11);
    expect(passi.find((p) => p.id === 'dati-retributivi')!.paragrafi[0]).toContain('111.65 €');
  });
});
