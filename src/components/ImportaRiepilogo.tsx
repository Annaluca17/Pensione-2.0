/**
 * ImportaRiepilogo.tsx
 * Caricamento del "Riepilogo generale dipendente — VOCI DI TESTATA" (PDF) per
 * compilare il Calcolo Unificato. I file sono letti nel browser e non vengono inviati.
 */

import { useMemo, useState } from 'react';
import { compila } from '../cedolino/compila';
import { leggiRiepiloghi } from '../cedolino/leggiRiepilogo';
import { estraiPagine } from '../cedolino/pdf';
import type { Compilazione, RiepilogoAnnuo } from '../cedolino/tipi';

interface Props {
  /** Data di cessazione già inserita, usata se il riepilogo non la riporta. */
  dataCessazione: string;
  onCompila: (c: Compilazione) => void;
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export default function ImportaRiepilogo({ dataCessazione, onCompila }: Props) {
  const [lettura, setLettura] = useState(false);
  const [errore, setErrore] = useState('');
  const [perCf, setPerCf] = useState<Map<string, RiepilogoAnnuo[]>>(new Map());
  const [cf, setCf] = useState('');
  const [perequativo, setPerequativo] = useState(false);
  const [applicato, setApplicato] = useState(false);

  const carica = async (files: FileList | null) => {
    if (!files?.length) return;
    setLettura(true); setErrore(''); setApplicato(false);
    try {
      const pagine = (await Promise.all([...files].map(estraiPagine))).flat();
      const gruppi = new Map<string, RiepilogoAnnuo[]>();
      for (const r of leggiRiepiloghi(pagine)) gruppi.set(r.cf, [...(gruppi.get(r.cf) ?? []), r]);
      setPerCf(gruppi);
      setCf(gruppi.size === 1 ? [...gruppi.keys()][0] : '');
      if (!gruppi.size) {
        setErrore('Nessuna pagina "VOCI DI TESTATA" trovata. Il formato letto è il "Riepilogo generale '
          + 'dipendente" annuale; il cedolino mensile non è ancora supportato.');
      }
    } catch (e) {
      console.error('[ImportaRiepilogo] lettura PDF', e);
      setPerCf(new Map());
      setErrore('Impossibile leggere il PDF (file danneggiato o protetto da password).');
    } finally {
      setLettura(false);
    }
  };

  const scelti = perCf.get(cf);
  const anteprima = useMemo(
    () => scelti ? compila(scelti, { perequativo, dataCessazione }) : null,
    [scelti, perequativo, dataCessazione],
  );
  const mesiTrovati = anteprima?.mesi.filter(m => m.tabellare != null).length ?? 0;

  return (
    <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Compila dal riepilogo paga (PDF)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          "Riepilogo generale dipendente — Voci di testata", uno per anno: per la cessazione nei primi mesi
          dell'anno carica anche quello precedente. I file restano sul tuo computer.
        </p>
      </div>

      <input type="file" accept="application/pdf,.pdf" multiple disabled={lettura}
        onChange={e => { carica(e.target.files); e.target.value = ''; }}
        className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50" />

      {lettura && <p className="text-xs text-slate-500">Lettura in corso…</p>}
      {errore && <p className="text-xs text-red-700">{errore}</p>}

      {perCf.size > 1 && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Il file contiene {perCf.size} dipendenti: scegli quale
          </label>
          <select value={cf} onChange={e => { setCf(e.target.value); setApplicato(false); }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">— seleziona —</option>
            {[...perCf].map(([k, rr]) => (
              <option key={k} value={k}>
                {rr[0].nome} — {k} ({rr.map(r => r.anno).sort().join(', ')})
              </option>
            ))}
          </select>
        </div>
      )}

      {anteprima && (
        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>{anteprima.nome}</strong> · {anteprima.cf}</span>
            <span>Cessazione: <strong>{anteprima.cessazione || '—'}</strong></span>
            <span>Posizione: <strong>{anteprima.posizione || '—'}</strong></span>
            <span>Mesi trovati: <strong>{mesiTrovati}/12</strong></span>
            {anteprima.meseVoci && (
              <span>Voci da: <strong>{MESI[anteprima.meseVoci.mese]} {anteprima.meseVoci.anno}</strong></span>
            )}
          </div>

          {anteprima.haPerequativo && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={perequativo}
                onChange={e => { setPerequativo(e.target.checked); setApplicato(false); }}
                className="w-4 h-4 accent-blue-600" />
              <span>Somma l'<strong>Elemento perequativo</strong> al tabellare (voce 01 e 12 mesi)</span>
            </label>
          )}

          {anteprima.nonRiconosciute.length > 0 && (
            <p className="text-amber-800">
              Voci non riconosciute, da inserire a mano se servono: {anteprima.nonRiconosciute.join(' · ')}
            </p>
          )}
          {anteprima.avvisi.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              {anteprima.avvisi.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button onClick={() => { onCompila(anteprima); setApplicato(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Compila i campi
            </button>
            {applicato && (
              <span className="text-emerald-700">
                ✓ Compilati anagrafica, voci 01–11, posizione e 12 mesi: controllali nei passi successivi.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
