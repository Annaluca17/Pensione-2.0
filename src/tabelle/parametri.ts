// Parametri globali del calcolo, ciascuno con la sua fonte (nessun override per pratica).
import type {Parametri} from '../motore';

export const parametri = {
  sogliaGiorniTfr: {
    valore: {giorni: 15, conteggio: 'lavorativi-lun-sab'},
    fonte:
      'Soglia: Circ. INPS 185/2021 §2.1 ("almeno quindici giorni continuativi nel mese"). Conteggio in lavorativi lun-sab per prassi (D10; ticket 16: nessuna verifica, nessuna fonte decide il calendario: research/quindici-giorni-tfr.md)',
  },
  divisoreGiornaliera: {valore: 26, fonte: 'CCNL Funzioni Locali 2019-21, art. 74 c. 4 (giornaliera = mensile / 26); D9'},
  tettoGiorniMeseParziale: {
    valore: 26,
    fonte: "D9: giorni lun-sab dal 1° (o dall'assunzione) alla cessazione, domeniche escluse, tetto 26; prassi confermata dall'utente, senza fonte normativa",
  },
  divisoreRateoTredicesima: {
    valore: 365,
    fonte: 'CCNL 2019-21 art. 75 e Circ. INPS 185/2021: rateo in 365esimi di calendario (D10; research/regole-ultimo-miglio.md §3.1)',
  },
  limiteDmaPreviste: {
    valore: 6,
    fonte:
      "D12: PASSWEB accetta al massimo 6 DMA previste (manuale PASSWEB v1.20 p. 60, prassi dell'utente); gli 8 mesi della Circ. INPS 26/2019 non si usano; C21-1",
  },
} as const satisfies Parametri;
