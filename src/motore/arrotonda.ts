import type {Centesimi} from './tipi';

// Tolleranza relativa: assorbe gli errori di rappresentazione del double (1,005 € = 100,4999… cent)
// senza toccare i valori davvero sotto la metà. 1e-9 cent di base, 1e-12 in proporzione.
const tolleranza = (x: number) => Math.max(1e-9, x * 1e-12);

/**
 * L'unico arrotondamento del motore (D17): da centesimi a precisione piena a centesimi interi,
 * half-up (la metà lontano da zero), con tolleranza. Si applica una volta sul valore di ogni riga
 * PASSWEB o campo DMA; i totali sono somme di valori già arrotondati.
 */
export function arrotonda(centesimi: number): Centesimi {
  if (!Number.isFinite(centesimi)) throw new Error(`arrotonda: valore non finito (${centesimi})`);
  const assoluto = Math.abs(centesimi);
  const intero = Math.floor(assoluto + 0.5 + tolleranza(assoluto));
  return centesimi < 0 ? -intero : intero;
}
