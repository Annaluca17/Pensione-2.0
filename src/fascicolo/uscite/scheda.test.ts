// Scheda PDF (ticket 16): contenuto dal Risultato e PDF con importi e versione. Dati di fantasia.
import {describe, expect, it} from 'vitest';
import type {Ente, Pratica} from '../../archivio';
import {casiNormativiDma} from '../../casi-normativi/dma-previste';
import {casiNormativiMiglioramento} from '../../casi-normativi/miglioramento';
import {casiNormativiPensioneTfs} from '../../casi-normativi/pensione-tfs';
import {casiNormativiTfr} from '../../casi-normativi/tfr';
import {calcolaPratica} from '../../motore';
import type {DatiPratica, DatiPraticaPensione} from '../../motore';
import {tabelle} from '../../tabelle';
import {costruisciScheda} from './scheda';
import {schedaPdf} from './schedaPdf';

const ente: Ente = {id: 'e1', nome: 'Comune di Prova'};
const pratica = (dati: DatiPratica): Pratica => ({
  id: 'p1',
  enteId: 'e1',
  tipo: 'cessazione',
  dati,
  congelati: [],
  creata: '2026-10-12T10:00:00.000Z',
  modificata: '2026-10-12T10:00:00.000Z',
});
const caso = (id: string) => casiNormativiTfr.find((c) => c.id === id)!.dati;
const scheda = (dati: DatiPratica) => costruisciScheda(pratica(dati), ente, calcolaPratica(dati, tabelle));

describe('contenuto della scheda', () => {
  it('righe PASSWEB già arrotondate come nel Risultato, versione delle tabelle, nessun riquadro se non serve', () => {
    const esito = scheda(caso('TFR-N02'));
    if (esito.stato !== 'pronta') throw new Error('scheda non generata');
    const [tfr] = esito.scheda.blocchi;
    expect(tfr.righe).toEqual([
      ['Decorrenza giuridica', '01/09/2012'],
      ['Decorrenza economica', '01/09/2012'],
      ['Data di cessazione', '20/10/2026'],
      ['Rateo di 13ª pagato (mese di cessazione)', 'nel mese di cessazione, misura "Parziale"'],
      ['Retribuzione valutabile del mese pieno (mese di cessazione)', '2.130,27 €'],
      ['Rateo di 13ª teorica, modalità di pagamento "Parziale" (mese di cessazione)', '111,65 €'],
    ]);
    expect(esito.scheda.versioneTabelle).toBe(tabelle.versione);
    expect(esito.scheda.forzature).toEqual([]);
    expect(esito.scheda.avvisi).toEqual([]);
  });

  it('riquadro con le forzature (proposto/usato/forzato) e gli avvisi che cambiano ciò che si digita', () => {
    const n07 = caso('TFR-N07');
    const esito = scheda({...n07, forzature: {giorniMeseParziale: 12}});
    if (esito.stato !== 'pronta') throw new Error('scheda non generata');
    expect(esito.scheda.forzature).toEqual([{campo: 'Giorni del mese parziale', proposto: '14', usato: '12', forzato: '12'}]);
    expect(esito.scheda.avvisi).toHaveLength(1);
    expect(esito.scheda.avvisi[0]).toContain('14 giorni lavorativi lun-sab e 16 di calendario');
  });

  it('le eccezioni fuori periodo non vanno in stampa: non cambiano ciò che si digita', () => {
    const n02 = caso('TFR-N02');
    const esito = scheda({...n02, voci: {...n02.voci, eccezioni: {...n02.voci.eccezioni, '2020-01': {'01': 1}}}});
    if (esito.stato !== 'pronta') throw new Error('scheda non generata');
    expect(esito.scheda.avvisi).toEqual([]);
  });

  it('cessazione con l\'unica sezione bloccata: nessuna scheda, con i motivi', () => {
    const n02 = caso('TFR-N02');
    const esito = scheda({...n02, anagrafica: {...n02.anagrafica, cessazione: undefined}});
    expect(esito).toEqual({stato: 'non-generabile', motivi: ['Manca la data di cessazione.']});
  });
});

const praticaPensione = (dati: DatiPraticaPensione): Pratica => ({...pratica(dati), tipo: 'pensione', dati});
const casoPensione = (id: string) => casiNormativiPensioneTfs.find((c) => c.id === id)!.dati;
const schedaPensione = (dati: DatiPraticaPensione) => costruisciScheda(praticaPensione(dati), ente, calcolaPratica(dati, tabelle));
const pronta = (esito: ReturnType<typeof costruisciScheda>) => {
  if (esito.stato !== 'pronta') throw new Error(`scheda non generata: ${esito.motivi}`);
  return esito.scheda;
};
const valori = (s: ReturnType<typeof pronta>, titolo: string) => s.blocchi.find((b) => b.titolo === titolo)?.righe?.map((r) => r[1]);

