// La guida PASSWEB passo per passo (ticket 18): stessa resa del vecchio Step 4 del modulo TFR, con gli
// screenshot sotto /guida-passweb/ e il segnaposto se un'immagine manca.
import {ImageIcon} from 'lucide-react';
import {useState} from 'react';
import type {GuidaStep} from './costruttore';

function GuidaImg({img, alt}: {img?: string; alt: string}) {
  const [errore, setErrore] = useState(false);
  if (img && !errore) {
    return <img src={img} alt={alt} loading="lazy" onError={() => setErrore(true)} className="mt-2 max-w-full rounded-lg border border-slate-200" />;
  }
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-400">
      <ImageIcon className="h-4 w-4 shrink-0" />
      <span>Screenshot in arrivo — {alt}</span>
    </div>
  );
}

export function Guida({passi}: {passi: GuidaStep[]}) {
  return (
    <ol className="space-y-4">
      {passi.map((s, i) => (
        <li key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{i + 1}</span>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-800">{s.titolo}</h3>
          </div>
          <div className="space-y-2 p-4">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {s.paragrafi.map((p, j) => (
                <li key={j}>{p}</li>
              ))}
            </ul>
            {s.imgAlt && <GuidaImg img={s.img} alt={s.imgAlt} />}
            {s.imgNota && <p className="text-xs italic text-slate-500">{s.imgNota}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
