// Pezzi condivisi dalle lettere: quella del fascicolo (SlotLettera) e quella cumulativa della scrivania (ticket 10).
import {useState} from 'react';
import type {Ente} from '../../archivio';
import {campo, etichetta} from '../campi';
import type {DatiEnteLettera} from './lettera';

export const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function scarica(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {href: url, download: nome});
  a.click();
  URL.revokeObjectURL(url);
}

export const pulsante =
  'rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300';

/** I dati fissi dell'ente: chiesti la prima volta, poi riassunti con "Modifica". */
export function useEnteLettera(ente: Ente, aggiornaEnte: (lettera: NonNullable<Ente['lettera']>) => void) {
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
