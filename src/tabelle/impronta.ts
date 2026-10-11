// Impronta del contenuto delle tabelle, per il registro versioni (T7). Serve a rilevare un cambio,
// non a difendersi da un attacco: cyrb53 (53 bit) sul JSON canonico, cioè con le chiavi ordinate.

function canonico(valore: unknown): string {
  if (Array.isArray(valore)) return `[${valore.map(canonico).join(',')}]`;
  if (valore !== null && typeof valore === 'object') {
    const chiavi = Object.keys(valore).sort();
    return `{${chiavi.map((k) => `${JSON.stringify(k)}:${canonico((valore as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(valore) ?? 'null';
}

function cyrb53(testo: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < testo.length; i++) {
    const c = testo.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** 14 cifre esadecimali. */
export function impronta(valore: unknown): string {
  return cyrb53(canonico(valore)).toString(16).padStart(14, '0');
}
