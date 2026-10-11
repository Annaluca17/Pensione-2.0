/** Strumenti comuni per leggere pagine PDF come testo con coordinate. */

import type { PaginaPdf, TestoPdf } from './tipi';

export const RE_CF = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;

export interface Riga { top: number; testi: TestoPdf[] }

/** Raggruppa i frammenti in righe (tolleranza verticale in pt), da sinistra a destra. */
export function righe(pagina: PaginaPdf, toll = 3): Riga[] {
  const ord = pagina.filter(t => t.testo.trim()).sort((a, b) => a.top - b.top || a.x - b.x);
  const out: Riga[] = [];
  for (const t of ord) {
    const ultima = out[out.length - 1];
    if (ultima && t.top - ultima.top <= toll) ultima.testi.push(t);
    else out.push({ top: t.top, testi: [t] });
  }
  for (const r of out) r.testi.sort((a, b) => a.x - b.x);
  return out;
}

export const testoRiga = (r: Riga) => r.testi.map(t => t.testo).join(' ');

/** "1.503,70" → 1503.7; tutto ciò che non è un importo → null. */
export function importo(s: string): number | null {
  const m = s.trim().match(/^(-?)(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!m) return null;
  const v = parseFloat(`${m[2].replace(/\./g, '')}.${m[3]}`);
  return m[1] ? -v : v;
}

/** Primo codice fiscale della pagina. */
export const codiceFiscale = (pagina: PaginaPdf): string =>
  pagina.flatMap(t => t.testo.trim().split(/\s+/)).find(p => RE_CF.test(p)) ?? '';
