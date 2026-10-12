// Slot della lettera (ticket 17 e 34, storie 71, 76-78): lettera TFR per la cessazione, lettera del
// miglioramento contrattuale per la pensione. I dati fissi si chiedono la prima volta e si salvano
// sull'ente; oggetto e date si modificano qui e non si salvano.
import {useState} from 'react';
import type {Ente, Pratica} from '../../archivio';
import {tabelle} from '../../tabelle';
import {campo, etichetta} from '../campi';
import {esitoLetteraMiglioramento, letteraMiglioramentoBlob, letteraTfrBlob, nomeFileLettera, oggettoPredefinito, oggettoPredefinitoMiglioramento} from './lettera';
import type {DatiEnteLettera} from './lettera';
import type {PropsUscita, Uscita} from './tipo';

const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function scarica(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href: url, download: nome});
  a.click();
  URL.revokeObjectURL(url);
}

const pulsante =
  'rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';

/** I dati fissi dell'ente: chiesti la prima volta, poi riassunti con "Modifica". */
function useEnteLettera(ente: Ente, aggiornaEnte: PropsUscita['aggiornaEnte']) {
  const salvati: DatiEnteLettera = {nomeComune: ente.lettera?.nomeComune ?? '', sedeInps: ente.lettera?.sedeInps ?? '', luogo: ente.lettera?.luogo ?? ''};
  const completi = Boolean(salvati.nomeComune && salvati.sedeInps && salvati.luogo);
  const [modifica, setModifica] = useState(false);
  const [datiEnte, setDatiEnte] = useState<DatiEnteLettera>(salvati);
  const chiede = !completi || modifica;
  return {
    valido: !chiede || Boolean(datiEnte.nomeComune.trim() && datiEnte.sedeInps.trim() && datiEnte.luogo.trim()),
    /** I dati da usare nella lettera; se erano da chiedere li salva sull'ente. */
    usa(): DatiEnteLettera {
      if (!chiede) return salvati;
      const usati = {nomeComune: datiEnte.nomeComune.trim(), sedeInps: datiEnte.sedeInps.trim(), luogo: datiEnte.luogo.trim()};
      aggiornaEnte(usati);
      setModifica(false);
      return usati;
    },
    campi: chiede ? (
      <fieldset className="space-y-2 rounded-md border border-slate-200 p-2">
        <legend className="px-1 text-xs text-slate-500">Dati dell'ente, si salvano per le prossime lettere</legend>
        {(
          [
            ['nomeComune', 'Nome del Comune'],
            ['sedeInps', 'Sede provinciale INPS'],
            ['luogo', 'Luogo'],
          ] as const
        ).map(([chiave, nome]) => (
          <label key={chiave} className={etichetta}>
            {nome}
            <input className={campo} value={datiEnte[chiave]} onChange={(e) => setDatiEnte({...datiEnte, [chiave]: e.target.value})} />
          </label>
        ))}
      </fieldset>
    ) : (
      <p className="text-slate-600">
        Comune di {salvati.nomeComune} · INPS di {salvati.sedeInps} · {salvati.luogo}{' '}
        <button className="text-blue-700 hover:underline" onClick={() => setModifica(true)}>
          Modifica
        </button>
      </p>
    ),
  };
}

type PropsTipo<T extends Pratica['tipo']> = PropsUscita & {pratica: Extract<Pratica, {tipo: T}>};

function LetteraTfr({pratica, ente, aggiornaEnte}: PropsTipo<'cessazione'>) {
  const dati = useEnteLettera(ente, aggiornaEnte);
  const [oggetto, setOggetto] = useState(() => oggettoPredefinito(tabelle));
  const [data, setData] = useState(oggi);
  const a = pratica.dati.anagrafica;
  const mancano = [!a.nome && 'nome', !a.codiceFiscale && 'codice fiscale', !a.assunzione && 'assunzione', !a.cessazione && 'cessazione'].filter(Boolean);

  const genera = async () => {
    const blob = await letteraTfrBlob({
      ...dati.usa(),
      oggetto: oggetto.trim() || oggettoPredefinito(tabelle),
      data,
      dipendente: {nome: a.nome, codiceFiscale: a.codiceFiscale, assunzione: a.assunzione, cessazione: a.cessazione},
    });
    scarica(nomeFileLettera('TFR', a.codiceFiscale, data), blob);
  };

  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-500">Lettera TFR all'INPS: anagrafica e date, nessun importo.</p>
      {dati.campi}
      <label className={etichetta}>
        Oggetto (non si salva)
        <textarea className={campo} rows={3} value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
      </label>
      <label className={etichetta}>
        Data della lettera
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <button className={pulsante} disabled={mancano.length > 0 || !dati.valido || !data} onClick={() => void genera()}>
        Genera la lettera
      </button>
      {mancano.length > 0 && <p className="text-red-700">Mancano nell'anagrafica: {mancano.join(', ')}.</p>}
    </div>
  );
}

function LetteraMiglioramento({pratica, ente, risultato, aggiornaEnte}: PropsTipo<'pensione'>) {
  const dati = useEnteLettera(ente, aggiornaEnte);
  const [oggetto, setOggetto] = useState(() => oggettoPredefinitoMiglioramento(tabelle));
  const [data, setData] = useState(oggi);
  const [dataPassweb, setDataPassweb] = useState('');
  const esito = esitoLetteraMiglioramento(pratica, risultato);
  const a = pratica.dati.anagrafica;
  const mancano = [!a.nome && 'nome', !a.codiceFiscale && 'codice fiscale', !a.cessazione && 'cessazione'].filter(Boolean);

  if (esito.stato === 'non-generabile') {
    return (
      <div className="space-y-1 text-sm">
        <p className="text-slate-500">La lettera del miglioramento contrattuale non si genera:</p>
        <ul className="list-disc pl-5 text-slate-600">
          {esito.motivi.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    );
  }

  const genera = async () => {
    const blob = await letteraMiglioramentoBlob({
      ...dati.usa(),
      oggetto: oggetto.trim() || oggettoPredefinitoMiglioramento(tabelle),
      data,
      dataPassweb,
      riferimentoNormativo: tabelle.lettere.miglioramento.riferimentoNormativo,
      regime: pratica.dati.regime,
      dipendente: {nome: a.nome, codiceFiscale: a.codiceFiscale, cessazione: a.cessazione},
    });
    scarica(nomeFileLettera('Miglioramento', a.codiceFiscale, data), blob);
  };

  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-500">Lettera del miglioramento contrattuale all'INPS: anagrafica e date, nessun importo.</p>
      {dati.campi}
      <label className={etichetta}>
        Oggetto (non si salva)
        <textarea className={campo} rows={3} value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
      </label>
      <label className={etichetta}>
        Data della lettera
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <label className={etichetta}>
        Data di inserimento in PASSWEB
        <input className={campo} type="date" value={dataPassweb} onChange={(e) => setDataPassweb(e.target.value)} />
      </label>
      <button className={pulsante} disabled={mancano.length > 0 || !dati.valido || !data || !dataPassweb} onClick={() => void genera()}>
        Genera la lettera
      </button>
      {mancano.length > 0 && <p className="text-red-700">Mancano nell'anagrafica: {mancano.join(', ')}.</p>}
    </div>
  );
}

export const SlotLettera: Uscita = (props) =>
  props.pratica.tipo === 'cessazione' ? (
    <LetteraTfr {...props} pratica={props.pratica} />
  ) : (
    <LetteraMiglioramento {...props} pratica={props.pratica} />
  );
