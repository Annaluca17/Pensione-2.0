// Test sui soli dati dei contratti: stato, copertura, forma e valori chiave presi dalle fonti
// (ricerche tabelle-ccnl.md e indennita-comparto.md), scritti qui come letterali indipendenti.
import {describe, expect, it} from 'vitest';
import type {ContrattoDefinitivo, Scaglionamento} from '../motore';
import {tabelle} from './index';

const aree = ['funzionari-eq', 'istruttori', 'operatori-esperti', 'operatori'] as const;

function contratto(id: string) {
  const c = tabelle.contratti.find((x) => x.id === id);
  if (!c) throw new Error(`contratto ${id} assente`);
  return c;
}
function definitivo(id: string): ContrattoDefinitivo {
  const c = contratto(id);
  if (c.stato !== 'definitivo') throw new Error(`${id} non è definitivo`);
  return c;
}
function scaglionamento(id: string, decorrenza: string, tipo: Scaglionamento['tipo'] = 'tabellare') {
  const s = definitivo(id).scaglionamenti.find((x) => x.decorrenza === decorrenza && x.tipo === tipo);
  if (!s) throw new Error(`${id}: scaglionamento ${decorrenza} assente`);
  return s;
}
const mensili = (s: Scaglionamento) => aree.map((a) => s.importi[a].mensile);

describe('stato dei contratti', () => {
  it('il 2019-21 e il 2022-24 sono definitivi, il 2025-27 è un\'ipotesi', () => {
    expect(contratto('ccnl-2019-21').stato).toBe('definitivo');
    expect(contratto('ccnl-2022-24').stato).toBe('definitivo');
    expect(contratto('ccnl-2025-27').stato).toBe('ipotesi');
  });

  it('un\'ipotesi non espone importi: i suoi valori stanno solo sotto `proposta`', () => {
    for (const c of tabelle.contratti.filter((x) => x.stato === 'ipotesi')) {
      expect(c).not.toHaveProperty('scaglionamenti');
      expect(c).not.toHaveProperty('ivc');
      expect(c).not.toHaveProperty('indennitaComparto');
      expect(c).toHaveProperty('proposta');
    }
    for (const c of tabelle.contratti.filter((x) => x.stato === 'definitivo')) {
      expect(c).toHaveProperty('scaglionamenti');
      expect(c).not.toHaveProperty('proposta');
    }
  });

  it('id univoci, firma e vigenza coerenti, ogni contratto con la sua fonte', () => {
    const ids = tabelle.contratti.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of tabelle.contratti) {
      expect(c.vigenza.dal <= c.vigenza.al).toBe(true);
      expect(c.fonte.startsWith('https://')).toBe(true);
    }
    expect(contratto('ccnl-2019-21').firma).toBe('2022-11-16');
    expect(contratto('ccnl-2022-24').firma).toBe('2026-02-23');
    expect(contratto('ccnl-2025-27').firma).toBe('2026-07-21');
  });
});

describe('copertura e forma degli scaglionamenti', () => {
  it('le tabelle partono dal 01/01/2019', () => {
    expect(tabelle.coperturaDal).toBe('2019-01-01');
    const primo = [...definitivo('ccnl-2019-21').scaglionamenti].map((s) => s.decorrenza).sort()[0];
    expect(primo).toBe('2019-01-01');
  });

  it('scaglionamenti in ordine di decorrenza, ciascuno completo per la sua chiave', () => {
    for (const c of tabelle.contratti.filter((x) => x.stato === 'definitivo')) {
      const dec = (c as ContrattoDefinitivo).scaglionamenti.map((s) => s.decorrenza);
      expect(dec).toEqual([...dec].sort());
      for (const s of (c as ContrattoDefinitivo).scaglionamenti) {
        const attese = s.chiave === 'posizione' ? [...tabelle.posizioni] : [...aree];
        expect(Object.keys(s.importi).sort()).toEqual(attese.sort());
      }
    }
  });
});

