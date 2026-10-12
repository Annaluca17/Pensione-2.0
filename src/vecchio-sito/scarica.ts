// Pulsante "scarica i dati del vecchio sito" (ticket 35): le tre chiavi del localStorage del vecchio
// sito, grezze, in un JSON. Sola lettura: non migra e non cancella nulla (le chiavi restano intatte).

/** Le tre chiavi del vecchio sito: PASSWEB, TFR e bozze del wizard TFR. */
export const CHIAVI_VECCHIE = [
  'xdesk_passweb_progetti_v1',
  'xdesk_tfr_progetti_v1',
  'xdesk_tfr_bozze_v1',
] as const;

export type Memoria = Pick<Storage, 'getItem'>;

/** Il JSON con una chiave per ciascuna delle tre: il valore grezzo salvato, o null se assente. */
export function contenutoVecchioSito(memoria: Memoria): string {
  const fotografia: Record<string, string | null> = {};
  for (const chiave of CHIAVI_VECCHIE) fotografia[chiave] = memoria.getItem(chiave);
  return JSON.stringify(fotografia, null, 2);
}

/** Nome del file scaricato, con la data di oggi: vecchio-sito-AAAA-MM-GG.json. */
export function nomeFileVecchioSito(oggi: Date): string {
  const aaaa = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const gg = String(oggi.getDate()).padStart(2, '0');
  return `vecchio-sito-${aaaa}-${mm}-${gg}.json`;
}
