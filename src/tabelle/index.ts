// Indice pubblico dei dati delle tabelle (ticket 05). Il motore riceve `Tabelle` per iniezione e
// non importa mai questi file; da qui si importano solo tipi e `arrotonda` dall'indice del motore.
import type {Tabelle} from '../motore';
import {catalogoVoci} from './catalogo';
import {ccnl201921} from './ccnl-2019-21';
import {ccnl202224} from './ccnl-2022-24';
import {ccnl202527} from './ccnl-2025-27';
import {differenzialiArt14} from './differenziali-art14';
import {letteraTfr} from './lettere';
import {parametri} from './parametri';
import {righeTfr} from './righe-tfr';
import {trasposizione} from './trasposizione';
import {versioni} from './versioni';

export const tabelle: Tabelle = {
  versione: versioni[versioni.length - 1].id,
  registro: versioni.map(({id, motivo}) => ({id, motivo})),
  coperturaDal: '2019-01-01',
  posizioni: trasposizione.map((t) => t.posizione),
  contratti: [ccnl201921, ccnl202224, ccnl202527],
  trasposizione,
  differenzialiArt14,
  catalogoVoci,
  righeTfr,
  parametri,
  lettere: {tfr: letteraTfr},
};
