// Sezioni della pratica di pensione (ticket 30, storie 13-20, 32-41): regime, situazione, Credito e pensione
// erogata; UM pensione e UM TFS con composizione, avvisi con fonte, blocchi e chiusura. Il TFR riusa SezioneTfr.
import {useState} from 'react';
import type {Avviso, Centesimi, Contratto, DatiPraticaPensione, Risultato, Situazione} from '../motore';
import type {Chiusura} from './chiusura';
import {Avvisi, BarraChiusura, CampoEuro, MotiviBlocco, Riquadro, RigaImporto, campo, etichetta} from './campi';
import {impostaDmaPreviste, impostaMiglioramento, impostaPensioneErogata, impostaSituazione, meseDmaProposto, regimeProposto, scegliRegime, scriviEuro} from './modifiche';

type ModificaPensione = (cambia: (dati: DatiPraticaPensione) => DatiPraticaPensione) => void;
const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

const SITUAZIONI: {tipo: Situazione['tipo']; nome: string; dal?: string}[] = [
  {tipo: 'ordinaria', nome: 'Ordinaria'},
  {tipo: 'sospensione-cautelare', nome: 'Sospensione cautelare', dal: 'Primo giorno di sospensione'},
  {tipo: 'trattenuta-malattia', nome: 'Trattenuta 100% per malattia', dal: 'Primo giorno di trattenuta'},
  {tipo: 'congedo-104', nome: 'Congedo L. 104', dal: 'Primo giorno di congedo'},
  {tipo: 'optante-tfr', nome: 'Optante TFR', dal: "Primo giorno dopo l'opzione"},
];

