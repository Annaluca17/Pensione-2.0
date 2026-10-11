import {describe, expect, it} from 'vitest';
import {conAnagrafica, pratica, tabelleDiProva} from './fixture';
import {calcolaPratica} from './index';
import type {Forzature, Risultato} from './index';

const meseParziale = (r: Risultato) => {
  const s = r.sezioni.meseParziale;
  if (s.esito !== 'calcolata') throw new Error(`mese parziale bloccato: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

describe('calcolaPratica', () => {
  it('porta l\'id della versione delle tabelle (ADR 0004)', () => {
    expect(calcolaPratica(pratica(), tabelleDiProva).versioneTabelle).toBe('2026-10-11.1');
  });
});

const retribuzione = (r: Risultato) => {
  const s = r.sezioni.retribuzione;
  if (s.esito !== 'calcolata') throw new Error(`retribuzione bloccata: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

// Storie 16-17 e spec "Lettore": 12 mesi fino al mese della data di riferimento di TFS/TFR.
describe('espansione dei 12 mesi', () => {
  it('espande la base sui 12 mesi fino al mese della cessazione', () => {
    const {mesi} = retribuzione(calcolaPratica(pratica(), tabelleDiProva));
    expect(mesi.map((m) => m.mese)).toEqual([
      '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
      '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    ]);
    expect(mesi.every((m) => m.voci['01'] === 200000 && m.voci['03'] === 15000)).toBe(true);
    expect(mesi.every((m) => m.partTime.percentuale === 100)).toBe(true);
  });

  it('un\'eccezione di voce sostituisce solo le voci che elenca, in quel mese', () => {
    const dati = pratica({
      voci: {base: {'01': 200000, '03': 15000}, eccezioni: {'2026-01': {'01': 210000}, '2026-02': {'09': 1200}}},
    });
    const {mesi} = retribuzione(calcolaPratica(dati, tabelleDiProva));
    const di = (mese: string) => mesi.find((m) => m.mese === mese)!.voci;
    expect(di('2025-12')).toEqual({'01': 200000, '03': 15000});
    expect(di('2026-01')).toEqual({'01': 210000, '03': 15000});
    expect(di('2026-02')).toEqual({'01': 200000, '03': 15000, '09': 1200});
  });

  it('un\'eccezione di part-time sostituisce % e tipo di quel mese', () => {
    const dati = pratica({
      partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {'2025-10': {percentuale: 83.33, tipo: 'V'}}},
    });
    const {mesi} = retribuzione(calcolaPratica(dati, tabelleDiProva));
    expect(mesi.find((m) => m.mese === '2025-10')!.partTime).toEqual({percentuale: 83.33, tipo: 'V'});
    expect(mesi.find((m) => m.mese === '2025-11')!.partTime).toEqual({percentuale: 50, tipo: 'O'});
  });

  it('la finestra finisce al mese della data di riferimento di TFS/TFR, anche forzata', () => {
    const dati = pratica({forzature: {dataRiferimentoFineServizio: '2025-12-31'}});
    const {mesi} = retribuzione(calcolaPratica(dati, tabelleDiProva));
    expect(mesi[0].mese).toBe('2025-01');
    expect(mesi.at(-1)!.mese).toBe('2025-12');
  });

  it('assunzione dentro la finestra: i mesi prima dell\'assunzione restano fuori', () => {
    const {mesi} = retribuzione(
      calcolaPratica(conAnagrafica({assunzione: '2025-11-15', cessazione: '2026-03-16'}), tabelleDiProva),
    );
    expect(mesi.map((m) => m.mese)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
  });

  it('eccezioni fuori dalla finestra: ignorate, con un avviso che elenca i mesi', () => {
    const dati = pratica({
      voci: {base: {'01': 200000}, eccezioni: {'2025-03': {'01': 1}, '2026-04': {'01': 2}, '2026-01': {'01': 3}}},
      partTime: {base: {percentuale: 100}, eccezioni: {'2024-12': {percentuale: 50, tipo: 'O'}}},
    });
    const r = calcolaPratica(dati, tabelleDiProva);
    expect(r.avvisi.filter((a) => a.codice === 'eccezioni-fuori-periodo')).toEqual([
      {tipo: 'avviso', codice: 'eccezioni-fuori-periodo', mesi: ['2024-12', '2025-03', '2026-04'], dal: '2025-04', al: '2026-03'},
    ]);
    const {mesi} = retribuzione(r);
    expect(mesi).toHaveLength(12);
    expect(mesi.map((m) => m.voci['01'])).toEqual([...Array(9).fill(200000), 3, 200000, 200000]);
    expect(mesi.every((m) => m.partTime.percentuale === 100)).toBe(true);
  });

  it('senza eccezioni fuori periodo nessun avviso', () => {
    expect(calcolaPratica(pratica(), tabelleDiProva).avvisi.filter((a) => a.codice === 'eccezioni-fuori-periodo')).toEqual([]);
  });
});

// D9: giorni lun-sab dal 1° (o dall'assunzione) alla cessazione, domeniche escluse, tetto 26,
// mese intero = 26. Calendario 2026: domeniche di marzo 1, 8, 15, 22, 29.
describe('mese parziale (D9)', () => {
  it('cessazione a metà mese: lun-sab dal 1° alla cessazione', () => {
    const s = meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-03-16'}), tabelleDiProva));
    expect(s.mese).toBe('2026-03');
    expect(s.dal).toBe('2026-03-01');
    expect(s.al).toBe('2026-03-16');
    expect(s.giorni).toEqual({proposto: 13, usato: 13});
  });

  it('cessazione di sabato: il sabato conta', () => {
    const s = meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-03-14'}), tabelleDiProva));
    expect(s.giorni.proposto).toBe(12);
  });

  it('cessazione a fine mese: mese intero = 26', () => {
    // marzo 2026: 31 giorni − 5 domeniche = 26
    expect(meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-03-31'}), tabelleDiProva)).giorni.proposto).toBe(26);
    // febbraio 2026: 28 giorni − 4 domeniche = 24 lun-sab, ma il mese intero vale 26
    expect(meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-02-28'}), tabelleDiProva)).giorni.proposto).toBe(26);
  });

  it('tetto 26: un mese intero con 27 giorni lun-sab vale 26', () => {
    // gennaio 2026: 31 giorni − 4 domeniche (4, 11, 18, 25) = 27
    expect(meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-01-31'}), tabelleDiProva)).giorni.proposto).toBe(26);
    // al 30 gennaio i lun-sab sono 26: il tetto non taglia nulla
    expect(meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-01-30'}), tabelleDiProva)).giorni.proposto).toBe(26);
  });

  it('assunzione in corso di mese: si conta dall\'assunzione', () => {
    const s = meseParziale(
      calcolaPratica(conAnagrafica({assunzione: '2026-03-10', cessazione: '2026-03-20'}), tabelleDiProva),
    );
    // 10-20 marzo: 11 giorni − domenica 15 = 10
    expect(s.dal).toBe('2026-03-10');
    expect(s.giorni.proposto).toBe(10);
    // assunto il 10 e cessato il 31: non è un mese intero, 22 giorni − domeniche 15, 22, 29 = 19
    const fine = calcolaPratica(conAnagrafica({assunzione: '2026-03-10', cessazione: '2026-03-31'}), tabelleDiProva);
    expect(meseParziale(fine).giorni.proposto).toBe(19);
  });

  it('un sabato festivo conta come gli altri giorni lun-sab', () => {
    // 25/04/2026 (Liberazione) è sabato e 06/04/2026 (Pasquetta) è lunedì: contano entrambi.
    // 1-25 aprile: 25 giorni − domeniche 5, 12, 19 = 22
    const s = meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-04-25'}), tabelleDiProva));
    expect(s.giorni.proposto).toBe(22);
  });

  it('cessazione di domenica il 1° del mese: zero giorni', () => {
    expect(meseParziale(calcolaPratica(conAnagrafica({cessazione: '2026-03-01'}), tabelleDiProva)).giorni.proposto).toBe(0);
  });

  it('la forzatura dei giorni resta visibile come proposto/usato/forzato', () => {
    const s = meseParziale(calcolaPratica(pratica({forzature: {giorniMeseParziale: 11}}), tabelleDiProva));
    expect(s.giorni).toEqual({proposto: 13, usato: 11, forzato: 11});
  });
});

// Storia 38: si forzano solo giorni del mese parziale e date di riferimento, mai gli importi.
describe('forzature', () => {
  it('il tipo non ammette importi delle righe', () => {
    // @ts-expect-error: gli importi delle righe PASSWEB non sono forzabili (storia 38)
    const importo: Forzature = {importoRiga: 100};
    // @ts-expect-error: nemmeno il valore di una voce si forza: si correggono le voci
    const voce: Forzature = {voce01: 100};
    expect([importo, voce]).toHaveLength(2);
  });

  it('una chiave estranea arrivata a runtime non entra nel risultato né nel calcolo', () => {
    const forzature = {importoRiga: 100, giorniMeseParziale: 10} as unknown as Forzature;
    const r = calcolaPratica(pratica({forzature}), tabelleDiProva);
    expect(r.forzature).toEqual([{chiave: 'giorniMeseParziale', proposto: 13, forzato: 10}]);
  });

  it('le date di riferimento proposte sono la cessazione e si possono forzare', () => {
    const r = calcolaPratica(pratica({forzature: {dataRiferimentoFineServizio: '2026-02-28'}}), tabelleDiProva);
    expect(r.dateRiferimento).toEqual({
      pensione: {proposto: '2026-03-16', usato: '2026-03-16'},
      fineServizio: {proposto: '2026-03-16', usato: '2026-02-28', forzato: '2026-02-28'},
    });
    expect(r.forzature).toEqual([{chiave: 'dataRiferimentoFineServizio', proposto: '2026-03-16', forzato: '2026-02-28'}]);
  });
});

// Coerenza di dominio: blocchi tipizzati, mai eccezioni; le sezioni indipendenti si calcolano.
describe('blocchi di coerenza', () => {
  const codici = (r: Risultato) => r.blocchi.map((b) => b.codice);

  it('cessazione mancante: bloccate le sezioni che ne dipendono', () => {
    const r = calcolaPratica(conAnagrafica({cessazione: undefined}), tabelleDiProva);
    const blocco = {tipo: 'blocco', codice: 'cessazione-mancante'};
    expect(r.blocchi).toEqual([blocco]);
    expect(r.sezioni.meseParziale).toEqual({esito: 'bloccata', motivi: [blocco]});
    expect(r.sezioni.retribuzione).toEqual({esito: 'bloccata', motivi: [blocco]});
    expect(r.dateRiferimento).toBeUndefined();
  });

  it('data che non esiste: blocco, non eccezione', () => {
    const r = calcolaPratica(conAnagrafica({cessazione: '2026-02-30'}), tabelleDiProva);
    expect(r.blocchi).toEqual([{tipo: 'blocco', codice: 'data-non-valida', campo: 'cessazione', valore: '2026-02-30'}]);
    expect(r.sezioni.meseParziale.esito).toBe('bloccata');
    expect(r.sezioni.retribuzione.esito).toBe('bloccata');
    const a = calcolaPratica(conAnagrafica({assunzione: '01/03/2001'}), tabelleDiProva);
    expect(codici(a)).toEqual(['data-non-valida']);
    expect(a.sezioni.meseParziale.esito).toBe('bloccata');
  });

  it('assunzione dopo la cessazione: date incoerenti', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: '2026-04-01', cessazione: '2026-03-16'}), tabelleDiProva);
    expect(r.blocchi).toEqual([
      {
        tipo: 'blocco',
        codice: 'date-incoerenti',
        campo: 'assunzione',
        data: '2026-04-01',
        regola: 'non-dopo',
        rispetto: 'cessazione',
        dataRispetto: '2026-03-16',
      },
    ]);
    expect(r.sezioni.meseParziale.esito).toBe('bloccata');
    expect(r.sezioni.retribuzione.esito).toBe('bloccata');
  });

  it('data di riferimento forzata dopo la cessazione o prima dell\'assunzione: date incoerenti', () => {
    const dopo = calcolaPratica(pratica({forzature: {dataRiferimentoFineServizio: '2026-04-30'}}), tabelleDiProva);
    expect(dopo.blocchi).toEqual([
      {
        tipo: 'blocco',
        codice: 'date-incoerenti',
        campo: 'dataRiferimentoFineServizio',
        data: '2026-04-30',
        regola: 'non-dopo',
        rispetto: 'cessazione',
        dataRispetto: '2026-03-16',
      },
    ]);
    expect(dopo.sezioni.retribuzione.esito).toBe('bloccata');
    // il mese parziale si chiude alla cessazione, non alla data di riferimento
    expect(dopo.sezioni.meseParziale.esito).toBe('calcolata');

    const prima = calcolaPratica(pratica({forzature: {dataRiferimentoPensione: '2000-12-31'}}), tabelleDiProva);
    expect(prima.blocchi).toContainEqual({
      tipo: 'blocco',
      codice: 'date-incoerenti',
      campo: 'dataRiferimentoPensione',
      data: '2000-12-31',
      regola: 'non-prima-di',
      rispetto: 'assunzione',
      dataRispetto: '2001-03-01',
    });
    expect(prima.sezioni.retribuzione.esito).toBe('calcolata');
  });

  it('% di part-time fuori range: bloccata la retribuzione, il mese parziale si calcola', () => {
    for (const percentuale of [0, -10, 120, Number.NaN]) {
      const r = calcolaPratica(pratica({partTime: {base: {percentuale}, eccezioni: {}}}), tabelleDiProva);
      expect(r.blocchi).toEqual([{tipo: 'blocco', codice: 'part-time-fuori-range', mese: 'base', percentuale}]);
      expect(r.sezioni.retribuzione.esito).toBe('bloccata');
      expect(r.sezioni.meseParziale.esito).toBe('calcolata');
    }
    const eccezione = pratica({partTime: {base: {percentuale: 100}, eccezioni: {'2026-01': {percentuale: 150}}}});
    expect(calcolaPratica(eccezione, tabelleDiProva).blocchi).toEqual([
      {tipo: 'blocco', codice: 'part-time-fuori-range', mese: '2026-01', percentuale: 150},
    ]);
  });

  it('posizione inesistente o fuori dalle aree A-D: blocco, le sezioni del nucleo si calcolano', () => {
    const inesistente = calcolaPratica(conAnagrafica({posizione: 'C9'}), tabelleDiProva);
    expect(inesistente.blocchi).toEqual([
      {tipo: 'blocco', codice: 'posizione-non-valida', posizione: 'C9', motivo: 'inesistente'},
    ]);
    expect(inesistente.sezioni.retribuzione.esito).toBe('calcolata');
    expect(inesistente.sezioni.meseParziale.esito).toBe('calcolata');

    const tabelleConDirigenti = {...tabelleDiProva, posizioni: [...tabelleDiProva.posizioni, 'DIR']};
    const fuori = calcolaPratica(conAnagrafica({posizione: 'DIR'}), tabelleConDirigenti);
    expect(fuori.blocchi).toEqual([
      {tipo: 'blocco', codice: 'posizione-non-valida', posizione: 'DIR', motivo: 'fuori-aree-a-d'},
    ]);
  });

  it('data prima del 01/01/2019: tabelle non disponibili, le sezioni senza tabelle si calcolano', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: '2001-03-01', cessazione: '2018-06-15'}), tabelleDiProva);
    expect(r.blocchi).toEqual([
      {tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'cessazione', data: '2018-06-15', coperturaDal: '2019-01-01'},
    ]);
    expect(r.sezioni.meseParziale.esito).toBe('calcolata');
    expect(r.sezioni.retribuzione.esito).toBe('calcolata');

    const forzata = calcolaPratica(pratica({forzature: {dataRiferimentoFineServizio: '2018-12-31'}}), tabelleDiProva);
    expect(codici(forzata)).toEqual(['tabelle-non-disponibili']);
  });

  it('giorni forzati fuori da 0-26 o non interi: bloccato il mese parziale', () => {
    for (const giorni of [27, -1, 10.5]) {
      const r = calcolaPratica(pratica({forzature: {giorniMeseParziale: giorni}}), tabelleDiProva);
      expect(r.blocchi).toEqual([{tipo: 'blocco', codice: 'giorni-forzati-non-validi', giorni, massimo: 26}]);
      expect(r.sezioni.meseParziale.esito).toBe('bloccata');
      expect(r.sezioni.retribuzione.esito).toBe('calcolata');
    }
  });

  it('più problemi insieme: tutti elencati, nessuna eccezione', () => {
    const dati = conAnagrafica(
      {posizione: 'X', assunzione: 'ieri', cessazione: undefined},
      {partTime: {base: {percentuale: 0}, eccezioni: {}}, forzature: {giorniMeseParziale: 99}},
    );
    expect(() => calcolaPratica(dati, tabelleDiProva)).not.toThrow();
    expect(codici(calcolaPratica(dati, tabelleDiProva)).sort()).toEqual([
      'cessazione-mancante',
      'data-non-valida',
      'giorni-forzati-non-validi',
      'posizione-non-valida',
    ]);
  });
});
