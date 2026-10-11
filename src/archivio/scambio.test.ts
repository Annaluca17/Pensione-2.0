// Export JSON e import per unione (ticket 11, storie 62-66). Solo dati di fantasia.
import {describe, expect, it} from 'vitest';
import {applicaImport, esporta, normalizzaNome, preparaImport} from './scambio';
import type {Archivio, Pratica} from './schema';

const ADESSO = '2026-10-11T18:00:00.000Z';

const pratica = (id: string, enteId: string, modificata = '2026-10-01T10:00:00.000Z', cessazione = '2026-06-20'): Pratica => ({
  id,
  enteId,
  tipo: 'cessazione',
  dati: {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C3', assunzione: '2012-09-01', cessazione},
    voci: {base: {'01': 192823}, eccezioni: {}},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
  },
  congelati: [],
  creata: '2026-09-01T10:00:00.000Z',
  modificata,
});

const mio: Archivio = {
  versioneSchema: 1,
  enti: [
    {id: 'e1', nome: 'Comune di Prova'},
    {id: 'e2', nome: 'Unione dei Comuni  di Fantasìa'},
  ],
  pratiche: [pratica('p1', 'e1'), pratica('p2', 'e1'), pratica('p3', 'e2')],
  ultimoExport: null,
};

describe('esporta', () => {
  it('tutto l\'archivio: stessi dati, nessuna cifratura, ultimoExport aggiornato nel file e nell\'archivio', () => {
    const {archivio, file} = esporta(mio, ADESSO);
    expect(archivio).toEqual({...mio, ultimoExport: ADESSO});
    expect(JSON.parse(file)).toEqual(archivio);
  });

  it('un solo ente: le sue pratiche, ultimoExport del file ma non dell\'archivio (decisione del ticket 11)', () => {
    const {archivio, file} = esporta(mio, ADESSO, 'e2');
    expect(archivio).toBe(mio);
    expect(JSON.parse(file)).toEqual({versioneSchema: 1, enti: [mio.enti[1]], pratiche: [mio.pratiche[2]], ultimoExport: ADESSO});
  });

  it('un ente inesistente o un archivio malformato non si esportano', () => {
    expect(() => esporta(mio, ADESSO, 'nessuno')).toThrow();
    expect(() => esporta({...mio, enti: [{id: '', nome: ''}]}, ADESSO)).toThrow();
  });
});

describe('normalizzaNome', () => {
  it('ignora maiuscole, accenti e spazi doppi', () => {
    expect(normalizzaNome('  Unione dei COMUNI di  Fantasia ')).toBe(normalizzaNome('Unione dei Comuni  di Fantasìa'));
  });
});

