/**
 * ImportaRiepilogo.tsx
 * Caricamento di cedolini mensili e "Riepilogo generale dipendente" Halley (PDF)
 * per compilare il Calcolo Unificato. I file sono letti nel browser e non vengono inviati.
 */

import { useMemo, useState } from 'react';
import { compila } from '../cedolino/compila';
import { leggiDocumenti } from '../cedolino/documenti';
import { estraiPagine } from '../cedolino/pdf';
import type { Compilazione, PaginaPdf, RiepilogoAnnuo } from '../cedolino/tipi';

interface Props {
  /** Data di cessazione già inserita, usata se il riepilogo non la riporta. */
  dataCessazione: string;
  onCompila: (c: Compilazione) => void;
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export default function ImportaRiepilogo({ dataCessazione, onCompila }: Props) {
  const [lettura, setLettura] = useState<{ fatti: number; totale: number } | null>(null);
  const [errore, setErrore] = useState('');
  // I file si aggiungono uno dopo l'altro: i cedolini di ogni mese stanno in cartelle diverse.
  const [caricati, setCaricati] = useState<Array<{ nome: string; pagine: PaginaPdf[] }>>([]);
  const [cfScelto, setCfScelto] = useState('');
  const [perequativo, setPerequativo] = useState(false);
  const [applicato, setApplicato] = useState(false);

  const carica = async (files: FileList | null) => {
    if (!files?.length) return;
    // Copia subito: FileList è "viva" e si svuota quando l'input viene azzerato.
    const lista = [...files];
    setLettura({ fatti: 0, totale: lista.length }); setErrore(''); setApplicato(false);
    const nuovi: typeof caricati = [];
    const falliti: string[] = [];
    for (const [i, f] of lista.entries()) {
      setLettura({ fatti: i, totale: lista.length });
      try { nuovi.push({ nome: f.name, pagine: await estraiPagine(f) }); }
      catch (e) { console.error('[ImportaRiepilogo] lettura PDF', f.name, e); falliti.push(f.name); }
    }
    if (falliti.length) setErrore(`Impossibile leggere ${falliti.join(', ')} (file danneggiato o protetto da password).`);
    setCaricati(p => [...p, ...nuovi]);
    setLettura(null);
  };

  const svuota = () => { setCaricati([]); setCfScelto(''); setErrore(''); setApplicato(false); };

  const letti = useMemo(() => leggiDocumenti(caricati.flatMap(c => c.pagine)), [caricati]);
  const perCf = useMemo(() => {
    const gruppi = new Map<string, RiepilogoAnnuo[]>();
    for (const r of letti.riepiloghi) gruppi.set(r.cf, [...(gruppi.get(r.cf) ?? []), r]);
    return gruppi;
  }, [letti]);
  const cf = perCf.has(cfScelto) ? cfScelto : perCf.size === 1 ? [...perCf.keys()][0] : '';
  const { cedolino, riepilogo, straordinarie, altre } = letti.pagine;
  const esitoLettura = [
    cedolino && `${cedolino} cedolini mensili`,
    riepilogo && `${riepilogo} pagine di riepilogo annuale`,
    straordinarie && `${straordinarie} cedolini supplementari scartati`,
    altre && `${altre} pagine non riconosciute`,
  ].filter(Boolean).join(' · ');

  const scelti = perCf.get(cf);
  const anteprima = useMemo(
    () => scelti ? compila(scelti, { perequativo, dataCessazione }) : null,
    [scelti, perequativo, dataCessazione],
  );
  const mesiTrovati = anteprima?.mesi.filter(m => m.tabellare != null).length ?? 0;

  return (
    <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Compila dai cedolini (PDF Halley)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Aggiungi i cedolini mensili degli ultimi 12 mesi, anche quelli dell'intero ente, uno o più file
          alla volta; in alternativa il "Riepilogo generale dipendente — Voci di testata" di ciascun anno.
          I file restano sul tuo computer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept="application/pdf,.pdf" multiple disabled={!!lettura}
          onChange={e => { carica(e.target.files); e.target.value = ''; }}
          className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50" />
        {caricati.length > 0 && (
          <button onClick={svuota}
            className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs hover:bg-white transition-colors">
            Ricomincia
          </button>
        )}
      </div>

      {lettura && (
        <p className="text-xs text-slate-500">
          Lettura in corso… file {lettura.fatti + 1} di {lettura.totale}
        </p>
      )}
      {caricati.length > 0 && (
        <p className="text-xs text-slate-500">
          {caricati.length} file ({caricati.map(c => c.nome).join(', ')})
          {esitoLettura && <> — letti: {esitoLettura}</>}
        </p>
      )}
      {letti.avvisi.map((a, i) => <p key={i} className="text-xs text-amber-800">{a}</p>)}
      {caricati.length > 0 && !perCf.size && !lettura && (
        <p className="text-xs text-red-700">Nessun cedolino né riepilogo Halley riconosciuto nei file caricati.</p>
      )}
      {errore && <p className="text-xs text-red-700">{errore}</p>}

      {perCf.size > 1 && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Il file contiene {perCf.size} dipendenti: scegli quale
          </label>
          <select value={cf} onChange={e => { setCfScelto(e.target.value); setApplicato(false); }}
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