describe('scheda della pratica di pensione', () => {
  it('regime TFS: blocco UM pensione e blocco TFS, nessun TFR; importi dei casi normativi (PT-N01)', () => {
    const s = pronta(schedaPensione(casoPensione('PT-N01')));
    expect(s.titolo).toBe('Scheda della pratica di pensione');
    expect(s.intestazione).toContainEqual(['Regime di fine servizio', 'TFS']);
    expect(s.blocchi.map((b) => b.titolo)).toEqual(['Ultimo miglio pensione', 'Ultimo miglio TFS']);
    expect(valori(s, 'Ultimo miglio pensione')).toEqual([
      '20.452,56 €',
      '1.336,68 €',
      '300,00 €',
      '461,04 €',
      '64,56 €',
      '471,72 €',
      '1.879,19 €',
      '23.086,56 €',
      '24.965,75 €',
    ]);
    const tfs = valori(s, 'Ultimo miglio TFS')!;
    expect(tfs).toContain('20.342,32 €');
    expect(tfs.at(-1)).toBe('24.374,60 €');
  });
});

describe('scheda della pratica di pensione: dati da inserire in PASSWEB', () => {
  it('13ª e totale fissi annui in evidenza, il totale con la 13ª in tono minore', () => {
    const s = pronta(schedaPensione(casoPensione('PT-N01')));
    const um = s.blocchi.find((b) => b.titolo === 'Ultimo miglio pensione')!;
    const etichette = (indici?: number[]) => indici?.map((i) => um.righe![i][0]);
    expect(etichette(um.inEvidenza)?.slice(1)).toEqual(['Totale fissi annui']);
    expect(etichette(um.inTonoMinore)).toEqual(['Totale con la 13ª']);
  });
});

describe('scheda della pratica di pensione: regime e blocchi', () => {
  it('regime TFR: blocco TFR al posto del TFS (MC-N04 senza miglioramento)', () => {
    const {miglioramento: _m, ...dati} = casiNormativiMiglioramento.find((c) => c.id === 'MC-N04')!.dati;
    const s = pronta(schedaPensione(dati));
    expect(s.intestazione).toContainEqual(['Regime di fine servizio', 'TFR']);
    expect(s.blocchi.map((b) => b.titolo)).toEqual(['Ultimo miglio pensione', 'Ultimo miglio TFR']);
  });

  it('tutte le sezioni bloccate: nessuna scheda, con i motivi', () => {
    const dati = casoPensione('PT-N01');
    const esito = schedaPensione({...dati, anagrafica: {...dati.anagrafica, cessazione: undefined}});
    expect(esito.stato).toBe('non-generabile');
    if (esito.stato === 'non-generabile') expect(esito.motivi).toContain('Manca la data di cessazione.');
  });
});

describe('scheda della pratica di pensione: DMA previste', () => {
  const dma = (id: string) => casiNormativiDma.find((c) => c.id === id)!.dati;

  it('un blocco per mese con i campi del regime e gli importi dei casi normativi (DM-N02)', () => {
    const s = pronta(schedaPensione(dma('DM-N02')));
    const mesiDma = s.blocchi.filter((b) => b.titolo.startsWith('DMA previste'));
    expect(mesiDma.map((b) => b.titolo)).toEqual([
      'DMA previste 11/2026 · dal 01/11/2026 al 30/11/2026 · 26/26 giorni · 100% · TFS',
      'DMA previste 12/2026 · dal 01/12/2026 al 31/12/2026 · 26/26 giorni · 100% · TFS · con 13ª (365/365)',
      'DMA previste 01/2027 · dal 01/01/2027 al 15/01/2027 · 13/26 giorni · 100% · TFS · con 13ª (15/365)',
    ]);
    expect(mesiDma.map((b) => b.righe!.map((r) => r[1]))).toEqual([
      ['2.099,26 €', '2.099,26 €', '1.653,76 €'],
      ['4.166,46 €', '4.166,46 €', '3.307,52 €'],
      ['1.134,58 €', '1.134,58 €', '894,84 €'],
    ]);
  });

  it('senza iscrizione al Credito il campo non compare (DM-N06)', () => {
    const s = pronta(schedaPensione(dma('DM-N06')));
    expect(valori(s, s.blocchi.find((b) => b.titolo.startsWith('DMA previste'))!.titolo)).toEqual(['2.567,16 €', '2.031,72 €']);
  });

  it('il settimo mese, oltre il limite, compare con la spiegazione sotto i sei preparati (DM-N04)', () => {
    const s = pronta(schedaPensione(dma('DM-N04')));
    expect(s.blocchi.filter((b) => b.titolo.startsWith('DMA previste 0') || b.titolo.startsWith('DMA previste 1'))).toHaveLength(6);
    const oltre = s.blocchi.find((b) => b.titolo === 'DMA previste: mesi non preparati')!;
    expect(oltre.motivi).toHaveLength(2);
    expect(oltre.motivi![0]).toContain('02/2027');
    expect(oltre.motivi![0]).toContain('al massimo 6');
  });

  it('DMA bloccata: solo i motivi, le altre sezioni restano calcolate', () => {
    const dati = dma('DM-N02');
    const s = pronta(schedaPensione({...dati, dmaPreviste: {dal: '2027-03'}}));
    const blocco = s.blocchi.find((b) => b.titolo === 'DMA previste')!;
    expect(blocco.righe).toBeUndefined();
    expect(blocco.motivi!.length).toBeGreaterThan(0);
    expect(valori(s, 'Ultimo miglio pensione')).toBeDefined();
  });
});

