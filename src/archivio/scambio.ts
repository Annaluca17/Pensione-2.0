// Export JSON e import per unione (spec "Persistenza", ticket 11). Il file ha lo stesso involucro,
// la stessa validazione e le stesse migrazioni dell'archivio nel browser; contiene dati veri, senza
// cifratura. L'import non sostituisce mai: unisce, dopo un riepilogo.
import {leggi, migrazioni} from './archivio';
import type {Catena, Scartata} from './archivio';
import {schemaArchivio} from './schema';
import type {Archivio, Ente, Pratica} from './schema';

/**
 * Esporta tutto l'archivio (aggiorna `ultimoExport`) o un solo ente (il file porta la data, l'archivio
 * no: non è un backup di tutto, decisione del ticket 11).
 */
export function esporta(archivio: Archivio, adesso: string, enteId?: string): {archivio: Archivio; file: string} {
  if (enteId === undefined) {
    const {modificheNonEsportateDal: _esportate, ...resto} = archivio;
    const aggiornato = schemaArchivio.parse({...resto, ultimoExport: adesso});
    return {archivio: aggiornato, file: JSON.stringify(aggiornato)};
  }
  const ente = archivio.enti.find((e) => e.id === enteId);
  if (!ente) throw new Error(`esporta: l'ente ${enteId} non esiste`);
  const file = schemaArchivio.parse({
    versioneSchema: archivio.versioneSchema,
    enti: [ente],
    pratiche: archivio.pratiche.filter((p) => p.enteId === enteId),
    ultimoExport: adesso,
  });
  return {archivio, file: JSON.stringify(file)};
}

/** Nome per abbinare gli enti: senza maiuscole, accenti e spazi doppi. */
export const normalizzaNome = (nome: string) =>
  nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export interface Conflitto {
  mia: Pratica;
  dalFile: Pratica;
  /** La modificata più di recente; a parità, la mia. */
  predefinita: 'mia' | 'file';
}

export interface Riepilogo {
  entiNuovi: Ente[];
  entiAbbinati: {dalFile: Ente; locale: Ente; per: 'id' | 'nome'}[];
  aggiunte: Pratica[];
  uguali: Pratica[];
  conflitti: Conflitto[];
  scartate: Scartata[];
  conteggi: Record<'entiNuovi' | 'entiAbbinati' | 'aggiunte' | 'uguali' | 'conflitti' | 'scartate', number>;
}

export type EsitoImport =
  | {stato: 'pronto'; riepilogo: Riepilogo}
  | {stato: 'non-valido'; motivo: string; grezzo: string}
  | {stato: 'versione-futura'; versione: number; grezzo: string};

/** Il contenuto di una pratica, senza le date di creazione e modifica. */
function contenuto(p: Pratica): string {
  const {creata: _c, modificata: _m, ...resto} = p;
  return canonico(resto);
}
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    const chiavi = Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort();
    return `{${chiavi.map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

/** Legge il file e prepara il riepilogo dell'unione, senza toccare l'archivio. */
export function preparaImport(archivio: Archivio, grezzo: string, catena: Catena = migrazioni): EsitoImport {
  const letto = leggi(grezzo, catena);
  if (letto.stato !== 'valido') return letto;
  const file = letto.archivio;

  const entiNuovi: Ente[] = [];
  const entiAbbinati: Riepilogo['entiAbbinati'] = [];
  const enteLocale = new Map<string, string>();
  for (const ente of file.enti) {
    const perId = archivio.enti.find((e) => e.id === ente.id);
    const perNome = perId ? undefined : archivio.enti.find((e) => normalizzaNome(e.nome) === normalizzaNome(ente.nome));
    const locale = perId ?? perNome;
    if (locale) {
      entiAbbinati.push({dalFile: ente, locale, per: perId ? 'id' : 'nome'});
      enteLocale.set(ente.id, locale.id);
    } else {
      entiNuovi.push(ente);
      enteLocale.set(ente.id, ente.id);
    }
  }

  const aggiunte: Pratica[] = [];
  const uguali: Pratica[] = [];
  const conflitti: Conflitto[] = [];
  for (const daFile of file.pratiche) {
    const pratica = {...daFile, enteId: enteLocale.get(daFile.enteId)!};
    const mia = archivio.pratiche.find((p) => p.id === pratica.id);
    if (!mia) aggiunte.push(pratica);
    else if (contenuto(mia) === contenuto(pratica)) uguali.push(pratica);
    else conflitti.push({mia, dalFile: pratica, predefinita: pratica.modificata > mia.modificata ? 'file' : 'mia'});
  }

  const scartate = letto.scartate;
  return {
    stato: 'pronto',
    riepilogo: {
      entiNuovi,
      entiAbbinati,
      aggiunte,
      uguali,
      conflitti,
      scartate,
      conteggi: {
        entiNuovi: entiNuovi.length,
        entiAbbinati: entiAbbinati.length,
        aggiunte: aggiunte.length,
        uguali: uguali.length,
        conflitti: conflitti.length,
        scartate: scartate.length,
      },
    },
  };
}

/** Applica il riepilogo: per ogni conflitto la scelta dell'operatore, altrimenti la predefinita. */
export function applicaImport(archivio: Archivio, riepilogo: Riepilogo, scelte: Record<string, 'mia' | 'file'> = {}): Archivio {
  const sostituite = new Map(
    riepilogo.conflitti
      .filter((c) => (scelte[c.mia.id] ?? c.predefinita) === 'file')
      .map((c) => [c.mia.id, c.dalFile] as const),
  );
  return schemaArchivio.parse({
    ...archivio,
    enti: [...archivio.enti, ...riepilogo.entiNuovi],
    pratiche: [...archivio.pratiche.map((p) => sostituite.get(p.id) ?? p), ...riepilogo.aggiunte],
  });
}
