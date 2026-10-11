// Test sui dati di trasposizione/differenziale storico (voce 02), catalogo voci, righe PASSWEB del
// TFR, parametri e testo della lettera.
import {describe, expect, it} from 'vitest';
import {arrotonda} from '../motore';
import type {Area} from '../motore';
import {tabelle} from './index';

const categoriaArea: Record<string, Area> = {
  D: 'funzionari-eq',
  C: 'istruttori',
  B: 'operatori-esperti',
  A: 'operatori',
};
const ingresso: Record<string, string> = {D: 'D1', C: 'C1', B: 'B1', A: 'A1'};

function ivc2023(posizione: string) {
  const ccnl = tabelle.contratti.find((c) => c.id === 'ccnl-2022-24');
  if (ccnl?.stato !== 'definitivo') throw new Error('atteso CCNL 2022-24 definitivo');
  return ccnl.ivc.find((p) => p.dal === '2023-01-01')!.importi[posizione].mensile;
}
function tabF(posizione: string) {
  const ccnl = tabelle.contratti.find((c) => c.id === 'ccnl-2019-21');
  if (ccnl?.stato !== 'definitivo') throw new Error('atteso CCNL 2019-21 definitivo');
  return ccnl.scaglionamenti.find((s) => s.decorrenza === '2023-01-01')!.importi[posizione].annuo!;
}
const trasp = (p: string) => tabelle.trasposizione.find((t) => t.posizione === p)!;

describe('trasposizione e differenziale storico (voce 02)', () => {
  it('27 posizioni, ciascuna nella sua area e con la sua posizione d\'ingresso', () => {
    expect(tabelle.trasposizione).toHaveLength(27);
    expect(tabelle.posizioni).toEqual(tabelle.trasposizione.map((t) => t.posizione));
    expect(new Set(tabelle.posizioni).size).toBe(27);
    for (const t of tabelle.trasposizione) {
      expect(t.area).toBe(categoriaArea[t.posizione[0]]);
      expect(t.ingresso).toBe(ingresso[t.posizione[0]]);
    }
  });

  it('le posizioni d\'ingresso hanno differenziale 0', () => {
    for (const p of ['D1', 'C1', 'B1', 'A1']) {
      expect(trasp(p).differenzialeBase).toBe(0);
      expect(trasp(p).differenzialeStorico.mensile).toBe(0);
    }
  });

  it('base = tabellare 2023 della posizione meno quello d\'ingresso, annuo (Tab. F) / 12', () => {
    for (const t of tabelle.trasposizione) {
      expect(t.differenzialeBase).toBe(arrotonda((tabF(t.posizione) - tabF(t.ingresso)) / 12));
    }
  });

  it('valore da usare = base + IVC 2023 posizione - IVC 2023 d\'ingresso, sui mensili (parere ARAN 37607, D4)', () => {
    for (const t of tabelle.trasposizione) {
      expect(t.differenzialeStorico.mensile).toBe(t.differenzialeBase + ivc2023(t.posizione) - ivc2023(t.ingresso));
    }
  });

  it('esempi del parere ARAN 37607 e del ticket 21', () => {
    expect(trasp('C5').differenzialeBase).toBe(21641);
    expect(trasp('C5').differenzialeStorico.mensile).toBe(21750);
    expect(trasp('A3').differenzialeStorico.mensile).toBe(5099);
    expect(trasp('D7').differenzialeStorico.mensile).toBe(76865);
  });

  it('gli Operatori hanno la fonte marcata "da verificare", le altre aree no', () => {
    for (const t of tabelle.trasposizione) {
      const d = t.differenzialeStorico;
      if (t.area === 'operatori') {
        expect(d.verifica?.stato).toBe('da-verificare');
        expect(d.fonte).toContain('da verificare');
      } else {
        expect(d.verifica).toBeUndefined();
      }
    }
  });
});

