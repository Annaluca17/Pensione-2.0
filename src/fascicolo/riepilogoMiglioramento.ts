// Il miglioramento in quattro valori (ticket 04): vecchia pensione, pensione in PASSWEB, nuovo miglioramento
// all'ultima decorrenza, TFS migliorato o dicitura TFR. Le decorrenze intermedie restano solo nel dettaglio
// del fascicolo. Condiviso da fascicolo e scheda PDF, così non divergono.
import type {Centesimi, DatiPraticaPensione, TfsMigliorato, UmMigliorato, UmPensione} from '../motore';

export const DICITURA_TFR = 'Miglioramento TFR: non va effettuato inserimento in PASSWEB, verificare la richiesta nel messaggio per INPS.';

export interface RiepilogoMiglioramento {
  vecchia: UmPensione;
  /** La pensione già inserita in PASSWEB e se coincide con la vecchia pensione calcolata. */
  passweb?: {fissi: Centesimi; tredicesima: Centesimi; uguale: boolean};
  /** L'UM all'ultima decorrenza del contratto. */
  nuovo: UmMigliorato;
  intermedi: UmMigliorato[];
  fineServizio: {regime: 'TFS'; tfs?: TfsMigliorato} | {regime: 'TFR'; dicitura: string};
}

export function riepilogoMiglioramento(
  m: {scenarioA: UmPensione; migliorati: UmMigliorato[]; tfs?: TfsMigliorato},
  dati: Pick<DatiPraticaPensione, 'regime' | 'pensioneErogata'>,
): RiepilogoMiglioramento {
  const vecchia = m.scenarioA;
  const e = dati.pensioneErogata;
  return {
    vecchia,
    ...(e && {passweb: {...e, uguale: e.fissi === vecchia.totaleAnnui && e.tredicesima === vecchia.tredicesima.composizione.arrotondato}}),
    nuovo: m.migliorati[m.migliorati.length - 1]!,
    intermedi: m.migliorati.slice(0, -1),
    fineServizio: dati.regime === 'TFS' ? {regime: 'TFS', ...(m.tfs && {tfs: m.tfs})} : {regime: 'TFR', dicitura: DICITURA_TFR},
  };
}
