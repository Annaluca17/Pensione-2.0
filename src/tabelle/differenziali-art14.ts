// Differenziali stipendiali dell'art. 14 CCNL 2019-21, tabulati solo per il controllo della voce 03
// (T9): misura annua lorda su 13 mensilità e numero massimo per area. Le decorrenze dipendono dal
// contratto integrativo dell'ente e non si tabulano. Richiamati invariati da art. 14 CCNL 2022-24 e
// art. 18 dell'Ipotesi 2025-27.
import type {Area, DifferenzialeArt14} from '../motore';

const fonte = 'CCNL Funzioni Locali 2019-21 del 16/11/2022, art. 14 e Tabella A, p. 121';

export const differenzialiArt14 = {
  'funzionari-eq': {annuo: 160000, mensile: 12308, massimo: 6, fonte},
  istruttori: {annuo: 75000, mensile: 5769, massimo: 5, fonte},
  'operatori-esperti': {annuo: 65000, mensile: 5000, massimo: 5, fonte},
  operatori: {annuo: 55000, mensile: 4231, massimo: 5, fonte},
} as const satisfies Record<Area, DifferenzialeArt14>;
