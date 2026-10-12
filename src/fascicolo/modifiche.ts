// Modifiche ai dati della pratica dal fascicolo (ticket 14): funzioni pure su DatiPratica. Le voci si
// inseriscono a tempo pieno come base più eccezioni per mese (storie 16-17, D2, D4).
import type {
  Centesimi,
  DataISO,
  DatiPratica,
  DatiPraticaPensione,
  Forzature,
  MeseISO,
  PartTime,
  RegimeFineServizio,
  Situazione,
} from '../motore';

type Anagrafica = DatiPratica['anagrafica'];

/** Cambia un campo dell'anagrafica; una data vuota toglie il campo. */
export function impostaAnagrafica<D extends DatiPratica, K extends keyof Anagrafica>(dati: D, campo: K, valore: Anagrafica[K]): D {
  const anagrafica = {...dati.anagrafica, [campo]: valore};
  if (valore === '' && (campo === 'assunzione' || campo === 'cessazione')) delete anagrafica[campo];
  return {...dati, anagrafica};
}

/** Valore base di una voce; `undefined` la toglie. */
export function impostaVoceBase<D extends DatiPratica>(dati: D, voce: string, importo: Centesimi | undefined): D {
  const base = {...dati.voci.base, [voce]: importo};
  if (importo === undefined) delete base[voce];
  return {...dati, voci: {...dati.voci, base}};
}

/** Eccezione di una voce in un mese (sostituisce solo quella voce); `undefined` la toglie. */
export function impostaEccezioneVoce<D extends DatiPratica>(dati: D, mese: MeseISO, voce: string, importo: Centesimi | undefined): D {
  const delMese = {...dati.voci.eccezioni[mese], [voce]: importo};
  if (importo === undefined) delete delMese[voce];
  const eccezioni = {...dati.voci.eccezioni, [mese]: delMese};
  if (Object.keys(delMese).length === 0) delete eccezioni[mese];
  return {...dati, voci: {...dati.voci, eccezioni}};
}

export function impostaPartTimeBase<D extends DatiPratica>(dati: D, partTime: PartTime): D {
  return {...dati, partTime: {...dati.partTime, base: partTime}};
}

/** Eccezione di part-time di un mese; `undefined` la toglie. */
export function impostaEccezionePartTime<D extends DatiPratica>(dati: D, mese: MeseISO, partTime: PartTime | undefined): D {
  const eccezioni = {...dati.partTime.eccezioni, [mese]: partTime};
  if (partTime === undefined) delete eccezioni[mese];
  return {...dati, partTime: {...dati.partTime, eccezioni}};
}

/** Forza giorni del mese parziale o date di riferimento (mai importi, storia 38); `undefined` toglie. */
export function impostaForzatura<D extends DatiPratica, K extends keyof Forzature>(dati: D, chiave: K, valore: Forzature[K] | undefined): D {
  const forzature = {...dati.forzature, [chiave]: valore};
  if (valore === undefined) delete forzature[chiave];
  return {...dati, forzature};
}

/** Regime proposto dall'assunzione: TFR per gli assunti dal 01/01/2001 (DPCM 20/12/1999), altrimenti TFS. */
export const regimeProposto = (dati: DatiPratica): RegimeFineServizio =>
  dati.anagrafica.assunzione !== undefined && dati.anagrafica.assunzione >= '2001-01-01' ? 'TFR' : 'TFS';

/** Il regime segue l'assunzione finché l'operatore non lo sceglie (ticket 30); si applica a ogni modifica. */
export function allineaRegime(dati: DatiPraticaPensione): DatiPraticaPensione {
  if (dati.regimeScelto) return dati;
  const regime = regimeProposto(dati);
  return regime === dati.regime ? dati : {...dati, regime};
}

/** Il regime scelto dall'operatore resta fisso; `undefined` torna al proposto dall'assunzione. */
export function scegliRegime(dati: DatiPraticaPensione, regime: RegimeFineServizio | undefined): DatiPraticaPensione {
  if (regime) return {...dati, regime, regimeScelto: true};
  const {regimeScelto: _, ...proposto} = dati;
  return allineaRegime(proposto);
}

/**
 * Situazione del dipendente (D19, C20-1). Cambiando tipo il primo giorno già inserito resta; senza, `dal` è
 * vuoto e il motore blocca le sezioni (data non valida) finché l'operatore non lo inserisce (ticket 30).
 */
export function impostaSituazione(dati: DatiPraticaPensione, tipo: Situazione['tipo'], dal?: DataISO): DatiPraticaPensione {
  if (tipo === 'ordinaria') return {...dati, situazione: {tipo}};
  const prima = 'dal' in dati.situazione ? dati.situazione.dal : '';
  return {...dati, situazione: {tipo, dal: dal ?? prima}};
}

/** Totali della pensione erogata (storia 19): entrano solo se ci sono tutti e due, altrimenti la pratica non li ha. */
export function impostaPensioneErogata<D extends DatiPratica>(dati: D, totali: {fissi?: Centesimi; tredicesima?: Centesimi}): D {
  const {fissi, tredicesima} = totali;
  if (fissi !== undefined && tredicesima !== undefined) return {...dati, pensioneErogata: {fissi, tredicesima}};
  const {pensioneErogata: _, ...senza} = dati;
  return senza as D;
}

/** "1.234,56" o "1234.56" o "1234" → centesimi; `undefined` se vuoto, `null` se non è un importo. */
export function leggiEuro(testo: string): Centesimi | undefined | null {
  const pulito = testo.trim().replace(/\s|€/g, '');
  if (pulito === '') return undefined;
  const normale = /,/.test(pulito) ? pulito.replace(/\./g, '').replace(',', '.') : pulito;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normale)) return null;
  const [intero, decimali = ''] = normale.replace('-', '').split('.');
  const centesimi = Number(intero) * 100 + Number(decimali.padEnd(2, '0'));
  return normale.startsWith('-') ? -centesimi : centesimi;
}

/** Centesimi → "1.234,56". */
export function scriviEuro(centesimi: Centesimi): string {
  const segno = centesimi < 0 ? '-' : '';
  const assoluto = Math.abs(Math.round(centesimi));
  const intero = String(Math.floor(assoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${segno}${intero},${String(assoluto % 100).padStart(2, '0')}`;
}
