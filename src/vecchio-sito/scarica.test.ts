// Seam del pulsante "scarica i dati del vecchio sito" (ticket 35): contenuto e nome del file, con un
// localStorage finto. Solo dati di fantasia.
import {describe, expect, it, vi} from 'vitest';
import {CHIAVI_VECCHIE, contenutoVecchioSito, nomeFileVecchioSito} from './scarica';

function memoria(iniziale: Record<string, string> = {}) {
  const dati = new Map(Object.entries(iniziale));
  return {
    getItem: vi.fn((k: string) => dati.get(k) ?? null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    dati,
  };
}

describe('contenutoVecchioSito', () => {
  it('riporta le tre chiavi vecchie come stringhe grezze, senza parsarle', () => {
    const m = memoria({
      xdesk_passweb_progetti_v1: '{"progetti":[{"id":"p1","nomeComune":"Comune di Fantasia"}]}',
      xdesk_tfr_progetti_v1: 'non è JSON {',
      xdesk_tfr_bozze_v1: '{"RSSMRA80A01H501U":{"passo":2}}',
    });

    const json = JSON.parse(contenutoVecchioSito(m));

    expect(json).toEqual({
      xdesk_passweb_progetti_v1: '{"progetti":[{"id":"p1","nomeComune":"Comune di Fantasia"}]}',
      xdesk_tfr_progetti_v1: 'non è JSON {',
      xdesk_tfr_bozze_v1: '{"RSSMRA80A01H501U":{"passo":2}}',
    });
  });

  it('una chiave assente diventa null, non viene inventata', () => {
    const m = memoria({xdesk_tfr_progetti_v1: '[]'});

    const json = JSON.parse(contenutoVecchioSito(m));

    expect(Object.keys(json)).toEqual([...CHIAVI_VECCHIE]);
    expect(json.xdesk_passweb_progetti_v1).toBeNull();
    expect(json.xdesk_tfr_progetti_v1).toBe('[]');
    expect(json.xdesk_tfr_bozze_v1).toBeNull();
  });

  it('non scrive né cancella nulla: legge soltanto le tre chiavi', () => {
    const m = memoria({xdesk_passweb_progetti_v1: '{"x":1}', altra_chiave: 'intoccabile'});

    contenutoVecchioSito(m);

    expect(m.setItem).not.toHaveBeenCalled();
    expect(m.removeItem).not.toHaveBeenCalled();
    expect(m.clear).not.toHaveBeenCalled();
    expect(m.getItem.mock.calls.map(([k]) => k).sort()).toEqual([...CHIAVI_VECCHIE].sort());
    expect(m.dati.get('xdesk_passweb_progetti_v1')).toBe('{"x":1}');
    expect(m.dati.get('altra_chiave')).toBe('intoccabile');
  });
});

describe('nomeFileVecchioSito', () => {
  it('include la data di oggi in formato AAAA-MM-GG', () => {
    expect(nomeFileVecchioSito(new Date(2026, 9, 12, 17, 30))).toBe('vecchio-sito-2026-10-12.json');
  });
});
