// Ticket 26: le DMA previste del nuovo motore confrontate con la fotografia del vecchio Anticipo DMA
// (ticket 19; glossario: Fotografia del vecchio, Differenza attesa). Legge solo i dati congelati
// (./fotografie/): il reperto è sparito nella pulizia (ticket 36), gli importi restano.
// Passa se i campi non elencati valgono come il vecchio (±1 centesimo, D17) e se ogni campo elencato vale
// il nuovo importo, giustificato da decisione e fonte. Una sola versione per tempo pieno e part-time.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {DatiPraticaDma, RegimeFineServizio, VociMese} from '../motore';
import fotografia from './fotografie/anticipo-dma.json';
import {tabelle} from '../tabelle';

/** Dall'etichetta della voce del vecchio al codice del catalogo (D15). */
const codice: Record<string, string> = {
  'Stipendio tabellare per 13 mensilità': '01',
  'Differenziale storico (ex PEO) per 13 mensilità': '02',
  'Retribuzione di posizione per 13 mensilità': '07',
  'Indennità specifica (ex art.4 comma 3 CCNL 16/07/1996) per 12 mensilità 5,38': '08',
  'Indennità di Vacanza Contrattuale (compreso Anticipo IVC) per 13 mensilità': '09',
  'Indennità di Comparto per 12 mensilità': '10',
  'Una Tantum 1,5%': 'UT',
};

/**
 * Adattatore confermato dall'utente (ticket 26, decisione 13): il vecchio chiede i giorni, il nuovo li
 * ricava dalle date. Cessazione scelta per avere gli stessi 365esimi; i giorni del mese con la forzatura
 * (D9 ne proporrebbe altri: 13 il 15/07/2026, 26 ad aprile 2023 intero).
 */
const adattatore: Record<string, {posizione: string; cessazione: string; giorni: number}> = {
  'tempo-pieno': {posizione: 'C3', cessazione: '2026-07-15', giorni: 14},
  'part-time': {posizione: 'B4', cessazione: '2023-04-30', giorni: 9},
};

/** Dal campo DMA nuovo all'uscita del vecchio. */
const uscitaVecchia: Record<string, string> = {
  'imponibile-pensionistico': 'imponibileCPDEL',
  'imponibile-credito': 'imponibileFondoCredito',
  'imponibile-tfs': 'imponibileTFS80',
  'imponibile-tfr': 'imponibileTFR80',
  'retribuzione-teorica-tfr': 'tfrTabellareTeorico',
  'retribuzione-valutabile-tfr': 'tfrRivalutato',
};

const D8 = 'D8: IVC del mese dalla tabella (19,28 per gli istruttori dal 07/2025), non la 13,41 digitata nel vecchio';
const R2 = 'R2, R4: la posizione (07) va negli ulteriori elementi al 100%, fuori dall\'imponibile TFR all\'80%';

/** Differenze attese (ticket 26): caso, regime, campo → nuovo importo, con decisione e fonte nel motivo. */
const differenze: {caso: string; regime: RegimeFineServizio; campo: string; vecchio: number; nuovo: number; motivo: string}[] = [
  ...(['TFS', 'TFR'] as const).flatMap((regime) => [
    {caso: 'tempo-pieno', regime, campo: 'imponibile-pensionistico', vecchio: 274733, nuovo: 275364, motivo: D8},
    {caso: 'tempo-pieno', regime, campo: 'imponibile-credito', vecchio: 274733, nuovo: 275364, motivo: D8},
  ]),
  {caso: 'tempo-pieno', regime: 'TFS', campo: 'imponibile-tfs', vecchio: 166192, nuovo: 166696, motivo: D8},
  {caso: 'tempo-pieno', regime: 'TFR', campo: 'imponibile-tfr', vecchio: 217813, nuovo: 166696, motivo: `${R2}; ${D8}`},
  {caso: 'part-time', regime: 'TFR', campo: 'imponibile-tfr', vecchio: 99668, nuovo: 81672, motivo: R2},
];

/** Campi nuovi senza un'uscita del vecchio: valori calcolati a mano (frazioni esatte, half-up). */
const senzaVecchio: Record<string, Record<string, number>> = {
  'tempo-pieno': {'retribuzione-teorica-tfr': 254021, 'retribuzione-valutabile-tfr': 272897, 'ulteriori-elementi-tfr': 64527},
  'part-time': {'ulteriori-elementi-tfr': 22496},
};

const centesimi = (euro: number) => Math.round(euro * 100);

function dati(caso: (typeof fotografia.casi)[number], regime: RegimeFineServizio): DatiPraticaDma {
  const {posizione, cessazione, giorni} = adattatore[caso.id];
  const voci: VociMese = {};
  for (const v of caso.ingressi.voci as {voce_retributiva: string; importo_mensile?: number; valore_intero?: number}[]) {
    voci[codice[v.voce_retributiva]] = centesimi(v.importo_mensile ?? v.valore_intero!);
  }
  const percentuale = 'percentuale_part_time' in caso.ingressi ? caso.ingressi.percentuale_part_time : 100;
  return {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: caso.codiceFiscale, posizione, assunzione: '2001-03-01', cessazione},
    voci: {base: voci, eccezioni: {}},
    partTime: {base: {percentuale}, eccezioni: {}},
    forzature: {giorniMeseParziale: giorni},
    iscrittoCredito: true,
    regime,
    situazione: {tipo: 'ordinaria'},
    dmaPreviste: {dal: cessazione.slice(0, 7)},
  };
}

describe('fotografia Anticipo DMA: il nuovo motore contro il vecchio', () => {
  for (const caso of fotografia.casi) {
    for (const regime of ['TFS', 'TFR'] as const) {
      it(`${caso.id}, regime ${regime}: un periodo, giorni e 365esimi come nel vecchio; campi = vecchio ±1 centesimo salvo le differenze attese`, () => {
        const sezione = calcolaPratica(dati(caso, regime), tabelle).sezioni.dmaPreviste;
        if (sezione?.esito !== 'calcolata') throw new Error('DMA previste non calcolate');
        expect(sezione.periodi).toHaveLength(1);
        const [periodo] = sezione.periodi;
        expect([periodo.giorni, periodo.giorniTredicesima]).toEqual([caso.ingressi.giorni_mensili, caso.ingressi.giorni_tredicesima]);
        const uscite: Record<string, number> = caso.uscite;
        for (const {id, composizione} of periodo.campi) {
          const attesa = differenze.find((d) => d.caso === caso.id && d.regime === regime && d.campo === id);
          const vecchia = uscite[uscitaVecchia[id]];
          if (attesa) {
            expect(centesimi(vecchia), id).toBe(attesa.vecchio);
            expect(composizione.arrotondato, `${id}: ${attesa.motivo}`).toBe(attesa.nuovo);
          } else if (vecchia !== undefined) {
            expect(Math.abs(composizione.arrotondato - centesimi(vecchia)), id).toBeLessThanOrEqual(1);
          } else {
            expect(composizione.arrotondato, id).toBe(senzaVecchio[caso.id][id]);
          }
        }
      });
    }
  }
});
