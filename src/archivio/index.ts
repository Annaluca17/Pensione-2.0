// Indice pubblico dell'archivio (ticket 10): involucro Zod, lettura con migrazioni, salvataggio.
export {CHIAVE, archivioVuoto, ascolta, carica, chiediPersistenza, leggi, migra, migrazioni, salva} from './archivio';
export type {Catena, Deposito, EsitoLettura, Scartata} from './archivio';
export {VERSIONE_SCHEMA} from './schema';
export type {Archivio, Ente, Pratica} from './schema';
