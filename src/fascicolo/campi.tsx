// Mattoni del fascicolo: riquadro di sezione, stato, campo importo in euro, chiusura, blocchi, avvisi, righe.
import {useState} from 'react';
import type {ReactNode} from 'react';
import {spiega} from '../motore';
import type {Avviso, Blocco, Centesimi, Composizione} from '../motore';
import type {Chiusura} from './chiusura';
import {leggiEuro, scriviEuro} from './modifiche';

export const campo = 'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none';
export const etichetta = 'block text-sm text-slate-600';

export type StatoSezione = 'calcolata' | 'bloccata' | 'completa' | 'da completare' | 'chiusa' | 'da rilavorare';

const colore: Record<StatoSezione, string> = {
  calcolata: 'bg-emerald-100 text-emerald-800',
  completa: 'bg-emerald-100 text-emerald-800',
  bloccata: 'bg-red-100 text-red-800',
  'da completare': 'bg-amber-100 text-amber-900',
  chiusa: 'bg-slate-200 text-slate-800',
  'da rilavorare': 'bg-orange-100 text-orange-900',
};

export function Stato({stato}: {stato: StatoSezione}) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colore[stato]}`}>{stato}</span>;
}

export function Riquadro({id, titolo, stato, children}: {id: string; titolo: string; stato?: StatoSezione; children: ReactNode}) {
  return (
    <section id={id} className="scroll-mt-16 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`${id}-titolo`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={`${id}-titolo`} className="text-base font-semibold text-slate-800">
          {titolo}
        </h2>
        {stato && <Stato stato={stato} />}
      </div>
      {children}
    </section>
  );
}

/** Importo in euro all'italiana; scrive solo quando il testo è un importo valido o vuoto. */
export function CampoEuro({valore, onCambia, nome}: {valore: Centesimi | undefined; onCambia: (c: Centesimi | undefined) => void; nome: string}) {
  const [bozza, setBozza] = useState<string | null>(null);
  const testo = bozza ?? (valore === undefined ? '' : scriviEuro(valore));
  const letto = bozza === null ? valore : leggiEuro(bozza);
  return (
    <input
      className={`${campo} text-right tabular-nums ${letto === null ? 'border-red-400 bg-red-50' : ''}`}
      inputMode="decimal"
      aria-label={nome}
      aria-invalid={letto === null}
      value={testo}
      onChange={(e) => {
        setBozza(e.target.value);
        const c = leggiEuro(e.target.value);
        if (c !== null) onCambia(c);
      }}
      onBlur={() => setBozza(null)}
    />
  );
}

/** Chiudi / riapri una sezione e, se chiusa, le differenze del ricalcolo (ticket 15, ADR 0004). */
export function BarraChiusura({chiusura, calcolata, onChiudi, onRiapri}: {chiusura?: Chiusura; calcolata: boolean; onChiudi: () => void; onRiapri: () => void}) {
  if (!chiusura) {
    if (!calcolata) return null;
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <span>Quando hai trasmesso questi dati a PASSWEB, chiudi la sezione: gli importi si congelano con la versione delle tabelle.</span>
        <button className="rounded-md bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-700" onClick={onChiudi}>
          Chiudi la sezione
        </button>
      </div>
    );
  }
  return (
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
  );
}

/** I motivi di una sezione bloccata; le altre sezioni si calcolano lo stesso. */
export function MotiviBlocco({motivi}: {motivi: Blocco[]}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
      <p className="font-medium">La sezione non si può calcolare:</p>
      <ul className="mt-1 list-disc pl-5">
        {motivi.map((m, i) => (
          <li key={i}>{spiega(m)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Avvisi in italiano con la fonte: non fermano il calcolo. */
export function Avvisi({avvisi}: {avvisi: Avviso[]}) {
  if (avvisi.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2">
      {avvisi.map((a, i) => (
        <li key={i} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {spiega(a)}
          {'fonte' in a && <span className="mt-1 block text-xs text-amber-800">Fonte: {a.fonte}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Una riga PASSWEB con l'importo e, a richiesta, la sua composizione. */
export function RigaImporto({etichetta: testo, nota, composizione, chiave}: {etichetta: ReactNode; nota?: ReactNode; composizione: Composizione; chiave: string}) {
  return (
    <li className="p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-slate-800">
          {testo} {nota && <span className="text-slate-500">({nota})</span>}
        </span>
        <span className="text-base font-semibold tabular-nums" data-riga={chiave}>
          {scriviEuro(composizione.arrotondato)} €
        </span>
      </div>
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-blue-700">Come si arriva a questo importo</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 font-sans text-xs text-slate-700">{spiega(composizione)}</pre>
      </details>
    </li>
  );
}
