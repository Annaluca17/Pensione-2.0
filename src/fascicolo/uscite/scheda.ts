// Contenuto della scheda PDF (ticket 16, storie 72-75): dal Risultato, senza ricalcolare. Un blocco per
// sezione presente (pronto per la pensione, ticket 33), righe PASSWEB già arrotondate, niente
// composizione; riquadro forzature e avvisi solo se presenti; id della versione delle tabelle nel piede.
import type {Ente, Pratica} from '../../archivio';
import {spiega} from '../../motore';
import type {Avviso, Blocco, ChiaveForzatura, Risultato} from '../../motore';
import {scriviEuro} from '../modifiche';

export interface BloccoScheda {
  titolo: string;
  /** Campo e valore come nella maschera; assente se la sezione è bloccata. */
  righe?: [string, string][];
  /** Motivi del blocco, in italiano. */
  motivi?: string[];
}

export interface Scheda {
  titolo: string;
  intestazione: [string, string][];
  blocchi: BloccoScheda[];
  forzature: {campo: string; proposto: string; usato: string; forzato: string}[];
  avvisi: string[];
  versioneTabelle: string;
}

export type EsitoScheda = {stato: 'pronta'; scheda: Scheda} | {stato: 'non-generabile'; motivi: string[]};

/** Avvisi che cambiano ciò che si digita in PASSWEB (decisione del ticket 16). */
const AVVISI_DA_STAMPARE: Avviso['codice'][] = ['ivc-incompatibile', 'soglia-quindici-giorni-altra-regola', 'mese-iniziale-fuori-finestra'];

const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const nomeForzatura: Record<ChiaveForzatura, string> = {
  giorniMeseParziale: 'Giorni del mese parziale',
  dataRiferimentoPensione: 'Data di riferimento della pensione',
  dataRiferimentoFineServizio: 'Data di riferimento di TFS/TFR',
};
const valoreForzatura = (v: number | string) => (typeof v === 'number' ? String(v) : data(v));
const ESTREMO = {iniziale: 'mese di assunzione', finale: 'mese di cessazione'} as const;

function bloccoTfr(risultato: Risultato): BloccoScheda {
  const tfr = risultato.sezioni.tfr;
  const titolo = 'Ultimo miglio TFR';
  if (tfr.esito === 'bloccata') return {titolo, motivi: tfr.motivi.map((m: Blocco) => spiega(m))};
  const righe: [string, string][] = [
    ['Decorrenza giuridica', data(tfr.decorrenzaGiuridica)],
    ['Decorrenza economica', data(tfr.decorrenzaEconomica)],
    ['Data di cessazione', data(tfr.dataCessazione)],
  ];
  for (const estremo of ['iniziale', 'finale'] as const) {
    const e = estremo === 'iniziale' ? tfr.meseIniziale : tfr.meseFinale;
    if (e.pagamentoTredicesima) {
      righe.push([
        `Rateo di 13ª pagato (${ESTREMO[estremo]})`,
        `${e.pagamentoTredicesima === 'dicembre' ? 'a dicembre' : 'nel mese di cessazione'}, misura "Parziale"`,
      ]);
    }
    for (const r of tfr.righe.filter((x) => x.estremo === estremo)) {
      righe.push([`${r.etichetta} (${ESTREMO[estremo]})`, `${scriviEuro(r.composizione.arrotondato)} €`]);
    }
  }
  if (tfr.righe.length === 0) righe.push(['Dati retributivi', 'nessuno: mesi di assunzione e di cessazione senza dati da inserire']);
  return {titolo, righe};
}

/** La scheda di una pratica, o perché non si genera. */
export function costruisciScheda(pratica: Pratica, ente: Ente, risultato: Risultato): EsitoScheda {
  const blocchi = pratica.tipo === 'cessazione' ? [bloccoTfr(risultato)] : [];
  if (blocchi.length === 0 || blocchi.every((b) => b.motivi)) {
    const motivi = blocchi.flatMap((b) => b.motivi ?? []);
    return {stato: 'non-generabile', motivi: motivi.length > 0 ? motivi : ['Nessuna sezione calcolata da stampare.']};
  }
  const a = pratica.dati.anagrafica;
  return {
    stato: 'pronta',
    scheda: {
      titolo: pratica.tipo === 'cessazione' ? 'Scheda della pratica di cessazione' : 'Scheda della pratica di pensione',
      intestazione: [
        ['Dipendente', a.nome],
        ['Codice fiscale', a.codiceFiscale],
        ['Ente', ente.nome],
        ['Posizione economica', a.posizione || '—'],
      ],
      blocchi,
      forzature: risultato.forzature.map((f) => ({
        campo: nomeForzatura[f.chiave],
        proposto: valoreForzatura(f.proposto),
        usato: valoreForzatura(f.forzato),
        forzato: valoreForzatura(f.forzato),
      })),
      avvisi: risultato.avvisi.filter((x) => AVVISI_DA_STAMPARE.includes(x.codice)).map((x) => spiega(x)),
      versioneTabelle: risultato.versioneTabelle,
    },
  };
}
