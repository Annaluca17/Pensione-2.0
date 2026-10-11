import { describe, expect, it } from 'vitest';
import { compila, posizioneEconomica, ultimi12Mesi } from './compila';
import { cedoliniInRiepiloghi, leggiDocumenti } from './documenti';
import { cedolinoHalley, per, paginaTestata, testoPer } from './fixture';
import { leggiCedolinoHalley } from './leggiCedolinoHalley';
import { leggiPagina } from './leggiRiepilogo';
import { importo } from './testo';
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
    ['Ass.Pers.non riassorb.', '04'], ['ASS.AD PERSONAM', '05'],
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
    expect(leggiDocumenti([corpo, pagina, []]).riepiloghi).toHaveLength(1);
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

describe('leggiCedolinoHalley', () => {
  const settembre = cedolinoHalley({
    mese: 'Settembre', anno: 2026, area: 'FUN/D1/0/TI', assunzione: '09-12-1997',
    testata: [['STIPENDIO BASE', 2092.84], ['IND.VACANZA CONT.', 20.93], ['ASS.AD PERSONAM', 107.23],
              ['IND.DI VIGILANZA', 109.24], ['IND.COMPARTO Q.F.', 36.33]],
  });

  it('legge periodo, anagrafica e caselle', () => {
    expect(leggiCedolinoHalley(settembre)).toMatchObject({
      anno: 2026, mese: 8, nome: 'ROSSI MARIO', cf: 'RSSMRA80A01H501U', matricola: '17',
      straordinaria: false, assunzione: '09-12-1997', cessazione: '', posizione: 'D1', partTime: '',
    });
  });

  it('abbina ogni importo della testata alla sua etichetta', () => {
    expect(leggiCedolinoHalley(settembre)!.voci).toEqual([
      { etichetta: 'STIPENDIO BASE', importo: 2092.84 },
      { etichetta: 'IND.VACANZA CONT.', importo: 20.93 },
      { etichetta: 'ASS.AD PERSONAM', importo: 107.23 },
      { etichetta: 'IND.DI VIGILANZA', importo: 109.24 },
      { etichetta: 'IND.COMPARTO Q.F.', importo: 36.33 },
    ]);
  });

  it('legge una testata su due righe', () => {
    const otto: Array<[string, number]> = [
      ['STIPENDIO BASE', 1646.09], ['IND.VACANZA CONT.', 16.46], ['VARIE PENSION.', 5.38], ['IND.SPECIFICA', 5.38],
      ['IND.COMPARTO Q.F.', 22.68], ['DIFF.STIPENDIALE', 42.31], ['DIFF.STORICO', 108.38], ['IND.DI VIGILANZA', 109.24],
    ];
    const c = leggiCedolinoHalley(cedolinoHalley({ mese: 'Marzo', anno: 2026, testata: otto }))!;
    expect(c.voci.map(v => [v.etichetta, v.importo])).toEqual(otto);
  });

  it('legge cessazione, part-time e riconosce le elaborazioni supplementari', () => {
    const c = leggiCedolinoHalley(cedolinoHalley({
      mese: 'Aprile', anno: 2026, cessazione: '30-04-2026', partTime: '50', straordinaria: true, testata: [],
    }))!;
    expect(c).toMatchObject({ cessazione: '30-04-2026', partTime: '50', straordinaria: true, voci: [] });
  });

  it('legge la posizione del segretario comunale, poi segnalata come non A-D', () => {
    const c = leggiCedolinoHalley(cedolinoHalley({
      mese: 'Maggio', anno: 2026, area: '/SEGRETARIO C/0/TI', cessazione: '31-05-2026',
      testata: [['STIPENDIO BASE', 3077.28]],
    }))!;
    expect(c.posizione).toBe('SEGRETARIO C');
    const comp = compila(cedoliniInRiepiloghi([c]), { perequativo: false });
    expect(comp.posizione).toBe('');
    expect(comp.avvisi).toContain('Posizione economica "SEGRETARIO C" non riconosciuta: selezionala a mano.');
  });

  it('legge i nomi lunghi, che sporgono oltre la casella dell\'etichetta', () => {
    const nome = 'BIANCHI MARIA ANTONIETTA GIUSEPPINA';
    expect(leggiCedolinoHalley(cedolinoHalley({ mese: 'Maggio', anno: 2026, nome, matricola: '1234', testata: [] }))!)
      .toMatchObject({ nome, matricola: '1234' });
  });

  it('scarta le pagine che non sono cedolini Halley', () => {
    expect(leggiCedolinoHalley(paginaTestata({ anno: 2024, voci: [] }))).toBeNull();
    expect(leggiCedolinoHalley([])).toBeNull();
  });
});