describe('valori delle fonti', () => {
  it('CCNL 2019-21: tabellari per posizione 2019, 2020, 2021 e 2023 (Tab. E e F) e per area 2023 (Tab. G)', () => {
    expect(scaglionamento('ccnl-2019-21', '2019-01-01').importi.D7.annuo).toBe(3132724);
    expect(scaglionamento('ccnl-2019-21', '2019-01-01').importi.A1.annuo).toBe(1716417);
    expect(scaglionamento('ccnl-2019-21', '2020-01-01').importi.C5.annuo).toBe(2322960);
    expect(scaglionamento('ccnl-2019-21', '2021-01-01').importi.D7.annuo).toBe(3239020);
    expect(scaglionamento('ccnl-2019-21', '2023-01-01').importi.C5.annuo).toBe(2398980);
    expect(scaglionamento('ccnl-2019-21', '2023-04-01').importi.operatori.annuo).toBe(1828331);
  });

  it('CCNL 2022-24: tabellari d\'area 2024 e 2026 (mensili come sul cedolino)', () => {
    expect(mensili(scaglionamento('ccnl-2022-24', '2024-01-01'))).toEqual([207847, 191555, 170438, 163712]);
    expect(mensili(scaglionamento('ccnl-2022-24', '2026-01-01'))).toEqual([209284, 192823, 171527, 164609]);
  });

  it('CCNL 2022-24: l\'incremento 2023 per area è lo 0,5% del tabellare Tab. G / 12', () => {
    expect(mensili(scaglionamento('ccnl-2022-24', '2023-04-01', 'incremento'))).toEqual([967, 891, 793, 762]);
  });

  it('Ipotesi 2025-27: tabellari 2025, 2026 e 2027 solo come proposta', () => {
    const c = contratto('ccnl-2025-27');
    if (c.stato !== 'ipotesi') throw new Error('atteso ipotesi');
    const per = (d: string) => aree.map((a) => c.proposta.scaglionamenti.find((s) => s.decorrenza === d)!.importi[a].mensile);
    expect(per('2025-01-01')).toEqual([212751, 196075, 174460, 167575]);
    expect(per('2026-01-01')).toEqual([219202, 201963, 179660, 172421]);
    expect(per('2027-01-01')).toEqual([223136, 205586, 182880, 175504]);
  });

  it('IVC: 0,6% e 1% del 2025 per area, ancorate all\'Ipotesi 2025-27', () => {
    const ivc = definitivo('ccnl-2022-24').ivc.filter((p) => p.anticipa === 'ccnl-2025-27');
    expect(ivc.map((p) => p.dal)).toEqual(['2025-04-01', '2025-07-01']);
    expect(aree.map((a) => ivc[0].importi[a].mensile)).toEqual([1256, 1157, 1029, 988]);
    expect(aree.map((a) => ivc[1].importi[a].mensile)).toEqual([2093, 1928, 1715, 1646]);
  });

  it('IVC 2019-21: per posizione, 0,42% da aprile a giugno 2019 e 0,70% dopo, assorbite dal CCNL 2019-21', () => {
    // Caso di fantasia (C3), validato da Luca: importi dal PDF RGS IVC 2019 Funzioni Locali.
    const ivc = definitivo('ccnl-2019-21').ivc;
    const delMese = (mese: string) => ivc.find((p) => p.dal <= `${mese}-01` && (!p.al || `${mese}-01` <= p.al));
    expect(ivc.every((p) => p.anticipa === 'ccnl-2019-21' && p.chiave === 'posizione')).toBe(true);
    expect(delMese('2019-03')).toBeUndefined();
    expect(delMese('2019-05')?.importi.C3.mensile).toBe(749);
    expect(delMese('2022-05')?.importi.C3.mensile).toBe(1249);
  });

  it('IVC 2022-23: per posizione, assorbite dal CCNL 2022-24 (valgono 0 se si applica)', () => {
    const ivc = definitivo('ccnl-2022-24').ivc.filter((p) => p.anticipa === 'ccnl-2022-24');
    expect(ivc.map((p) => p.dal)).toEqual(['2022-04-01', '2022-07-01', '2023-01-01']);
    expect(ivc[2].importi.D7.mensile).toBe(1350);
    expect(ivc[2].importi.C5.mensile).toBe(1000);
    expect(ivc[2].importi.A1.mensile).toBe(752);
  });
});

describe('indennità di comparto (voce 10)', () => {
  const comparto = definitivo('ccnl-2022-24').indennitaComparto;

  it('fino al 2025 51,90 / 45,80 / 39,31 / 32,40; dal 01/01/2026 36,33 / 32,06 / 27,52 / 22,68', () => {
    expect(comparto.map((k) => k.decorrenza)).toEqual(['2019-01-01', '2026-01-01']);
    expect(aree.map((a) => comparto[0].importi[a].mensile)).toEqual([5190, 4580, 3931, 3240]);
    expect(aree.map((a) => comparto[1].importi[a].mensile)).toEqual([3633, 3206, 2752, 2268]);
  });

  it('residua = partenza - quota conglobata (bilancio + fondo), per ogni area', () => {
    const quota = comparto[1].quotaConglobata!;
    for (const a of aree) {
      expect(comparto[0].importi[a].mensile - quota[a].bilancio - quota[a].fondo).toBe(comparto[1].importi[a].mensile);
    }
  });

  it('Ipotesi 2025-27: 51,94 / 45,83 / 39,34 / 32,42 dal 01/07/2027, solo come proposta', () => {
    const c = contratto('ccnl-2025-27');
    if (c.stato !== 'ipotesi') throw new Error('atteso ipotesi');
    const k = c.proposta.indennitaComparto[0];
    expect(k.decorrenza).toBe('2027-07-01');
    expect(aree.map((a) => k.importi[a].mensile)).toEqual([5194, 4583, 3934, 3242]);
  });
});
