// Slot della lettera (ticket 17 e 34, storie 71, 76-78): lettera TFR per la cessazione, lettera del
// miglioramento contrattuale per la pensione. I dati fissi si chiedono la prima volta e si salvano
// sull'ente; oggetto e date si modificano qui e non si salvano.
import {useState} from 'react';
import type {Pratica} from '../../archivio';
import {tabelle} from '../../tabelle';
import {campo, etichetta} from '../campi';
import {oggi, pulsante, scarica, useEnteLettera} from './enteLettera';
import {esitoLetteraMiglioramento, letteraMiglioramentoBlob, letteraTfrBlob, nomeFileLettera, oggettoPredefinito, oggettoPredefinitoMiglioramento} from './lettera';
import type {PropsUscita, Uscita} from './tipo';

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
      dipendenti: [{nome: a.nome, codiceFiscale: a.codiceFiscale, assunzione: a.assunzione, cessazione: a.cessazione}],
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
      dipendenti: [{nome: a.nome, codiceFiscale: a.codiceFiscale, cessazione: a.cessazione, regime: pratica.dati.regime}],
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
