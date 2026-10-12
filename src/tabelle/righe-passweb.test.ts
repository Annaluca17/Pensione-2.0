// Test sulle mappe voce → riga PASSWEB di pensione, TFS (9 righe, D16) e DMA previste. Le liste
// letterali sono scritte qui a mano dalle decisioni (D3, D6, D7, D15, D16, D20, R1-R5), indipendenti
// dai dati; le mappe devono inoltre coincidere con i flag del catalogo e con i casi normativi.
import {describe, expect, it} from 'vitest';
import {casiNormativiPensioneTfs} from '../casi-normativi/pensione-tfs';
import {tabelle} from './index';

type Utile = (typeof tabelle.catalogoVoci)[number]['utile'];
const conFlag = (f: (u: Utile) => boolean) => tabelle.catalogoVoci.filter((v) => f(v.utile)).map((v) => v.codice);
const codici = tabelle.catalogoVoci.map((v) => v.codice);
const ordinate = (voci: readonly string[]) => [...voci].sort();

describe('righe PASSWEB della pensione (D16): una riga per voce, più la 13ª', () => {
  const {righe, tredicesima} = tabelle.righePassweb.pensione;

  it('una riga per ogni voce utile alla pensione, con la voce del catalogo', () => {
    expect(righe.map((r) => r.voci)).toEqual(conFlag((u) => u.pensione).map((c) => [c]));
    expect(new Set(righe.map((r) => r.id)).size).toBe(righe.length);
    for (const r of righe) {
      expect(r.etichetta.trim()).not.toBe('');
      expect(r.fonte.trim()).not.toBe('');
    }
  });

  it('sono 16, quante le voci del catalogo: tutte sono utili alla pensione', () => {
    expect(righe).toHaveLength(16);
  });

  it('la 13ª è la somma dei mensili delle voci con 13ª: 01-07, 09 e la Una Tantum', () => {
    expect(ordinate(tredicesima.voci)).toEqual(['01', '02', '03', '04', '05', '06', '07', '09', 'UT']);
    expect(ordinate(tredicesima.voci)).toEqual(ordinate(conFlag((u) => u.pensione && u.tredicesima)));
    expect(tredicesima.fonte.trim()).not.toBe('');
  });

  it('comparto (10) in pensione senza 13ª; 14 e 15 in pensione, a 10 mensilità, senza 13ª', () => {
    expect(righe.some((r) => r.voci[0] === '10')).toBe(true);
    expect(tredicesima.voci).not.toContain('10');
    expect(tredicesima.voci).not.toContain('14');
    expect(tredicesima.voci).not.toContain('15');
  });
});

describe('righe PASSWEB del TFS: le 9 della maschera (D16), 13ª = Σ 12 mesi / 12 (D20)', () => {
  const righe = tabelle.righePassweb.tfs;
  const riga = (id: string) => righe.find((r) => r.id === id)!;

  it('nove righe, nell\'ordine della maschera, ognuna con etichetta, campo PASSWEB e fonte', () => {
    expect(righe.map((r) => r.id)).toEqual([
      'tab-e',
      'ria',
      'tredicesima',
      'assegno-assorbibile',
      'asili',
      'assegno-non-riassorbibile',
      'indennita-64-56',
      'vigilanza',
      'differenziali',
    ]);
    for (const r of righe) {
      expect(r.etichetta.trim()).not.toBe('');
      expect(r.campoPassweb?.trim()).toBeTruthy();
      expect(r.fonte.trim()).not.toBe('');
    }
  });

  it('voci di ogni riga (D16): tabellare con IVC, RIA, assegni, asili 12+13, 64,56, vigilanza, differenziali 02+03', () => {
    expect(riga('tab-e').voci).toEqual(['01', '09']);
    expect(riga('ria').voci).toEqual(['06']);
    expect(riga('assegno-assorbibile').voci).toEqual(['05']);
    expect(riga('asili').voci).toEqual(['12', '13']);
    expect(riga('assegno-non-riassorbibile').voci).toEqual(['04']);
    expect(riga('indennita-64-56').voci).toEqual(['08']);
    expect(riga('vigilanza').voci).toEqual(['11']);
    expect(riga('differenziali').voci).toEqual(['02', '03']);
  });

  it('la 13ª TFS è delle voci utili al TFS con 13ª, IVC compresa; posizione e comparto fuori (D6, D7)', () => {
    expect(ordinate(riga('tredicesima').voci)).toEqual(['01', '02', '03', '04', '05', '06', '09']);
    expect(ordinate(riga('tredicesima').voci)).toEqual(ordinate(conFlag((u) => u.tfs && u.tredicesima)));
  });

  it('le righe diverse dalla 13ª spartiscono tutte e sole le voci utili al TFS, senza doppioni', () => {
    const voci = righe.filter((r) => r.id !== 'tredicesima').flatMap((r) => r.voci);
    expect(ordinate(voci)).toEqual(ordinate(conFlag((u) => u.tfs)));
    expect(new Set(voci).size).toBe(voci.length);
    for (const fuori of ['07', '10', '14', '15', 'UT']) expect(voci).not.toContain(fuori);
  });
});

