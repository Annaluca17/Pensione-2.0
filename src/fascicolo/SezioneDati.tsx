// Dati della pratica a mano (ticket 14): anagrafica, voci e part-time, date di riferimento e giorni
// del mese parziale forzabili con proposto/usato/forzato visibili (storie 16-17, 37).
import {useState} from 'react';
import type {ReactNode} from 'react';
import type {ChiaveDataRiferimento, DatiPratica, MeseISO, RegimeFineServizio, Risultato, Tabelle, TipoPartTime, ValoreForzabile} from '../motore';
import {CampoEuro, Riquadro, campo, etichetta} from './campi';
import {CaricaPdf} from './CaricaPdf';
import type {StatoSezione} from './campi';
import {
  impostaAnagrafica,
  impostaEccezionePartTime,
  impostaEccezioneVoce,
  impostaForzatura,
  impostaPartTimeBase,
  impostaVoceBase,
} from './modifiche';

/** Generica: una modifica conserva i campi della pratica di pensione (regime, situazione). */
export type Modifica = (cambia: <D extends DatiPratica>(dati: D) => D) => void;
const mese = (m: MeseISO) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function SezioneAnagrafica({dati, tabelle, modifica, stato}: {dati: DatiPratica; tabelle: Tabelle; modifica: Modifica; stato: StatoSezione}) {
  const a = dati.anagrafica;
  return (
    <Riquadro id="anagrafica" titolo="Anagrafica" stato={stato}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={etichetta}>
          Nome e cognome
          <input className={campo} value={a.nome} onChange={(e) => modifica((d) => impostaAnagrafica(d, 'nome', e.target.value))} />
        </label>
        <label className={etichetta}>
          Codice fiscale
          <input
            className={`${campo} uppercase`}
            maxLength={16}
            value={a.codiceFiscale}
            onChange={(e) => modifica((d) => impostaAnagrafica(d, 'codiceFiscale', e.target.value.toUpperCase()))}
          />
        </label>
        <label className={etichetta}>
          Posizione economica
          <select className={campo} value={a.posizione} onChange={(e) => modifica((d) => impostaAnagrafica(d, 'posizione', e.target.value))}>
            <option value="">—</option>
            {tabelle.posizioni.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className={etichetta}>
          Data di assunzione
          <input className={campo} type="date" value={a.assunzione ?? ''} onChange={(e) => modifica((d) => impostaAnagrafica(d, 'assunzione', e.target.value))} />
        </label>
        <label className={etichetta}>
          Data di cessazione
          <input className={campo} type="date" value={a.cessazione ?? ''} onChange={(e) => modifica((d) => impostaAnagrafica(d, 'cessazione', e.target.value))} />
        </label>
      </div>
    </Riquadro>
  );
}

const TIPI: (TipoPartTime | '')[] = ['', 'O', 'V', 'M'];
const nomeTipo = {'': '—', O: 'orizzontale', V: 'verticale', M: 'misto'} as const;

export function SezioneRetribuzione({
  dati,
  tabelle,
  risultato,
  modifica,
  utilita,
}: {
  dati: DatiPratica;
  tabelle: Tabelle;
  risultato: Risultato;
  modifica: Modifica;
  /** Quali voci del catalogo mostrare (per la cessazione: utili al TFR). */
  utilita: 'tfr' | 'pensione';
}) {
  const voci = tabelle.catalogoVoci.filter((v) => v.utile[utilita]);
  const sezione = risultato.sezioni.retribuzione;
  const mesi = sezione.esito === 'calcolata' ? sezione.mesi.map((m) => m.mese) : [];
  const [nuova, setNuova] = useState({mese: '', voce: voci[0]?.codice ?? ''});
  const [nuovoPt, setNuovoPt] = useState('');
  const meseScelto = mesi.includes(nuova.mese) ? nuova.mese : (mesi.at(-1) ?? '');
  const eccezioniVoci = Object.entries(dati.voci.eccezioni).flatMap(([m, vv]) =>
    Object.entries(vv ?? {}).map(([voce, importo]) => ({mese: m, voce, importo})),
  );
  const ptBase = dati.partTime.base;

  return (
    <Riquadro id="retribuzione" titolo="Retribuzione" stato={sezione.esito}>
      <p className="mb-3 text-sm text-slate-500">
        Voci a tempo pieno, come sul cedolino senza riduzioni: il part-time si indica sotto (D4).{' '}
        {mesi.length > 0 && `Mesi considerati: da ${mese(mesi[0])} a ${mese(mesi.at(-1)!)}.`}
      </p>
      <CaricaPdf dati={dati} tabelle={tabelle} modifica={modifica} />
      <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
        {voci.map((v) => (
          <div key={v.codice} className="grid grid-cols-[1fr_9rem] items-center gap-2">
            <span className="text-sm text-slate-700">
              <span className="text-slate-400">{v.codice}</span> {v.descrizione}
            </span>
            <CampoEuro nome={`Voce ${v.codice} base`} valore={dati.voci.base[v.codice]} onCambia={(c) => modifica((d) => impostaVoceBase(d, v.codice, c))} />
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Eccezioni per mese</h3>
      {eccezioniVoci.length > 0 && (
        <ul className="mb-2 space-y-1 text-sm">
          {eccezioniVoci.map((e) => (
            <li key={`${e.mese}-${e.voce}`} className="grid grid-cols-[6rem_1fr_9rem_auto] items-center gap-2">
              <span>{mese(e.mese)}</span>
              <span className="text-slate-600">voce {e.voce}</span>
              <CampoEuro nome={`Voce ${e.voce} di ${mese(e.mese)}`} valore={e.importo} onCambia={(c) => modifica((d) => impostaEccezioneVoce(d, e.mese, e.voce, c))} />
              <button className="text-xs text-red-600 hover:underline" onClick={() => modifica((d) => impostaEccezioneVoce(d, e.mese, e.voce, undefined))}>
                Togli
              </button>
            </li>
          ))}
        </ul>
      )}
      {mesi.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className={etichetta}>
            Mese
            <select className={campo} value={meseScelto} onChange={(e) => setNuova({...nuova, mese: e.target.value})}>
              {mesi.map((m) => (
                <option key={m} value={m}>
                  {mese(m)}
                </option>
              ))}
            </select>
          </label>
          <label className={etichetta}>
            Voce
            <select className={campo} value={nuova.voce} onChange={(e) => setNuova({...nuova, voce: e.target.value})}>
              {voci.map((v) => (
                <option key={v.codice} value={v.codice}>
                  {v.codice} {v.descrizione}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            onClick={() => modifica((d) => impostaEccezioneVoce(d, meseScelto, nuova.voce, d.voci.base[nuova.voce] ?? 0))}
          >
            Aggiungi eccezione
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Le eccezioni si aggiungono quando assunzione e cessazione sono valide.</p>
      )}

      <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Part-time</h3>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className={etichetta}>
          % di base
          <input
            className={`${campo} w-24 text-right`}
            type="number"
            min={1}
            max={100}
            step="0.01"
            aria-label="Percentuale di part-time di base"
            value={ptBase.percentuale}
            onChange={(e) => modifica((d) => impostaPartTimeBase(d, {...ptBase, percentuale: Number(e.target.value)}))}
          />
        </label>
        <label className={etichetta}>
          Tipo
          <select
            className={campo}
            value={ptBase.tipo ?? ''}
            onChange={(e) => modifica((d) => impostaPartTimeBase(d, {percentuale: ptBase.percentuale, ...(e.target.value && {tipo: e.target.value as TipoPartTime})}))}
          >
            {TIPI.map((t) => (
              <option key={t} value={t}>
                {nomeTipo[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {Object.entries(dati.partTime.eccezioni).map(([m, pt]) => (
          <li key={m} className="flex flex-wrap items-center gap-2">
            <span className="w-24">{mese(m)}</span>
            <input
              className={`${campo} w-24 text-right`}
              type="number"
              min={1}
              max={100}
              step="0.01"
              aria-label={`Percentuale di part-time di ${mese(m)}`}
              value={pt?.percentuale ?? 100}
              onChange={(e) => modifica((d) => impostaEccezionePartTime(d, m, {...pt, percentuale: Number(e.target.value)}))}
            />
            <select
              className={`${campo} w-36`}
              aria-label={`Tipo di part-time di ${mese(m)}`}
              value={pt?.tipo ?? ''}
              onChange={(e) =>
                modifica((d) => impostaEccezionePartTime(d, m, {percentuale: pt?.percentuale ?? 100, ...(e.target.value && {tipo: e.target.value as TipoPartTime})}))
              }
            >
              {TIPI.map((t) => (
                <option key={t} value={t}>
                  {nomeTipo[t]}
                </option>
              ))}
            </select>
            <button className="text-xs text-red-600 hover:underline" onClick={() => modifica((d) => impostaEccezionePartTime(d, m, undefined))}>
              Togli
            </button>
          </li>
        ))}
      </ul>
      {mesi.length > 0 && (
        <div className="mt-2 flex flex-wrap items-end gap-2 text-sm">
          <select className={`${campo} w-36`} aria-label="Mese della nuova eccezione di part-time" value={nuovoPt || mesi.at(-1)} onChange={(e) => setNuovoPt(e.target.value)}>
            {mesi.map((m) => (
              <option key={m} value={m}>
                {mese(m)}
              </option>
            ))}
          </select>
          <button
            className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
            onClick={() => modifica((d) => impostaEccezionePartTime(d, nuovoPt || mesi.at(-1)!, {...ptBase}))}
          >
            Aggiungi % per un mese
          </button>
        </div>
      )}
    </Riquadro>
  );
}

function Forzabile({
  titolo,
  valore,
  mostra,
  children,
  onTogli,
}: {
  titolo: string;
  valore: ValoreForzabile<string | number>;
  mostra: (v: string | number) => string;
  children: ReactNode;
  onTogli: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-sm font-medium text-slate-700">{titolo}</div>
      <dl className="mt-1 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Proposto</dt>
          <dd>{mostra(valore.proposto)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Usato</dt>
          <dd className="font-medium">{mostra(valore.usato)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Forzato</dt>
          <dd>{valore.forzato === undefined ? '—' : mostra(valore.forzato)}</dd>
        </div>
      </dl>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {children}
        {valore.forzato !== undefined && (
          <button className="text-xs text-slate-600 hover:underline" onClick={onTogli}>
            Togli la forzatura
          </button>
        )}
      </div>
    </div>
  );
}

/** Date di riferimento e giorni del mese parziale: le sole forzature (storie 37-38). */
export function SezioneForzature({
  dati,
  risultato,
  modifica,
  regime,
}: {
  dati: DatiPratica;
  risultato: Risultato;
  modifica: Modifica;
  /** Pratica di pensione: anche la data della pensione, e la fine servizio è del TFS o del TFR. */
  regime?: RegimeFineServizio;
}) {
  const date = risultato.dateRiferimento;
  const parziale = risultato.sezioni.meseParziale;
  const forzabili: {chiave: ChiaveDataRiferimento; titolo: string; valore?: ValoreForzabile<string>}[] = [
    ...(regime ? [{chiave: 'dataRiferimentoPensione' as const, titolo: 'Data di riferimento della pensione', valore: date?.pensione}] : []),
    {
      chiave: 'dataRiferimentoFineServizio',
      titolo: regime === 'TFS' ? 'Data di fine TFS' : 'Data di riferimento del TFR',
      valore: date?.fineServizio,
    },
  ];
  return (
    <Riquadro id="forzature" titolo="Date di riferimento e mese parziale" stato={parziale.esito}>
      <div className="grid gap-3 md:grid-cols-2">
        {date ? (
          forzabili.map(({chiave, titolo, valore}) =>
            valore ? (
              <Forzabile key={chiave} titolo={titolo} valore={valore} mostra={(v) => data(String(v))} onTogli={() => modifica((d) => impostaForzatura(d, chiave, undefined))}>
                <input
                  className={`${campo} w-44`}
                  type="date"
                  aria-label={`Forza: ${titolo}`}
                  value={dati.forzature[chiave] ?? ''}
                  onChange={(e) => modifica((d) => impostaForzatura(d, chiave, e.target.value || undefined))}
                />
              </Forzabile>
            ) : null,
          )
        ) : (
          <p className="text-sm text-slate-500">{regime ? 'Le date di riferimento si propongono dalla cessazione e dalla situazione.' : 'La data di riferimento si propone dalla cessazione.'}</p>
        )}
        {parziale.esito === 'calcolata' ? (
          <Forzabile
            titolo={`Giorni del mese parziale (${mese(parziale.mese)}, lun-sab, D9)`}
            valore={parziale.giorni}
            mostra={(v) => String(v)}
            onTogli={() => modifica((d) => impostaForzatura(d, 'giorniMeseParziale', undefined))}
          >
            <input
              className={`${campo} w-24 text-right`}
              type="number"
              min={0}
              max={26}
              aria-label="Forza i giorni del mese parziale"
              value={dati.forzature.giorniMeseParziale ?? ''}
              onChange={(e) => modifica((d) => impostaForzatura(d, 'giorniMeseParziale', e.target.value === '' ? undefined : Number(e.target.value)))}
            />
          </Forzabile>
        ) : (
          <p className="text-sm text-slate-500">Il mese parziale si calcola con una cessazione valida.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">Gli importi delle righe PASSWEB non si forzano: si correggono le voci (storia 38).</p>
    </Riquadro>
  );
}

