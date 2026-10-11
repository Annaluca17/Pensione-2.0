// Promemoria dei 7 giorni, avviso di archivio vuoto, svuotamento (ticket 13, storie 68-69).
import {describe, expect, it} from 'vitest';
import {archivioVuoto} from './archivio';
import {esporta} from './scambio';
import {promemoriaExport, segnaModifica, svuota, vuotoSospetto} from './salvaguardie';
import type {Archivio} from './schema';

const conEnte: Archivio = {...archivioVuoto(), enti: [{id: 'e1', nome: 'Comune di Prova'}]};

describe('promemoria dei 7 giorni', () => {
  it('la prima modifica dopo un export segna l\'istante; le successive no', () => {
    const una = segnaModifica(conEnte, '2026-10-01T10:00:00.000Z');
    expect(segnaModifica(una, '2026-10-05T10:00:00.000Z').modificheNonEsportateDal).toBe('2026-10-01T10:00:00.000Z');
  });

  it('scatta dopo più di 7 giorni di modifiche non esportate', () => {
    const a = segnaModifica(conEnte, '2026-10-01T10:00:00.000Z');
    expect(promemoriaExport(a, '2026-10-08T10:00:00.000Z')).toBeNull();
    expect(promemoriaExport(a, '2026-10-09T10:00:00.000Z')).toBe(8);
  });

  it('nessun promemoria senza modifiche; l\'export completo lo azzera, quello di un ente no', () => {
    expect(promemoriaExport(conEnte, '2027-01-01T00:00:00.000Z')).toBeNull();
    const a = segnaModifica(conEnte, '2026-10-01T10:00:00.000Z');
    expect(esporta(a, '2026-10-20T10:00:00.000Z').archivio.modificheNonEsportateDal).toBeUndefined();
    expect(esporta(a, '2026-10-20T10:00:00.000Z', 'e1').archivio.modificheNonEsportateDal).toBe('2026-10-01T10:00:00.000Z');
  });
});

describe('archivio vuoto all\'avvio', () => {
  it('avvisa se risultava un export o la persistenza concessa', () => {
    expect(vuotoSospetto(archivioVuoto(), false)).toBe(false);
    expect(vuotoSospetto(archivioVuoto(), true)).toBe(true);
    expect(vuotoSospetto({...archivioVuoto(), ultimoExport: '2026-10-01T10:00:00.000Z'}, false)).toBe(true);
    expect(vuotoSospetto(conEnte, true)).toBe(false);
  });

  it('svuotare toglie enti e pratiche e tiene la data dell\'ultimo export', () => {
    const a = {...segnaModifica(conEnte, '2026-10-01T10:00:00.000Z'), ultimoExport: '2026-09-01T10:00:00.000Z'};
    expect(svuota(a)).toEqual({versioneSchema: 1, enti: [], pratiche: [], ultimoExport: '2026-09-01T10:00:00.000Z'});
  });
});
