// Oggetto predefinito e riferimento normativo delle lettere (TFR e miglioramento contrattuale) (spec "Uscite"): vive nelle tabelle,
// non nel codice, e cambia con la versione. L'oggetto resta modificabile alla generazione.
import type {TestoLettera} from '../motore';

export const letteraTfr = {
  oggetto: 'Comunicazione dati retributivi utili al calcolo del TFR — inserimento PASSWEB',
  riferimentoNormativo: 'Circolare INPS n. 185 del 14/12/2021, par. 2.1',
  fonte:
    "Oggetto: vecchio generateLetterTFR.ts (DEFAULT_OGGETTO_TFR). Riferimento: la circolare impone l'UM TFR a ogni cessazione (research/regole-ultimo-miglio.md §3)",
} as const satisfies TestoLettera;

export const letteraMiglioramento = {
  oggetto: 'Comunicazione inserimento miglioramenti contrattuali tramite sistema PASSWEB',
  riferimentoNormativo: 'art. 57, comma 2, CCNL Funzioni Locali 2022/2024',
  fonte:
    'Oggetto e riferimento: vecchio generateLetter.ts (art. 57 c. 2 CCNL 2022/2024). Un solo riferimento per ora, anche per i miglioramenti 2019-21 e 2025-27 (ticket 34); da rileggere contro la norma (ADR 0001)',
} as const satisfies TestoLettera;
