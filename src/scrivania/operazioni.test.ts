// Operazioni della scrivania (ticket 12). Dati di fantasia.
import {describe, expect, it} from 'vitest';
import {archivioVuoto, schemaArchivio} from '../archivio';
import {aggiungiEnte, aggiungiPratica, aperta, elencoScrivania, eliminaEnte, eliminaPratica, sezioniPertinenti} from './operazioni';
import type {Filtri} from './operazioni';

const ADESSO = '2026-10-11T10:00:00.000Z';
const OGGI = '2026-10-11';
const tutte: Filtri = {soloAperte: false, tipo: 'tutti', enteId: 'tutti'};

function popolato() {
  let a = archivioVuoto();
  a = aggiungiEnte(a, ' Comune di Prova ', 'e1').archivio;
  a = aggiungiEnte(a, 'Comune di Fantasia', 'e2').archivio;
  a = aggiungiPratica(a, {enteId: 'e1', tipo: 'pensione', nome: 'Mario Rossi', codiceFiscale: 'rssmra80a01h501u', cessazione: '2026-12-31'}, 'p1', ADESSO).archivio;
  a = aggiungiPratica(a, {enteId: 'e1', tipo: 'cessazione', nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', cessazione: '2026-10-20'}, 'p2', ADESSO).archivio;
  a = aggiungiPratica(a, {enteId: 'e2', tipo: 'cessazione', nome: 'Anna Bianchi', codiceFiscale: 'RSSMRA80A01H501U'}, 'p3', ADESSO).archivio;
  a = aggiungiPratica(a, {enteId: 'e2', tipo: 'pensione', nome: 'Luigi Verdi', codiceFiscale: 'RSSMRA80A01H501U', cessazione: '2026-09-30'}, 'p4', ADESSO).archivio;
  return a;
}

describe('enti e pratiche', () => {
  it('creano un archivio valido per lo schema', () => {
    expect(() => schemaArchivio.parse(popolato())).not.toThrow();
  });

  it('lo stesso CF in due pratiche resta due pratiche scollegate (storia 8)', () => {
    const [p1, p2] = popolato().pratiche;
    expect(p1.dati.anagrafica.codiceFiscale).toBe(p2.dati.anagrafica.codiceFiscale);
    expect(p1.id).not.toBe(p2.id);
    expect([p1.tipo, p2.tipo]).toEqual(['pensione', 'cessazione']);
  });

  it('una pratica nuova ha il Credito preimpostato a sì (R5, ticket 26)', () => {
    for (const p of popolato().pratiche) expect(p.dati.iscrittoCredito, p.id).toBe(true);
  });

  it('una pratica non si crea in un ente inesistente', () => {
    expect(() => aggiungiPratica(archivioVuoto(), {enteId: 'x', tipo: 'pensione', nome: 'A', codiceFiscale: 'B'}, 'p', ADESSO)).toThrow();
  });

  it('cancellare una pratica toglie solo lei', () => {
    expect(eliminaPratica(popolato(), 'p2').pratiche.map((p) => p.id)).toEqual(['p1', 'p3', 'p4']);
  });

  it('cancellare un ente toglie anche le sue pratiche: nessuna orfana', () => {
    const a = eliminaEnte(popolato(), 'e1');
    expect(a.enti.map((e) => e.id)).toEqual(['e2']);
    expect(a.pratiche.map((p) => p.id)).toEqual(['p3', 'p4']);
  });
});

describe('elenco della scrivania', () => {
  it('tutte le pratiche di tutti gli enti, per data di cessazione; senza data in fondo', () => {
    expect(elencoScrivania(popolato(), tutte, OGGI).map((r) => r.pratica.id)).toEqual(['p4', 'p2', 'p1', 'p3']);
  });

  it('evidenzia le cessazioni entro 30 giorni da oggi, non quelle passate né lontane', () => {
    const vicine = elencoScrivania(popolato(), tutte, OGGI).filter((r) => r.scadenzaVicina).map((r) => r.pratica.id);
    expect(vicine).toEqual(['p2']);
  });

  it('filtri per tipo ed ente', () => {
    expect(elencoScrivania(popolato(), {...tutte, tipo: 'pensione'}, OGGI).map((r) => r.pratica.id)).toEqual(['p4', 'p1']);
    expect(elencoScrivania(popolato(), {...tutte, enteId: 'e2'}, OGGI).map((r) => r.pratica.id)).toEqual(['p4', 'p3']);
  });

  it('filtro per mese di cessazione (aaaa-mm): chi non ha la data non entra; senza filtro entrano tutti', () => {
    const ids = (mese?: string) => elencoScrivania(popolato(), {...tutte, meseCessazione: mese}, OGGI).map((r) => r.pratica.id);
    expect(ids('2026-10')).toEqual(['p2']);
    expect(ids('2026-09')).toEqual(['p4']);
    expect(ids('2027-01')).toEqual([]);
    expect(ids(undefined)).toEqual(['p4', 'p2', 'p1', 'p3']);
    expect(ids('')).toEqual(['p4', 'p2', 'p1', 'p3']);
  });

  it('aperte/tutte: una cessazione col TFR chiuso non è aperta, salvo se da rilavorare', () => {
    const a = popolato();
    const chiusa = {...a.pratiche[1], congelati: [{sezione: 'tfr', versioneTabelle: 'v', dati: a.pratiche[1].dati, risultato: {} as never}]};
    const conChiusa = {...a, pratiche: [a.pratiche[0], chiusa as never, a.pratiche[2], a.pratiche[3]]};
    const aperte = (rilavorare = () => false) =>
      elencoScrivania(conChiusa, {...tutte, soloAperte: true}, OGGI, rilavorare).map((r) => r.pratica.id);
    expect(aperte()).toEqual(['p4', 'p1', 'p3']);
    expect(aperte(() => true)).toEqual(['p4', 'p2', 'p1', 'p3']);
  });
});

describe('pratica di pensione (ticket 30)', () => {
  it("nasce in situazione ordinaria, col regime proposto senza assunzione (TFS) e non scelto", () => {
    const p = popolato().pratiche[0];
    if (p.tipo !== 'pensione') throw new Error(p.tipo);
    expect([p.dati.regime, p.dati.situazione, p.dati.regimeScelto]).toEqual(['TFS', {tipo: 'ordinaria'}, undefined]);
  });

  it("è aperta finché UM pensione e la sezione del suo regime (TFS o TFR) non sono chiuse entrambe", () => {
    const p = popolato().pratiche[0];
    if (p.tipo !== 'pensione') throw new Error(p.tipo);
    const chiusa = (sezione: string) => ({sezione, versioneTabelle: 'v', dati: p.dati, risultato: {} as never}) as never;
    expect(aperta({...p, congelati: [chiusa('umPensione')]})).toBe(true);
    expect(aperta({...p, congelati: [chiusa('umPensione'), chiusa('tfs')]})).toBe(false);
    expect(aperta({...p, dati: {...p.dati, regime: 'TFR'}, congelati: [chiusa('umPensione'), chiusa('tfs')]})).toBe(true);
    expect(aperta({...p, dati: {...p.dati, regime: 'TFR'}, congelati: [chiusa('umPensione'), chiusa('tfr')]})).toBe(false);
  });
});

describe('DMA previste e miglioramento nella pratica di pensione (ticket 31)', () => {
  const pensione = () => {
    const p = popolato().pratiche[0];
    if (p.tipo !== 'pensione') throw new Error(p.tipo);
    return p;
  };
  const chiusa = (sezione: string) => ({sezione, versioneTabelle: 'v', dati: pensione().dati, risultato: {} as never}) as never;
  const base = () => [chiusa('umPensione'), chiusa('tfs')];

  it('contano fra le sezioni della pratica solo se attivate', () => {
    expect(sezioniPertinenti(pensione())).toEqual(['umPensione', 'tfs']);
    const dati = {...pensione().dati, dmaPreviste: {dal: '2026-07'}, miglioramento: {contratto: 'ccnl-2022-24'}};
    expect(sezioniPertinenti({...pensione(), dati})).toEqual(['umPensione', 'tfs', 'dmaPreviste', 'miglioramento']);
  });

  it('una pratica con le altre sezioni chiuse resta aperta finché non si chiudono anche le DMA previste', () => {
    const dati = {...pensione().dati, dmaPreviste: {dal: '2026-07'}};
    expect(aperta({...pensione(), dati, congelati: base()})).toBe(true);
    expect(aperta({...pensione(), dati, congelati: [...base(), chiusa('dmaPreviste')]})).toBe(false);
  });

  it('lo stesso per il miglioramento', () => {
    const dati = {...pensione().dati, miglioramento: {contratto: 'ccnl-2022-24'}};
    expect(aperta({...pensione(), dati, congelati: base()})).toBe(true);
    expect(aperta({...pensione(), dati, congelati: [...base(), chiusa('miglioramento')]})).toBe(false);
  });
});
