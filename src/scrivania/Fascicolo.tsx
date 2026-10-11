// Fascicolo di una pratica (ticket 12: lo spazio vuoto col suo percorso; le sezioni arrivano dal 14).
import type {Archivio} from '../archivio';

export function Fascicolo({archivio, praticaId, onEsci}: {archivio: Archivio; praticaId: string; onEsci: () => void}) {
  const pratica = archivio.pratiche.find((p) => p.id === praticaId);
  const ente = pratica && archivio.enti.find((e) => e.id === pratica.enteId);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-8">
      <nav className="mb-4 text-sm text-slate-500" aria-label="Percorso">
        <button className="text-blue-700 hover:underline" onClick={onEsci}>
          Scrivania
        </button>
        {pratica && ente && (
          <>
            <span className="mx-2">›</span>
            <span>{ente.nome}</span>
            <span className="mx-2">›</span>
            <span className="text-slate-800">{pratica.dati.anagrafica.nome}</span>
          </>
        )}
      </nav>
      {!pratica ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          La pratica non è più nell'archivio (forse cancellata da un'altra scheda).
        </p>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{pratica.dati.anagrafica.nome}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pratica.tipo === 'pensione' ? 'Pratica di pensione' : 'Pratica di cessazione'} · {pratica.dati.anagrafica.codiceFiscale}
          </p>
          <div className="mt-6 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Le sezioni del fascicolo arriveranno qui.
          </div>
        </section>
      )}
    </div>
  );
}
