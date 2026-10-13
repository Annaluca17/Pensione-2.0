// Lettera per più dipendenti dello stesso ente (ticket 10 delle prove): le pratiche visibili nell'elenco, spuntate
// di default; quelle che non possono entrare restano senza spunta, col motivo. Dati dell'ente, oggetto e date come
// nel fascicolo (SlotLettera): oggetto e date non si salvano.
import {useMemo, useState} from 'react';
import type {Ente} from '../archivio';
import {calcolaPratica} from '../motore';
import {campo, etichetta} from '../fascicolo/campi';
import {oggi, pulsante, scarica, useEnteLettera} from '../fascicolo/uscite/enteLettera';
import {
  esitoLetteraMiglioramento,
  letteraMiglioramentoBlob,
  letteraTfrBlob,
  nomeFileLetteraEnte,
  oggettoPredefinito,
  oggettoPredefinitoMiglioramento,
} from '../fascicolo/uscite/lettera';
import {tabelle} from '../tabelle';
import type {RigaScrivania, TipoPratica} from './operazioni';

/** Perché una pratica non può entrare nella lettera (vuoto = può entrare). */
function motiviEsclusione({pratica}: RigaScrivania): string[] {
  const a = pratica.dati.anagrafica;
  if (pratica.tipo === 'cessazione') {
    const mancano = [!a.nome && 'nome', !a.codiceFiscale && 'codice fiscale', !a.assunzione && 'assunzione', !a.cessazione && 'cessazione'].filter(Boolean);
    return mancano.length ? [`Mancano nell'anagrafica: ${mancano.join(', ')}.`] : [];
  }
  const esito = esitoLetteraMiglioramento(pratica, calcolaPratica(pratica.dati, tabelle));
  if (esito.stato === 'non-generabile') return esito.motivi;
  const mancano = [!a.nome && 'nome', !a.codiceFiscale && 'codice fiscale', !a.cessazione && 'cessazione'].filter(Boolean);
  return mancano.length ? [`Mancano nell'anagrafica: ${mancano.join(', ')}.`] : [];
}

export function LetteraCumulativa({
  righe,
  ente,
  tipo,
  aggiornaEnte,
}: {
  righe: RigaScrivania[];
  ente: Ente;
  tipo: TipoPratica;
  aggiornaEnte: (lettera: NonNullable<Ente['lettera']>) => void;
}) {
  const dati = useEnteLettera(ente, aggiornaEnte);
  const [oggetto, setOggetto] = useState(() => (tipo === 'cessazione' ? oggettoPredefinito(tabelle) : oggettoPredefinitoMiglioramento(tabelle)));
  const [data, setData] = useState(oggi);
  const [dataPassweb, setDataPassweb] = useState('');
  const [tolte, setTolte] = useState<ReadonlySet<string>>(new Set());

  const voci = useMemo(() => righe.map((r) => ({riga: r, motivi: motiviEsclusione(r)})), [righe]);
  const scelte = voci.filter((v) => !v.motivi.length && !tolte.has(v.riga.pratica.id));
  const serveDataPassweb = tipo === 'pensione';

  const alterna = (id: string) => setTolte((t) => new Set(t.has(id) ? [...t].filter((x) => x !== id) : [...t, id]));

  const genera = async () => {
    const comuni = {...dati.usa(), data};
    const pratiche = scelte.map((v) => v.riga.pratica);
    const blob =
      tipo === 'cessazione'
        ? await letteraTfrBlob({
            ...comuni,
            oggetto: oggetto.trim() || oggettoPredefinito(tabelle),
            dipendenti: pratiche.map(({dati: d}) => ({
              nome: d.anagrafica.nome,
              codiceFiscale: d.anagrafica.codiceFiscale,
              assunzione: d.anagrafica.assunzione,
              cessazione: d.anagrafica.cessazione,
            })),
          })
        : await letteraMiglioramentoBlob({
            ...comuni,
            oggetto: oggetto.trim() || oggettoPredefinitoMiglioramento(tabelle),
            dataPassweb,
            riferimentoNormativo: tabelle.lettere.miglioramento.riferimentoNormativo,
            dipendenti: pratiche.flatMap((p) =>
              p.tipo === 'pensione'
                ? [{nome: p.dati.anagrafica.nome, codiceFiscale: p.dati.anagrafica.codiceFiscale, cessazione: p.dati.anagrafica.cessazione, regime: p.dati.regime}]
                : [],
            ),
          });
    const nome = tipo === 'cessazione' ? 'TFR' : 'Miglioramento';
    scarica(
      pratiche.length === 1 ? `Lettera${nome}_${pratiche[0].dati.anagrafica.codiceFiscale}_${data}.docx` : nomeFileLetteraEnte(nome, ente.nome, data),
      blob,
    );
  };

  return (
    <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-5 text-sm" aria-label="Lettera per più dipendenti">
      <p className="text-slate-500">
        Lettera {tipo === 'cessazione' ? 'TFR' : 'del miglioramento contrattuale'} all'INPS per {ente.nome}: una riga per dipendente, nessun importo.
      </p>
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
        {voci.map(({riga, motivi}) => {
          const id = riga.pratica.id;
          const a = riga.pratica.dati.anagrafica;
          return (
            <li key={id} className="flex items-start gap-2 px-3 py-2">
              <input
                type="checkbox"
                id={`cumulativa-${id}`}
                className="mt-1"
                checked={!motivi.length && !tolte.has(id)}
                disabled={motivi.length > 0}
                onChange={() => alterna(id)}
              />
              <label htmlFor={`cumulativa-${id}`} className={motivi.length ? 'text-slate-400' : 'text-slate-800'}>
                <span className="font-medium">{a.nome || '(senza nome)'}</span> <span className="text-xs">{a.codiceFiscale}</span>
                {motivi.length > 0 && <span className="block text-xs text-red-700">Esclusa: {motivi.join(' ')}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      {dati.campi}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={`${etichetta} sm:col-span-3`}>
          Oggetto (non si salva)
          <textarea className={campo} rows={2} value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
        </label>
        <label className={etichetta}>
          Data della lettera
          <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        {serveDataPassweb && (
          <label className={etichetta}>
            Data di inserimento in PASSWEB
            <input className={campo} type="date" value={dataPassweb} onChange={(e) => setDataPassweb(e.target.value)} />
          </label>
        )}
      </div>
      <button className={pulsante} disabled={!scelte.length || !dati.valido || !data || (serveDataPassweb && !dataPassweb)} onClick={() => void genera()}>
        Genera la lettera ({scelte.length})
      </button>
    </div>
  );
}
