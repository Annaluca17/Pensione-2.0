// Slot della lettera (ticket 17, storie 71, 76-78): lettera TFR per la cessazione. I dati fissi si
// chiedono la prima volta e si salvano sull'ente; oggetto e data si modificano qui e non si salvano.
import {useState} from 'react';
import {tabelle} from '../../tabelle';
import {campo, etichetta} from '../campi';
import {letteraTfrBlob, nomeFileLettera, oggettoPredefinito} from './lettera';
import type {DatiEnteLettera} from './lettera';
import type {Uscita} from './tipo';

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

export const SlotLettera: Uscita = ({pratica, ente, aggiornaEnte}) => {
  const salvati: DatiEnteLettera = {nomeComune: ente.lettera?.nomeComune ?? '', sedeInps: ente.lettera?.sedeInps ?? '', luogo: ente.lettera?.luogo ?? ''};
  const completi = Boolean(salvati.nomeComune && salvati.sedeInps && salvati.luogo);
  const [modificaEnte, setModificaEnte] = useState(false);
  const [datiEnte, setDatiEnte] = useState<DatiEnteLettera>(salvati);
  const [oggetto, setOggetto] = useState(() => oggettoPredefinito(tabelle));
  const [data, setData] = useState(oggi);

  if (pratica.tipo !== 'cessazione') {
    return <p className="text-sm text-slate-500">La lettera del miglioramento contrattuale arriva col tratto 2.</p>;
  }
  const a = pratica.dati.anagrafica;
  const mancano = [!a.nome && 'nome', !a.codiceFiscale && 'codice fiscale', !a.assunzione && 'assunzione', !a.cessazione && 'cessazione'].filter(Boolean);
  const chiedeEnte = !completi || modificaEnte;
  const enteValido = Boolean(datiEnte.nomeComune.trim() && datiEnte.sedeInps.trim() && datiEnte.luogo.trim());

  const genera = async () => {
    const usati = chiedeEnte ? datiEnte : salvati;
    if (chiedeEnte) {
      aggiornaEnte({nomeComune: usati.nomeComune.trim(), sedeInps: usati.sedeInps.trim(), luogo: usati.luogo.trim()});
      setModificaEnte(false);
    }
    const blob = await letteraTfrBlob({
      ...usati,
      oggetto: oggetto.trim() || oggettoPredefinito(tabelle),
      data,
      dipendente: {nome: a.nome, codiceFiscale: a.codiceFiscale, assunzione: a.assunzione, cessazione: a.cessazione},
    });
    scarica(nomeFileLettera(a.codiceFiscale, data), blob);
  };

  return (
    <div className="space-y-2 text-sm">
      <p className="text-slate-500">Lettera TFR all'INPS: anagrafica e date, nessun importo.</p>
      {chiedeEnte ? (
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
          <button className="text-blue-700 hover:underline" onClick={() => setModificaEnte(true)}>
            Modifica
          </button>
        </p>
      )}
      <label className={etichetta}>
        Oggetto (non si salva)
        <textarea className={campo} rows={3} value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
      </label>
      <label className={etichetta}>
        Data della lettera
        <input className={campo} type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <button
        className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={mancano.length > 0 || (chiedeEnte && !enteValido) || !data}
        onClick={() => void genera()}
      >
        Genera la lettera
      </button>
      {mancano.length > 0 && <p className="text-red-700">Mancano nell'anagrafica: {mancano.join(', ')}.</p>}
    </div>
  );
};
