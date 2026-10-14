// "Applica" la Proposta a una pratica (D7): sostituisce voci e % part-time, l'anagrafica solo nei campi vuoti.
import type {DatiPratica, MeseISO, PartTime} from '../motore';
import type {Proposta} from './tipi';

export interface Applicazione<D extends DatiPratica = DatiPratica> {
  dati: D;
  avvisi: string[];
}

type Anagrafica = DatiPratica['anagrafica'];

const CAMPI: Array<[keyof Anagrafica, string]> = [
  ['nome', 'Nome'],
  ['codiceFiscale', 'Codice fiscale'],
  ['posizione', 'Posizione'],
  ['assunzione', 'Assunzione'],
  ['cessazione', 'Cessazione'],
];

/** La % viene dalla Proposta; il tipo O/V/M anche se il cedolino lo porta ("50,00-O"), altrimenti resta quello della pratica. */
function partTime(prima: DatiPratica['partTime'], dalProposta: DatiPratica['partTime']): DatiPratica['partTime'] {
  const conTipo = (p: PartTime, tipo: PartTime['tipo']): PartTime => (p.tipo || !tipo ? p : {...p, tipo});
  const eccezioni: Record<MeseISO, PartTime> = {};
  for (const [mese, p] of Object.entries(dalProposta.eccezioni)) {
    eccezioni[mese] = conTipo(p, prima.eccezioni[mese]?.tipo);
  }
  return {base: conTipo(dalProposta.base, prima.base.tipo), eccezioni};
}

/** Riempie solo i campi vuoti; un campo pieno e diverso resta com'è e produce un avviso. */
function anagrafica(pratica: Anagrafica, letta: Proposta['dati']['anagrafica']): {anagrafica: Anagrafica; avvisi: string[]} {
  const risultato: Anagrafica = {...pratica};
  const avvisi: string[] = [];
  for (const [campo, nome] of CAMPI) {
    const attuale = pratica[campo]?.trim() ?? '';
    const nuovo = letta[campo]?.trim() ?? '';
    if (!nuovo) continue;
    if (!attuale) risultato[campo] = nuovo;
    else if (attuale !== nuovo) avvisi.push(`${nome}: nella pratica c'è ${attuale}, nei PDF ${nuovo}; tenuto ${attuale}.`);
  }
  return {anagrafica: risultato, avvisi};
}

const codici = (voci: DatiPratica['voci']) =>
  new Set([...Object.keys(voci.base), ...Object.values(voci.eccezioni).flatMap(v => Object.keys(v ?? {}))]);

/** Codici delle voci che la pratica ha e la Proposta no: l'Applica le toglie. */
function vociTolte(prima: DatiPratica['voci'], dopo: DatiPratica['voci']): string[] {
  const rimaste = codici(dopo);
  return [...codici(prima)].filter(c => !rimaste.has(c)).sort();
}

export function applicaProposta<D extends DatiPratica>(dati: D, proposta: Proposta): Applicazione<D> {
  const a = anagrafica(dati.anagrafica, proposta.dati.anagrafica);
  const tolte = vociTolte(dati.voci, proposta.dati.voci);
  const avvisiVoci = tolte.length ? [`Voci della pratica non presenti nei PDF e tolte: ${tolte.join(', ')}.`] : [];
  return {
    dati: {...dati, anagrafica: a.anagrafica, voci: proposta.dati.voci, partTime: partTime(dati.partTime, proposta.dati.partTime)},
    avvisi: [...a.avvisi, ...avvisiVoci],
  };
}
