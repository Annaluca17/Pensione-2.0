// Test sui soli dati (spec "Testing Decisions"): ogni mensile in centesimi è l'arrotondamento
// dell'annuo pubblicato dalla fonte (T2, storia 87), e ogni importo ha una fonte.
import {describe, expect, it} from 'vitest';
import {arrotonda} from '../motore';
import type {Importo, Scaglionamento} from '../motore';
import {tabelle} from './index';

/** Tutti gli scaglionamenti, anche quelli di un'ipotesi (stanno sotto `proposta`). */
function scaglionamenti(): {contratto: string; scaglionamento: Scaglionamento}[] {
  return tabelle.contratti.flatMap((c) =>
    (c.stato === 'definitivo' ? c.scaglionamenti : c.proposta.scaglionamenti).map((scaglionamento) => ({
      contratto: c.id,
      scaglionamento,
    })),
  );
}

describe('tabellari: arrotonda(annuo / divisore) = mensile', () => {
  const casi = scaglionamenti().flatMap(({contratto, scaglionamento}) =>
    Object.entries(scaglionamento.importi)
      .filter(([, importo]) => importo.annuo !== undefined)
      .map(([chiave, importo]) => ({contratto, scaglionamento, chiave, importo})),
  );

  it('ci sono importi con annuo da verificare (il test non è vuoto)', () => {
    // 27 posizioni x 4 date del CCNL 2019-21 + 4 aree x 2 date del 2022-24 + 4 aree x 3 dell'ipotesi
    expect(casi.length).toBeGreaterThanOrEqual(27 * 4 + 4 * 2 + 4 * 3 + 4);
  });

  it.each(casi.map((c) => [`${c.contratto} ${c.scaglionamento.decorrenza} ${c.chiave}`, c] as const))(
    '%s',
    (_nome, {scaglionamento, importo}) => {
      expect(scaglionamento.divisoreAnnuo).toBeDefined();
      expect(arrotonda(importo.annuo! / scaglionamento.divisoreAnnuo!)).toBe(importo.mensile);
    },
  );

  it('il divisore dei tabellari è 12', () => {
    for (const {scaglionamento} of scaglionamenti()) {
      if (scaglionamento.tipo === 'tabellare') expect(scaglionamento.divisoreAnnuo).toBe(12);
    }
  });
});

describe('ogni importo ha una fonte', () => {
  it('propria o quella dell\'insieme che lo contiene', () => {
    const senzaFonte: string[] = [];
    const controlla = (dove: string, insieme: string, importi: Readonly<Record<string, Importo>>) => {
      for (const [chiave, importo] of Object.entries(importi)) {
        if (!(importo.fonte ?? insieme).trim()) senzaFonte.push(`${dove} ${chiave}`);
      }
    };
    for (const {contratto, scaglionamento} of scaglionamenti()) {
      controlla(`${contratto} ${scaglionamento.decorrenza}`, scaglionamento.fonte, scaglionamento.importi);
    }
    for (const c of tabelle.contratti) {
      if (c.stato === 'definitivo') {
        for (const p of c.ivc) controlla(`${c.id} ivc ${p.dal}`, p.fonte, p.importi);
      }
      const comparti = c.stato === 'definitivo' ? c.indennitaComparto : c.proposta.indennitaComparto;
      for (const k of comparti) controlla(`${c.id} comparto ${k.decorrenza}`, k.fonte, k.importi);
    }
    expect(senzaFonte).toEqual([]);
  });
});

describe('differenziali art. 14: misura annua su 13 mensilità', () => {
  it.each(Object.entries(tabelle.differenzialiArt14))('%s', (_area, d) => {
    expect(arrotonda(d.annuo / 13)).toBe(d.mensile);
    expect(d.fonte.trim()).not.toBe('');
  });
});
