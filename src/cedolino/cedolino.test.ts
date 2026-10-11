import { describe, expect, it } from 'vitest';
import { compila, posizioneEconomica, ultimi12Mesi } from './compila';
import { per, paginaTestata, testoPer } from './fixture';
import { importo, leggiPagina, leggiRiepiloghi } from './leggiRiepilogo';
import { classifica } from './voci';

describe('importo', () => {
  it('legge il formato italiano', () => {
    expect(importo('1.503,70')).toBe(1503.7);
    expect(importo('12.129,15')).toBe(12129.15);
    expect(importo('5,38')).toBe(5.38);
    expect(importo('-24,18')).toBe(-24.18);
  });
  it('scarta ciò che non è un importo', () => {
    expect(importo('30-09-2024')).toBeNull();
    expect(importo('EX-C5')).toBeNull();
    expect(importo('1.5')).toBeNull();
  });
});

describe('classifica', () => {
  it.each([
    ['Stipendio tabellare', '01'], ['STIPENDIO BASE', '01'],
    ['Differenziale storico', '02'], ['DIFF.STORICO', '02'], ['L.E.D. / Integr.Tab.', '02'],
    ['DIFF.STIPENDIALE', '03'],
    ['Ass.Pers.non riassorb.', '04'], ['ASS.AD PERSONAM', '04'],
    ['Ass.pers.assorbibile', '05'],
    ['Salario anzianita`', '06'],
    ['Retrib.Posizione(non dir)', '07'], ['RETR.POSIZ.N.DIR.', '07'],
    ['Indenn.Specifica (I-IV)', '08'], ['IND.SPECIFICA', '08'], ['VARIE PENSION.', '08'],
    ['Inden.di vacanza contr.', '09'], ['IND.VACANZA CONT.', '09'],
    ['Indennita` di Comparto', '10'], ['Inden. Comparto (q.fondo)', '10'], ['IND.COMPARTO Q.F.', '10'],
    ['Indennita` di vigil.', '11'], ['IND.DI VIGILANZA', '11'],
    ['Elemento perequativo', 'perequativo'],
    ['Tredicesima', 'ignora'], ['Tredicesima (n.Inadel)', 'ignora'], ['Tredic magg.retr.posiz.', 'ignora'],
    ['Una tantum 1.5 L.197/22', 'ignora'], ['Totale lordo', 'ignora'],
  ])('%s → %s', (etichetta, atteso) => {
    expect(classifica(etichetta)).toBe(atteso);
  });
  it('restituisce null per le etichette sconosciute', () => {
    expect(classifica('Indennità di rischio')).toBeNull();
  });
});

describe('leggiPagina', () => {
  const pagina = paginaTestata({
    anno: 2024,
    voci: [
      ['Stipendio tabellare', per(1782.74, 0, 8)],
      ['Inden.di vacanza contr.', per(77, 0, 8)],
      ['Tredicesima', [null, null, null, null, null, null, null, null, null, 1558.53, null, null]],
    ],
    assunzione: [...testoPer('30-12-1997', 0, 9).slice(0, 11), '30-12-1997'],
    cessazione: [null, null, null, null, null, null, null, null, '30-09-2024', '30-09-2024', null, '30-09-2024'],
    posizione: testoPer('EX-C5', 0, 9),
  });

  it('legge intestazione e anagrafica', () => {
    const r = leggiPagina(pagina)!;
    expect(r).toMatchObject({ anno: 2024, nome: 'ROSSI MARIO', cf: 'RSSMRA80A01H501U', matricola: '17' });
    expect(r).toMatchObject({ assunzione: '30-12-1997', cessazione: '30-09-2024', posizione: 'EX-C5', partTime: '' });
  });

  it('mette ogni importo nella colonna del suo mese e scarta il totale', () => {
    const r = leggiPagina(pagina)!;
    expect(r.voci[0]).toEqual({ etichetta: 'Stipendio tabellare', mesi: per(1782.74, 0, 8) });
    expect(r.voci[2].mesi[9]).toBe(1558.53);
    expect(r.voci[2].mesi.filter(v => v != null)).toHaveLength(1);
  });

  it('scarta le pagine che non sono VOCI DI TESTATA', () => {
    const corpo = paginaTestata({ anno: 2024, sezione: 'VOCI DI CORPO', voci: [['Straordinario', per(10)]] });
    expect(leggiPagina(corpo)).toBeNull();
    expect(leggiRiepiloghi([corpo, pagina, []])).toHaveLength(1);
  });
});

describe('posizioneEconomica', () => {
  it.each([['EX-C5', 'C5'], ['B3-PEO', 'B3'], ['a5', 'A5'], ['D7', 'D7'], ['DIR', ''], ['', '']])(
    '%s → %s', (s, atteso) => expect(posizioneEconomica(s)).toBe(atteso));
});

describe('ultimi12Mesi', () => {
  it('copre i 12 mesi fino a quello di cessazione, attraversando l\'anno', () => {
    const f = ultimi12Mesi('2024-09-30');
    expect(f[0]).toEqual({ mese: 9, anno: 2023 });
    expect(f[11]).toEqual({ mese: 8, anno: 2024 });
  });
});

