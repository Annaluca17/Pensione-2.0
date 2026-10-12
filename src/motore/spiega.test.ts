import {describe, expect, it} from 'vitest';
import {componi} from './composizione';
import {spiega} from './index';

describe('spiega: blocchi', () => {
  it.each([
    [{tipo: 'blocco', codice: 'cessazione-mancante'}, 'Manca la data di cessazione.'],
    [
      {tipo: 'blocco', codice: 'data-non-valida', campo: 'cessazione', valore: '2026-02-30'},
      'La data di cessazione «2026-02-30» non è una data valida.',
    ],
    [
      {
        tipo: 'blocco', codice: 'date-incoerenti', campo: 'assunzione', data: '2026-04-01',
        regola: 'non-dopo', rispetto: 'cessazione', dataRispetto: '2026-03-16',
      },
      'La data di assunzione (01/04/2026) non può essere successiva alla data di cessazione (16/03/2026).',
    ],
    [
      {
        tipo: 'blocco', codice: 'date-incoerenti', campo: 'dataRiferimentoPensione', data: '2000-12-31',
        regola: 'non-prima-di', rispetto: 'assunzione', dataRispetto: '2001-03-01',
      },
      'La data di riferimento della pensione (31/12/2000) non può essere precedente alla data di assunzione (01/03/2001).',
    ],
    [
      {tipo: 'blocco', codice: 'part-time-fuori-range', mese: 'base', percentuale: 120},
      'La % di part-time di base (120) deve essere maggiore di 0 e al massimo 100.',
    ],
    [
      {tipo: 'blocco', codice: 'part-time-fuori-range', mese: '2026-01', percentuale: 0},
      'La % di part-time di 01/2026 (0) deve essere maggiore di 0 e al massimo 100.',
    ],
    [
      {tipo: 'blocco', codice: 'posizione-non-valida', posizione: 'C9', motivo: 'inesistente'},
      'La posizione C9 non esiste nelle tabelle.',
    ],
    [
      {tipo: 'blocco', codice: 'posizione-non-valida', posizione: 'DIR', motivo: 'fuori-aree-a-d'},
      'La posizione DIR non è una posizione delle aree A-D.',
    ],
    [
      {
        tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'dataRiferimentoFineServizio',
        data: '2018-12-31', coperturaDal: '2019-01-01',
      },
      'Tabelle non disponibili per la data: la data di riferimento di TFS/TFR (31/12/2018) è precedente al 01/01/2019.',
    ],
    [
      {tipo: 'blocco', codice: 'giorni-forzati-non-validi', giorni: 27, massimo: 26},
      'I giorni forzati del mese parziale (27) devono essere un numero intero fra 0 e 26 (D9).',
    ],
    [
      {
        tipo: 'blocco', codice: 'date-incoerenti', campo: 'situazione', data: '2024-12-01',
        regola: 'non-dopo', rispetto: 'cessazione', dataRispetto: '2024-11-30',
      },
      'La data di inizio della situazione (01/12/2024) non può essere successiva alla data di cessazione (30/11/2024).',
    ],
    [
      {tipo: 'blocco', codice: 'situazione-non-gestita', situazione: 'optante-tfr', regime: 'TFR'},
      "Optante TFR in regime TFR: la sezione TFR dell'optante non è gestita dal sito, va calcolata a parte.",
    ],
  ] as const)('%o', (blocco, testo) => {
    expect(spiega(blocco)).toBe(testo);
  });
});

describe('spiega: avvisi', () => {
  it('eccezioni fuori periodo', () => {
    expect(
      spiega({tipo: 'avviso', codice: 'eccezioni-fuori-periodo', mesi: ['2024-12', '2025-03'], dal: '2025-04', al: '2026-03'}),
    ).toBe('Eccezioni ignorate perché fuori dai mesi considerati (da 04/2025 a 03/2026): 12/2024, 03/2025.');
  });
});

describe('spiega: avvisi della pensione e del TFS', () => {
  it('TFS annualizzato (C20-3)', () => {
    expect(spiega({tipo: 'avviso', codice: 'tfs-annualizzato', mese: '2024-12', mesi: 12, fonte: 'D2'})).toBe(
      'È inserito un solo mese: il TFS moltiplica 12/2024 per 12, senza verificare i 12 mesi (D2).',
    );
  });

  it('contratto in ipotesi (T5)', () => {
    expect(spiega({tipo: 'avviso', codice: 'contratto-in-ipotesi', contratto: 'ccnl-2025-27', vigenzaDal: '2025-01-01', fonte: 'T5'})).toBe(
      "La data di riferimento (pensione o fine TFS) cade nella vigenza dell'ipotesi ccnl-2025-27 (dal 01/01/2025), che non produce importi: alla firma la pratica tornerà da rilavorare (T5).",
    );
  });
});

describe('spiega: composizione', () => {
  it('elenca voci e mesi, operazioni con la fonte, valore pieno e arrotondato', () => {
    const riga = componi({
      addendi: [
        {voce: '01', mese: '2026-03', importo: 123457},
        {voce: '03', mese: '2026-03', importo: 4321},
      ],
      operazioni: [
        {tipo: 'dividi', per: 26, motivo: 'giornaliera', fonte: 'CCNL 2019-21 art. 74 c. 4'},
        {tipo: 'moltiplica', per: 14, motivo: 'giorni del mese parziale'},
      ],
      fonte: 'riga di prova',
    });
    expect(spiega(riga)).toBe(
      [
        'voce 01, 03/2026: 1.234,57 €',
        'voce 03, 03/2026: 43,21 €',
        'somma: 1.277,78 €',
        '÷ 26: giornaliera (CCNL 2019-21 art. 74 c. 4)',
        '× 14: giorni del mese parziale',
        'valore pieno 688,0354 €, arrotondato 688,04 €',
        'Fonte: riga di prova',
      ].join('\n'),
    );
  });

  it('importi negativi e piccoli', () => {
    const riga = componi({addendi: [{voce: '05', mese: '2026-01', importo: -5}], operazioni: [], fonte: 'prova'});
    expect(spiega(riga).split('\n')[0]).toBe('voce 05, 01/2026: -0,05 €');
  });
});