describe('catalogo voci', () => {
  const voce = (codice: string) => tabelle.catalogoVoci.find((v) => v.codice === codice)!;

  it('15 voci più la Una Tantum, codici univoci, tutte con fonte e validità dentro la copertura', () => {
    expect(tabelle.catalogoVoci.map((v) => v.codice)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', 'UT',
    ]);
    for (const v of tabelle.catalogoVoci) {
      expect(v.fonte.trim()).not.toBe('');
      expect(v.dal >= tabelle.coperturaDal).toBe(true);
    }
  });

  it('validità: voce 02 dal 01/04/2023, Una Tantum solo 2023, le altre dal 01/01/2019 senza fine', () => {
    expect(voce('02').dal).toBe('2023-04-01');
    expect(voce('UT').dal).toBe('2023-01-01');
    expect(voce('UT').al).toBe('2023-12-31');
    for (const v of tabelle.catalogoVoci.filter((x) => !['02', 'UT'].includes(x.codice))) {
      expect(v.dal).toBe('2019-01-01');
      expect(v.al).toBeUndefined();
    }
  });

  it('flag di utilità (D15): posizione no al TFS, comparto solo pensione, 14 e 15 su 10 mensilità', () => {
    expect(voce('07').utile).toEqual({pensione: true, tredicesima: true, tfs: false, tfr: true});
    expect(voce('10').utile).toEqual({pensione: true, tredicesima: false, tfs: false, tfr: false});
    expect(voce('08').utile).toEqual({pensione: true, tredicesima: false, tfs: true, tfr: true});
    expect(voce('UT').utile).toEqual({pensione: true, tredicesima: true, tfs: false, tfr: false});
    expect(voce('14').mensilita).toBe(10);
    expect(voce('15').mensilita).toBe(10);
    expect(voce('01').mensilita).toBe(12);
  });
});

describe('righe PASSWEB del TFR', () => {
  const riga = (id: string) => tabelle.righeTfr.find((r) => r.id === id)!;
  const conFlag = (f: (u: (typeof tabelle.catalogoVoci)[number]['utile']) => boolean) =>
    tabelle.catalogoVoci.filter((v) => f(v.utile)).map((v) => v.codice).sort();

  it('tre righe, ognuna con etichetta e fonte', () => {
    expect(tabelle.righeTfr.map((r) => r.id)).toEqual([
      'retribuzione-valutabile',
      'rateo-tredicesima-teorica',
      'tredicesima-emolumenti-cassa',
    ]);
    for (const r of tabelle.righeTfr) {
      expect(r.etichetta.trim()).not.toBe('');
      expect(r.fonte.trim()).not.toBe('');
    }
  });

  it('la retribuzione valutabile contiene tutte e sole le voci utili al TFR', () => {
    expect([...riga('retribuzione-valutabile').voci].sort()).toEqual(conFlag((u) => u.tfr));
  });

  it('rateo e cassa contengono tutte e sole le voci utili al TFR con 13ª', () => {
    const attese = conFlag((u) => u.tfr && u.tredicesima);
    expect([...riga('rateo-tredicesima-teorica').voci].sort()).toEqual(attese);
    expect([...riga('tredicesima-emolumenti-cassa').voci].sort()).toEqual(attese);
  });
});

describe('parametri e lettera', () => {
  it('soglia dei 15 giorni in lavorativi lun-sab (D10), 26 e 365 (D9, D10), ognuno con fonte', () => {
    const p = tabelle.parametri;
    expect(p.sogliaGiorniTfr.valore).toEqual({giorni: 15, conteggio: 'lavorativi-lun-sab'});
    expect(p.divisoreGiornaliera.valore).toBe(26);
    expect(p.tettoGiorniMeseParziale.valore).toBe(26);
    expect(p.divisoreRateoTredicesima.valore).toBe(365);
    for (const parametro of Object.values(p)) expect(parametro.fonte.trim()).not.toBe('');
  });

  it('la lettera TFR ha oggetto e riferimento normativo con la fonte', () => {
    const l = tabelle.lettere.tfr;
    expect(l.oggetto).toContain('TFR');
    expect(l.riferimentoNormativo).toContain('185');
    expect(l.fonte.trim()).not.toBe('');
  });
});
