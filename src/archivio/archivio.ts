// Archivio dell'operatore nel browser (spec "Persistenza", ticket 10): una chiave localStorage con
// l'involucro {versioneSchema, enti, pratiche, ultimoExport}, riscritta intera a ogni modifica.
// Le tre chiavi dei vecchi moduli non si leggono né si toccano: la v1 nasce vuota.
import {VERSIONE_SCHEMA, schemaArchivio, schemaInvolucro, schemaPratica} from './schema';
import type {Archivio, Pratica} from './schema';

export const CHIAVE = 'pensione2_archivio';

/** Il minimo di `Storage` che serve, per poter usare un finto nei test. */
export interface Deposito {
  getItem(chiave: string): string | null;
  setItem(chiave: string, valore: string): void;
}

/** Una pratica scartata perché malformata (o senza ente), con la sua copia grezza. */
export interface Scartata {
  indice: number;
  id?: string;
  motivo: string;
  grezza: unknown;
}

export type EsitoLettura =
  | {stato: 'valido'; archivio: Archivio; scartate: Scartata[]}
  | {stato: 'non-valido'; motivo: string; grezzo: string}
  | {stato: 'versione-futura'; versione: number; grezzo: string};

/** Un passo della catena porta un archivio dalla versione `n` (la chiave) alla `n + 1`. */
export type Catena = Readonly<Record<number, (precedente: Record<string, unknown>) => unknown>>;

/** Le migrazioni di produzione: nessuna, la v1 è la prima versione. */
export const migrazioni: Catena = {};

export const archivioVuoto = (): Archivio => ({versioneSchema: VERSIONE_SCHEMA, enti: [], pratiche: [], ultimoExport: null});

/** Applica la catena dalla versione del file fino a `a`; lancia se manca un passo. Funzione pura. */
export function migra(file: {versioneSchema: number}, a: number, catena: Catena): unknown {
  let corrente: Record<string, unknown> = structuredClone(file);
  for (let v = file.versioneSchema; v < a; v++) {
    const passo = catena[v];
    if (!passo) throw new Error(`manca la migrazione dalla versione ${v} alla ${v + 1}`);
    corrente = passo(corrente) as Record<string, unknown>;
  }
  return corrente;
}

/** Legge un archivio grezzo (localStorage o file): validazione, migrazioni, pratiche scartate. */
export function leggi(grezzo: string | null, catena: Catena = migrazioni): EsitoLettura {
  if (grezzo === null) return {stato: 'valido', archivio: archivioVuoto(), scartate: []};
  const nonValido = (motivo: string): EsitoLettura => ({stato: 'non-valido', motivo, grezzo});

  let file: unknown;
  try {
    file = JSON.parse(grezzo);
  } catch {
    return nonValido('il contenuto non è JSON');
  }
  const versione = (file as {versioneSchema?: unknown} | null)?.versioneSchema;
  if (typeof file !== 'object' || file === null || typeof versione !== 'number' || !Number.isInteger(versione)) {
    return nonValido('manca la versione dello schema');
  }
  if (versione > VERSIONE_SCHEMA) return {stato: 'versione-futura', versione, grezzo};
  if (versione < VERSIONE_SCHEMA) {
    try {
      file = migra(file as {versioneSchema: number}, VERSIONE_SCHEMA, catena);
    } catch (e) {
      return nonValido(e instanceof Error ? e.message : String(e));
    }
  }

  const involucro = schemaInvolucro.safeParse(file);
  if (!involucro.success) return nonValido(involucro.error.message);
  const enti = new Set(involucro.data.enti.map((e) => e.id));
  const pratiche: Pratica[] = [];
  const scartate: Scartata[] = [];
  involucro.data.pratiche.forEach((grezza, indice) => {
    const id = (grezza as {id?: unknown} | null)?.id;
    const scarta = (motivo: string) => scartate.push({indice, ...(typeof id === 'string' && {id}), motivo, grezza});
    const pratica = schemaPratica.safeParse(grezza);
    if (!pratica.success) scarta(pratica.error.message);
    else if (!enti.has(pratica.data.enteId)) scarta(`l'ente ${pratica.data.enteId} non esiste nell'archivio`);
    else pratiche.push(pratica.data);
  });
  return {stato: 'valido', archivio: {...involucro.data, pratiche}, scartate};
}

/** Carica l'archivio dalla sua chiave; vuoto alla prima apertura. */
export const carica = (deposito: Deposito, catena: Catena = migrazioni) => leggi(deposito.getItem(CHIAVE), catena);

/**
 * Riscrive intero l'archivio. Non sovrascrive mai un contenuto che non supera la validazione o di
 * una versione futura (resta da scaricare grezzo); un archivio malformato è un errore di programmazione.
 */
export function salva(deposito: Deposito, archivio: Archivio): {ok: true} | {ok: false; motivo: string} {
  const presente = leggi(deposito.getItem(CHIAVE));
  if (presente.stato !== 'valido') {
    return {ok: false, motivo: `l'archivio nel browser non è valido (${presente.stato}): non si sovrascrive`};
  }
  const valido = schemaArchivio.parse(archivio);
  deposito.setItem(CHIAVE, JSON.stringify(valido));
  return {ok: true};
}

interface EventoStorage {
  key: string | null;
  newValue: string | null;
}
interface Finestra {
  addEventListener(tipo: 'storage', f: (e: EventoStorage) => void): void;
  removeEventListener(tipo: 'storage', f: (e: EventoStorage) => void): void;
}

/** Più schede: rilegge quando un'altra scheda scrive l'archivio; vince l'ultima scrittura. */
export function ascolta(finestra: Finestra, ricarica: (esito: EsitoLettura) => void): () => void {
  const f = (e: EventoStorage) => {
    if (e.key === CHIAVE) ricarica(leggi(e.newValue));
  };
  finestra.addEventListener('storage', f);
  return () => finestra.removeEventListener('storage', f);
}

/** Chiede al browser di non svuotare l'archivio (spec "Persistenza"); `false` se non disponibile. */
export async function chiediPersistenza(storage: {persist?: () => Promise<boolean>} | undefined): Promise<boolean> {
  try {
    return (await storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
