// Oggetto predefinito e riferimento normativo della lettera TFR (spec "Uscite"): vive nelle tabelle,
// non nel codice, e cambia con la versione. L'oggetto resta modificabile alla generazione.
import type {TestoLettera} from '../motore';

export const letteraTfr = {
  oggetto: 'Comunicazione dati retributivi utili al calcolo del TFR — inserimento PASSWEB',
  riferimentoNormativo: 'Circolare INPS n. 185 del 14/12/2021, par. 2.1',
  fonte:
    "Oggetto: vecchio generateLetterTFR.ts (DEFAULT_OGGETTO_TFR). Riferimento: la circolare impone l'UM TFR a ogni cessazione (research/regole-ultimo-miglio.md §3)",
} as const satisfies TestoLettera;
