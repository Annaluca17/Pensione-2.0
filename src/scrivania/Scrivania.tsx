// Scrivania (ticket 12, storie 1-5, 8-9): enti, creazione di pratiche, elenco di tutte le pratiche
// ordinate per data di cessazione, con scadenze vicine evidenziate e tre filtri.
import {useMemo, useState} from 'react';
import type {Archivio} from '../archivio';
import {GIORNI_SCADENZA, aggiungiEnte, aggiungiPratica, elencoScrivania, eliminaEnte, eliminaPratica} from './operazioni';
import type {Filtri, TipoPratica} from './operazioni';
import {LetteraCumulativa} from './LetteraCumulativa';
import {PannelloArchivio, esportaFile} from './PannelloArchivio';
import {causaInBreve, ipotesiInBreve} from '../fascicolo/chiusura';
import {tabelle} from '../tabelle';

/** Oggi nel fuso dell'operatore, aaaa-mm-gg. */
const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const data = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
const nomeTipo: Record<TipoPratica, string> = {pensione: 'Pensione', cessazione: 'Cessazione'};

const campo = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
const bottone = 'whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';
const bottoneTenue = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50';

/** Un pulsante di cancellazione a due passi: niente dialoghi del browser. */
function Elimina({etichetta, avviso, onConferma}: {etichetta: string; avviso: string; onConferma: () => void}) {
  const [chiede, setChiede] = useState(false);
  if (!chiede) {
    return (
      <button className="text-sm text-red-600 hover:underline" onClick={() => setChiede(true)}>
        {etichetta}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="text-red-700">{avviso}</span>
      <button className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700" onClick={onConferma}>
        Conferma
      </button>
      <button className="text-slate-600 hover:underline" onClick={() => setChiede(false)}>
        Annulla
      </button>
    </span>
  );
}

export function Scrivania({
  archivio,
  aggiorna,
  sostituisci,
  persistenzaConcessa,
  onApri,
  tipo,
  onTipo,
}: {
  archivio: Archivio;
  aggiorna: (modifica: (a: Archivio) => Archivio) => void;
  sostituisci: (a: Archivio) => void;
  persistenzaConcessa: boolean;
  onApri: (praticaId: string) => void;
  /** Il filtro per tipo sta fuori: lo apre il ?modulo= del Portale e il postMessage lo comunica (ticket 36). */
  tipo: Filtri['tipo'];
  onTipo: (tipo: Filtri['tipo']) => void;
}) {
  const [nomeEnte, setNomeEnte] = useState('');
  const [nuova, setNuova] = useState({enteId: '', tipo: 'pensione' as TipoPratica, nome: '', codiceFiscale: '', cessazione: ''});
  const [altriFiltri, setFiltri] = useState<Omit<Filtri, 'tipo'>>({soloAperte: true, enteId: 'tutti'});
  const filtri: Filtri = useMemo(() => ({...altriFiltri, tipo}), [altriFiltri, tipo]);

  const enteScelto = archivio.enti.some((e) => e.id === nuova.enteId) ? nuova.enteId : (archivio.enti[0]?.id ?? '');
  // Pratiche con una sezione chiusa che il ricalcolo cambia: da rilavorare, con la causa (storia 10).
  const cause = useMemo(
    () => new Map(archivio.pratiche.map((p) => [p.id, causaInBreve(p, tabelle)] as const).filter(([, c]) => c !== undefined)),
    [archivio],
  );
  // Pratiche toccate da un contratto non ancora firmato: alla firma torneranno da rilavorare (storia 11).
  const ipotesi = useMemo(
    () => new Map(archivio.pratiche.map((p) => [p.id, ipotesiInBreve(p, tabelle)] as const).filter(([, c]) => c !== undefined)),
    [archivio],
  );
  const [cumulativa, setCumulativa] = useState(false);
  const righe = useMemo(() => elencoScrivania(archivio, filtri, oggi(), (p) => cause.has(p.id)), [archivio, filtri, cause]);
  // La lettera per più dipendenti ha senso con un ente e un tipo precisi (ticket 10 delle prove).
  const enteLettera = archivio.enti.find((e) => e.id === filtri.enteId);
  const contaPratiche = (enteId: string) => archivio.pratiche.filter((p) => p.enteId === enteId).length;

  const creaEnte = () => {
    if (!nomeEnte.trim()) return;
    aggiorna((a) => aggiungiEnte(a, nomeEnte, crypto.randomUUID()).archivio);
    setNomeEnte('');
  };

  const creaPratica = () => {
    if (!enteScelto || !nuova.nome.trim()) return;
    const {cessazione, ...resto} = nuova;
    aggiorna(
      (a) =>
        aggiungiPratica(a, {...resto, enteId: enteScelto, ...(cessazione && {cessazione})}, crypto.randomUUID(), new Date().toISOString())
          .archivio,
    );
    setNuova({...nuova, nome: '', codiceFiscale: '', cessazione: ''});
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scrivania</h1>
        <p className="mt-1 text-sm text-slate-500">Le pratiche di tutti gli enti, ordinate per data di cessazione.</p>
      </header>

      <PannelloArchivio archivio={archivio} aggiorna={aggiorna} sostituisci={sostituisci} persistenzaConcessa={persistenzaConcessa} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="titolo-enti">
          <h2 id="titolo-enti" className="mb-3 text-base font-semibold text-slate-800">Enti</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              creaEnte();
            }}
          >
            <input className={campo} placeholder="Nome dell'ente" value={nomeEnte} onChange={(e) => setNomeEnte(e.target.value)} aria-label="Nome del nuovo ente" />
            <button className={bottone} type="submit" disabled={!nomeEnte.trim()}>
              Aggiungi ente
            </button>
          </form>
          <ul className="mt-4 divide-y divide-slate-100">
            {archivio.enti.length === 0 && <li className="py-2 text-sm text-slate-500">Nessun ente: creane uno per iniziare.</li>}
            {archivio.enti.map((ente) => {
              const n = contaPratiche(ente.id);
              return (
                <li key={ente.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-sm text-slate-800">
                    {ente.nome} <span className="text-slate-400">· {n} {n === 1 ? 'pratica' : 'pratiche'}</span>
                  </span>
                  <span className="inline-flex items-center gap-3">
                    <button className="text-sm text-blue-700 hover:underline" onClick={() => esportaFile(archivio, sostituisci, ente.id)}>
                      Esporta
                    </button>
                    <Elimina
                    etichetta="Elimina ente"
                    avviso={n > 0 ? `Elimina l'ente e le sue ${n === 1 ? 'una pratica' : `${n} pratiche`}?` : "Eliminare l'ente?"}
                    onConferma={() => aggiorna((a) => eliminaEnte(a, ente.id))}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="titolo-nuova">
          <h2 id="titolo-nuova" className="mb-3 text-base font-semibold text-slate-800">Nuova pratica</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              creaPratica();
            }}
          >
            <label className="text-sm text-slate-600 sm:col-span-2">
              Ente
              <select className={campo} value={enteScelto} onChange={(e) => setNuova({...nuova, enteId: e.target.value})} disabled={archivio.enti.length === 0}>
                {archivio.enti.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-sm text-slate-600 sm:col-span-2">
              <legend>Tipo</legend>
              <div className="mt-1 flex gap-4">
                {(['pensione', 'cessazione'] as const).map((t) => (
                  <label key={t} className="inline-flex items-center gap-1.5">
                    <input type="radio" name="tipo" checked={nuova.tipo === t} onChange={() => setNuova({...nuova, tipo: t})} />
                    {nomeTipo[t]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm text-slate-600">
              Nome e cognome
              <input className={campo} value={nuova.nome} onChange={(e) => setNuova({...nuova, nome: e.target.value})} />
            </label>
            <label className="text-sm text-slate-600">
              Codice fiscale
              <input className={`${campo} uppercase`} value={nuova.codiceFiscale} maxLength={16} onChange={(e) => setNuova({...nuova, codiceFiscale: e.target.value})} />
            </label>
            <label className="text-sm text-slate-600">
              Data di cessazione
              <input className={campo} type="date" value={nuova.cessazione} onChange={(e) => setNuova({...nuova, cessazione: e.target.value})} />
            </label>
            <div className="flex items-end">
              <button className={`${bottone} w-full`} type="submit" disabled={!enteScelto || !nuova.nome.trim()}>
                Crea pratica
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="titolo-pratiche">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <h2 id="titolo-pratiche" className="text-base font-semibold text-slate-800">
            Pratiche <span className="font-normal text-slate-400">({righe.length})</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Aperte o tutte">
              {[true, false].map((solo) => (
                <button
                  key={String(solo)}
                  className={`px-3 py-1.5 ${filtri.soloAperte === solo ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  aria-pressed={filtri.soloAperte === solo}
                  onClick={() => setFiltri({...altriFiltri, soloAperte: solo})}
                >
                  {solo ? 'Aperte' : 'Tutte'}
                </button>
              ))}
            </div>
            <select className="rounded-md border border-slate-300 px-2 py-1.5" aria-label="Filtro per tipo" value={filtri.tipo} onChange={(e) => onTipo(e.target.value as Filtri['tipo'])}>
              <option value="tutti">Tutti i tipi</option>
              <option value="pensione">Pensione</option>
              <option value="cessazione">Cessazione</option>
            </select>
            <select className="rounded-md border border-slate-300 px-2 py-1.5" aria-label="Filtro per ente" value={filtri.enteId} onChange={(e) => setFiltri({...altriFiltri, enteId: e.target.value})}>
              <option value="tutti">Tutti gli enti</option>
              {archivio.enti.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <input
              type="month"
              className="rounded-md border border-slate-300 px-2 py-1.5"
              aria-label="Filtro per mese di cessazione"
              value={filtri.meseCessazione ?? ''}
              onChange={(e) => setFiltri({...altriFiltri, meseCessazione: e.target.value || undefined})}
            />
            <button
              className={`${bottoneTenue} disabled:cursor-not-allowed disabled:opacity-50`}
              aria-pressed={cumulativa}
              disabled={!enteLettera || filtri.tipo === 'tutti'}
              title={!enteLettera || filtri.tipo === 'tutti' ? 'Scegli prima un ente e un tipo nei filtri' : undefined}
              onClick={() => setCumulativa(!cumulativa)}
            >
              Lettera per più dipendenti
            </button>
          </div>
        </div>

        {cumulativa && enteLettera && filtri.tipo !== 'tutti' && (
          <LetteraCumulativa
            key={`${enteLettera.id}-${filtri.tipo}`}
            righe={righe}
            ente={enteLettera}
            tipo={filtri.tipo}
            aggiornaEnte={(lettera) => aggiorna((a) => ({...a, enti: a.enti.map((e) => (e.id === enteLettera.id ? {...e, lettera} : e))}))}
          />
        )}

        {righe.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Nessuna pratica con questi filtri.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">Cessazione</th>
                  <th className="px-5 py-2 font-medium">Dipendente</th>
                  <th className="px-5 py-2 font-medium">Ente</th>
                  <th className="px-5 py-2 font-medium">Tipo</th>
                  <th className="px-5 py-2 font-medium">Stato</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {righe.map(({pratica, ente, aperta, scadenzaVicina}) => (
                  <tr key={pratica.id} className={scadenzaVicina ? 'bg-amber-50' : undefined}>
                    <td className="whitespace-nowrap px-5 py-3">
                      {data(pratica.dati.anagrafica.cessazione)}
                      {scadenzaVicina && (
                        <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                          entro {GIORNI_SCADENZA} gg
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{pratica.dati.anagrafica.nome}</div>
                      <div className="text-xs text-slate-500">{pratica.dati.anagrafica.codiceFiscale}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{ente.nome}</td>
                    <td className="px-5 py-3 text-slate-700">{nomeTipo[pratica.tipo]}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {cause.has(pratica.id) ? (
                        <span className="text-orange-800">
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium">da rilavorare</span>
                          <span className="mt-1 block text-xs">{cause.get(pratica.id)}</span>
                        </span>
                      ) : aperta ? (
                        'Aperta'
                      ) : (
                        'Chiusa'
                      )}
                      {ipotesi.has(pratica.id) && (
                        <span className="mt-1 block text-amber-900">
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium">ipotesi</span>
                          <span className="mt-1 block text-xs">{ipotesi.get(pratica.id)}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button className={bottoneTenue} onClick={() => onApri(pratica.id)}>
                          Apri
                        </button>
                        <Elimina etichetta="Elimina" avviso="Eliminare la pratica?" onConferma={() => aggiorna((a) => eliminaPratica(a, pratica.id))} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
