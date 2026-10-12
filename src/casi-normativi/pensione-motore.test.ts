// Ticket 23: i casi normativi di UM pensione e situazioni validati (ticket 20) passano dal seam
// calcolaPratica(dati, tabelle) con le tabelle CCNL vere, esatti al centesimo. Il TFS degli stessi
// casi è in tfs-motore.test.ts (ticket 25), insieme all'insieme intero degli avvisi.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {Risultato, UmPensione} from '../motore';
import {tabelle} from '../tabelle';
import {casiNormativiPensioneTfs} from './pensione-tfs';

const sezionePensione = (r: Risultato): UmPensione => {
  const s = r.sezioni.umPensione;
  if (!s) throw new Error('sezione UM pensione assente');
  if (s.esito !== 'calcolata') throw new Error(`UM pensione bloccata: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

describe('casi normativi UM pensione e situazioni dal motore', () => {
  for (const caso of casiNormativiPensioneTfs.filter((c) => c.validazione.stato === 'validato')) {
    describe(`${caso.id}: ${caso.titolo}`, () => {
      const risultato = calcolaPratica(caso.dati, tabelle);
      const atteso = caso.atteso.pensione;

      it('porta l\'id della versione delle tabelle', () => {
        expect(risultato.versioneTabelle).toBe(tabelle.versione);
      });

      it('date di riferimento proposte dalla situazione (D19, C20-1)', () => {
        expect(risultato.dateRiferimento?.pensione.usato).toBe(caso.atteso.dateRiferimento.pensione);
        expect(risultato.dateRiferimento?.fineServizio.usato).toBe(caso.atteso.dateRiferimento.fineServizio);
      });

      it('una riga per voce, mensile × mensilità, esatta al centesimo', () => {
        const um = sezionePensione(risultato);
        expect(um.mese).toBe(atteso.mese);
        expect(um.righe.map((r) => r.voce)).toEqual(atteso.righe.map((r) => r.voce));
        atteso.righe.forEach((attesa, i) => {
          const {composizione} = um.righe[i];
          expect(composizione.arrotondato, attesa.voce).toBe(attesa.valore);
          expect(composizione.addendi).toEqual([{voce: attesa.voce, mese: atteso.mese, importo: attesa.mensile}]);
          expect(composizione.operazioni.map((o) => [o.tipo, o.per])).toEqual([['moltiplica', attesa.mensilita]]);
          expect(composizione.fonte).not.toBe('');
        });
      });

      it('13ª = somma dei mensili delle voci con 13ª', () => {
        const {tredicesima} = sezionePensione(risultato);
        expect(tredicesima.composizione.arrotondato).toBe(atteso.tredicesima.valore);
        expect(tredicesima.composizione.addendi.map((a) => a.voce)).toEqual(atteso.tredicesima.voci);
        expect(tredicesima.composizione.operazioni).toEqual([]);
      });

      it('totali = somma delle righe arrotondate (D17)', () => {
        const um = sezionePensione(risultato);
        expect(um.totaleAnnui).toBe(atteso.totaleAnnui);
        expect(um.totale).toBe(atteso.totale);
      });

      it('regime TFS: nessuna sezione TFR', () => {
        expect(caso.dati.regime).toBe('TFS');
        expect(risultato.sezioni.tfr).toBeUndefined();
      });
    });
  }
});
