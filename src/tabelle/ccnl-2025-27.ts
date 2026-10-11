// Ipotesi CCNL Funzioni Locali 2025-27 firmata il 21/07/2026 (non definitiva). Fonte: PDF ARAN (Ipotesi-comparto-FL-25-27, 21 luglio).
// Un'ipotesi non produce importi: i valori stanno sotto `proposta` e il motore non li legge finché lo
// stato non passa a 'definitivo' (T5). Alla firma: cambiare lo stato, spostare i valori sotto le
// chiavi di ContrattoDefinitivo e aggiungere la riga nel registro versioni.
import type {ContrattoIpotesi} from '../motore';

export const ccnl202527 = {
  id: 'ccnl-2025-27',
  nome: 'Ipotesi CCNL Funzioni Locali 2025-2027',
  stato: 'ipotesi',
  firma: '2026-07-21',
  vigenza: {dal: '2025-01-01', al: '2027-12-31'},
  fonte: 'https://www.aranagenzia.it/wp-content/uploads/2026/07/Ipotesi-comparto-FL-25-27-_-21-luglio-firma-1-1.pdf',
  proposta: {
    scaglionamenti: [
      {
        decorrenza: '2025-01-01',
        chiave: 'area',
        tipo: 'tabellare',
        divisoreAnnuo: 12,
        fonte: 'Ipotesi CCNL Funzioni Locali 2025-27 firmata il 21/07/2026 (non definitiva), art. 35 e Tabella B colonna 1 (senza conglobamento del comparto)',
        importi: {
            'funzionari-eq': {mensile: 212751, annuo: 2553015},
            istruttori: {mensile: 196075, annuo: 2352899},
            'operatori-esperti': {mensile: 174460, annuo: 2093519},
            operatori: {mensile: 167575, annuo: 2010899},
        },
      },
      {
        decorrenza: '2026-01-01',
        chiave: 'area',
        tipo: 'tabellare',
        divisoreAnnuo: 12,
        fonte: 'Ipotesi CCNL Funzioni Locali 2025-27 firmata il 21/07/2026 (non definitiva), art. 35 e Tabella B colonna 2',
        importi: {
            'funzionari-eq': {mensile: 219202, annuo: 2630427},
            istruttori: {mensile: 201963, annuo: 2423555},
            'operatori-esperti': {mensile: 179660, annuo: 2155919},
            operatori: {mensile: 172421, annuo: 2069051},
        },
      },
      {
        decorrenza: '2027-01-01',
        chiave: 'area',
        tipo: 'tabellare',
        divisoreAnnuo: 12,
        fonte: 'Ipotesi CCNL Funzioni Locali 2025-27 firmata il 21/07/2026 (non definitiva), art. 35 e Tabella B colonna 3',
        importi: {
            'funzionari-eq': {mensile: 223136, annuo: 2677635},
            istruttori: {mensile: 205586, annuo: 2467031},
            'operatori-esperti': {mensile: 182880, annuo: 2194559},
            operatori: {mensile: 175504, annuo: 2106047},
        },
      },
    ],
    indennitaComparto: [
      {
        decorrenza: '2027-07-01',
        fonte: 'Ipotesi CCNL Funzioni Locali 2025-27 firmata il 21/07/2026 (non definitiva), art. 36-bis e Tabella C, p. 55: quota residua 2026 più incremento (15,61 / 13,77 / 11,82 / 9,74)',
        importi: {
        'funzionari-eq': {mensile: 5194},
        istruttori: {mensile: 4583},
        'operatori-esperti': {mensile: 3934},
        operatori: {mensile: 3242},
        },
      },
    ],
  },
} as const satisfies ContrattoIpotesi;
