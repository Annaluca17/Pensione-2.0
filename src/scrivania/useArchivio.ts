// L'archivio nel browser per l'interfaccia: carica all'avvio, ricarica quando un'altra scheda scrive,
// salva intero a ogni modifica (spec "Persistenza", ticket 10).
import {useCallback, useEffect, useRef, useState} from 'react';
import {ascolta, carica, salva, segnaModifica} from '../archivio';
import type {Archivio, EsitoLettura} from '../archivio';

export function useArchivio() {
  const [esito, setEsito] = useState<EsitoLettura>(() => carica(localStorage));
  const corrente = useRef(esito);
  corrente.current = esito;

  useEffect(
    () =>
      ascolta(window, (nuovo) => {
        corrente.current = nuovo;
        setEsito(nuovo);
      }),
    [],
  );

  const [persistenzaConcessa, setPersistenza] = useState(false);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistenza, () => setPersistenza(false));
  }, []);

  /** Scrive l'archivio; se il salvataggio è rifiutato, rilegge ciò che c'è. */
  const scrivi = useCallback((modifica: (archivio: Archivio) => Archivio) => {
    const prima = corrente.current;
    if (prima.stato !== 'valido') return;
    const archivio = modifica(prima.archivio);
    const nuovo: EsitoLettura = salva(localStorage, archivio).ok ? {...prima, archivio} : carica(localStorage);
    corrente.current = nuovo;
    setEsito(nuovo);
  }, []);

  /** Una modifica dell'operatore: segna anche da quando ci sono modifiche non esportate (storia 68). */
  const aggiorna = useCallback(
    (modifica: (archivio: Archivio) => Archivio) => scrivi((a) => segnaModifica(modifica(a), new Date().toISOString())),
    [scrivi],
  );

  /** Sostituisce l'archivio senza segnarlo come modificato (dopo un export, uno svuotamento). */
  const sostituisci = useCallback((archivio: Archivio) => scrivi(() => archivio), [scrivi]);

  return {esito, aggiorna, sostituisci, persistenzaConcessa};
}

/** Scarica un testo come file (copia grezza dell'archivio, pratiche scartate). */
export function scaricaTesto(nome: string, testo: string) {
  const url = URL.createObjectURL(new Blob([testo], {type: 'application/json'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: nome});
  a.click();
  URL.revokeObjectURL(url);
}
