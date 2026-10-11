// Export, import per unione e salvaguardie dell'archivio dalla scrivania (ticket 13, storie 62-69).
import {useState} from 'react';
import {applicaImport, esporta, preparaImport, promemoriaExport, svuota, vuotoSospetto} from '../archivio';
import type {Archivio, EsitoImport, Riepilogo} from '../archivio';
import {scaricaTesto} from './useArchivio';

/** Oggi nel fuso dell'operatore, per il nome del file. */
const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const quando = (istante: string) => new Date(istante).toLocaleDateString('it-IT');
const nomeFile = (testo: string) =>
  testo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const bottoneTenue = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50';

/** Esporta tutto (aggiorna ultimoExport) o un ente: sempre un file scelto dall'operatore, mai automatico. */
export function esportaFile(archivio: Archivio, sostituisci: (a: Archivio) => void, enteId?: string) {
  const {archivio: aggiornato, file} = esporta(archivio, new Date().toISOString(), enteId);
  const ente = enteId ? archivio.enti.find((e) => e.id === enteId) : undefined;
  scaricaTesto(ente ? `ente-${nomeFile(ente.nome)}-${oggi()}.json` : `archivio-pensione-${oggi()}.json`, file);
  if (!enteId) sostituisci(aggiornato);
}

function RiepilogoImport({
  riepilogo,
  onApplica,
  onAnnulla,
}: {
  riepilogo: Riepilogo;
  onApplica: (scelte: Record<string, 'mia' | 'file'>) => void;
  onAnnulla: () => void;
}) {
  const [scelte, setScelte] = useState<Record<string, 'mia' | 'file'>>(() =>
    Object.fromEntries(riepilogo.conflitti.map((c) => [c.mia.id, c.predefinita])),
  );
  const c = riepilogo.conteggi;
  const perNome = riepilogo.entiAbbinati.filter((a) => a.per === 'nome');
  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800" role="region" aria-label="Riepilogo dell'import">
      <h3 className="font-semibold">Riepilogo dell'import</h3>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        <li>
          Pratiche da aggiungere: <strong>{c.aggiunte}</strong>
        </li>
        <li>
          Pratiche uguali, saltate: <strong>{c.uguali}</strong>
        </li>
        <li>
          Conflitti: <strong>{c.conflitti}</strong>
        </li>
        <li>
          Pratiche malformate, scartate: <strong>{c.scartate}</strong>
        </li>
        <li>
          Enti nuovi: <strong>{c.entiNuovi}</strong>
        </li>
        <li>
          Enti già presenti: <strong>{c.entiAbbinati}</strong>
        </li>
      </ul>
      {perNome.length > 0 && (
        <p className="mt-2 text-slate-600">
          Abbinati per nome: {perNome.map((a) => `«${a.dalFile.nome}» → «${a.locale.nome}»`).join(', ')}.
        </p>
      )}
      {riepilogo.conflitti.length > 0 && (
        <table className="mt-3 w-full text-left">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 font-medium">Pratica in conflitto</th>
              <th className="py-1 font-medium">Mia</th>
              <th className="py-1 font-medium">Dal file</th>
            </tr>
          </thead>
          <tbody>
            {riepilogo.conflitti.map(({mia, dalFile}) => (
              <tr key={mia.id} className="border-t border-blue-100">
                <td className="py-1.5">{mia.dati.anagrafica.nome}</td>
                {(['mia', 'file'] as const).map((lato) => (
                  <td key={lato} className="py-1.5">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name={`conflitto-${mia.id}`}
                        checked={scelte[mia.id] === lato}
                        onChange={() => setScelte({...scelte, [mia.id]: lato})}
                      />
                      {lato === 'mia' ? 'Tieni la mia' : 'Prendi dal file'} (modificata il{' '}
                      {quando(lato === 'mia' ? mia.modificata : dalFile.modificata)})
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 flex gap-2">
        <button className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700" onClick={() => onApplica(scelte)}>
          Applica l'import
        </button>
        <button className={bottoneTenue} onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </div>
  );
}

export function PannelloArchivio({
  archivio,
  aggiorna,
  sostituisci,
  persistenzaConcessa,
}: {
  archivio: Archivio;
  aggiorna: (modifica: (a: Archivio) => Archivio) => void;
  sostituisci: (a: Archivio) => void;
  persistenzaConcessa: boolean;
}) {
  const [importo, setImporto] = useState<EsitoImport | null>(null);
  const [svuotare, setSvuotare] = useState(false);
  const promemoria = promemoriaExport(archivio, new Date().toISOString());

  const leggiFile = async (file: File | undefined) => {
    if (file) setImporto(preparaImport(archivio, await file.text()));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="titolo-archivio">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titolo-archivio" className="text-base font-semibold text-slate-800">
            Archivio
          </h2>
          <p className="text-sm text-slate-500">
            {archivio.ultimoExport ? `Ultimo export completo: ${quando(archivio.ultimoExport)}.` : 'Nessun export completo finora.'} Il file
            contiene dati veri: conservalo sul tuo PC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={bottoneTenue} onClick={() => esportaFile(archivio, sostituisci)}>
            Esporta tutto
          </button>
          <label className={`${bottoneTenue} cursor-pointer`}>
            Importa da file
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void leggiFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {!svuotare ? (
            <button className="text-sm text-red-600 hover:underline" onClick={() => setSvuotare(true)}>
              Svuota archivio
            </button>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2 text-sm">
              <span className="text-red-700">Togliere tutti gli enti e le pratiche dal browser?</span>
              <button
                className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                onClick={() => {
                  sostituisci(svuota(archivio));
                  setSvuotare(false);
                }}
              >
                Conferma
              </button>
              <button className="text-slate-600 hover:underline" onClick={() => setSvuotare(false)}>
                Annulla
              </button>
            </span>
          )}
        </div>
      </div>

      {promemoria !== null && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          Ci sono modifiche non esportate da {promemoria} giorni: esporta l'archivio per averne una copia di ripristino.
        </p>
      )}
      {vuotoSospetto(archivio, persistenzaConcessa) && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          L'archivio è vuoto
          {archivio.ultimoExport ? `, ma risulta un export del ${quando(archivio.ultimoExport)}` : ', ma il browser aveva concesso di conservarlo'}: se
          non l'hai svuotato tu, reimporta l'ultimo file esportato.
        </p>
      )}

      {importo?.stato === 'versione-futura' && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          File rifiutato: è stato scritto da una versione più nuova del sito (schema {importo.versione}). Ricarica la pagina e riprova; l'archivio
          non è stato toccato.
        </p>
      )}
      {importo?.stato === 'non-valido' && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          File rifiutato: non è un archivio valido ({importo.motivo.slice(0, 200)}). L'archivio non è stato toccato.
        </p>
      )}
      {importo?.stato === 'pronto' && (
        <RiepilogoImport
          riepilogo={importo.riepilogo}
          onAnnulla={() => setImporto(null)}
          onApplica={(scelte) => {
            aggiorna((a) => applicaImport(a, importo.riepilogo, scelte));
            setImporto(null);
          }}
        />
      )}
    </section>
  );
}
