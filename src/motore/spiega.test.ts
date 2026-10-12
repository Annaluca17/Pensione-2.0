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
    [
      {tipo: 'blocco', codice: 'data-non-valida', campo: 'dmaPreviste', valore: '2027-13'},
      'Il mese della prima DMA prevista «2027-13» non è una data valida.',
    ],
    [
      {
        tipo: 'blocco', codice: 'date-incoerenti', campo: 'dmaPreviste', data: '2027-04-01',
        regola: 'non-dopo', rispetto: 'cessazione', dataRispetto: '2027-03-31',
      },
      'Il mese della prima DMA prevista (04/2027) non può essere successivo al mese di cessazione (03/2027).',
    ],
    [
      {
        tipo: 'blocco', codice: 'date-incoerenti', campo: 'dmaPreviste', data: '2019-12-01',
        regola: 'non-prima-di', rispetto: 'assunzione', dataRispetto: '2020-01-15',
      },
      'Il mese della prima DMA prevista (12/2019) non può essere precedente al mese di assunzione (01/2020).',
    ],
    [
      {tipo: 'blocco', codice: 'situazione-non-gestita', situazione: 'sospensione-cautelare', dal: '2027-02-15', motivo: 'non-al-primo-del-mese'},
      'La sospensione cautelare inizia il 15/02/2027, non il 1° del mese: le DMA previste non si dividono a metà mese, vanno preparate a parte (C21-2).',
    ],
    [
      {tipo: 'blocco', codice: 'dma-oltre-limite', mese: '2027-02', limite: 6, fonte: 'D12'},
      'DMA prevista di 02/2027 non preparata: PASSWEB ne accetta al massimo 6 (D12). Si inserirà quando le DMA vere avranno fatto scorrere i mesi.',
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
      "La data di riferimento (pensione o fine TFS) o la cessazione del miglioramento contrattuale cade nella vigenza dell'ipotesi ccnl-2025-27 (dal 01/01/2025), che non produce importi: alla firma la pratica tornerà da rilavorare (T5).",
    );
  });
});

describe('spiega: avvisi delle DMA previste', () => {
  it('DMA non prevista con la trattenuta per malattia (D19, C21-2)', () => {
    expect(spiega({tipo: 'avviso', codice: 'dma-non-prevista', situazione: 'trattenuta-malattia', fonte: 'D19'})).toBe(
      'Con la trattenuta 100% per malattia la DMA prevista non serve: nessun periodo preparato (D19, C21-2).',
    );
  });
});

describe('spiega: miglioramento contrattuale (C21-5…C21-8)', () => {
  it.each([
    [
      {
        tipo: 'blocco', codice: 'miglioramento-non-applicabile', contratto: 'ccnl-2022-24', vigenzaDal: '2022-01-01',
        vigenzaAl: '2024-12-31', firma: '2026-02-23', cessazione: '2025-10-31', fonte: 'C21-5',
      },
      'Miglioramento ccnl-2022-24 non applicabile: vale per chi è cessato nella sua vigenza (01/01/2022 - 31/12/2024) ' +
        'e prima della firma (23/02/2026); la cessazione è del 31/10/2025 (C21-5).',
    ],
    [{tipo: 'blocco', codice: 'contratto-inesistente', contratto: 'boh'}, 'Il contratto «boh» scelto per il miglioramento non è nelle tabelle.'],
    [
      {tipo: 'blocco', codice: 'importo-non-in-tabella', decorrenza: '2022-07-01', chiave: 'A3', fonte: 'IVC RGS 2022-23'},
      "Manca in tabella l'importo per A3 dello scaglionamento dal 01/07/2022 (IVC RGS 2022-23): il miglioramento non si può calcolare.",
    ],
    [
      {tipo: 'avviso', codice: 'pensione-erogata-diversa', fissi: 2313168, tredicesima: 188184, ricalcolatoFissi: 2348568, ricalcolato13: 191134, fonte: 'T4'},
      "La pensione erogata (fissi 23.131,68 €, 13ª 1.881,84 €) differisce dall'UM ricalcolato dalle voci " +
        '(fissi 23.485,68 €, 13ª 1.911,34 €): la vecchia domanda non si tocca (T4).',
    ],
    [
      {tipo: 'avviso', codice: 'nessun-miglioramento-reale', decorrenza: '2025-01-01', migliorato: 4038083, erogata: 4123311, fonte: 'T4'},
      'Nessun miglioramento reale dal 01/01/2025: fissi + 13ª migliorati (40.380,83 €) non superano la pensione erogata ' +
        '(41.233,11 €). Non inserire la domanda (T4).',
    ],
  ] as const)('%o', (cosa, testo) => {
    expect(spiega(cosa)).toBe(testo);
  });

  it('TFS da modificare, con le righe', () => {
    expect(spiega({tipo: 'avviso', codice: 'tfs-da-modificare', righe: ['tab-e', 'tredicesima', 'differenziali'], fonte: 'C21-8'})).toBe(
      'UM TFS da modificare: il miglioramento contrattuale cambia le righe tab-e, tredicesima, differenziali (C21-8).',
    );
  });
});

