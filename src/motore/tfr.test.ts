// Regole singole del TFR con tabelle di fantasia minime (spec "Testing Decisions"). I casi con le
// tabelle vere stanno in src/casi-normativi.
import {describe, expect, it} from 'vitest';
import {conAnagrafica, tabelleDiProva} from './fixture';
import {calcolaPratica, spiega} from './index';
import type {Parametri, Risultato, Tabelle, Tfr} from './index';

const tabelle = (conteggio: Parametri['sogliaGiorniTfr']['valore']['conteggio'] = 'lavorativi-lun-sab'): Tabelle => ({
  ...tabelleDiProva,
  righeTfr: [
    {id: 'retribuzione-valutabile', etichetta: 'Mese pieno', voci: ['01', '03'], fonte: 'prova'},
    {id: 'rateo-tredicesima-teorica', etichetta: 'Rateo', voci: ['01'], fonte: 'prova'},
    {id: 'tredicesima-emolumenti-cassa', etichetta: 'Cassa', voci: ['01'], fonte: 'prova'},
  ],
  parametri: {...tabelleDiProva.parametri, sogliaGiorniTfr: {valore: {giorni: 15, conteggio}, fonte: 'prova'}},
});

const sezioneTfr = (r: Risultato): Tfr => {
  const s = r.sezioni.tfr;
  if (s.esito !== 'calcolata') throw new Error(`TFR bloccato: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

// Martedì 16/06/2026: 14 lavorativi lun-sab, 16 di calendario (D10).
const divergente = conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-16'});

describe('soglia dei 15 giorni TFR (D10, storia 43)', () => {
  it('di default conta i lavorativi lun-sab, lo dichiara e avvisa che col calendario cambierebbe', () => {
    const r = calcolaPratica(divergente, tabelle());
    const tfr = sezioneTfr(r);
    expect(tfr.soglia).toMatchObject({giorni: 15, conteggio: 'lavorativi-lun-sab'});
    expect(tfr.meseFinale).toEqual({mese: '2026-06', esito: 'non-utile', giorni: {lavorativiLunSab: 14, calendario: 16}});
    expect(tfr.righe.map((x) => x.id)).toEqual(['tredicesima-emolumenti-cassa']);
    expect(r.avvisi).toContainEqual(
      expect.objectContaining({codice: 'soglia-quindici-giorni-altra-regola', esitoUsato: 'non-utile', esitoAltraRegola: 'utile'}),
    );
  });

  it('col parametro "calendario" lo stesso mese è utile, e l\'avviso dice il contrario', () => {
    const r = calcolaPratica(divergente, tabelle('calendario'));
    const tfr = sezioneTfr(r);
    expect(tfr.soglia.conteggio).toBe('calendario');
    expect(tfr.meseFinale.esito).toBe('utile');
    expect(tfr.righe.map((x) => x.id)).toEqual(['retribuzione-valutabile', 'rateo-tredicesima-teorica']);
    expect(r.avvisi).toContainEqual(
      expect.objectContaining({codice: 'soglia-quindici-giorni-altra-regola', esitoUsato: 'utile', esitoAltraRegola: 'non-utile'}),
    );
  });

  it('nessun avviso quando le due conte danno lo stesso esito', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-20'}), tabelle());
    expect(r.avvisi.filter((a) => a.codice === 'soglia-quindici-giorni-altra-regola')).toEqual([]);
  });
});

describe('righe del mese utile e per cassa (C07-1…3)', () => {
  it('rateo: voci della riga × % × giorni di calendario / 365, un solo arrotondamento', () => {
    const dati = conAnagrafica(
      {assunzione: '2010-01-01', cessazione: '2026-06-20'},
      {partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {}}},
    );
    const [mesePieno, rateo] = sezioneTfr(calcolaPratica(dati, tabelle())).righe;
    // 01 2.000,00 + 03 150,00 al 50%; rateo solo 01: 2.000,00 × 50% × 20 / 365 = 54,79452…
    expect(mesePieno.composizione.arrotondato).toBe(107500);
    expect(rateo.composizione.addendi).toEqual([{voce: '01', mese: '2026-06', importo: 200000, percentuale: 50, giorni: 20}]);
    expect(rateo.composizione.arrotondato).toBe(5479);
  });

  it('cassa con cessazione a gennaio: nessun mese precedente, riga a 0', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-01-10'}), tabelle());
    const [cassa] = sezioneTfr(r).righe;
    expect(cassa.id).toBe('tredicesima-emolumenti-cassa');
    expect(cassa.composizione.addendi).toEqual([]);
    expect(cassa.composizione.arrotondato).toBe(0);
  });

  it('assunzione a metà di un mese dell\'anno di cessazione: il rateo di quel mese conta i giorni dall\'assunzione', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: '2026-02-09', cessazione: '2026-04-08'}), tabelle());
    const cassa = sezioneTfr(r).righe.find((x) => x.id === 'tredicesima-emolumenti-cassa')!;
    expect(cassa.composizione.addendi.map((a) => [a.mese, a.giorni])).toEqual([
      ['2026-02', 20],
      ['2026-03', 31],
    ]);
  });
});

describe('sezione TFR bloccata (storia 36)', () => {
  it('senza cessazione', () => {
    const r = calcolaPratica(conAnagrafica({cessazione: undefined}), tabelle());
    expect(r.sezioni.tfr).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'cessazione-mancante'}]});
  });

  it('senza assunzione (decorrenza giuridica obbligatoria, C185 §2.1): ferma solo il TFR', () => {
    const r = calcolaPratica(conAnagrafica({assunzione: undefined}), tabelle());
    expect(r.sezioni.tfr).toEqual({esito: 'bloccata', motivi: [{tipo: 'blocco', codice: 'assunzione-mancante'}]});
    expect(r.sezioni.retribuzione.esito).toBe('calcolata');
    expect(spiega({tipo: 'blocco', codice: 'assunzione-mancante'})).toBe('Manca la data di assunzione.');
  });

  it('con una cessazione prima delle tabelle', () => {
    const r = calcolaPratica(conAnagrafica({cessazione: '2018-10-20'}), tabelle());
    expect(r.sezioni.tfr).toMatchObject({esito: 'bloccata', motivi: [{codice: 'tabelle-non-disponibili'}]});
  });

  it('con una posizione inesistente', () => {
    const r = calcolaPratica(conAnagrafica({posizione: 'C9'}), tabelle());
    expect(r.sezioni.tfr).toMatchObject({esito: 'bloccata', motivi: [{codice: 'posizione-non-valida'}]});
  });
});

describe('spiega: avvisi del TFR', () => {
  it('soglia dei 15 giorni', () => {
    const [avviso] = calcolaPratica(divergente, tabelle()).avvisi.filter((a) => a.codice === 'soglia-quindici-giorni-altra-regola');
    expect(spiega(avviso)).toBe(
      'Mese di cessazione 06/2026: 14 giorni lavorativi lun-sab e 16 di calendario. Con la regola usata il mese è non utile; ' +
        'con l\'altra sarebbe utile (D10).',
    );
  });

  it('IVC incompatibile', () => {
    expect(
      spiega({tipo: 'avviso', codice: 'ivc-incompatibile', mese: '2024-12', inserita: 891, daTabella: 0, contrattoApplicato: 'ccnl-2022-24', fonte: 'D8'}),
    ).toBe('IVC di 12/2024 inserita 8,91 €, ma col contratto ccnl-2022-24 vale 0,00 €: si usa il valore della tabella (D8).');
  });

  it('mese di assunzione fuori dai mesi inseriti', () => {
    expect(
      spiega({tipo: 'avviso', codice: 'mese-iniziale-fuori-finestra', mese: '2021-06', finestraDal: '2025-11', finestraAl: '2026-10', fonte: 'C07-4'}),
    ).toBe(
      'Il mese di assunzione 06/2021 è utile ma non intero, e le voci inserite vanno da 11/2025 a 10/2026: ' +
        'retribuzione del mese pieno e rateo di 13ª iniziale da calcolare a parte.',
    );
  });

  it('composizione con % e giorni per addendo', () => {
    const dati = conAnagrafica(
      {assunzione: '2010-01-01', cessazione: '2026-06-20'},
      {partTime: {base: {percentuale: 50, tipo: 'O'}, eccezioni: {}}},
    );
    const rateo = sezioneTfr(calcolaPratica(dati, tabelle())).righe[1];
    expect(spiega(rateo.composizione).split('\n')[0]).toBe('voce 01, 06/2026: 2.000,00 € × 50% × 20 gg');
  });
});

describe('IVC (D8)', () => {
  it('una voce 09 non inserita resta 0: il motore non aggiunge l\'IVC della tabella', () => {
    const ivc = {
      dal: '2026-01-01',
      chiave: 'posizione' as const,
      percentuale: 1,
      anticipa: 'contratto-futuro',
      importi: {C5: {mensile: 2000}},
      fonte: 'prova',
    };
    const conIvc: Tabelle = {
      ...tabelle(),
      righeTfr: tabelle().righeTfr.map((r) => (r.id === 'rateo-tredicesima-teorica' ? {...r, voci: ['01', '09']} : r)),
      contratti: [
        {id: 'prova', nome: 'prova', stato: 'definitivo', firma: '2020-01-01', vigenza: {dal: '2019-01-01', al: '2027-12-31'}, fonte: 'prova', scaglionamenti: [], ivc: [ivc], indennitaComparto: []},
      ],
    };
    const dati = conAnagrafica({assunzione: '2010-01-01', cessazione: '2026-06-20'});
    const senza = sezioneTfr(calcolaPratica(dati, conIvc)).righe[1];
    expect(senza.composizione.addendi.map((a) => a.voce)).toEqual(['01']);
    const sbagliata = calcolaPratica({...dati, voci: {base: {'01': 200000, '09': 500}, eccezioni: {}}}, conIvc);
    expect(sezioneTfr(sbagliata).righe[1].composizione.addendi.find((a) => a.voce === '09')!.importo).toBe(2000);
    expect(sbagliata.avvisi).toContainEqual(expect.objectContaining({codice: 'ivc-incompatibile', inserita: 500, daTabella: 2000}));
  });
});
