// Seam dell'archivio (ticket 10): leggi/carica/salva/ascolta sull'involucro Zod, con un localStorage
// finto. Solo dati di fantasia.
import {describe, expect, it, vi} from 'vitest';
import {CHIAVE, archivioVuoto, ascolta, carica, leggi, migra, salva} from './archivio';
import type {Archivio, Pratica} from './schema';

function memoria(iniziale: Record<string, string> = {}) {
  const dati = new Map(Object.entries(iniziale));
  return {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => void dati.set(k, v)),
    dati,
  };
}

const pratica = (id: string, enteId = 'e1'): Pratica => ({
  id,
  enteId,
  tipo: 'cessazione',
  dati: {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-06-20'},
    voci: {base: {'01': 192823}, eccezioni: {}},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
  },
  congelati: [],
  creata: '2026-10-11T10:00:00.000Z',
  modificata: '2026-10-11T10:00:00.000Z',
});

const archivio: Archivio = {
  versioneSchema: 1,
  enti: [{id: 'e1', nome: 'Comune di Prova'}],
  pratiche: [pratica('p1')],
  ultimoExport: null,
};

describe('carica', () => {
  it('alla prima apertura l\'archivio è vuoto e valido', () => {
    expect(carica(memoria())).toEqual({stato: 'valido', archivio: archivioVuoto(), scartate: []});
  });

  it('carica un archivio valido', () => {
    expect(carica(memoria({[CHIAVE]: JSON.stringify(archivio)}))).toEqual({stato: 'valido', archivio, scartate: []});
  });

  it('le tre chiavi vecchie non si leggono', () => {
    const storage = memoria({
      xdesk_passweb_progetti_v1: '[1]',
      xdesk_tfr_progetti_v1: '[2]',
      xdesk_tfr_bozze_v1: '{}',
    });
    const getItem = vi.spyOn(storage, 'getItem');
    expect(carica(storage)).toMatchObject({stato: 'valido', archivio: archivioVuoto()});
    expect(getItem.mock.calls.map(([k]) => k)).toEqual([CHIAVE]);
  });
});

describe('leggi: errori', () => {
  it('un archivio che non è JSON è non valido, con la copia grezza', () => {
    expect(leggi('{rotto')).toMatchObject({stato: 'non-valido', grezzo: '{rotto'});
  });

  it('un involucro con la forma sbagliata è non valido', () => {
    const grezzo = JSON.stringify({...archivio, enti: [{id: 'e1'}]});
    expect(leggi(grezzo)).toMatchObject({stato: 'non-valido', grezzo});
  });

  it('una versione futura dello schema è rifiutata', () => {
    const grezzo = JSON.stringify({...archivio, versioneSchema: 2});
    expect(leggi(grezzo)).toEqual({stato: 'versione-futura', versione: 2, grezzo});
  });

  it('una pratica malformata si scarta da sola e si segnala; il resto entra', () => {
    const malformata = {...pratica('p2'), tipo: 'boh'};
    const orfana = pratica('p3', 'ente-che-non-esiste');
    const esito = leggi(JSON.stringify({...archivio, pratiche: [pratica('p1'), malformata, orfana]}));
    if (esito.stato !== 'valido') throw new Error(esito.stato);
    expect(esito.archivio.pratiche.map((p) => p.id)).toEqual(['p1']);
    expect(esito.scartate.map((s) => [s.indice, s.id])).toEqual([
      [1, 'p2'],
      [2, 'p3'],
    ]);
    expect(esito.scartate[0].grezza).toEqual(malformata);
    expect(esito.scartate[1].motivo).toContain('ente');
  });
});

describe('migra: catena vN → vN+1', () => {
  // Versione 0 artificiale: gli enti si chiamavano "amministrazioni" e mancava ultimoExport.
  const catena = {
    0: (v0: Record<string, unknown>) => {
      const {amministrazioni, ...resto} = v0;
      return {...resto, versioneSchema: 1, enti: amministrazioni, ultimoExport: null};
    },
  };
  const v0 = {versioneSchema: 0, amministrazioni: archivio.enti, pratiche: archivio.pratiche};

  it('porta un file della versione precedente alla corrente, con funzioni pure', () => {
    const prima = structuredClone(v0);
    expect(migra(v0, 1, catena)).toEqual(archivio);
    expect(v0).toEqual(prima);
  });

  it('leggi applica la catena prima di validare', () => {
    expect(leggi(JSON.stringify(v0), catena)).toEqual({stato: 'valido', archivio, scartate: []});
  });

  it('un passo mancante nella catena rende il file non valido', () => {
    expect(leggi(JSON.stringify({...v0, versioneSchema: -1}), catena)).toMatchObject({stato: 'non-valido'});
  });
});

describe('salva', () => {
  it('riscrive intero l\'involucro nella sua chiave', () => {
    const storage = memoria();
    expect(salva(storage, archivio)).toEqual({ok: true});
    expect(JSON.parse(storage.dati.get(CHIAVE)!)).toEqual(archivio);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('non sovrascrive mai un archivio che non supera la validazione', () => {
    const storage = memoria({[CHIAVE]: '{rotto'});
    expect(salva(storage, archivio)).toMatchObject({ok: false});
    expect(storage.dati.get(CHIAVE)).toBe('{rotto');
  });

  it('non sovrascrive un archivio di una versione futura', () => {
    const futuro = JSON.stringify({...archivio, versioneSchema: 9});
    const storage = memoria({[CHIAVE]: futuro});
    expect(salva(storage, archivio)).toMatchObject({ok: false});
    expect(storage.dati.get(CHIAVE)).toBe(futuro);
  });

  it('rifiuta di scrivere un archivio malformato (errore di programmazione)', () => {
    const storage = memoria();
    expect(() => salva(storage, {...archivio, enti: [{id: '', nome: ''}]})).toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe('ascolta: più schede', () => {
  it('ricarica quando un\'altra scheda scrive la chiave dell\'archivio, e ignora le altre chiavi', () => {
    const ascoltatori: ((e: {key: string | null; newValue: string | null}) => void)[] = [];
    const finestra = {
      addEventListener: (_: 'storage', f: (typeof ascoltatori)[number]) => void ascoltatori.push(f),
      removeEventListener: vi.fn(),
    };
    const ricevuti: unknown[] = [];
    const smetti = ascolta(finestra, (esito) => ricevuti.push(esito));
    ascoltatori[0]({key: 'xdesk_tfr_progetti_v1', newValue: '[]'});
    ascoltatori[0]({key: CHIAVE, newValue: JSON.stringify(archivio)});
    expect(ricevuti).toEqual([{stato: 'valido', archivio, scartate: []}]);
    smetti();
    expect(finestra.removeEventListener).toHaveBeenCalled();
  });
});
