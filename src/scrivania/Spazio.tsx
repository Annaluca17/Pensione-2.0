// Lo spazio nuovo (ticket 12): registra qui le rotte della scrivania e del fascicolo, così che i
// ticket successivi riempiano le viste senza toccare l'App. Un solo archivio per entrambe.
import {useState} from 'react';
import {useArchivio, scaricaTesto} from './useArchivio';
import {Fascicolo} from './Fascicolo';
import {Scrivania} from './Scrivania';

export type Rotta = {vista: 'scrivania'} | {vista: 'fascicolo'; praticaId: string};

export function Spazio() {
  const {esito, aggiorna, sostituisci, persistenzaConcessa} = useArchivio();
  const [rotta, setRotta] = useState<Rotta>({vista: 'scrivania'});

  if (esito.stato !== 'valido') {
    // Archivio non valido o di una versione futura: mai sovrascritto, scrivania bloccata (spec "Persistenza").
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16 sm:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-900">L'archivio nel browser non si può aprire</h1>
          <p className="mt-2 text-sm text-red-800">
            {esito.stato === 'versione-futura'
              ? `È stato scritto da una versione più nuova del sito (schema ${esito.versione}).`
              : `Non supera la validazione: ${esito.motivo.slice(0, 300)}`}{' '}
            Il sito non lo sovrascrive: scarica la copia grezza e conservala.
          </p>
          <button
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            onClick={() => scaricaTesto('archivio-grezzo.json', esito.grezzo)}
          >
            Scarica la copia grezza
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {esito.scartate.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-8" role="status">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {esito.scartate.length === 1 ? 'Una pratica malformata è stata scartata' : `${esito.scartate.length} pratiche malformate sono state scartate`}.{' '}
            <button className="underline" onClick={() => scaricaTesto('pratiche-scartate.json', JSON.stringify(esito.scartate, null, 2))}>
              Scarica le scartate
            </button>
          </div>
        </div>
      )}
      {rotta.vista === 'fascicolo' ? (
        <Fascicolo archivio={esito.archivio} praticaId={rotta.praticaId} onEsci={() => setRotta({vista: 'scrivania'})} />
      ) : (
        <Scrivania
          archivio={esito.archivio}
          aggiorna={aggiorna}
          sostituisci={sostituisci}
          persistenzaConcessa={persistenzaConcessa}
          onApri={(praticaId) => setRotta({vista: 'fascicolo', praticaId})}
        />
      )}
    </>
  );
}
