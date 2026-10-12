import {describe, expect, it} from 'vitest';
import {classifica} from '../regole';
import {halley, leggiCedolino, leggiRiepilogo} from './index';
import {cedolinoHalley, paginaTestata, per, testoPer} from './fixture';

describe('halley.regole (seam S3)', () => {
  it.each([
    ['Stipendio tabellare', '01'], ['STIPENDIO BASE', '01'],
    ['Differenziale storico', '02'], ['DIFF.STORICO', '02'], ['L.E.D. / Integr.Tab.', '02'],
    ['DIFF.STIPENDIALE', '03'],
    ['Ass.Pers.non riassorb.', '04'], ['ASS.AD PERSONAM', '05'], ['Ass.pers.assorbibile', '05'],
    ['Salario anzianita`', '06'],
    ['Retrib.Posizione(non dir)', '07'], ['RETR.POSIZ.N.DIR.', '07'],
    ['Indenn.Specifica (I-IV)', '08'], ['IND.SPECIFICA', '08'], ['VARIE PENSION.', '08'],
    ['Inden.di vacanza contr.', '09'], ['IND.VACANZA CONT.', '09'],
    ['Indennita` di Comparto', '10'], ['Inden. Comparto (q.fondo)', '10'], ['IND.COMPARTO Q.F.', '10'],
    ['Indennita` di vigil.', '11'], ['IND.DI VIGILANZA', '11'],
    ['Elemento perequativo', 'perequativo'],
    ['Tredicesima', 'ignora'], ['Tredicesima (n.Inadel)', 'ignora'], ['Una tantum 1.5 L.197/22', 'ignora'], ['Totale lordo', 'ignora'],
  ])('%s → %s', (etichetta, atteso) => {
    expect(classifica(halley, etichetta)).toBe(atteso);
  });

  it('non riconosce le etichette sconosciute', () => {
    expect(classifica(halley, 'Indennità di rischio')).toBeNull();
  });
});

describe('halley.leggiCedolino (seam S2)', () => {
  const settembre = cedolinoHalley({
    mese: 'Settembre', anno: 2026, area: 'FUN/D1/0/TI', assunzione: '09-12-1997',
    testata: [['STIPENDIO BASE', 2092.84], ['IND.VACANZA CONT.', 20.93], ['ASS.AD PERSONAM', 107.23],
      ['IND.DI VIGILANZA', 109.24], ['IND.COMPARTO Q.F.', 36.33]],
  });

  it('legge periodo, anagrafica e caselle', () => {
    expect(leggiCedolino(settembre)).toMatchObject({
      formato: 'cedolino', anno: 2026, mese: 8, nome: 'ROSSI MARIO', cf: 'RSSMRA80A01H501U',
      straordinaria: false, assunzione: '09-12-1997', cessazione: '', posizione: 'D1', partTime: '',
    });
  });

  it('abbina ogni importo della testata alla sua etichetta, in centesimi', () => {
    expect(leggiCedolino(settembre)!.voci).toEqual([
      {etichetta: 'STIPENDIO BASE', importo: 209284},
      {etichetta: 'IND.VACANZA CONT.', importo: 2093},
      {etichetta: 'ASS.AD PERSONAM', importo: 10723},
      {etichetta: 'IND.DI VIGILANZA', importo: 10924},
      {etichetta: 'IND.COMPARTO Q.F.', importo: 3633},
    ]);
  });

  it('non passa dal float: 1,15 e 0,29 restano 115 e 29', () => {
    const c = leggiCedolino(cedolinoHalley({mese: 'Maggio', anno: 2026, testata: [['STIPENDIO BASE', 1.15], ['IND.SPECIFICA', 0.29]]}))!;
    expect(c.voci.map(v => v.importo)).toEqual([115, 29]);
  });

  it('legge una testata su due righe', () => {
    const otto: Array<[string, number]> = [
      ['STIPENDIO BASE', 1646.09], ['IND.VACANZA CONT.', 16.46], ['VARIE PENSION.', 5.38], ['IND.SPECIFICA', 5.38],
      ['IND.COMPARTO Q.F.', 22.68], ['DIFF.STIPENDIALE', 42.31], ['DIFF.STORICO', 108.38], ['IND.DI VIGILANZA', 109.24],
    ];
    const c = leggiCedolino(cedolinoHalley({mese: 'Marzo', anno: 2026, testata: otto}))!;
    expect(c.voci.map(v => [v.etichetta, v.importo / 100])).toEqual(otto);
  });

  it('legge cessazione, part-time e riconosce le elaborazioni supplementari', () => {
    const c = leggiCedolino(cedolinoHalley({
      mese: 'Aprile', anno: 2026, cessazione: '30-04-2026', partTime: '50', straordinaria: true, testata: [],
    }))!;
    expect(c).toMatchObject({cessazione: '30-04-2026', partTime: '50', straordinaria: true, voci: []});
  });

  it('legge i nomi lunghi, che sporgono oltre la casella dell etichetta', () => {
    const nome = 'BIANCHI MARIA ANTONIETTA GIUSEPPINA';
    expect(leggiCedolino(cedolinoHalley({mese: 'Maggio', anno: 2026, nome, testata: []}))).toMatchObject({nome});
  });

  it('scarta le pagine che non sono cedolini Halley', () => {
    expect(leggiCedolino(paginaTestata({anno: 2024, voci: []}))).toBeNull();
    expect(leggiCedolino([])).toBeNull();
  });
});

describe('halley.leggiRiepilogo (seam S2)', () => {
  const pagina = paginaTestata({
    anno: 2024,
    voci: [
      ['Stipendio tabellare', per(1782.74, 0, 8)],
      ['Inden.di vacanza contr.', per(0.29, 0, 8)],
      ['Tredicesima', [null, null, null, null, null, null, null, null, null, 1558.53, null, null]],
    ],
    assunzione: testoPer('30-12-1997', 0, 9),
    cessazione: [null, null, null, null, null, null, null, null, '30-09-2024', '30-09-2024', null, '30-09-2024'],
    posizione: testoPer('EX-C5', 0, 9),
    partTime: ['100', '100', '100', '100', '100', '100', '50', '50', '50', null, null, null],
  });

  it('legge intestazione, anagrafica e % part-time per ogni mese', () => {
    expect(leggiRiepilogo(pagina)).toMatchObject({
      formato: 'riepilogo', anno: 2024, nome: 'ROSSI MARIO', cf: 'RSSMRA80A01H501U',
      assunzione: '30-12-1997', cessazione: '30-09-2024', posizione: 'EX-C5',
      partTime: ['100', '100', '100', '100', '100', '100', '50', '50', '50', '', '', ''],
    });
  });

  it('mette ogni importo in centesimi nella colonna del suo mese e scarta il totale', () => {
    const r = leggiRiepilogo(pagina)!;
    expect(r.voci[0]).toEqual({etichetta: 'Stipendio tabellare', mesi: [...Array(9).fill(178274), null, null, null]});
    expect(r.voci[1].mesi[0]).toBe(29);
    expect(r.voci[2].mesi[9]).toBe(155853);
  });

  it('scarta le pagine che non sono VOCI DI TESTATA', () => {
    expect(leggiRiepilogo(paginaTestata({anno: 2024, sezione: 'VOCI DI CORPO', voci: [['Straordinario', per(10)]]}))).toBeNull();
  });
});