describe('cedolini mensili → calcolatore', () => {
  const mese = (m: string, tab: number, extra: Partial<Parameters<typeof cedolinoHalley>[0]> = {}) =>
    cedolinoHalley({ mese: m, anno: 2026, area: 'IST/C6/0/TI', assunzione: '09-12-1997',
      testata: [['STIPENDIO BASE', tab], ['IND.VACANZA CONT.', 19.28], ['IND.COMPARTO Q.F.', 32.06], ['DIFF.STORICO', 271.84]],
      ...extra });

  it('unisce i mesi dello stesso dipendente in un anno e scarta gli arretrati', () => {
    const l = leggiDocumenti([
      mese('Aprile', 1928.23), mese('Luglio', 1928.23),
      mese('Aprile', 0, { straordinaria: true, testata: [] }),
      cedolinoHalley({ mese: 'Aprile', anno: 2026, cf: 'VRDLGU75B02F205X', testata: [['STIPENDIO BASE', 1715.27]] }),
    ]);
    expect(l.pagine).toEqual({ riepilogo: 0, cedolino: 3, straordinarie: 1, altre: 0 });
    expect(l.avvisi[0]).toContain('supplementari');
    const mio = l.riepiloghi.find(r => r.cf === 'RSSMRA80A01H501U')!;
    expect(mio.anno).toBe(2026);
    expect(mio.posizione).toBe('C6');
    expect(mio.voci[0]).toEqual({ etichetta: 'STIPENDIO BASE', mesi: [null, null, null, 1928.23, null, null, 1928.23, null, null, null, null, null] });
  });

  it('a parità di mese tiene l\'ultimo file e lo segnala se gli importi cambiano', () => {
    const avvisi: string[] = [];
    const r = cedoliniInRiepiloghi([
      leggiCedolinoHalley(mese('Luglio', 1900))!, leggiCedolinoHalley(mese('Luglio', 1928.23))!,
    ], avvisi);
    expect(r[0].voci[0].mesi[6]).toBe(1928.23);
    expect(avvisi).toEqual(['luglio 2026: cedolino caricato due volte con importi diversi (1 dipendente); tenuto quello dell\'ultimo file.']);
  });

  it('compila il calcolatore da dodici cedolini a cavallo di due anni', () => {
    const nomi = ['Ottobre', 'Novembre', 'Dicembre'];
    const pagine = [
      ...nomi.map(m => cedolinoHalley({ mese: m, anno: 2025, testata: [['STIPENDIO BASE', 1900], ['IND.VACANZA CONT.', 12]] })),
      ...['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre']
        .map(m => mese(m, 1928.23, { cessazione: m === 'Settembre' ? '30-09-2026' : undefined })),
    ];
    const l = leggiDocumenti(pagine);
    const c = compila(l.riepiloghi, { perequativo: false });
    expect(c).toMatchObject({ cessazione: '2026-09-30', posizione: 'C6', assunzione: '1997-12-09', meseVoci: { mese: 8, anno: 2026 } });
    expect(c.imp).toMatchObject({ '01': '1928.23', '02': '271.84', '09': '19.28', '10': '32.06' });
    expect(c.mesi.map(m => m.tabellare)).toEqual([1900, 1900, 1900, ...Array(9).fill(1928.23)]);
    expect(c.mesi.map(m => m.ivc)).toEqual([12, 12, 12, ...Array(9).fill(19.28)]);
    expect(c.avvisi.some(a => a.startsWith('Mancano'))).toBe(false);
  });

  it('riepilogo e cedolini dello stesso anno si completano mese per mese', () => {
    const riep = leggiPagina(paginaTestata({ anno: 2026, voci: [['Stipendio tabellare', per(1928.23, 0, 5)]] }))!;
    const ced = cedoliniInRiepiloghi([leggiCedolinoHalley(mese('Luglio', 2000, { cessazione: '31-07-2026' }))!]);
    const c = compila([riep, ...ced], { perequativo: false });
    expect(c.mesi.slice(-7).map(m => m.tabellare)).toEqual([1928.23, 1928.23, 1928.23, 1928.23, 1928.23, 1928.23, 2000]);
  });
});