describe('preparaImport: riepilogo prima di applicare', () => {
  const file = (archivio: Partial<Archivio>) => JSON.stringify({versioneSchema: 1, enti: [], pratiche: [], ultimoExport: null, ...archivio});

  it('id nuovo → aggiunta; stesso id e contenuto → saltata; contenuto diverso → conflitto, default la più recente', () => {
    const esito = preparaImport(
      mio,
      file({
        enti: [mio.enti[0]],
        pratiche: [
          pratica('p1', 'e1', '2026-10-05T10:00:00.000Z'), // uguale nei dati: cambia solo la data di modifica
          pratica('p2', 'e1', '2026-10-09T10:00:00.000Z', '2026-06-30'), // più recente nel file
          pratica('p9', 'e1'),
        ],
      }),
    );
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    const {riepilogo} = esito;
    expect(riepilogo.aggiunte.map((p) => p.id)).toEqual(['p9']);
    expect(riepilogo.uguali.map((p) => p.id)).toEqual(['p1']);
    expect(riepilogo.conflitti.map((c) => [c.mia.id, c.predefinita])).toEqual([['p2', 'file']]);
    expect(riepilogo.conteggi).toEqual({entiNuovi: 0, entiAbbinati: 1, aggiunte: 1, uguali: 1, conflitti: 1, scartate: 0});
  });

  it('nel conflitto, se la mia è più recente o pari, il default è tenere la mia', () => {
    const esito = preparaImport(mio, file({enti: [mio.enti[0]], pratiche: [pratica('p2', 'e1', '2026-09-01T10:00:00.000Z', '2026-06-30')]}));
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    expect(esito.riepilogo.conflitti[0].predefinita).toBe('mia');
  });

  it('enti abbinati per id, poi per nome normalizzato; le pratiche del file passano all\'ente locale', () => {
    const esito = preparaImport(
      mio,
      file({
        enti: [
          {id: 'e1', nome: 'Altro nome, stesso id'},
          {id: 'x7', nome: 'unione dei comuni di fantasia'},
          {id: 'x8', nome: 'Comune Nuovo'},
        ],
        pratiche: [pratica('p7', 'x7'), pratica('p8', 'x8')],
      }),
    );
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    const {riepilogo} = esito;
    expect(riepilogo.entiAbbinati.map((a) => [a.dalFile.id, a.locale.id, a.per])).toEqual([
      ['e1', 'e1', 'id'],
      ['x7', 'e2', 'nome'],
    ]);
    expect(riepilogo.entiNuovi.map((e) => e.id)).toEqual(['x8']);
    expect(riepilogo.aggiunte.map((p) => [p.id, p.enteId])).toEqual([
      ['p7', 'e2'],
      ['p8', 'x8'],
    ]);
  });

  it('una pratica malformata si scarta e si segnala; il resto entra', () => {
    const esito = preparaImport(mio, file({enti: [mio.enti[0]], pratiche: [{...pratica('p5', 'e1'), tipo: 'boh'} as never, pratica('p6', 'e1')]}));
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    expect(esito.riepilogo.scartate.map((s) => s.id)).toEqual(['p5']);
    expect(esito.riepilogo.aggiunte.map((p) => p.id)).toEqual(['p6']);
  });

  it('un file di versione futura è rifiutato; uno non valido pure', () => {
    expect(preparaImport(mio, file({versioneSchema: 2} as never))).toMatchObject({stato: 'versione-futura', versione: 2});
    expect(preparaImport(mio, '{rotto')).toMatchObject({stato: 'non-valido'});
  });

  it('un file di una versione precedente viene migrato', () => {
    const catena = {0: (v0: Record<string, unknown>) => ({...v0, versioneSchema: 1, ultimoExport: null})};
    const v0 = JSON.stringify({versioneSchema: 0, enti: [mio.enti[0]], pratiche: [pratica('p9', 'e1')]});
    const esito = preparaImport(mio, v0, catena);
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    expect(esito.riepilogo.aggiunte.map((p) => p.id)).toEqual(['p9']);
  });
});

describe('applicaImport', () => {
  const grezzo = JSON.stringify({
    versioneSchema: 1,
    enti: [mio.enti[0], {id: 'x8', nome: 'Comune Nuovo'}],
    pratiche: [pratica('p2', 'e1', '2026-10-09T10:00:00.000Z', '2026-06-30'), pratica('p8', 'x8')],
    ultimoExport: null,
  });
  const pronto = preparaImport(mio, grezzo);
  if (pronto.stato !== 'pronto') throw new Error(pronto.stato);

  it('con i default: aggiunge enti e pratiche nuovi, nel conflitto prende la più recente', () => {
    const nuovo = applicaImport(mio, pronto.riepilogo);
    expect(nuovo.enti.map((e) => e.id)).toEqual(['e1', 'e2', 'x8']);
    expect(nuovo.pratiche.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p8']);
    expect(nuovo.pratiche[1].dati.anagrafica.cessazione).toBe('2026-06-30');
    expect(nuovo.ultimoExport).toBe(mio.ultimoExport);
  });

  it('"tieni la mia" per un conflitto lascia la pratica locale', () => {
    const nuovo = applicaImport(mio, pronto.riepilogo, {p2: 'mia'});
    expect(nuovo.pratiche[1]).toEqual(mio.pratiche[1]);
  });

  it('per ripartire da zero: archivio vuoto, poi import', () => {
    const vuoto: Archivio = {versioneSchema: 1, enti: [], pratiche: [], ultimoExport: null};
    const esito = preparaImport(vuoto, esporta(mio, ADESSO).file);
    if (esito.stato !== 'pronto') throw new Error(esito.stato);
    const nuovo = applicaImport(vuoto, esito.riepilogo);
    expect(nuovo.enti).toEqual(mio.enti);
    expect(nuovo.pratiche).toEqual(mio.pratiche);
  });
});
