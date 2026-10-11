import {arrotonda} from './arrotonda';
import type {Addendo, Centesimi, Composizione, Operazione} from './tipi';

/** Costruisce la composizione di una riga: somma, operazioni a precisione piena, un solo arrotonda. */
export function componi(riga: {addendi: Addendo[]; operazioni: Operazione[]; fonte: string}): Composizione {
  let pieno = riga.addendi.reduce((somma, a) => somma + a.importo, 0);
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
