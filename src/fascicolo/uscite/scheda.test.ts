// Scheda PDF (ticket 16): contenuto dal Risultato e PDF con importi e versione. Dati di fantasia.
import {describe, expect, it} from 'vitest';
import type {Ente, Pratica} from '../../archivio';
import {casiNormativiTfr} from '../../casi-normativi/tfr';
import {calcolaPratica} from '../../motore';
import type {DatiPratica} from '../../motore';
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

describe('PDF', () => {
  it('contiene gli importi delle righe e la versione delle tabelle nel piede', () => {
    const esito = scheda(caso('TFR-N02'));
    if (esito.stato !== 'pronta') throw new Error('scheda non generata');
    const testo = schedaPdf(esito.scheda, '12/10/2026').output();
    expect(testo).toContain('2.130,27');
    expect(testo).toContain('111,65');
    expect(testo).toContain(`Tabelle versione ${tabelle.versione}`);
  });
});
