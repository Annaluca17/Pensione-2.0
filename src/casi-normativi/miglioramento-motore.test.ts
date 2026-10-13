// Ticket 27: i casi normativi del miglioramento contrattuale validati (ticket 21) passano dal seam
// calcolaPratica(dati, tabelle) con le tabelle CCNL vere, esatti al centesimo: Scenario A, un UM migliorato
// per decorrenza (C21-6, C21-7), TFS migliorato mese per mese (C21-8), blocchi e avvisi del miglioramento.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {Avviso, DatiPraticaMiglioramento, Miglioramento, Risultato, UmPensione} from '../motore';
import {tabelle} from '../tabelle';
import {casiNormativiMiglioramento, type UmAtteso} from './miglioramento';

const sezione = (r: Risultato) => {
  const s = r.sezioni.miglioramento;
  if (!s) throw new Error('sezione miglioramento assente');
  return s;
};
const definitivo = (r: Risultato): Extract<Miglioramento, {stato: 'definitivo'}> => {
  const s = sezione(r);
  if (s.esito !== 'calcolata') throw new Error(`miglioramento bloccato: ${s.motivi.map((m) => m.codice)}`);
  if (s.stato !== 'definitivo') throw new Error('miglioramento in ipotesi');
  return s;
};

/** Un UM come lo scrive il caso: righe per voce (mensile e valore), 13ª, totali. */
const comeNelCaso = (um: UmPensione): Omit<UmAtteso, 'mese'> => ({
  righe: um.righe.map((r) => ({voce: r.voce, mensile: r.composizione.addendi.reduce((s, a) => s + a.importo, 0), valore: r.composizione.arrotondato})),
  tredicesima: {voci: [...new Set(um.tredicesima.composizione.addendi.map((a) => a.voce))], valore: um.tredicesima.composizione.arrotondato},
  totaleAnnui: um.totaleAnnui,
  totale: um.totale,
});
const perVoce = <T extends {voce: string}>(l: T[]) => [...l].sort((x, y) => x.voce.localeCompare(y.voce));
const ordinaUm = (u: Omit<UmAtteso, 'mese'>) => ({...u, righe: perVoce(u.righe), tredicesima: {...u.tredicesima, voci: [...u.tredicesima.voci].sort()}});

/** Gli avvisi del miglioramento: i suoi codici e l'ipotesi del contratto scelto (C21-5, ticket 21). */
const CODICI = new Set(['miglioramento-non-applicabile', 'pensione-erogata-diversa', 'nessun-miglioramento-reale', 'tfs-da-modificare']);
/** Un avviso come lo scrive il caso: `righe` del TFS come elenco separato da virgole. */
const comeAvvisoNelCaso = ({tipo: _t, codice, fonte, ...dati}: Extract<Avviso, {fonte: string}>) => ({
  codice,
  dati: 'righe' in dati ? {righe: dati.righe.join(',')} : dati,
  fonte,
});
/** Il valore pieno scritto dal caso: intero o frazione ridotta. */
const pieno = (s: string) => s.split('/').map(Number).reduce((a, b) => a / b);

