// Avvisi di coerenza dei dati con le tabelle del contratto vigente (ticket 24, storie 50-52): tabelle
// di fantasia minime, dal seam `calcolaPratica`. Un avviso non cambia gli importi né ferma la sezione.
import {describe, expect, it} from 'vitest';
import {pratica, tabelleDiProva} from './fixture';
import {calcolaPratica} from './index';
import type {Avviso, ContrattoDefinitivo, DatiPraticaPensione, Risultato, Tabelle, VoceCatalogo} from './index';

const voce = (codice: string): VoceCatalogo => ({
  codice,
  descrizione: `voce ${codice}`,
  mensilita: 12,
  utile: {pensione: true, tredicesima: false, tfs: true, tfr: true},
  dal: '2019-01-01',
  fonte: 'prova',
});

const area = (importo: number) => ({'funzionari-eq': {mensile: importo}, istruttori: {mensile: importo}, 'operatori-esperti': {mensile: importo}, operatori: {mensile: importo}});

const contratto: ContrattoDefinitivo = {
  id: 'c1',
  nome: 'Contratto di prova',
  stato: 'definitivo',
  firma: '2022-11-16',
  vigenza: {dal: '2019-01-01', al: '2030-12-31'},
  fonte: 'prova',
  scaglionamenti: [{decorrenza: '2023-04-01', chiave: 'area', tipo: 'tabellare', importi: {istruttori: {mensile: 190000}}, fonte: 'Tabella di prova'}],
  ivc: [],
  indennitaComparto: [{decorrenza: '2019-01-01', importi: area(4580), fonte: 'Tabella comparto di prova'}],
};

const tabelle: Tabelle = {
  ...tabelleDiProva,
  contratti: [contratto],
  trasposizione: [
    {posizione: 'C5', area: 'istruttori', ingresso: 'C1', differenzialeBase: 20000, differenzialeStorico: {mensile: 20000, fonte: 'Trasposizione di prova'}},
  ],
  differenzialiArt14: {...tabelleDiProva.differenzialiArt14, istruttori: {annuo: 75000, mensile: 5769, massimo: 5, fonte: 'Art. 14 di prova'}},
  catalogoVoci: ['01', '02', '03', '09', '10'].map(voce),
  righeTfr: [{id: 'retribuzione-valutabile', etichetta: 'Mese pieno', voci: ['01', '02', '03', '09', '10'], fonte: 'prova'}],
  righePassweb: {
    ...tabelleDiProva.righePassweb,
    pensione: {
      righe: ['01', '02', '03', '09', '10'].map((v) => ({id: `voce-${v}`, etichetta: `Voce ${v}`, voci: [v], fonte: 'prova'})),
      tredicesima: {id: 'tredicesima', etichetta: '13ª', voci: [], fonte: 'prova'},
    },
  },
};

/** Voci coerenti con la tabella di prova (C5, istruttori) a novembre 2024. */
const coerenti = {'01': 190000, '02': 20000, '03': 5769, '10': 4580};

const conVoci = (voci: Record<string, number>): DatiPraticaPensione => {
  const base = pratica({voci: {base: voci, eccezioni: {}}});
  return {...base, regime: 'TFS', situazione: {tipo: 'ordinaria'}, anagrafica: {...base.anagrafica, assunzione: '2001-03-01', cessazione: '2024-11-30'}};
};

const CODICI = ['tabellare-diverso', 'differenziale-storico-diverso', 'comparto-diverso', 'differenziale-art14-incoerente', 'ivc-non-tabulata'];
/** Gli avvisi di coerenza del mese di cessazione (l'unico controllato in questi casi). */
const avvisi = (r: Risultato): Avviso[] => r.avvisi.filter((a) => CODICI.includes(a.codice) && 'mese' in a && a.mese === '2024-11');
const tutti = (r: Risultato): Avviso[] => r.avvisi.filter((a) => CODICI.includes(a.codice));

describe('dati coerenti con la tabella: nessun avviso', () => {
  it('tabellare, differenziale storico, art. 14 e comparto come in tabella', () => {
    expect(avvisi(calcolaPratica(conVoci(coerenti), tabelle))).toEqual([]);
  });
});