/** Regime di fine servizio, situazione, Credito e pensione erogata. */
export function SezioneDatiPensione({
  dati,
  modifica,
  contratti,
  contrattoProposto,
}: {
  dati: DatiPraticaPensione;
  modifica: ModificaPensione;
  contratti: readonly Contratto[];
  /** Il contratto che il motore propone per il miglioramento (C21-5). */
  contrattoProposto?: string;
}) {
  // Attivate ma ancora senza mese o senza contratto: nei dati non c'è nulla, la casella resta spuntata.
  const [dmaAttesa, setDmaAttesa] = useState(false);
  const [migliorAttesa, setMigliorAttesa] = useState(false);
  const dmaAttiva = dati.dmaPreviste !== undefined || dmaAttesa;
  const migliorAttivo = dati.miglioramento !== undefined || migliorAttesa;
  const proposto = regimeProposto(dati);
  const situazione = SITUAZIONI.find((s) => s.tipo === dati.situazione.tipo)!;
  const [erogata, setErogata] = useState<{fissi?: Centesimi; tredicesima?: Centesimi}>(dati.pensioneErogata ?? {});
  const cambiaErogata = (parziale: {fissi?: Centesimi; tredicesima?: Centesimi}) => {
    const nuova = {...erogata, ...parziale};
    setErogata(nuova);
    modifica((d) => impostaPensioneErogata(d, nuova));
  };
  const soloUno = (erogata.fissi === undefined) !== (erogata.tredicesima === undefined);

  return (
    <Riquadro id="pensione" titolo="Regime e situazione">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={etichetta}>
          Regime di fine servizio
          <select
            className={campo}
            value={dati.regimeScelto ? dati.regime : ''}
            onChange={(e) => modifica((d) => scegliRegime(d, (e.target.value || undefined) as DatiPraticaPensione['regime'] | undefined))}
          >
            <option value="">Proposto dall'assunzione ({proposto})</option>
            <option value="TFS">TFS (scelto)</option>
            <option value="TFR">TFR (scelto)</option>
          </select>
          <span className="mt-1 block text-xs text-slate-500">
            Assunti dal 01/01/2001 in TFR, prima in TFS (DPCM 20/12/1999). Usato: <strong>{dati.regime}</strong>
          </span>
        </label>
        <label className={etichetta}>
          Situazione
          <select className={campo} value={dati.situazione.tipo} onChange={(e) => modifica((d) => impostaSituazione(d, e.target.value as Situazione['tipo']))}>
            {SITUAZIONI.map((s) => (
              <option key={s.tipo} value={s.tipo}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        {situazione.dal && 'dal' in dati.situazione && (
          <label className={etichetta}>
            {situazione.dal}
            <input
              className={campo}
              type="date"
              value={dati.situazione.dal}
              onChange={(e) => modifica((d) => impostaSituazione(d, d.situazione.tipo, e.target.value))}
            />
          </label>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={dati.iscrittoCredito} onChange={(e) => modifica((d) => ({...d, iscrittoCredito: e.target.checked}))} />
        Iscritto al Fondo Credito
      </label>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Sezioni facoltative</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={dmaAttiva}
              onChange={(e) => {
                const attiva = e.target.checked;
                const mese = attiva ? meseDmaProposto(dati) : undefined;
                setDmaAttesa(attiva && mese === undefined);
                modifica((d) => impostaDmaPreviste(d, mese));
              }}
            />
            Prepara le DMA previste
          </label>
          {dmaAttiva && (
            <label className={`${etichetta} mt-2`}>
              Primo mese (il successivo all'ultima DMA vera)
              <input
                className={campo}
                type="month"
                value={dati.dmaPreviste?.dal ?? ''}
                onChange={(e) => {
                  setDmaAttesa(e.target.value === '');
                  modifica((d) => impostaDmaPreviste(d, e.target.value || undefined));
                }}
              />
              <span className="mt-1 block text-xs text-slate-500">Al massimo sei DMA: il 7º mese non si può inserire. Proposto: cinque mesi prima della cessazione.</span>
            </label>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={migliorAttivo}
              onChange={(e) => {
                const attivo = e.target.checked;
                const contratto = attivo ? contrattoProposto : undefined;
                setMigliorAttesa(attivo && contratto === undefined);
                modifica((d) => impostaMiglioramento(d, contratto));
              }}
            />
            Miglioramento contrattuale
          </label>
          {migliorAttivo && (
            <label className={`${etichetta} mt-2`}>
              Contratto
              <select
                className={campo}
                value={dati.miglioramento?.contratto ?? ''}
                onChange={(e) => {
                  setMigliorAttesa(e.target.value === '');
                  modifica((d) => impostaMiglioramento(d, e.target.value || undefined));
                }}
              >
                <option value="">Scegli il contratto</option>
                {contratti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.stato === 'ipotesi' ? 'ipotesi' : 'definitivo'}, firma {c.firma.slice(8, 10)}/{c.firma.slice(5, 7)}/{c.firma.slice(0, 4)})
                    {c.id === contrattoProposto ? ' · proposto' : ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                {contrattoProposto ? 'Il proposto è il contratto firmato dopo la cessazione, nella cui vigenza cade.' : 'Nessun contratto firmato dopo la cessazione e vigente alla cessazione: scegli tu.'}
              </span>
            </label>
          )}
        </div>
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Pensione erogata (facoltativa)</h3>
      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <label className={etichetta}>
          Totale fissi annui
          <CampoEuro nome="Pensione erogata: totale fissi" valore={erogata.fissi} onCambia={(c) => cambiaErogata({fissi: c})} />
        </label>
        <label className={etichetta}>
          Quota di 13ª
          <CampoEuro nome="Pensione erogata: quota di 13ª" valore={erogata.tredicesima} onCambia={(c) => cambiaErogata({tredicesima: c})} />
        </label>
      </div>
      <p className={`mt-1 text-xs ${soloUno ? 'text-amber-700' : 'text-slate-500'}`}>
        {soloUno ? "Manca l'altro totale: la pensione erogata entra nella pratica solo con tutti e due." : 'I totali già accettati da INPS in PASSWEB; servono al miglioramento contrattuale.'}
      </p>
    </Riquadro>
  );
}

const CODICI_PENSIONE: Avviso['codice'][] = ['contratto-in-ipotesi', 'ivc-incompatibile'];
/** Col miglioramento l'UM pensione tiene l'IVC inserita (ticket 01): gli avvisi IVC sono del TFS o del TFR. */
const codiciPensione = (r: Risultato) => (r.sezioni.miglioramento ? CODICI_PENSIONE.filter((c) => c !== 'ivc-incompatibile') : CODICI_PENSIONE);
const CODICI_TFS: Avviso['codice'][] = ['tfs-annualizzato', 'ivc-incompatibile', 'contratto-in-ipotesi'];

interface PropsSezione {
  risultato: Risultato;
  chiusura?: Chiusura;
  onChiudi: () => void;
  onRiapri: () => void;
}

const statoDi = (chiusura: Chiusura | undefined, esito: 'calcolata' | 'bloccata') =>
  chiusura ? (chiusura.daRilavorare ? 'da rilavorare' : 'chiusa') : esito;

/** UM pensione sul mese della data di riferimento della pensione (storia 39). */
export function SezioneUmPensione({risultato, chiusura, onChiudi, onRiapri}: PropsSezione) {
  const congelato = chiusura?.congelato.sezione === 'umPensione' ? chiusura.congelato.risultato : undefined;
  const um = congelato ?? risultato.sezioni.umPensione ?? {esito: 'bloccata' as const, motivi: []};
  return (
    <Riquadro id="umPensione" titolo="Ultimo miglio pensione" stato={statoDi(chiusura, um.esito)}>
      <BarraChiusura chiusura={chiusura} calcolata={um.esito === 'calcolata'} onChiudi={onChiudi} onRiapri={onRiapri} />
      {um.esito === 'bloccata' ? (
        <MotiviBlocco motivi={um.motivi} />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">Mese di riferimento {mese(um.mese)}: voci intere anche per i part-time (D4).</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {um.righe.map((r) => (
              <RigaImporto key={r.id} chiave={`umPensione/${r.id}`} etichetta={r.etichetta} composizione={r.composizione} />
            ))}
            <RigaImporto chiave={`umPensione/${um.tredicesima.id}`} etichetta={um.tredicesima.etichetta} composizione={um.tredicesima.composizione} />
          </ul>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-sky-800">Da inserire in PASSWEB</p>
          <dl className="mt-1 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-sky-300 bg-sky-50 p-3">
              <dt className="text-sm text-sky-900">Totale fissi annui</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-900" data-riga="umPensione/totale-annui">
                {scriviEuro(um.totaleAnnui)} €
              </dd>
            </div>
            <div className="rounded-lg border border-sky-300 bg-sky-50 p-3">
              <dt className="text-sm text-sky-900">{um.tredicesima.etichetta}</dt>
              <dd className="text-xl font-semibold tabular-nums text-slate-900" data-riga="umPensione/tredicesima-evidenza">
                {scriviEuro(um.tredicesima.composizione.arrotondato)} €
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Totale con la 13ª (non si inserisce): <span className="tabular-nums">{scriviEuro(um.totale)} €</span>
          </p>
        </>
      )}
      <Avvisi avvisi={risultato.avvisi.filter((a) => codiciPensione(risultato).includes(a.codice))} />
    </Riquadro>
  );
}

/** UM TFS in 9 righe sui 12 mesi alla data di fine TFS (storie 40-41). */
export function SezioneTfs({risultato, chiusura, onChiudi, onRiapri}: PropsSezione) {
  const congelato = chiusura?.congelato.sezione === 'tfs' ? chiusura.congelato.risultato : undefined;
  const tfs = congelato ?? risultato.sezioni.tfs ?? {esito: 'bloccata' as const, motivi: []};
  return (
    <Riquadro id="tfs" titolo="Ultimo miglio TFS" stato={statoDi(chiusura, tfs.esito)}>
      <BarraChiusura chiusura={chiusura} calcolata={tfs.esito === 'calcolata'} onChiudi={onChiudi} onRiapri={onRiapri} />
      {tfs.esito === 'bloccata' ? (
        <MotiviBlocco motivi={tfs.motivi} />
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">
            Mesi sommati da {mese(tfs.dal)} a {mese(tfs.al)}, nessun × 13 (D3).
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {tfs.righe.map((r) => (
              <RigaImporto key={r.id} chiave={`tfs/${r.id}`} etichetta={r.etichetta} nota={r.campoPassweb} composizione={r.composizione} />
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Totale <span className="font-medium tabular-nums">{scriviEuro(tfs.totale)} €</span>
          </p>
        </>
      )}
      <Avvisi avvisi={risultato.avvisi.filter((a) => CODICI_TFS.includes(a.codice))} />
    </Riquadro>
  );
}
