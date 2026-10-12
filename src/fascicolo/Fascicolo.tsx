// Fascicolo su pagina unica con indice laterale (ticket 14, storie 6-7, 32): i dati si compilano a
// mano e il Risultato si ricalcola intero a ogni modifica, senza pulsante "calcola". La pratica di pensione
// (ticket 30) ha regime e situazione, UM pensione e, secondo il regime, TFS o TFR.
import {useMemo} from 'react';
import type {Archivio, Pratica} from '../archivio';
import {calcolaPratica} from '../motore';
import type {DatiPraticaPensione, NomeSezione} from '../motore';
import {tabelle} from '../tabelle';
import {Stato} from './campi';
import type {StatoSezione} from './campi';
import {SezioneAnagrafica, SezioneForzature, SezioneRetribuzione} from './SezioneDati';
import type {Modifica} from './SezioneDati';
import {SezioneTfr} from './SezioneTfr';
import {SezioneDatiPensione, SezioneTfs, SezioneUmPensione} from './SezioniPensione';
import {allineaRegime} from './modifiche';
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
  // Ogni modifica della pensione riallinea il regime all'assunzione, finché non è scelto (ticket 30).
  const modifica: Modifica = (cambia) =>
    cambiaPratica((p) => {
      const modificata = new Date().toISOString();
      return p.tipo === 'pensione' ? {...p, dati: allineaRegime(cambia(p.dati)), modificata} : {...p, dati: cambia(p.dati), modificata};
    });
  const modificaPensione = (cambia: (dati: DatiPraticaPensione) => DatiPraticaPensione) =>
    cambiaPratica((p) => (p.tipo === 'pensione' ? {...p, dati: allineaRegime(cambia(p.dati)), modificata: new Date().toISOString()} : p));
  const statoChiusura = (sezione: NomeSezione): StatoSezione | undefined =>
    chiuse[sezione] ? (chiuse[sezione].daRilavorare ? 'da rilavorare' : 'chiusa') : undefined;
  const azioni = (sezione: NomeSezione) => ({
    chiusura: chiuse[sezione],
    onChiudi: () => cambiaPratica((p) => chiudiSezione(p, sezione, tabelle, new Date().toISOString())),
    onRiapri: () => cambiaPratica((p) => riapriSezione(p, sezione, new Date().toISOString())),
  });

  const a = pratica.dati.anagrafica;
  const statoAnagrafica: StatoSezione = a.nome && a.codiceFiscale && a.posizione && a.assunzione && a.cessazione ? 'completa' : 'da completare';
  const cessazione = pratica.tipo === 'cessazione';
  const regime = pratica.tipo === 'pensione' ? pratica.dati.regime : undefined;
  // Sezioni del regime e, se chiuse prima di un cambio di regime, quelle dell'altro: restano, da rilavorare.
  const conTfs = regime === 'TFS' || chiuse.tfs !== undefined;
  const conTfr = cessazione || regime === 'TFR' || chiuse.tfr !== undefined;
  const stato = (sezione: 'umPensione' | 'tfs' | 'tfr') => statoChiusura(sezione) ?? risultato.sezioni[sezione]?.esito ?? 'bloccata';
  const indice: {id: string; titolo: string; stato?: StatoSezione}[] = [
    {id: 'anagrafica', titolo: 'Anagrafica', stato: statoAnagrafica},
    ...(regime ? [{id: 'pensione', titolo: 'Regime e situazione'}] : []),
    {id: 'retribuzione', titolo: 'Retribuzione', stato: risultato.sezioni.retribuzione.esito},
    {id: 'forzature', titolo: 'Date e mese parziale', stato: risultato.sezioni.meseParziale.esito},
    ...(regime ? [{id: 'umPensione', titolo: 'Ultimo miglio pensione', stato: stato('umPensione')}] : []),
    ...(conTfs ? [{id: 'tfs', titolo: 'Ultimo miglio TFS', stato: stato('tfs')}] : []),
    ...(conTfr ? [{id: 'tfr', titolo: 'Ultimo miglio TFR', stato: stato('tfr')}] : []),
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
          {pratica.tipo === 'pensione' && <SezioneDatiPensione dati={pratica.dati} modifica={modificaPensione} />}
          <SezioneRetribuzione dati={pratica.dati} tabelle={tabelle} risultato={risultato} modifica={modifica} utilita={cessazione ? 'tfr' : 'pensione'} />
          <SezioneForzature dati={pratica.dati} risultato={risultato} modifica={modifica} regime={regime} />
          {regime && <SezioneUmPensione risultato={risultato} {...azioni('umPensione')} />}
          {conTfs && <SezioneTfs risultato={risultato} {...azioni('tfs')} />}
          {conTfr && <SezioneTfr risultato={risultato} {...azioni('tfr')} />}
          <LetteraExport
            pratica={pratica}
            ente={ente}
            risultato={risultato}
            aggiornaEnte={(lettera) => aggiorna((ar) => ({...ar, enti: ar.enti.map((e) => (e.id === ente.id ? {...e, lettera} : e))}))}
          />
        </div>
      </div>
    </div>
  );
}
