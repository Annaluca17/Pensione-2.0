// Fascicolo su pagina unica con indice laterale (ticket 14, storie 6-7, 32): i dati si compilano a
// mano e il Risultato si ricalcola intero a ogni modifica, senza pulsante "calcola".
import {useMemo} from 'react';
import type {Archivio, Pratica} from '../archivio';
import {calcolaPratica} from '../motore';
import type {DatiPratica} from '../motore';
import {tabelle} from '../tabelle';
import {Stato} from './campi';
import type {StatoSezione} from './campi';
import {SezioneAnagrafica, SezioneForzature, SezioneRetribuzione} from './SezioneDati';
import {SezioneTfr} from './SezioneTfr';
import {chiudiSezione, chiusure, riapriSezione} from './chiusura';
import {LetteraExport} from './uscite/LetteraExport';

export function Fascicolo({
  archivio,
  praticaId,
  aggiorna,
  onEsci,
}: {
  archivio: Archivio;
  praticaId: string;
  aggiorna: (modifica: (a: Archivio) => Archivio) => void;
  onEsci: () => void;
}) {
  const pratica = archivio.pratiche.find((p) => p.id === praticaId);
  const ente = pratica && archivio.enti.find((e) => e.id === pratica.enteId);
  const risultato = useMemo(() => (pratica ? calcolaPratica(pratica.dati, tabelle) : undefined), [pratica]);
  const chiuse = useMemo(() => (pratica ? chiusure(pratica, tabelle) : {}), [pratica]);

  const percorso = (
    <nav className="mb-4 text-sm text-slate-500" aria-label="Percorso">
      <button className="text-blue-700 hover:underline" onClick={onEsci}>
        Scrivania
      </button>
      {pratica && ente && (
        <>
          <span className="mx-2">›</span>
          <span>{ente.nome}</span>
          <span className="mx-2">›</span>
          <span className="text-slate-800">{pratica.dati.anagrafica.nome}</span>
        </>
      )}
    </nav>
  );
  if (!pratica || !ente || !risultato) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-8">
        {percorso}
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          La pratica non è più nell'archivio (forse cancellata da un'altra scheda).
        </p>
      </div>
    );
  }

  const cambiaPratica = (cambia: (p: Pratica) => Pratica) =>
    aggiorna((a) => ({...a, pratiche: a.pratiche.map((p) => (p.id === praticaId ? cambia(p) : p))}));
  const modifica = (cambia: (dati: DatiPratica) => DatiPratica) =>
    cambiaPratica((p) => ({...p, dati: cambia(p.dati), modificata: new Date().toISOString()}));
  const statoChiusura = (sezione: 'tfr'): StatoSezione | undefined =>
    chiuse[sezione] ? (chiuse[sezione].daRilavorare ? 'da rilavorare' : 'chiusa') : undefined;

  const a = pratica.dati.anagrafica;
  const statoAnagrafica: StatoSezione = a.nome && a.codiceFiscale && a.posizione && a.assunzione && a.cessazione ? 'completa' : 'da completare';
  const cessazione = pratica.tipo === 'cessazione';
  const indice: {id: string; titolo: string; stato?: StatoSezione}[] = [
    {id: 'anagrafica', titolo: 'Anagrafica', stato: statoAnagrafica},
    {id: 'retribuzione', titolo: 'Retribuzione', stato: risultato.sezioni.retribuzione.esito},
    {id: 'forzature', titolo: 'Date e mese parziale', stato: risultato.sezioni.meseParziale.esito},
    ...(cessazione ? [{id: 'tfr', titolo: 'Ultimo miglio TFR', stato: statoChiusura('tfr') ?? risultato.sezioni.tfr.esito}] : []),
    {id: 'uscite', titolo: 'Lettera ed export'},
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-8">
      {percorso}
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{a.nome || 'Senza nome'}</h1>
        <p className="text-sm text-slate-500">
          {cessazione ? 'Pratica di cessazione' : 'Pratica di pensione'} · {ente.nome} · tabelle {risultato.versioneTabelle}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
        <nav className="lg:sticky lg:top-16 lg:self-start" aria-label="Sezioni del fascicolo">
          <ul className="space-y-1 rounded-xl border border-slate-200 bg-white p-2 text-sm">
            {indice.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-slate-700 hover:bg-slate-50">
                  {s.titolo}
                  {s.stato && <Stato stato={s.stato} />}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          <SezioneAnagrafica dati={pratica.dati} tabelle={tabelle} modifica={modifica} stato={statoAnagrafica} />
          <SezioneRetribuzione dati={pratica.dati} tabelle={tabelle} risultato={risultato} modifica={modifica} utilita={cessazione ? 'tfr' : 'pensione'} />
          <SezioneForzature dati={pratica.dati} risultato={risultato} modifica={modifica} />
          {cessazione ? (
            <SezioneTfr
              risultato={risultato}
              chiusura={chiuse.tfr}
              onChiudi={() => cambiaPratica((p) => chiudiSezione(p, 'tfr', tabelle, new Date().toISOString()))}
              onRiapri={() => cambiaPratica((p) => riapriSezione(p, 'tfr', new Date().toISOString()))}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Le sezioni della pratica di pensione (ultimo miglio, TFS, DMA previste) arrivano col tratto 2.
            </p>
          )}
          <LetteraExport pratica={pratica} ente={ente} risultato={risultato} />
        </div>
      </div>
    </div>
  );
}
