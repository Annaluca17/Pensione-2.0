// Modifiche ai dati della pratica dal fascicolo (ticket 14): funzioni pure su DatiPratica. Le voci si
// inseriscono a tempo pieno come base più eccezioni per mese (storie 16-17, D2, D4).
import type {Centesimi, DatiPratica, Forzature, MeseISO, PartTime} from '../motore';

type Anagrafica = DatiPratica['anagrafica'];

/** Cambia un campo dell'anagrafica; una data vuota toglie il campo. */
export function impostaAnagrafica<K extends keyof Anagrafica>(dati: DatiPratica, campo: K, valore: Anagrafica[K]): DatiPratica {
  const anagrafica = {...dati.anagrafica, [campo]: valore};
  if (valore === '' && (campo === 'assunzione' || campo === 'cessazione')) delete anagrafica[campo];
  return {...dati, anagrafica};
}

/** Valore base di una voce; `undefined` la toglie. */
export function impostaVoceBase(dati: DatiPratica, voce: string, importo: Centesimi | undefined): DatiPratica {
  const base = {...dati.voci.base, [voce]: importo};
  if (importo === undefined) delete base[voce];
  return {...dati, voci: {...dati.voci, base}};
}

/** Eccezione di una voce in un mese (sostituisce solo quella voce); `undefined` la toglie. */
export function impostaEccezioneVoce(dati: DatiPratica, mese: MeseISO, voce: string, importo: Centesimi | undefined): DatiPratica {
  const delMese = {...dati.voci.eccezioni[mese], [voce]: importo};
  if (importo === undefined) delete delMese[voce];
  const eccezioni = {...dati.voci.eccezioni, [mese]: delMese};
  if (Object.keys(delMese).length === 0) delete eccezioni[mese];
  return {...dati, voci: {...dati.voci, eccezioni}};
}

export function impostaPartTimeBase(dati: DatiPratica, partTime: PartTime): DatiPratica {
  return {...dati, partTime: {...dati.partTime, base: partTime}};
}

/** Eccezione di part-time di un mese; `undefined` la toglie. */
export function impostaEccezionePartTime(dati: DatiPratica, mese: MeseISO, partTime: PartTime | undefined): DatiPratica {
  const eccezioni = {...dati.partTime.eccezioni, [mese]: partTime};
  if (partTime === undefined) delete eccezioni[mese];
  return {...dati, partTime: {...dati.partTime, eccezioni}};
}

/** Forza giorni del mese parziale o date di riferimento (mai importi, storia 38); `undefined` toglie. */
export function impostaForzatura<K extends keyof Forzature>(dati: DatiPratica, chiave: K, valore: Forzature[K] | undefined): DatiPratica {
  const forzature = {...dati.forzature, [chiave]: valore};
  if (valore === undefined) delete forzature[chiave];
  return {...dati, forzature};
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
