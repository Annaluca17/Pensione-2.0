import {arrotonda} from './arrotonda';
import type {Addendo, Centesimi, Composizione, Operazione} from './tipi';

/** Valore di un addendo: importo × % di part-time / 100 × giorni / divisore (D4, D9, D11). */
export const valoreAddendo = (a: Addendo) => (a.importo * (a.percentuale ?? 100) * (a.giorni ?? 1)) / 100 / (a.divisore ?? 1);

const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));

/** Costruisce la composizione di una riga: somma, operazioni a precisione piena, un solo arrotonda. */
export function componi(riga: {addendi: Addendo[]; operazioni: Operazione[]; fonte: string}): Composizione {
  // Prodotti interi sul divisore comune (es. 26 × 365) sommati prima di dividere una volta: meno errori
  // in virgola mobile, e un valore esattamente a metà centesimo resta tale (half-up, D17).
  const comune = riga.addendi.reduce((m, a) => {
    const d = a.divisore ?? 1;
    return (m * d) / mcd(m, d);
  }, 1);
  const prodotti = riga.addendi.reduce(
    (somma, a) => somma + a.importo * (a.percentuale ?? 100) * (a.giorni ?? 1) * (comune / (a.divisore ?? 1)),
    0,
  );
  let pieno = prodotti / (100 * comune);
  for (const op of riga.operazioni) {
    if (op.tipo === 'dividi' && op.per === 0) throw new Error(`componi: divisione per zero (${op.motivo})`);
    pieno = op.tipo === 'moltiplica' ? pieno * op.per : pieno / op.per;
  }
  return {...riga, pieno, arrotondato: arrotonda(pieno)};
}

/** Totale di più righe = somma dei valori già arrotondati (D17). */
export function totale(righe: Composizione[]): Centesimi {
  return righe.reduce((somma, r) => somma + r.arrotondato, 0);
}
