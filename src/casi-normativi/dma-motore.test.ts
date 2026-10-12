// Ticket 26: i casi normativi delle DMA previste validati (ticket 21) passano dal seam
// calcolaPratica(dati, tabelle) con le tabelle CCNL vere, esatti al centesimo: un periodo per mese
// solare da `dmaPreviste.dal` alla cessazione, i primi 6 (D12, C21-1), giorni D9, 13ª a dicembre e
// alla cessazione (D11, C21-3), campi per regime e Credito (R1-R5), codici 83/49 (R3, C21-2).
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {Avviso, DmaPreviste, Risultato} from '../motore';
import {tabelle} from '../tabelle';
import {casiNormativiDma} from './dma-previste';

const sezioneDma = (r: Risultato): DmaPreviste => {
  const s = r.sezioni.dmaPreviste;
  if (!s) throw new Error('sezione DMA previste assente');
  if (s.esito !== 'calcolata') throw new Error(`DMA previste bloccate: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

/** Valore pieno del caso ("n/d" centesimi) come numero. */
const frazione = (testo: string) => {
  const [n, d = '1'] = testo.split('/');
  return Number(n) / Number(d);
};

// Gli avvisi della sezione DMA (decisione 12 del ticket 26): le altre sezioni hanno i loro test.
const CODICI_DMA = new Set(['dma-non-prevista']);

describe('casi normativi delle DMA previste dal motore', () => {
  for (const caso of casiNormativiDma.filter((c) => c.validazione.stato === 'validato')) {
    describe(`${caso.id}: ${caso.titolo}`, () => {
      const risultato = calcolaPratica(caso.dati, tabelle);
      const {periodi: attesi} = caso.atteso;
      const mesiDma = new Set([...attesi.map((p) => p.mese), ...caso.atteso.blocchi.map((b) => b.mese)]);

      it('periodi: mese, date, giorni D9, 365esimi della 13ª, % part-time, regime e codice servizio', () => {
        const periodi = sezioneDma(risultato).periodi;
        expect(periodi.map(({campi: _c, ...p}) => p)).toEqual(attesi.map(({campi: _c, ...p}) => p));
      });

      it('campi per regime e Credito, nell\'ordine di righePassweb.dma, esatti al centesimo', () => {
        const periodi = sezioneDma(risultato).periodi;
        attesi.forEach((atteso, i) => {
          const campi = periodi[i].campi;
          expect(campi.map((c) => c.id), atteso.mese).toEqual(atteso.campi.map((c) => c.campo));
          atteso.campi.forEach((c, j) => {
            const {composizione, etichetta} = campi[j];
            const dove = `${atteso.mese} ${c.campo}`;
            expect(composizione.arrotondato, dove).toBe(c.valore);
            expect(Math.abs(composizione.pieno - frazione(c.pieno)), dove).toBeLessThan(1e-6);
            expect(etichetta, dove).toBe(tabelle.righePassweb.dma.find((d) => d.id === c.campo)!.etichetta);
            expect(composizione.fonte.length, dove).toBeGreaterThan(20);
          });
        });
      });

      it('composizione: voci del mese, % del mese, giorni su 26 e 365esimi della 13ª', () => {
        const periodi = sezioneDma(risultato).periodi;
        attesi.forEach((atteso, i) => {
          for (const {composizione} of periodi[i].campi) {
            for (const a of composizione.addendi) {
              expect(a.mese).toBe(atteso.mese);
              expect(a.percentuale ?? 100).toBe(atteso.percentuale);
              if (a.divisore !== undefined) expect([26, 365]).toContain(a.divisore);
              if (a.divisore === 365) expect(a.giorni).toBe(atteso.giorniTredicesima);
            }
          }
        });
      });

      it('blocchi dma-oltre-limite dal 7º mese, con limite e fonte; la sezione resta calcolata', () => {
        const blocchi = risultato.blocchi.filter((b) => b.codice === 'dma-oltre-limite');
        expect(blocchi.map(({tipo: _t, ...b}) => b)).toEqual(caso.atteso.blocchi);
        expect(risultato.sezioni.dmaPreviste?.esito).toBe('calcolata');
      });

      it('avvisi della sezione DMA (nessuna IVC incompatibile nei mesi DMA)', () => {
        const dma = risultato.avvisi.filter((a): a is Extract<Avviso, {fonte: string}> => CODICI_DMA.has(a.codice));
        expect(dma.map(({tipo: _t, codice, fonte, ...dati}) => ({codice, dati, fonte}))).toEqual(caso.atteso.avvisi);
        const ivc = risultato.avvisi.filter((a) => a.codice === 'ivc-incompatibile' && mesiDma.has(a.mese));
        expect(ivc).toEqual([]);
      });
    });
  }
});