describe('campi DMA previste (D1, D6, D11, R1-R5)', () => {
  const campi = tabelle.righePassweb.dma;
  const campo = (id: string) => campi.find((c) => c.id === id)!;

  it('i campi di PASSWEB: pensionistico, credito, TFS, TFR, teorica, valutabile, ulteriori elementi', () => {
    expect(campi.map((c) => c.id)).toEqual([
      'imponibile-pensionistico',
      'imponibile-credito',
      'imponibile-tfs',
      'imponibile-tfr',
      'retribuzione-teorica-tfr',
      'retribuzione-valutabile-tfr',
      'ulteriori-elementi-tfr',
    ]);
    for (const c of campi) {
      expect(c.etichetta.trim()).not.toBe('');
      expect(c.fonte.trim()).not.toBe('');
    }
  });

  it('pensionistico: tutte le voci utili alla pensione, comparto compreso; 13ª delle voci con 13ª', () => {
    const c = campo('imponibile-pensionistico');
    expect(ordinate(c.voci)).toEqual(ordinate(conFlag((u) => u.pensione)));
    expect(c.voci).toContain('10');
    expect(ordinate(c.tredicesima)).toEqual(ordinate(conFlag((u) => u.pensione && u.tredicesima)));
    expect(c.percentuale).toBe(100);
  });

  it('credito = imponibile pensionistico (R5), solo se il dipendente è iscritto al Credito', () => {
    const c = campo('imponibile-credito');
    expect(c.voci).toEqual(campo('imponibile-pensionistico').voci);
    expect(c.tredicesima).toEqual(campo('imponibile-pensionistico').tredicesima);
    expect(c.condizione).toBe('iscritto-credito');
  });

  it('TFS e TFR all\'80% sulle voci utili al TFS (R4), 13ª delle sole voci con 13ª; solo col proprio regime', () => {
    for (const [id, regime] of [['imponibile-tfs', 'TFS'], ['imponibile-tfr', 'TFR']] as const) {
      const c = campo(id);
      expect(ordinate(c.voci)).toEqual(ordinate(conFlag((u) => u.tfs && u.tfr)));
      expect(ordinate(c.tredicesima)).toEqual(ordinate(conFlag((u) => u.tfs && u.tfr && u.tredicesima)));
      expect(c.percentuale).toBe(80);
      expect(c.regime).toBe(regime);
      expect(c.voci).not.toContain('07');
      expect(c.voci).not.toContain('10');
    }
  });

  it('teorica TFR (R1): voci utili al TFR, posizione e IVC comprese, comparto escluso, 100%, senza 13ª', () => {
    const c = campo('retribuzione-teorica-tfr');
    expect(ordinate(c.voci)).toEqual(ordinate(conFlag((u) => u.tfr)));
    expect(c.voci).toContain('07');
    expect(c.voci).toContain('09');
    expect(c.voci).not.toContain('10');
    expect(c.tredicesima).toEqual([]);
    expect(c.percentuale).toBe(100);
    expect(c.regime).toBe('TFR');
  });

  it('ulteriori elementi TFR (R2): voci con TFR sì e TFS no, oggi la sola posizione, al 100%', () => {
    const c = campo('ulteriori-elementi-tfr');
    expect(c.voci).toEqual(['07']);
    expect(c.tredicesima).toEqual(['07']);
    expect(ordinate(c.tredicesima)).toEqual(ordinate(conFlag((u) => u.tfr && !u.tfs && u.tredicesima)));
    expect(ordinate(c.voci)).toEqual(ordinate(conFlag((u) => u.tfr && !u.tfs)));
    expect(c.percentuale).toBe(100);
    expect(c.regime).toBe('TFR');
  });

  it('valutabile TFR (R4): voci utili al TFS più gli ulteriori elementi, al 100%, con la 13ª', () => {
    const c = campo('retribuzione-valutabile-tfr');
    expect(ordinate(c.voci)).toEqual(ordinate(conFlag((u) => u.tfr)));
    expect(ordinate(c.tredicesima)).toEqual(ordinate(conFlag((u) => u.tfr && u.tredicesima)));
    expect(c.percentuale).toBe(100);
    expect(c.regime).toBe('TFR');
  });
});

describe('ogni voce mappata esiste nel catalogo', () => {
  it('pensione, TFS e DMA citano solo codici del catalogo', () => {
    const {pensione, tfs, dma} = tabelle.righePassweb;
    const citate = [
      ...pensione.righe.flatMap((r) => r.voci),
      ...pensione.tredicesima.voci,
      ...tfs.flatMap((r) => r.voci),
      ...dma.flatMap((c) => [...c.voci, ...c.tredicesima]),
    ];
    for (const codice of citate) expect(codici).toContain(codice);
  });
});

describe('le mappe coincidono con i casi normativi calcolati a mano (ticket 20)', () => {
  const mappaTfs = new Map(tabelle.righePassweb.tfs.map((r) => [r.id, r]));
  const mappaPensione = new Map(tabelle.righePassweb.pensione.righe.map((r) => [r.voci[0], r]));

  it('righe TFS: stesso id e stesse voci; la 13ª dei casi usa un sottoinsieme delle voci della mappa', () => {
    for (const caso of casiNormativiPensioneTfs) {
      expect(caso.atteso.tfs.righe.map((r) => r.riga)).toEqual(tabelle.righePassweb.tfs.map((r) => r.id));
      for (const r of caso.atteso.tfs.righe) {
        const voci = mappaTfs.get(r.riga)!.voci;
        if (r.riga === 'tredicesima') {
          for (const v of r.voci) expect(voci, `${caso.id} 13ª TFS ${v}`).toContain(v);
        } else {
          expect(r.voci, `${caso.id} ${r.riga}`).toEqual(voci);
        }
      }
    }
  });

  it('righe pensione: ogni voce dei casi ha la sua riga e la 13ª usa voci della mappa', () => {
    for (const caso of casiNormativiPensioneTfs) {
      for (const r of caso.atteso.pensione.righe) expect(mappaPensione.has(r.voce), `${caso.id} ${r.voce}`).toBe(true);
      for (const v of caso.atteso.pensione.tredicesima.voci) {
        expect(tabelle.righePassweb.pensione.tredicesima.voci, `${caso.id} 13ª ${v}`).toContain(v);
      }
    }
  });
});
