// Mattoni del fascicolo: riquadro di sezione, stato, campo importo in euro.
import {useState} from 'react';
import type {ReactNode} from 'react';
import type {Centesimi} from '../motore';
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