describe('compila', () => {
  // Cessazione 30/09/2024: servono ottobre-dicembre 2023 e gennaio-settembre 2024.
  const r2023 = leggiPagina(paginaTestata({
    anno: 2023,
    voci: [
      ['Stipendio tabellare', [...per(1503.7).slice(0, 3), ...per(1523.61).slice(3)]],
      ['L.E.D. / Integr.Tab.', per(108.38, 0, 2)],
      ['Differenziale storico', per(108.38, 3, 11)],
      ['Inden.di vacanza contr.', per(8.06)],
      ['Indennita` di Comparto', per(3.09)],
      ['Inden. Comparto (q.fondo)', per(29.31)],
      ['Una tantum 1.5 L.197/22', per(24.18, 6, 11)],
    ],
    posizione: testoPer('A5'),
  }))!;
  const r2024 = leggiPagina(paginaTestata({
    anno: 2024,
    voci: [
      ['Stipendio tabellare', per(1523.61, 0, 8)],
      ['Differenziale storico', per(108.38, 0, 8)],
      ['Inden.di vacanza contr.', per(8.06, 0, 8)],
      ['Indenn.Specifica (I-IV)', per(5.38, 0, 8)],
      ['Indennita` di Comparto', per(3.09, 0, 8)],
      ['Inden. Comparto (q.fondo)', per(29.31, 0, 8)],
      ['Elemento perequativo', per(23, 0, 8)],
      ['Indennità di rischio', per(30, 0, 8)],
    ],
    assunzione: testoPer('01-12-1995', 0, 8),
    cessazione: testoPer('30-09-2024', 0, 8),
    posizione: testoPer('EX-A5', 0, 8),
  }))!;

  it('compila anagrafica, posizione e voci dal mese di cessazione', () => {
    const c = compila([r2024, r2023], { perequativo: false });
    expect(c).toMatchObject({
      nome: 'ROSSI MARIO', cf: 'RSSMRA80A01H501U',
      assunzione: '1995-12-01', cessazione: '2024-09-30', posizione: 'A5',
      meseVoci: { mese: 8, anno: 2024 }, haPerequativo: true,
    });
    expect(c.imp).toEqual({
      '01': '1523.61', '02': '108.38', '03': '', '04': '', '05': '', '06': '',
      '07': '', '08': '5.38', '09': '8.06', '10': '32.4', '11': '',
    });
  });

  it('compila i 12 mesi a cavallo dei due anni', () => {
    const c = compila([r2023, r2024], { perequativo: false });
    expect(c.mesi.map(m => [m.mese, m.anno, m.tabellare, m.ivc])).toEqual([
      [9, 2023, 1523.61, 8.06], [10, 2023, 1523.61, 8.06], [11, 2023, 1523.61, 8.06],
      ...Array.from({ length: 9 }, (_, i) => [i, 2024, 1523.61, 8.06]),
    ]);
    expect(c.avvisi.some(a => a.startsWith('Mancano'))).toBe(false);
  });

  it('somma l\'Elemento perequativo al tabellare solo se richiesto', () => {
    const c = compila([r2023, r2024], { perequativo: true });
    expect(c.imp['01']).toBe('1546.61');
    expect(c.mesi[11].tabellare).toBe(1546.61);
    // Nel 2023 non c'è perequativo: il tabellare resta quello del riepilogo.
    expect(c.mesi[0].tabellare).toBe(1523.61);
  });

  it('segnala le etichette non riconosciute e i mesi mancanti', () => {
    const c = compila([r2024], { perequativo: false });
    expect(c.nonRiconosciute).toEqual(['Indennità di rischio']);
    expect(c.mesi.slice(0, 3).every(m => m.tabellare == null && m.ivc == null)).toBe(true);
    expect(c.avvisi.find(a => a.startsWith('Mancano'))).toContain('ottobre 2023, novembre 2023, dicembre 2023');
  });

  it('con cessazione a metà mese prende le voci dal mese precedente', () => {
    const r = leggiPagina(paginaTestata({
      anno: 2024,
      voci: [['Stipendio tabellare', [...per(1600, 0, 7).slice(0, 8), 800, null, null, null]]],
      cessazione: testoPer('15-09-2024', 0, 8),
    }))!;
    const c = compila([r], { perequativo: false });
    expect(c.meseVoci).toEqual({ mese: 7, anno: 2024 });
    expect(c.imp['01']).toBe('1600');
    expect(c.avvisi.some(a => a.includes('metà mese'))).toBe(true);
  });

  it('senza data di cessazione nel riepilogo usa quella già inserita', () => {
    const r = leggiPagina(paginaTestata({ anno: 2024, voci: [['Stipendio tabellare', per(1600, 0, 5)]] }))!;
    expect(compila([r], { perequativo: false }).mesi).toHaveLength(0);
    const c = compila([r], { perequativo: false, dataCessazione: '2024-06-30' });
    expect(c.cessazione).toBe('2024-06-30');
    expect(c.meseVoci).toEqual({ mese: 5, anno: 2024 });
  });

  it('avvisa se due righe della stessa voce hanno importi diversi', () => {
    const r = leggiPagina(paginaTestata({
      anno: 2024,
      voci: [['Stipendio tabellare', per(1600)], ['IND.SPECIFICA', per(5.38)], ['VARIE PENSION.', per(6)]],
      cessazione: testoPer('31-12-2024'),
    }))!;
    const c = compila([r], { perequativo: false });
    expect(c.imp['08']).toBe('5.38');
    expect(c.avvisi.filter(a => a.includes('voce 08'))).toHaveLength(12);
  });
});
