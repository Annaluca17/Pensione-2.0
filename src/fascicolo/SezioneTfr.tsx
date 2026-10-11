// Sezione TFR del fascicolo (ticket 14, storie 33-36, 42-43): righe PASSWEB con le etichette della
// maschera, composizione di ogni riga, avvisi con fonte e, se bloccata, i motivi. Solo lettura.
import {spiega} from '../motore';
import type {Avviso, Risultato} from '../motore';
import type {Chiusura} from './chiusura';
import {Riquadro} from './campi';
import {scriviEuro} from './modifiche';

const CODICI_TFR: Avviso['codice'][] = ['soglia-quindici-giorni-altra-regola', 'ivc-incompatibile', 'mese-iniziale-fuori-finestra'];
const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const esito = {intero: 'intero', utile: 'utile (almeno 15 giorni)', 'non-utile': 'non utile (meno di 15 giorni)'} as const;

export function SezioneTfr({
  risultato,
  chiusura,
  onChiudi,
  onRiapri,
}: {
  risultato: Risultato;
  chiusura?: Chiusura;
  onChiudi: () => void;
  onRiapri: () => void;
}) {
  // Sezione chiusa: si mostra ciò che è stato trasmesso (il congelato), con le differenze dal ricalcolo.
  const congelato = chiusura?.congelato.sezione === 'tfr' ? chiusura.congelato.risultato : undefined;
  const tfr = congelato ?? risultato.sezioni.tfr;
  const avvisi = risultato.avvisi.filter((a) => CODICI_TFR.includes(a.codice));
  const stato = chiusura ? (chiusura.daRilavorare ? 'da rilavorare' : 'chiusa') : tfr.esito;
  return (
    <Riquadro id="tfr" titolo="Ultimo miglio TFR" stato={stato}>
      {chiusura ? (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${chiusura.daRilavorare ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-slate-300 bg-slate-50 text-slate-700'}`}
          role="status"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Sezione chiusa con le tabelle {chiusura.congelato.versioneTabelle}: gli importi qui sotto sono quelli trasmessi.
              {!chiusura.daRilavorare && ' Il ricalcolo di oggi dà gli stessi valori.'}
            </span>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={onRiapri}>
              Riapri la sezione
            </button>
          </div>
          {chiusura.daRilavorare && (
            <>
              <p className="mt-2 font-medium">Da rilavorare: il ricalcolo cambia questi campi.</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {chiusura.confronto.differenze.map((d) => (
                  <li key={d.campo}>{spiega(d)}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        tfr.esito === 'calcolata' && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <span>Quando hai trasmesso questi dati a PASSWEB, chiudi la sezione: gli importi si congelano con la versione delle tabelle.</span>
            <button className="rounded-md bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-700" onClick={onChiudi}>
              Chiudi la sezione
            </button>
          </div>
        )
      )}
      {tfr.esito === 'bloccata' ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          <p className="font-medium">La sezione non si può calcolare:</p>
          <ul className="mt-1 list-disc pl-5">
            {tfr.motivi.map((m, i) => (
              <li key={i}>{spiega(m)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Decorrenza giuridica</dt>
              <dd className="font-medium">{data(tfr.decorrenzaGiuridica)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Decorrenza economica</dt>
              <dd className="font-medium">{data(tfr.decorrenzaEconomica)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Data di cessazione</dt>
              <dd className="font-medium">{data(tfr.dataCessazione)}</dd>
            </div>
            {(['meseIniziale', 'meseFinale'] as const).map((chiave) => {
              const e = tfr[chiave];
              return (
                <div key={chiave}>
                  <dt className="text-xs text-slate-500">{chiave === 'meseIniziale' ? 'Mese di assunzione' : 'Mese di cessazione'}</dt>
                  <dd>
                    {mese(e.mese)}: {esito[e.esito]}
                    {e.giorni && (
                      <span className="text-slate-500">
                        {' '}
                        · {e.giorni.lavorativiLunSab} lavorativi, {e.giorni.calendario} di calendario
                      </span>
                    )}
                    {e.pagamentoTredicesima && (
                      <span className="text-slate-500"> · 13ª pagata {e.pagamentoTredicesima === 'dicembre' ? 'a dicembre' : 'nel mese di cessazione'}, misura "Parziale"</span>
                    )}
                  </dd>
                </div>
              );
            })}
            <div>
              <dt className="text-xs text-slate-500">Soglia dei 15 giorni</dt>
              <dd>{tfr.soglia.conteggio === 'lavorativi-lun-sab' ? 'giorni lavorativi lun-sab' : 'giorni di calendario'}</dd>
            </div>
          </dl>

          <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Dati retributivi utili al TFR</h3>
          {tfr.righe.length === 0 ? (
            <p className="text-sm text-slate-600">Nessun dato retributivo da inserire: i mesi di assunzione e di cessazione non lo richiedono (C185 §2.1).</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {tfr.righe.map((r) => (
                <li key={`${r.estremo}-${r.id}`} className="p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm text-slate-800">
                      {r.etichetta} <span className="text-slate-500">({r.estremo === 'iniziale' ? 'mese di assunzione' : 'mese di cessazione'})</span>
                    </span>
                    <span className="text-base font-semibold tabular-nums" data-riga={`${r.estremo}/${r.id}`}>
                      {scriviEuro(r.composizione.arrotondato)} €
                    </span>
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-blue-700">Come si arriva a questo importo</summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 font-sans text-xs text-slate-700">{spiega(r.composizione)}</pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {avvisi.length > 0 && (
        <ul className="mt-4 space-y-2">
          {avvisi.map((a, i) => (
            <li key={i} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              {spiega(a)}
              {'fonte' in a && <span className="mt-1 block text-xs text-amber-800">Fonte: {a.fonte}</span>}
            </li>
          ))}
        </ul>
      )}
    </Riquadro>
  );
}