describe('tabellare diverso dalla tabella (storia 51)', () => {
  it('avviso con inserito, valore di tabella, contratto e fonte; la riga resta quella inserita', () => {
    const r = calcolaPratica(conVoci({...coerenti, '01': 200000}), tabelle);
    expect(avvisi(r)).toEqual([
      {tipo: 'avviso', codice: 'tabellare-diverso', mese: '2024-11', inserito: 200000, daTabella: 190000, contrattoApplicato: 'c1', fonte: 'Tabella di prova'},
    ]);
    const um = r.sezioni.umPensione;
    if (um?.esito !== 'calcolata') throw new Error('UM pensione non calcolata');
    expect(um.righe.find((x) => x.voce === '01')?.composizione.arrotondato).toBe(200000 * 12);
  });
});

describe('differenziale storico diverso dalla tabella (storia 51)', () => {
  it('avviso con la fonte della trasposizione', () => {
    const r = calcolaPratica(conVoci({...coerenti, '02': 21000}), tabelle);
    expect(avvisi(r)).toEqual([
      {tipo: 'avviso', codice: 'differenziale-storico-diverso', mese: '2024-11', inserito: 21000, daTabella: 20000, contrattoApplicato: 'c1', fonte: 'Trasposizione di prova'},
    ]);
  });

  it('prima del tabellare per area (01/04/2023) la voce 02 non si confronta', () => {
    const dati = conVoci({'01': 190000, '02': 21000});
    const r = calcolaPratica({...dati, anagrafica: {...dati.anagrafica, cessazione: '2023-02-28'}}, tabelle);
    expect(avvisi(r).filter((a) => a.codice === 'differenziale-storico-diverso')).toEqual([]);
  });
});

describe('indennità di comparto diversa dalla tabella (storia 51)', () => {
  it('avviso con il comparto in vigore dell\'area', () => {
    const r = calcolaPratica(conVoci({...coerenti, '10': 5000}), tabelle);
    expect(avvisi(r)).toEqual([
      {tipo: 'avviso', codice: 'comparto-diverso', mese: '2024-11', inserito: 5000, daTabella: 4580, contrattoApplicato: 'c1', fonte: 'Tabella comparto di prova'},
    ]);
  });
});

describe('differenziale art. 14 (storia 52, T9)', () => {
  const art14 = (inserito: number) => avvisi(calcolaPratica(conVoci({...coerenti, '03': inserito}), tabelle));

  it('multipli della misura fino al massimo: nessun avviso, anche con l\'arrotondamento dell\'annuo', () => {
    // misura 57,69 €; 2 differenziali = 115,38 (2 × misura) o 115,38 (arrotondato 2 × 750/13 = 115,3846)
    for (const ok of [5769, 11538, 17307, 28845, 11539, 28846]) expect(art14(ok)).toEqual([]);
    // 3 × 750/13 = 173,0769 → 173,08 (la tolleranza di un cent per differenziale lo ammette comunque)
    expect(art14(17308)).toEqual([]);
  });

  it('non multiplo: avviso con area, misura, massimo e fonte', () => {
    expect(art14(8000)).toEqual([
      {tipo: 'avviso', codice: 'differenziale-art14-incoerente', mese: '2024-11', inserito: 8000, motivo: 'non-multiplo', area: 'istruttori', misura: 5769, massimo: 5, fonte: 'Art. 14 di prova'},
    ]);
  });

  it('oltre il massimo: sei differenziali per un\'area che ne ammette cinque', () => {
    expect(art14(6 * 5769)).toEqual([
      expect.objectContaining({codice: 'differenziale-art14-incoerente', motivo: 'oltre-massimo', massimo: 5}),
    ]);
  });

  it('voce 03 assente o a zero: nessun avviso', () => {
    expect(avvisi(calcolaPratica(conVoci({'01': 190000, '02': 20000, '10': 4580}), tabelle))).toEqual([]);
    expect(art14(0)).toEqual([]);
  });
});

