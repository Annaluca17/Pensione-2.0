// Slot della scheda PDF (ticket 16): legge il Risultato, non ricalcola; se la scheda non si genera
// il pulsante è disabilitato e se ne spiega il motivo (storia 75).
import {costruisciScheda} from './scheda';
import {schedaPdf} from './schedaPdf';
import type {Uscita} from './tipo';

const oggi = () => {
  const d = new Date();
  return {
    iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    testo: d.toLocaleDateString('it-IT'),
  };
};

export const SlotScheda: Uscita = ({pratica, ente, risultato}) => {
  const esito = costruisciScheda(pratica, ente, risultato);
  return (
    <div className="text-sm">
      <p className="mb-2 text-slate-500">Promemoria interno di ciò che si digita in PASSWEB, con la versione delle tabelle.</p>
      <button
        className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={esito.stato !== 'pronta'}
        onClick={() => {
          if (esito.stato !== 'pronta') return;
          const {iso, testo} = oggi();
          schedaPdf(esito.scheda, testo).save(`Scheda_${pratica.dati.anagrafica.codiceFiscale || 'pratica'}_${iso}.pdf`);
        }}
      >
        Scarica la scheda PDF
      </button>
      {esito.stato === 'non-generabile' && (
        <ul className="mt-2 list-disc pl-5 text-red-700">
          {esito.motivi.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
