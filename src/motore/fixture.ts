// Dati di fantasia per i test del motore: nessun nome, CF o ente reale.
import type {DatiPratica, Tabelle} from './index';

export const tabelleDiProva: Tabelle = {
  versione: '2026-10-11.1',
  coperturaDal: '2019-01-01',
  posizioni: ['A1', 'B3', 'C1', 'C5', 'D1', 'D3'],
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