describe('scheda della pratica di pensione: miglioramento contrattuale', () => {
  const mc = (id: string) => casiNormativiMiglioramento.find((c) => c.id === id)!.dati;

  it('Scenario B per decorrenza con la differenza, nessun TFS migliorato (cessato prima del primo tabellare); niente Scenario A (MC-N01)', () => {
    const s = pronta(schedaPensione(mc('MC-N01')));
    expect(s.blocchi.map((b) => b.titolo)).toEqual([
      'Ultimo miglio pensione',
      'Ultimo miglio TFS',
      'Miglioramento contrattuale: UM dal 01/07/2023 (Scenario B)',
      'Miglioramento contrattuale: UM dal 01/01/2024 (Scenario B)',
    ]);
    expect(valori(s, 'Miglioramento contrattuale: UM dal 01/01/2024 (Scenario B)')).toEqual([
      '20.452,56 €',
      '1.336,68 €',
      '300,00 €',
      '461,04 €',
      '64,56 €',
      '471,72 €',
      '1.879,19 €',
      '23.086,56 €',
      '24.965,75 €',
      '1.322,88 €',
      '110,24 €',
    ]);
    const prima = valori(s, 'Miglioramento contrattuale: UM dal 01/07/2023 (Scenario B)')!;
    expect(prima.slice(-5)).toEqual(['1.768,95 €', '21.763,68 €', '23.532,63 €', '0,00 €', '0,00 €']);
  });

  it('gli avvisi che cambiano ciò che si digita: nessun miglioramento reale, nessun avviso TFS (MC-N01)', () => {
    const s = pronta(schedaPensione(mc('MC-N01')));
    expect(s.avvisi.some((a) => a.includes('Nessun miglioramento reale dal 01/07/2023'))).toBe(true);
    expect(s.avvisi.some((a) => a.includes('UM TFS da modificare'))).toBe(false);
    expect(s.avvisi.some((a) => a.includes('differisce dall'))).toBe(false);
  });

  it('contratto ancora in ipotesi: una riga senza importi, e l’avviso informativo non va in stampa (MC-N05)', () => {
    const s = pronta(schedaPensione(mc('MC-N05')));
    expect(valori(s, 'Miglioramento contrattuale')).toEqual(['ipotesi: nessun importo finché non è firmato']);
    expect(s.avvisi).toEqual([]);
  });

  it('contratto non applicabile: solo i motivi, le altre sezioni restano (MC-N06)', () => {
    const s = pronta(schedaPensione(mc('MC-N06')));
    const blocco = s.blocchi.find((b) => b.titolo === 'Miglioramento contrattuale')!;
    expect(blocco.righe).toBeUndefined();
    expect(blocco.motivi![0]).toContain('non applicabile');
  });
});

describe('PDF', () => {
  it('contiene gli importi delle righe e la versione delle tabelle nel piede', () => {
    const esito = scheda(caso('TFR-N02'));
    if (esito.stato !== 'pronta') throw new Error('scheda non generata');
    const testo = schedaPdf(esito.scheda, '12/10/2026').output();
    expect(testo).toContain('2.130,27');
    expect(testo).toContain('111,65');
    expect(testo).toContain(`Tabelle versione ${tabelle.versione}`);
  });

  it('pratica di pensione: importi di ogni sezione, mesi oltre il limite e versione nel piede (DM-N04)', () => {
    const dati = casiNormativiDma.find((c) => c.id === 'DM-N04')!.dati;
    const testo = schedaPdf(pronta(schedaPensione(dati)), '12/10/2026').output();
    expect(testo).toContain('3.129,94');
    expect(testo).toContain('6.223,55');
    expect(testo).toContain('al massimo 6');
    expect(testo).toContain(`Tabelle versione ${tabelle.versione}`);
  });
});