describe('casi normativi del miglioramento contrattuale dal motore', () => {
  for (const caso of casiNormativiMiglioramento.filter((c) => c.validazione.stato === 'validato')) {
    describe(`${caso.id}: ${caso.titolo}`, () => {
      const risultato = calcolaPratica(caso.dati, tabelle);
      const {atteso} = caso;
      const scelto = caso.dati.miglioramento.contratto;

      it('esito: calcolato, senza importi (ipotesi, T5) o bloccato (C21-5); blocchi della sezione', () => {
        const s = sezione(risultato);
        if (atteso.esito === 'bloccato') {
          expect(s.esito).toBe('bloccata');
          expect(s.esito === 'bloccata' && s.motivi).toEqual(atteso.blocchi.map((b) => ({tipo: 'blocco', ...b})));
          expect(risultato.blocchi).toEqual(expect.arrayContaining(atteso.blocchi.map((b) => ({tipo: 'blocco', ...b}))));
          return;
        }
        expect(s.esito).toBe('calcolata');
        expect(s.esito === 'calcolata' && s.stato).toBe(atteso.esito === 'senza-importi' ? 'ipotesi' : 'definitivo');
        expect(s.esito === 'calcolata' && s.contratto).toBe(scelto);
      });

      it('avvisi del miglioramento, con la fonte', () => {
        const nostri = risultato.avvisi.filter(
          (a): a is Extract<Avviso, {fonte: string}> => CODICI.has(a.codice) || (a.codice === 'contratto-in-ipotesi' && a.contratto === scelto),
        );
        expect(nostri.map((a) => {
          const {codice, dati} = comeAvvisoNelCaso(a);
          return {codice, dati};
        })).toEqual(atteso.avvisi.map(({codice, dati}) => ({codice, dati})));
        for (const a of nostri) expect(a.fonte.length).toBeGreaterThan(20);
      });

      it('proposta del contratto: quello nella cui vigenza cade la cessazione, firmato dopo (C21-5)', () => {
        const atteso_ = atteso.esito === 'bloccato' ? 'ccnl-2025-27' : scelto;
        expect(risultato.miglioramentoProposto).toBe(atteso_);
      });

      if (atteso.esito !== 'calcolato') return;

      it('TFS migliorato mese per mese contro il TFS ordinario (C21-8); in regime TFR né TFS né TFR di miglioramento', () => {
        const m = definitivo(risultato);
        if (!atteso.tfs) {
          expect(m.tfs).toBeUndefined();
          expect(Object.keys(m)).not.toContain('tfr');
          return;
        }
        const tfs = m.tfs!;
        expect({dal: tfs.dal, al: tfs.al}).toEqual(atteso.tfs.mesi);
        expect(tfs.righe.map((r) => ({riga: r.id, valore: r.composizione.arrotondato}))).toEqual(atteso.tfs.righe.map(({riga, valore}) => ({riga, valore})));
        atteso.tfs.righe.forEach((r, i) => expect(tfs.righe[i].composizione.pieno, r.riga).toBeCloseTo(pieno(r.pieno), 6));
        expect(tfs.totale).toBe(atteso.tfs.totale);
        for (const r of tfs.righe) {
          expect(r.composizione.fonte).toContain('C21-8');
          expect(new Set(r.composizione.addendi.map((a) => a.mese)).size).toBeLessThanOrEqual(12);
          expect(r.composizione.operazioni.some((o) => o.tipo === 'moltiplica')).toBe(false);
        }
        const ordinario = risultato.sezioni.tfs;
        if (ordinario?.esito !== 'calcolata') throw new Error('TFS ordinario non calcolato');
        expect(ordinario.righe.map((r) => ({riga: r.id, valore: r.composizione.arrotondato}))).toEqual(atteso.tfs.ordinario);
      });

      it('Scenario A = UM dalle voci inserite così come sono, IVC compresa (C21-7)', () => {
        const m = definitivo(risultato);
        expect(m.contratto).toBe(caso.dati.miglioramento.contratto);
        const {mese, ...a} = atteso.scenarioA!;
        expect(m.scenarioA.mese).toBe(mese);
        expect(ordinaUm(comeNelCaso(m.scenarioA))).toEqual(ordinaUm(a));
      });

      it('un UM migliorato per decorrenza, con 01, 02, 09, 10 dalle tabelle e la differenza su fissi e 13ª (C21-6, C21-7)', () => {
        const m = definitivo(risultato);
        expect(m.migliorati.map((b) => b.decorrenza)).toEqual(atteso.migliorati!.map((b) => b.decorrenza));
        atteso.migliorati!.forEach((b, i) => {
          const nuovo = m.migliorati[i];
          expect(nuovo.sostituite, b.decorrenza).toEqual(b.sostituite);
          const {righe, tredicesima, totaleAnnui, totale} = b;
          expect(ordinaUm(comeNelCaso(nuovo)), b.decorrenza).toEqual(ordinaUm({righe, tredicesima, totaleAnnui, totale}));
          expect(nuovo.differenza, b.decorrenza).toEqual(b.differenza);
          for (const r of [...nuovo.righe, nuovo.tredicesima]) expect(r.composizione.fonte).not.toBe('');
        });
      });
    });
  }
});


describe('cessato prima del 2022: il CCNL 2022-24 non si applica (C21-5, T3)', () => {
  const mcN07 = casiNormativiMiglioramento.find((c) => c.id === 'MC-N07')!;
  const r = calcolaPratica({...mcN07.dati, miglioramento: {contratto: 'ccnl-2022-24'}}, tabelle);

  it('scelto il 2022-24 → blocco miglioramento-non-applicabile; la proposta è il 2019-21', () => {
    expect(sezione(r)).toMatchObject({esito: 'bloccata', motivi: [{codice: 'miglioramento-non-applicabile', contratto: 'ccnl-2022-24', cessazione: '2021-06-30'}]});
    expect(r.miglioramentoProposto).toBe('ccnl-2019-21');
  });
});

// Ticket 01 delle prove: pratica inserita nel 2022, prima della firma del 2019-21 e del 2022-24. Dati di
// fantasia (CF fantasia) con l'IVC di maggio 2022 della pratica vera, 19,62: l'IVC pagata allora, che le
// tabelle non ricostruiscono (l'IVC 2019-21 non c'è, quella 2022 per B4 è 5,03). Non è ancora in
// `casiNormativiMiglioramento`: il caso completo (UM migliorati, TFS) va calcolato a mano e validato (HITL).
const datiPregressa: DatiPraticaMiglioramento = {
  anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'B4', assunzione: '1999-03-01', cessazione: '2022-05-31'},
  voci: {base: {'01': 158000, '02': 11083, '10': 3931}, eccezioni: {'2022-05': {'09': 1962}}},
  partTime: {base: {percentuale: 100}, eccezioni: {}},
  forzature: {},
  iscrittoCredito: true,
  regime: 'TFS',
  situazione: {tipo: 'ordinaria'},
  miglioramento: {contratto: 'ccnl-2022-24'},
};

describe('pratica pregressa con le tabelle di allora: UM pensione con la IVC inserita (ticket 01)', () => {
  const r = calcolaPratica(datiPregressa, tabelle);

  it('cessato 05/2022 col 2022-24: l\'UM pensione tiene l\'IVC inserita (19,62 mensili, 235,44 annui)', () => {
    const um = r.sezioni.umPensione;
    if (um?.esito !== 'calcolata') throw new Error('UM pensione non calcolato');
    expect(um.righe.find((x) => x.voce === '09')?.composizione.arrotondato).toBe(23544);
  });

  it('l\'UM pensione coincide con lo Scenario A del miglioramento (C21-7)', () => {
    const um = r.sezioni.umPensione;
    if (um?.esito !== 'calcolata') throw new Error('UM pensione non calcolato');
    expect(ordinaUm(comeNelCaso(um))).toEqual(ordinaUm(comeNelCaso(definitivo(r).scenarioA)));
  });
});
