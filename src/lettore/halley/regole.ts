// Etichette Halley → voci del catalogo (D15). Scelte confermate da Luca (11/10/2026):
//  - "Ass. ad personam" è la voce 05 (assorbibile da progressione verticale); "Ass. pers. non riassorb." la 04.
//  - "Varie pension." 5,38 è la stessa Indennità specifica (08).
//  - "L.E.D. / Integr. Tab." è il differenziale storico (02).
//  - L'Elemento perequativo non si somma più (ticket 10, D5): è conglobato nel tabellare.
// L'ordine conta: vince la prima regola che corrisponde.
import type {RegolaEtichetta} from '../tipi';

export const regoleHalley: RegolaEtichetta[] = [
  {se: /^(tredic|totale|una tantum)/, destinazione: 'ignora'},
  {se: /^stipendio (tabellare|base)/, destinazione: '01'},
  {se: /^(l e d|led)\b|^diff\w* storico/, destinazione: '02'},
  {se: /^diff\w* stipendial/, destinazione: '03'},
  {se: /^ass\w* (.*\bassorb|ad personam)/, destinazione: '05'}, // "riassorb" non corrisponde
  {se: /^ass\w* pers/, destinazione: '04'},
  {se: /^salario (individuale )?(di )?anzian|^r i a\b|^ria\b/, destinazione: '06'},
  {se: /^retr\w* posiz/, destinazione: '07'},
  {se: /^ind\w* specifica|^varie pension/, destinazione: '08'},
  {se: /vacanza/, destinazione: '09'},
  {se: /compart/, destinazione: '10'},
  {se: /vigil/, destinazione: '11'},
  {se: /perequativ/, destinazione: 'perequativo'},
];
