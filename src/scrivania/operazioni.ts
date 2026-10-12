// Operazioni della scrivania sull'archivio (ticket 12, storie 1-5, 8-9): funzioni pure, l'interfaccia
// le chiama e salva il risultato. Id e istante arrivano da fuori (crypto.randomUUID, new Date).
import type {Archivio, Ente, Pratica} from '../archivio';
import type {DataISO, DatiPratica, NomeSezione} from '../motore';
import {regimeProposto} from '../fascicolo/modifiche';

export type TipoPratica = Pratica['tipo'];

export function aggiungiEnte(archivio: Archivio, nome: string, id: string): {archivio: Archivio; ente: Ente} {
  const ente: Ente = {id, nome: nome.trim()};
  return {archivio: {...archivio, enti: [...archivio.enti, ente]}, ente};
}

export interface NuovaPratica {
  enteId: string;
  tipo: TipoPratica;
  nome: string;
  codiceFiscale: string;
  cessazione?: DataISO;
}

/** Una pratica nuova: solo anagrafica minima, il resto si compila nel fascicolo. */
export function aggiungiPratica(archivio: Archivio, nuova: NuovaPratica, id: string, adesso: string): {archivio: Archivio; pratica: Pratica} {
  if (!archivio.enti.some((e) => e.id === nuova.enteId)) throw new Error(`aggiungiPratica: l'ente ${nuova.enteId} non esiste`);
  const dati: DatiPratica = {
    anagrafica: {
      nome: nuova.nome.trim(),
      codiceFiscale: nuova.codiceFiscale.trim().toUpperCase(),
      posizione: '',
      ...(nuova.cessazione && {cessazione: nuova.cessazione}),
    },
    voci: {base: {}, eccezioni: {}},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    // R5: preimpostato a sì, l'operatore lo toglie se il dipendente non è iscritto.
    iscrittoCredito: true,
  };
  const comune = {id, enteId: nuova.enteId, congelati: [], creata: adesso, modificata: adesso};
  // Pensione (ticket 30): regime proposto dall'assunzione (che ancora non c'è), situazione ordinaria.
  const pratica: Pratica =
    nuova.tipo === 'pensione'
      ? {...comune, tipo: 'pensione', dati: {...dati, regime: regimeProposto(dati), situazione: {tipo: 'ordinaria'}}}
      : {...comune, tipo: 'cessazione', dati};
  return {archivio: {...archivio, pratiche: [...archivio.pratiche, pratica]}, pratica};
}

export const eliminaPratica = (archivio: Archivio, id: string): Archivio => ({
  ...archivio,
  pratiche: archivio.pratiche.filter((p) => p.id !== id),
});

/** Cancella l'ente e le sue pratiche: nessuna pratica resta orfana. */
export const eliminaEnte = (archivio: Archivio, id: string): Archivio => ({
  ...archivio,
  enti: archivio.enti.filter((e) => e.id !== id),
  pratiche: archivio.pratiche.filter((p) => p.enteId !== id),
});

/** Sezioni che chiudono una pratica: per la pensione l'UM e la sezione del regime (ADR 0002, ticket 30). */
export const sezioniPertinenti = (pratica: Pratica): NomeSezione[] =>
  pratica.tipo === 'cessazione' ? ['tfr'] : ['umPensione', pratica.dati.regime === 'TFS' ? 'tfs' : 'tfr'];

/**
 * Aperta (decisione del ticket 10: lo stato si ricava) = almeno una sezione pertinente non chiusa; `daRilavorare` la riapre (lo calcola chi ha motore e tabelle).
 */
export function aperta(pratica: Pratica, daRilavorare = false): boolean {
  const sezioni = sezioniPertinenti(pratica);
  if (daRilavorare) return true;
  return sezioni.some((s) => !pratica.congelati.some((c) => c.sezione === s));
}

export interface Filtri {
  soloAperte: boolean;
  tipo: TipoPratica | 'tutti';
  enteId: string | 'tutti';
}

export interface RigaScrivania {
  pratica: Pratica;
  ente: Ente;
  aperta: boolean;
  /** Cessazione da oggi ai prossimi `GIORNI_SCADENZA` giorni (decisione del ticket 12). */
  scadenzaVicina: boolean;
}

export const GIORNI_SCADENZA = 30;

const giorno = (d: DataISO) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / 86_400_000;

/** Le pratiche di tutti gli enti, filtrate e ordinate per data di cessazione (senza data in fondo). */
export function elencoScrivania(
  archivio: Archivio,
  filtri: Filtri,
  oggi: DataISO,
  daRilavorare: (p: Pratica) => boolean = () => false,
): RigaScrivania[] {
  const enti = new Map(archivio.enti.map((e) => [e.id, e]));
  return archivio.pratiche
    .map((pratica) => {
      const cessazione = pratica.dati.anagrafica.cessazione;
      const mancano = cessazione ? giorno(cessazione) - giorno(oggi) : undefined;
      return {
        pratica,
        ente: enti.get(pratica.enteId)!,
        aperta: aperta(pratica, daRilavorare(pratica)),
        scadenzaVicina: mancano !== undefined && mancano >= 0 && mancano <= GIORNI_SCADENZA,
      };
    })
    .filter((r) => r.ente)
    .filter((r) => !filtri.soloAperte || r.aperta)
    .filter((r) => filtri.tipo === 'tutti' || r.pratica.tipo === filtri.tipo)
    .filter((r) => filtri.enteId === 'tutti' || r.pratica.enteId === filtri.enteId)
    .sort((a, b) => {
      const [ca, cb] = [a.pratica.dati.anagrafica.cessazione, b.pratica.dati.anagrafica.cessazione];
      if (ca === cb) return a.pratica.dati.anagrafica.nome.localeCompare(b.pratica.dati.anagrafica.nome);
      if (!ca) return 1;
      if (!cb) return -1;
      return ca.localeCompare(cb);
    });
}
