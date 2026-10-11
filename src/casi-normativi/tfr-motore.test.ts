// Ticket 08: i casi normativi TFR validati (ticket 07) passano dal seam calcolaPratica(dati, tabelle)
// con le tabelle CCNL vere, esatti al centesimo.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {Avviso, Risultato, Tfr} from '../motore';
import {tabelle} from '../tabelle';
import {casiNormativiTfr} from './tfr';

const CODICI_TFR = ['soglia-quindici-giorni-altra-regola', 'ivc-incompatibile', 'mese-iniziale-fuori-finestra'];

const sezioneTfr = (r: Risultato): Tfr => {
  const s = r.sezioni.tfr;
  if (s.esito !== 'calcolata') throw new Error(`TFR bloccato: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

/** Un avviso come lo scrive il caso: codice e dati, senza tipo né fonte. */
const comeNelCaso = ({tipo: _t, codice, fonte: _f, ...dati}: Extract<Avviso, {fonte: string}>) => ({codice, dati});

describe('casi normativi TFR dal motore', () => {
  for (const caso of casiNormativiTfr.filter((c) => c.validazione.stato === 'validato')) {
    describe(`${caso.id}: ${caso.titolo}`, () => {
      const risultato = calcolaPratica(caso.dati, tabelle);
      const atteso = caso.atteso;

      it('porta l\'id della versione delle tabelle', () => {
        expect(risultato.versioneTabelle).toBe(tabelle.versione);
      });

      if (atteso.esito === 'bloccata') {
        it('sezione TFR bloccata con i motivi attesi', () => {
          expect(risultato.sezioni.tfr).toEqual({esito: 'bloccata', motivi: atteso.blocchi});
        });
        return;
      }

      it('decorrenze, soglia e mesi delle estremità', () => {
        const tfr = sezioneTfr(risultato);
        expect(tfr.decorrenzaGiuridica).toBe(atteso.decorrenzaGiuridica);
        expect(tfr.decorrenzaEconomica).toBe(atteso.decorrenzaEconomica);
        expect(tfr.dataCessazione).toBe(atteso.dataCessazione);
        expect({giorni: tfr.soglia.giorni, conteggio: tfr.soglia.conteggio}).toEqual(atteso.soglia);
        expect(tfr.meseIniziale).toEqual(atteso.meseIniziale);
        expect(tfr.meseFinale).toEqual(atteso.meseFinale);
      });

      it('righe esatte al centesimo, con la composizione per voce e mese', () => {
        const righe = sezioneTfr(risultato).righe;
        expect(righe.map((r) => [r.estremo, r.id])).toEqual(atteso.righe.map((r) => [r.estremo, r.riga]));
        atteso.righe.forEach((attesa, i) => {
          const {composizione} = righe[i];
          expect(composizione.arrotondato, attesa.riga).toBe(attesa.valore);
          const [n, d] = attesa.pieno.split('/').map(Number);
          expect(composizione.pieno).toBeCloseTo(n / (d ?? 1), 6);
          const perMese = attesa.termini.map((t) => ({
            mese: t.mese,
            voci: Object.fromEntries(
              composizione.addendi.filter((a) => a.mese === t.mese).map((a) => [a.voce, a.importo]),
            ),
            percentuale: composizione.addendi.find((a) => a.mese === t.mese)?.percentuale ?? 100,
            giorni: composizione.addendi.find((a) => a.mese === t.mese)?.giorni,
          }));
          expect(perMese).toEqual(attesa.termini.map((t) => ({...t, giorni: t.giorni})));
          expect(new Set(composizione.addendi.map((a) => a.mese))).toEqual(new Set(attesa.termini.map((t) => t.mese)));
          expect(composizione.fonte.length).toBeGreaterThan(0);
        });
      });

      it('avvisi del TFR attesi, con la fonte', () => {
        const delTfr = risultato.avvisi.filter((a) => CODICI_TFR.includes(a.codice)) as Extract<Avviso, {fonte: string}>[];
        expect(delTfr.map(comeNelCaso)).toEqual(atteso.avvisi.map(({codice, dati}) => ({codice, dati})));
        for (const a of delTfr) expect(a.fonte.length).toBeGreaterThan(0);
      });
    });
  }
});
