// Dati di fantasia per i test del motore: nessun nome, CF o ente reale.
import type {DatiPratica, Tabelle} from './index';

export const tabelleDiProva: Tabelle = {
  versione: '2026-10-11.1',
  registro: [{id: '2026-10-11.1', motivo: 'Prima versione di prova'}],
  coperturaDal: '2019-01-01',
  posizioni: ['A1', 'B3', 'C1', 'C5', 'D1', 'D3'],
  // Il nucleo non legge ancora contratti, catalogo né parametri: qui sono vuoti o di fantasia.
  contratti: [],
  trasposizione: [],
  differenzialiArt14: {
    'funzionari-eq': {annuo: 0, mensile: 0, massimo: 0, fonte: 'prova'},
    istruttori: {annuo: 0, mensile: 0, massimo: 0, fonte: 'prova'},
    'operatori-esperti': {annuo: 0, mensile: 0, massimo: 0, fonte: 'prova'},
    operatori: {annuo: 0, mensile: 0, massimo: 0, fonte: 'prova'},
  },
  catalogoVoci: [],
  righeTfr: [],
  righePassweb: {pensione: {righe: [], tredicesima: {id: 'tredicesima', etichetta: '13ª', voci: [], fonte: 'prova'}}, tfs: [], dma: []},
  parametri: {
    sogliaGiorniTfr: {valore: {giorni: 15, conteggio: 'lavorativi-lun-sab'}, fonte: 'prova'},
    divisoreGiornaliera: {valore: 26, fonte: 'prova'},
    tettoGiorniMeseParziale: {valore: 26, fonte: 'prova'},
    divisoreRateoTredicesima: {valore: 365, fonte: 'prova'},
    limiteDmaPreviste: {valore: 2, fonte: 'prova'},
  },
  lettere: {
    tfr: {oggetto: 'prova', riferimentoNormativo: 'prova', fonte: 'prova'},
    miglioramento: {oggetto: 'prova', riferimentoNormativo: 'prova', fonte: 'prova'},
  },
};

/** Pratica di fantasia a tempo pieno; `modifica` sovrascrive i campi di primo livello. */
export function pratica(modifica: Partial<DatiPratica> = {}): DatiPratica {
  return {
    anagrafica: {
      nome: 'Mario Rossi',
      codiceFiscale: 'RSSMRA80A01H501U',
      posizione: 'C5',
      assunzione: '2001-03-01',
      cessazione: '2026-03-16',
    },
    voci: {base: {'01': 200000, '03': 15000}, eccezioni: {}},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
    ...modifica,
  };
}

/** Come `pratica`, cambiando solo l'anagrafica. */
export function conAnagrafica(anagrafica: Partial<DatiPratica['anagrafica']>, modifica: Partial<DatiPratica> = {}) {
  const base = pratica(modifica);
  return {...base, anagrafica: {...base.anagrafica, ...anagrafica}};
}
