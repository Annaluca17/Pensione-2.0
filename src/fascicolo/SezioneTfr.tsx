// Sezione TFR del fascicolo (ticket 14, storie 33-36, 42-43): righe PASSWEB con le etichette della
// maschera, composizione di ogni riga, avvisi con fonte e, se bloccata, i motivi. Solo lettura.
import {spiega} from '../motore';
import type {Avviso, Risultato} from '../motore';
import {Riquadro} from './campi';
import {scriviEuro} from './modifiche';

const CODICI_TFR: Avviso['codice'][] = ['soglia-quindici-giorni-altra-regola', 'ivc-incompatibile', 'mese-iniziale-fuori-finestra'];
const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const esito = {intero: 'intero', utile: 'utile (almeno 15 giorni)', 'non-utile': 'non utile (meno di 15 giorni)'} as const;

export function SezioneTfr({risultato}: {risultato: Risultato}) {
  const tfr = risultato.sezioni.tfr;
  const avvisi = risultato.avvisi.filter((a) => CODICI_TFR.includes(a.codice));
  return (
    <Riquadro id="tfr" titolo="Ultimo miglio TFR" stato={tfr.esito}>
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