describe('IVC non tabulata (storia 51)', () => {
  const periodo = {dal: '2024-01-01', chiave: 'area' as const, percentuale: 1, anticipa: 'futuro', fonte: 'IVC di prova', importi: {'funzionari-eq': {mensile: 700}}};
  const conIvc: Tabelle = {...tabelle, contratti: [{...contratto, ivc: [periodo]}]};

  it('il periodo di IVC c\'è ma non ha il valore per l\'area: avviso al posto di "incompatibile", la riga resta assente', () => {
    const r = calcolaPratica(conVoci({...coerenti, '09': 500}), conIvc);
    expect(avvisi(r)).toEqual([
      {tipo: 'avviso', codice: 'ivc-non-tabulata', mese: '2024-11', inserita: 500, chiave: 'istruttori', contrattoApplicato: 'c1', fonte: 'IVC di prova'},
    ]);
    expect(r.avvisi.some((a) => a.codice === 'ivc-incompatibile')).toBe(false);
    const um = r.sezioni.umPensione;
    if (um?.esito !== 'calcolata') throw new Error('UM pensione non calcolata');
    expect(um.righe.some((x) => x.voce === '09')).toBe(false);
  });

  it('IVC riassorbita da un contratto applicato: resta "incompatibile", non "non tabulata" (D8)', () => {
    const riassorbita: Tabelle = {...tabelle, contratti: [{...contratto, ivc: [{...periodo, anticipa: 'c1'}]}]};
    const r = calcolaPratica(conVoci({...coerenti, '09': 500}), riassorbita);
    expect(r.avvisi.map((a) => a.codice)).toContain('ivc-incompatibile');
    expect(avvisi(r)).toEqual([]);
  });
});

describe('tutte le sezioni presenti, un avviso per mese', () => {
  it('le voci di base valgono per i 12 mesi del TFS: l\'avviso è solo sul mese di fine servizio, dove la posizione è certa', () => {
    const r = calcolaPratica(conVoci({...coerenti, '01': 200000}), tabelle);
    expect(tutti(r).map((a) => ('mese' in a ? a.mese : ''))).toEqual(['2024-11']);
  });

  it('chi cambia area nella finestra: i mesi prima del cambio non danno falsi avvisi (PT-N06)', () => {
    const base = conVoci({...coerenti});
    const vecchia = {...coerenti, '01': 180000};
    const r = calcolaPratica({...base, voci: {base: vecchia, eccezioni: {'2024-07': coerenti, '2024-11': coerenti}}}, tabelle);
    expect(tutti(r)).toEqual([]);
  });

  it('DMA previste: l\'avviso c\'è sui mesi preparati, uno per mese', () => {
    const r = calcolaPratica({...conVoci({...coerenti, '01': 200000}), dmaPreviste: {dal: '2024-10'}}, tabelle);
    expect(tutti(r).map((a) => ('mese' in a ? a.mese : ''))).toEqual(['2024-10', '2024-11']);
  });

  it('pratica di cessazione (solo TFR): avvisi su ogni mese letto, uno per mese', () => {
    const base = pratica({voci: {base: {...coerenti, '01': 200000}, eccezioni: {'2024-10': {'01': 190000}}}});
    const r = calcolaPratica({...base, anagrafica: {...base.anagrafica, assunzione: '2001-03-01', cessazione: '2024-11-30'}}, tabelle);
    const mesi = tutti(r).map((a) => (a.codice === 'tabellare-diverso' ? a.mese : null));
    expect(mesi).toContain('2024-11');
    expect(mesi).not.toContain('2024-10');
    expect(new Set(mesi).size).toBe(mesi.length);
  });

  it('pensione in regime TFR: il mese letto da UM pensione e TFR ha un solo avviso', () => {
    const r = calcolaPratica({...conVoci({...coerenti, '01': 200000}), regime: 'TFR'}, tabelle);
    expect(avvisi(r).filter((a) => a.codice === 'tabellare-diverso' && a.mese === '2024-11')).toHaveLength(1);
  });

  it('non cambia gli importi: le righe sono quelle degli importi inseriti', () => {
    const coerente = calcolaPratica(conVoci(coerenti), tabelle);
    const diverso = calcolaPratica(conVoci({...coerenti, '01': 200000}), tabelle);
    const um = (r: Risultato) => (r.sezioni.umPensione?.esito === 'calcolata' ? r.sezioni.umPensione.righe.filter((x) => x.voce !== '01').map((x) => x.composizione.arrotondato) : null);
    expect(um(diverso)).toEqual(um(coerente));
    expect(diverso.sezioni.umPensione?.esito).toBe('calcolata');
  });
});
