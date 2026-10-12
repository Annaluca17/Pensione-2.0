// Il contratto col Portale Strumenti Interni (ticket 36, ADR 0002): il Portale apre il sito con
// ?modulo=<id> e ?embed=1; il sito risponde col postMessage dell'id che sta mostrando.
import type {Filtri} from '../scrivania/operazioni';

export type FiltroTipo = Filtri['tipo'];

// Gli id nuovi (scrivania, pensione, cessazione, decisi con l'utente il 12/10/2026) e i sette dei
// vecchi moduli, che restano validi e aprono la scrivania filtrata (ticket 07).
const ID = new Map<string, FiltroTipo>([
  ['scrivania', 'tutti'],
  ['pensione', 'pensione'],
  ['cessazione', 'cessazione'],
  ['unificato', 'pensione'],
  ['tfs_pensione', 'pensione'],
  ['anticipo_dma', 'pensione'],
  ['tfs_servizio', 'pensione'],
  ['tfr', 'cessazione'],
  ['lettere', 'tutti'],
]);

export function filtroDaModulo(modulo: string | null): FiltroTipo {
  return (modulo !== null && ID.get(modulo)) || 'tutti';
}

/** L'id che il postMessage comunica al Portale: la scrivania, filtrata o no. */
export function idPortale(filtro: FiltroTipo): string {
  return filtro === 'tutti' ? 'scrivania' : filtro;
}