describe('spiega: composizione', () => {
  it('giorni su un divisore: giornaliera su 26 e rateo di 13ª in 365esimi (D9, D11)', () => {
    const riga = componi({
      addendi: [
        {voce: '01', mese: '2026-07', importo: 191555, giorni: 14, divisore: 26},
        {voce: '01', mese: '2026-07', importo: 191555, percentuale: 50, giorni: 196, divisore: 365},
      ],
      operazioni: [],
      fonte: 'prova',
    });
    expect(spiega(riga).split('\n').slice(0, 3)).toEqual([
      'voce 01, 07/2026: 1.915,55 € × 14/26 gg',
      'voce 01, 07/2026: 1.915,55 € × 50% × 196/365 gg',
      'somma: 1.545,7621 €',
    ]);
  });

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

describe('spiega: avvisi di coerenza con le tabelle (ticket 24)', () => {
  const base = {tipo: 'avviso' as const, mese: '2024-11', contrattoApplicato: 'ccnl-2022-24', fonte: 'Tabella B'};

  it('tabellare diverso', () => {
    expect(spiega({...base, codice: 'tabellare-diverso', inserito: 200000, daTabella: 190000})).toBe(
      'Tabellare di 11/2024 inserito 2.000,00 €, ma la tabella del contratto ccnl-2022-24 dà 1.900,00 €: l\'importo inserito resta, da verificare.',
    );
  });

  it('differenziale storico diverso', () => {
    expect(spiega({...base, codice: 'differenziale-storico-diverso', inserito: 21000, daTabella: 20000})).toBe(
      'Differenziale storico di 11/2024 inserito 210,00 €, ma la tabella del contratto ccnl-2022-24 dà 200,00 €: l\'importo inserito resta, da verificare.',
    );
  });

  it('comparto diverso', () => {
    expect(spiega({...base, codice: 'comparto-diverso', inserito: 5000, daTabella: 4580})).toBe(
      'Indennità di comparto di 11/2024 inserita 50,00 €, ma la tabella del contratto ccnl-2022-24 dà 45,80 €: l\'importo inserito resta, da verificare.',
    );
  });

  it('differenziale art. 14: non multiplo e oltre il massimo', () => {
    const art14 = {...base, codice: 'differenziale-art14-incoerente' as const, area: 'istruttori' as const, misura: 5769, massimo: 5};
    expect(spiega({...art14, inserito: 8000, motivo: 'non-multiplo'})).toBe(
      'Differenziale art. 14 di 11/2024 inserito 80,00 €: non è un multiplo della misura di 57,69 € dell\'area Istruttori. L\'importo inserito resta, da verificare.',
    );
    expect(spiega({...art14, inserito: 34614, motivo: 'oltre-massimo'})).toBe(
      'Differenziale art. 14 di 11/2024 inserito 346,14 €: supera il massimo di 5 differenziali (57,69 € ciascuno) dell\'area Istruttori. L\'importo inserito resta, da verificare.',
    );
  });

  it('IVC non tabulata', () => {
    expect(spiega({...base, codice: 'ivc-non-tabulata', inserita: 500, chiave: 'istruttori'})).toBe(
      'IVC di 11/2024 inserita 5,00 €, ma la tabella del contratto ccnl-2022-24 non ha il valore per istruttori: non si somma, da verificare.',
    );
  });
});
