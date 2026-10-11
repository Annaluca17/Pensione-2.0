// Salvaguardie dell'archivio (spec "Persistenza", storie 68-69): il promemoria dei 7 giorni e l'avviso
// di archivio vuoto. Niente download automatico.
import type {Archivio} from './schema';

export const GIORNI_PROMEMORIA = 7;

/** Registra una modifica: se è la prima dopo l'ultimo export completo, ne segna l'istante. */
export const segnaModifica = (archivio: Archivio, adesso: string): Archivio =>
  archivio.modificheNonEsportateDal ? archivio : {...archivio, modificheNonEsportateDal: adesso};

/** Giorni da cui ci sono modifiche non esportate, se superano la soglia; altrimenti `null`. */
export function promemoriaExport(archivio: Archivio, adesso: string): number | null {
  if (!archivio.modificheNonEsportateDal) return null;
  const giorni = Math.floor((Date.parse(adesso) - Date.parse(archivio.modificheNonEsportateDal)) / 86_400_000);
  return giorni > GIORNI_PROMEMORIA ? giorni : null;
}

/** Archivio vuoto all'avvio, ma risultava un export o la persistenza concessa: forse va reimportato. */
export const vuotoSospetto = (archivio: Archivio, persistenzaConcessa: boolean) =>
  archivio.enti.length === 0 && archivio.pratiche.length === 0 && (archivio.ultimoExport !== null || persistenzaConcessa);

/** Per ripartire da zero: via enti e pratiche, resta la data dell'ultimo export (per l'avviso). */
export const svuota = (archivio: Archivio): Archivio => ({
  versioneSchema: archivio.versioneSchema,
  enti: [],
  pratiche: [],
  ultimoExport: archivio.ultimoExport,
});
