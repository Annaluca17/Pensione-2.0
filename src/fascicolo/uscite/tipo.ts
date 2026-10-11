// Contratto comune delle uscite del fascicolo: leggono pratica, ente e Risultato, non ricalcolano.
import type {FC} from 'react';
import type {Ente, Pratica} from '../../archivio';
import type {Risultato} from '../../motore';

export interface PropsUscita {
  pratica: Pratica;
  ente: Ente;
  risultato: Risultato;
}

export type Uscita = FC<PropsUscita>;
