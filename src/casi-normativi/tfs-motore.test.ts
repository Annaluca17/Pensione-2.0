// Ticket 25: i casi normativi di UM TFS validati (ticket 20) passano dal seam calcolaPratica(dati, tabelle)
// con le tabelle CCNL vere, esatti al centesimo: 9 righe nell'ordine della maschera (D16), Σ dei 12 mesi
// effettivi senza ×13 (D3), 13ª = Σ12/12 (D20), totale = somma delle righe arrotondate (D17).
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {Avviso, Risultato, Tfs} from '../motore';
import {tabelle} from '../tabelle';
import {casiNormativiPensioneTfs} from './pensione-tfs';

const sezioneTfs = (r: Risultato): Tfs => {
  const s = r.sezioni.tfs;
  if (!s) throw new Error('sezione TFS assente');
  if (s.esito !== 'calcolata') throw new Error(`TFS bloccata: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

/** Un avviso come lo scrive il caso: codice e dati, senza tipo né fonte. */
const comeNelCaso = ({tipo: _t, fonte: _f, codice, ...dati}: Extract<Avviso, {fonte: string}>) => ({codice, dati});
const chiave = (a: {codice: string; dati?: Record<string, unknown>}) => `${a.codice}|${a.dati?.mese ?? ''}|${a.dati?.contratto ?? ''}`;

describe('casi normativi UM TFS dal motore', () => {
  for (const caso of casiNormativiPensioneTfs.filter((c) => c.validazione.stato === 'validato')) {
    describe(`${caso.id}: ${caso.titolo}`, () => {
      const risultato = calcolaPratica(caso.dati, tabelle);
      const atteso = caso.atteso.tfs;

      it('le 9 righe della maschera, nell\'ordine, esatte al centesimo', () => {
        const tfs = sezioneTfs(risultato);
        expect(tfs.righe.map((r) => r.id)).toEqual(tabelle.righePassweb.tfs.map((r) => r.id));
        expect(tfs.righe.map((r) => r.id)).toEqual(atteso.righe.map((r) => r.riga));
        atteso.righe.forEach((attesa, i) => {
          expect(tfs.righe[i].composizione.arrotondato, attesa.riga).toBe(attesa.valore);
        });
      });

      it('composizione: un addendo per voce e mese, fonte, 13ª = Σ12 / 12 con un solo arrotondamento (D20)', () => {
        const tfs = sezioneTfs(risultato);
        atteso.righe.forEach((attesa, i) => {
          const {composizione} = tfs.righe[i];
          const mesi = new Set(composizione.addendi.map((a) => a.mese));
          for (const m of mesi) expect(m >= atteso.mesi.dal && m <= atteso.mesi.al, `${attesa.riga} ${m}`).toBe(true);
          for (const a of composizione.addendi) expect(attesa.voci, `${attesa.riga} ${a.voce}`).toContain(a.voce);
          expect(composizione.fonte).not.toBe('');
          const annualizzato = caso.atteso.avvisi.some((a) => a.codice === 'tfs-annualizzato');
          expect(composizione.operazioni.map((o) => [o.tipo, o.per])).toEqual([
            ...(annualizzato ? [['moltiplica', 12]] : []),
            ...(attesa.divisore === 12 ? [['dividi', 12]] : []),
          ]);
          if (annualizzato) expect(composizione.addendi.every((a) => a.mese === atteso.mesi.al)).toBe(true);
        });
      });

      it('avvisi: insieme intero del caso (pensione e TFS), senza doppioni', () => {
        const attesi = caso.atteso.avvisi.map(({codice, dati}) => ({codice, dati}));
        const dati = risultato.avvisi.map((a) => ('fonte' in a ? comeNelCaso(a) : {codice: a.codice, dati: a}));
        const ordina = <T extends {codice: string; dati?: Record<string, unknown>}>(l: T[]) => [...l].sort((x, y) => chiave(x).localeCompare(chiave(y)));
        expect(ordina(dati)).toEqual(ordina(attesi));
        for (const a of risultato.avvisi) if ('fonte' in a) expect(a.fonte).not.toBe('');
      });

      it('etichetta e campo PASSWEB come nella maschera', () => {
        const tfs = sezioneTfs(risultato);
        tabelle.righePassweb.tfs.forEach((def, i) => {
          expect(tfs.righe[i].etichetta).toBe(def.etichetta);
          expect(tfs.righe[i].campoPassweb).toBe(def.campoPassweb);
        });
      });

      it('totale = somma delle righe arrotondate (D17) e mesi della finestra', () => {
        const tfs = sezioneTfs(risultato);
        expect(tfs.totale).toBe(atteso.totale);
        expect(tfs.dal).toBe(atteso.mesi.dal);
        expect(tfs.al).toBe(atteso.mesi.al);
      });
    });
  }
});
