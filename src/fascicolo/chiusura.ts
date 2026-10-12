// Chiusura di una sezione e "da rilavorare" (ADR 0004, ticket 15, storie 7, 10, 59-60): chiudere
// congela il risultato con l'id della versione delle tabelle; il ricalcolo si confronta, non sostituisce.
import type {Pratica} from '../archivio';
import {calcolaPratica, confronta} from '../motore';
import type {Confronto, Congelato, NomeSezione, Tabelle} from '../motore';

/** Chiude una sezione calcolata: ne congela il risultato coi dati di adesso. */
export function chiudiSezione<P extends Pratica>(pratica: P, sezione: NomeSezione, tabelle: Tabelle, adesso: string): P {
  const risultato = calcolaPratica(pratica.dati, tabelle);
  const calcolata = risultato.sezioni[sezione];
  if (calcolata?.esito !== 'calcolata') throw new Error(`chiudiSezione: la sezione ${sezione} è bloccata`);
  if (calcolata.esito === 'calcolata' && 'stato' in calcolata && calcolata.stato === 'ipotesi') throw new Error(`chiudiSezione: il contratto ${calcolata.contratto} è un'ipotesi, senza importi`);
  const congelato = {sezione, versioneTabelle: risultato.versioneTabelle, dati: pratica.dati, risultato: calcolata} as Congelato;
  return {...pratica, congelati: [...pratica.congelati.filter((c) => c.sezione !== sezione), congelato], modificata: adesso};
}

/** Riapre una sezione chiusa: torna calcolata, i dati della pratica restano. */
export const riapriSezione = <P extends Pratica>(pratica: P, sezione: NomeSezione, adesso: string): P => ({
  ...pratica,
  congelati: pratica.congelati.filter((c) => c.sezione !== sezione),
  modificata: adesso,
});

export interface Chiusura {
  congelato: Congelato;
  confronto: Confronto;
  daRilavorare: boolean;
}

/** Per ogni sezione chiusa, il confronto col ricalcolo di oggi. */
export function chiusure(pratica: Pratica, tabelle: Tabelle): Partial<Record<NomeSezione, Chiusura>> {
  return Object.fromEntries(
    pratica.congelati.map((congelato) => {
      const confronto = confronta(congelato, {dati: pratica.dati, tabelle});
      return [congelato.sezione, {congelato, confronto, daRilavorare: confronto.differenze.length > 0}];
    }),
  );
}

/** La causa in breve, per la scrivania: i motivi delle versioni nuove e/o "dati modificati". */
export function causaInBreve(pratica: Pratica, tabelle: Tabelle): string | undefined {
  const cause = new Set<string>();
  for (const chiusura of Object.values(chiusure(pratica, tabelle))) {
    for (const d of chiusura?.confronto.differenze ?? []) {
      for (const c of d.cause) {
        if (c.tipo === 'dati') cause.add('dati modificati dopo la chiusura');
        else for (const v of c.versioni) cause.add(v.motivo);
      }
    }
  }
  return cause.size > 0 ? [...cause].join('; ') : undefined;
}

