import type {Destinazione, Gestionale} from './tipi';

export const normalizza = (s: string): string =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Destinazione di un'etichetta secondo le regole del gestionale; null se non riconosciuta. */
export function classifica(g: Gestionale, etichetta: string): Destinazione | null {
  const n = normalizza(etichetta);
  return g.regole.find(r => r.se.test(n))?.destinazione ?? null;
}
