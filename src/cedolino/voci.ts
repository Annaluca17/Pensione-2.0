/**
 * Corrispondenza fra le etichette dei riepiloghi paga e le voci 01-15 del
 * Calcolo Unificato. Le etichette cambiano da ente a ente e da anno ad anno,
 * quindi si confrontano normalizzate (minuscole, senza accenti né punteggiatura).
 *
 * Scelte confermate da Luca (11/10/2026):
 *  - "Ass. ad personam" (San Mauro) è la voce 04, come "Ass. pers. non riassorb.".
 *  - "Varie pension." 5,38 è la stessa Indennità specifica (08): non si somma.
 *  - "L.E.D. / Integr. Tab." in testata è il differenziale storico (02): nel 2023
 *    di Patti la stessa cifra cambia nome ad aprile.
 *  - L'Elemento perequativo si somma al tabellare solo se scelto caso per caso.
 */

export type Destinazione =
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11'
  | 'perequativo'
  | 'ignora';

export const normalizza = (s: string): string =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// L'ordine conta: vince la prima regola che corrisponde.
const REGOLE: Array<[RegExp, Destinazione]> = [
  [/^(tredic|totale|una tantum)/,                 'ignora'],
  [/^stipendio (tabellare|base)/,                 '01'],
  [/^(l e d|led)\b|^diff\w* storico/,             '02'],
  [/^diff\w* stipendial/,                         '03'],
  [/^ass\w* .*\bassorb/,                          '05'],  // assorbibile; "riassorb" non corrisponde
  [/^ass\w* (pers|ad personam)/,                  '04'],
  [/^salario (individuale )?(di )?anzian|^r i a\b|^ria\b/, '06'],
  [/^retr\w* posiz/,                              '07'],
  [/^ind\w* specifica|^varie pension/,            '08'],
  [/vacanza/,                                     '09'],
  [/compart/,                                     '10'],
  [/vigil/,                                       '11'],
  [/perequativ/,                                  'perequativo'],
];

/** Voci che nel riepilogo sono spezzate su più righe da sommare. */
export const VOCI_DA_SOMMARE = new Set<Destinazione>(['10']);

/** Voci del calcolatore che il lettore compila (le altre restano manuali). */
export const VOCI_GESTITE = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'] as const;

export function classifica(etichetta: string): Destinazione | null {
  const n = normalizza(etichetta);
  for (const [re, dest] of REGOLE) if (re.test(n)) return dest;
  return null;
}
