// Caricamento dei PDF Halley nella sezione Retribuzione (ticket 29, D7): i file si leggono nel browser,
// la Proposta si vede in anteprima con gli avvisi e solo "Applica" tocca la pratica.
import {useMemo, useState} from 'react';
import type {ChangeEvent} from 'react';
import {estraiPagine} from '../lettore/pdf';
import {applicaProposta, leggiProposte, scegliProposta} from '../lettore';
import type {PaginaPdf, Proposta} from '../lettore';
import type {DatiPratica, Tabelle} from '../motore';
import {campo, etichetta} from './campi';
import {scriviEuro} from './modifiche';
import type {Modifica} from './SezioneDati';

export function CaricaPdf({dati, tabelle, modifica}: {dati: DatiPratica; tabelle: Tabelle; modifica: Modifica}) {
  const [pagine, setPagine] = useState<PaginaPdf[]>([]);
  const [lettura, setLettura] = useState('');
  const [errore, setErrore] = useState('');
  const [cfScelto, setCfScelto] = useState('');
  const [applicata, setApplicata] = useState(false);

  const fineTfs = dati.anagrafica.cessazione || undefined;
  const proposte = useMemo(() => leggiProposte(pagine, {fineTfs}), [pagine, fineTfs]);
  const scelta = scegliProposta(proposte, dati.anagrafica.codiceFiscale);
  const proposta: Proposta | undefined =
    scelta.esito === 'scelta' ? scelta.proposta : scelta.esito === 'elenco' ? scelta.proposte.find((p) => p.cf === cfScelto) : undefined;
  const applicazione = proposta ? applicaProposta(dati, proposta) : undefined;

  async function carica(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!lista.length) return;
    setErrore('');
    setApplicata(false);
    const nuove: PaginaPdf[] = [];
    const falliti: string[] = [];
    for (const [i, f] of lista.entries()) {
      setLettura(`Lettura di ${f.name} (${i + 1} di ${lista.length})…`);
      try {
        nuove.push(...(await estraiPagine(f)));
      } catch (err) {
        console.error('[CaricaPdf] lettura PDF', f.name, err);
        falliti.push(f.name);
      }
    }
    setLettura('');
    if (falliti.length) setErrore(`Impossibile leggere ${falliti.join(', ')} (file danneggiato o protetto da password).`);
    setPagine((p) => [...p, ...nuove]);
  }

  function svuota() {
    setPagine([]);
    setCfScelto('');
    setErrore('');
    setApplicata(false);
  }

  function applica() {
    if (!proposta) return;
    modifica((d) => applicaProposta(d, proposta).dati);
    setApplicata(true);
    setPagine([]);
    setCfScelto('');
  }

  const descrizioneVoce = (codice: string) => tabelle.catalogoVoci.find((v) => v.codice === codice)?.descrizione ?? '';
  const avvisi = applicazione ? [...(proposta?.avvisi ?? []), ...applicazione.avvisi] : [];

  return (
    <div className="mb-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4" aria-label="Carica i PDF Halley">
      <label className={etichetta}>
        Carica cedolini o riepiloghi Halley (anche dell&apos;intero ente)
        <input className="mt-1 block text-sm" type="file" accept="application/pdf" multiple onChange={carica} />
      </label>
      <p className="mt-1 text-xs text-slate-500">I file si leggono in questo browser: non vengono inviati da nessuna parte.</p>
      {lettura && <p className="mt-2 text-sm text-slate-600">{lettura}</p>}
      {errore && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {errore}
        </p>
      )}
      {applicata && <p className="mt-2 text-sm text-emerald-800">Proposta applicata: voci e part-time sostituiti.</p>}

      {pagine.length > 0 && scelta.esito === 'vuoto' && (
        <p className="mt-2 text-sm text-amber-800">Nei PDF non c&apos;è nessun cedolino o riepilogo Halley leggibile.</p>
      )}
      {scelta.esito === 'assente' && (
        <p className="mt-2 text-sm text-amber-800" role="alert">
          Il codice fiscale della pratica non è nei PDF. Dipendenti trovati: {scelta.trovati.join(', ')}.
        </p>
      )}
      {scelta.esito === 'elenco' && (
        <label className={`${etichetta} mt-3`}>
          Dipendente
          <select className={`${campo} max-w-md`} value={cfScelto} onChange={(e) => setCfScelto(e.target.value)}>
            <option value="">— scegli —</option>
            {scelta.proposte.map((p) => (
              <option key={p.cf} value={p.cf}>
                {p.dati.anagrafica.nome ?? ''} {p.cf}
              </option>
            ))}
          </select>
        </label>
      )}

      {proposta && (
        <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm" aria-label="Anteprima della Proposta">
          <h3 className="font-semibold text-slate-800">
            Anteprima: {proposta.dati.anagrafica.nome} <span className="font-normal text-slate-500">{proposta.cf}</span>
          </h3>
          <p className="mt-1 text-slate-600">
            Posizione {proposta.dati.anagrafica.posizione || '—'}; assunzione {proposta.dati.anagrafica.assunzione ?? '—'}; cessazione{' '}
            {proposta.dati.anagrafica.cessazione ?? '—'}; part-time di base {proposta.dati.partTime.base.percentuale}%.
          </p>
          <ul className="mt-2 grid gap-x-6 md:grid-cols-2">
            {Object.entries(proposta.dati.voci.base).map(([codice, importo]) => (
              <li key={codice} className="flex justify-between gap-2">
                <span className="text-slate-700">
                  <span className="text-slate-400">{codice}</span> {descrizioneVoce(codice)}
                </span>
                <span className="tabular-nums">{scriviEuro(importo ?? 0)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-slate-600">
            Mesi con valori diversi dalla base: {Object.keys(proposta.dati.voci.eccezioni).length}; mesi con % diversa:{' '}
            {Object.keys(proposta.dati.partTime.eccezioni).length}.
          </p>
          {avvisi.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900" aria-label="Avvisi di lettura">
              {avvisi.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {proposta.nonRiconosciute.length > 0 && (
            <p className="mt-2 text-amber-900">Etichette non riconosciute: {proposta.nonRiconosciute.join(', ')}.</p>
          )}
          <div className="mt-3 flex gap-2">
            <button className="rounded-md bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800" onClick={applica}>
              Applica
            </button>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100" onClick={svuota}>
              Scarta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
