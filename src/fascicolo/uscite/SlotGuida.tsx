// Slot della guida PASSWEB (ticket 18, storia 84): si apre sopra il fascicolo, dalla sezione TFR
// calcolata. Testi e screenshot della guida invariati (nessun legame con spiega()).
import {useState} from 'react';
import {casoDaTfr} from '../../guida-passweb/caso';
import {buildPasswebGuide} from '../../guida-passweb/costruttore';
import {Guida} from '../../guida-passweb/Guida';
import {scriviEuro} from '../modifiche';
import type {Uscita} from './tipo';

const fmt = {
  eur: (n?: number) => (n === undefined ? '—' : `${scriviEuro(Math.round(n * 100))} €`),
  data: (s: string) => (s && s.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : s || '—'),
};

export const SlotGuida: Uscita = ({pratica, risultato}) => {
  const [aperta, setAperta] = useState(false);
  if (pratica.tipo !== 'cessazione') return <p className="text-sm text-slate-500">La guida della pratica di pensione arriva col tratto 2.</p>;
  const tfr = risultato.sezioni.tfr;
  if (tfr.esito !== 'calcolata') return <p className="text-sm text-red-700">La guida si apre quando la sezione TFR è calcolata.</p>;
  const caso = casoDaTfr(tfr);
  return (
    <div className="text-sm">
      <p className="mb-2 text-slate-500">Passo per passo l'inserimento e la certificazione in PASSWEB.</p>
      <button className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700" onClick={() => setAperta(true)}>
        Apri la guida
      </button>
      {aperta && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Guida PASSWEB" onClick={() => setAperta(false)}>
          <div className="mx-auto max-w-3xl space-y-4 rounded-xl bg-slate-50 p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Guida inserimento su PASSWEB</h2>
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={() => setAperta(false)}>
                Chiudi
              </button>
            </div>
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Guida operativa adattata alla casistica calcolata (mese iniziale: <strong>{caso.casoIniziale}</strong>, mese finale:{' '}
              <strong>{caso.casoFinale}</strong>).
            </p>
            <Guida passi={buildPasswebGuide(caso, fmt)} />
          </div>
        </div>
      )}
    </div>
  );
};
