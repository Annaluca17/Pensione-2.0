// Quale Proposta dei PDF caricati serve alla pratica (D7): per CF se la pratica ce l'ha, altrimenti da elenco.
import type {Proposta} from './tipi';

export type Scelta =
  | {esito: 'vuoto'}
  | {esito: 'scelta'; proposta: Proposta}
  | {esito: 'elenco'; proposte: Proposta[]}
  | {esito: 'assente'; trovati: string[]};

const normale = (cf: string) => cf.replace(/\s/g, '').toUpperCase();

export function scegliProposta(proposte: Proposta[], cfPratica: string): Scelta {
  if (proposte.length === 0) return {esito: 'vuoto'};
  const cf = normale(cfPratica);
  if (!cf) return {esito: 'elenco', proposte};
  const trovata = proposte.find(p => normale(p.cf) === cf);
  return trovata ? {esito: 'scelta', proposta: trovata} : {esito: 'assente', trovati: proposte.map(p => p.cf)};
}
