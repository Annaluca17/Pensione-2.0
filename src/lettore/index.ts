// Punto d'ingresso del lettore: pagine già estratte → Proposta per ogni dipendente (CF).
import {halley} from './halley';
import {inMesi} from './mesi';
import {costruisciProposta, nomeMese} from './proposta';
import type {CedolinoMensile, Gestionale, OpzioniLettura, PaginaPdf, Proposta} from './tipi';

export type {Gestionale, OpzioniLettura, PaginaPdf, Proposta} from './tipi';
export {applicaProposta} from './applica';
export type {Applicazione} from './applica';
export {scegliProposta} from './scegli';
export type {Scelta} from './scegli';

const progressivo = (c: CedolinoMensile) => c.anno * 12 + c.mese;

export function leggiProposte(
  pagine: PaginaPdf[],
  opzioni: OpzioniLettura = {},
  gestionale: Gestionale = halley,
): Proposta[] {
  const letti = pagine
    .map(p => gestionale.lettori.map(l => l(p)).find(Boolean))
    .flatMap(l => (l ? inMesi(l) : []));

  const perCf = new Map<string, CedolinoMensile[]>();
  for (const c of letti) perCf.set(c.cf, [...(perCf.get(c.cf) ?? []), c]);

  return [...perCf.entries()].map(([cf, daiPdf]) => {
    const avvisi: string[] = [];

    const straordinarie = daiPdf.filter(c => c.straordinaria).length;
    if (straordinarie) {
      avvisi.push(`${straordinarie} ${straordinarie === 1 ? 'cedolino' : 'cedolini'} di elaborazioni supplementari `
        + `(arretrati, determine) senza voci di testata: ${straordinarie === 1 ? 'non usato' : 'non usati'}.`);
    }

    // A parità di mese vale l'ultimo file; avviso se gli importi cambiano.
    const mesi = new Map<number, CedolinoMensile>();
    for (const c of daiPdf.filter(c => !c.straordinaria)) {
      const prec = mesi.get(progressivo(c));
      if (prec && JSON.stringify(prec.voci) !== JSON.stringify(c.voci)) {
        avvisi.push(`${nomeMese(c)}: cedolino caricato due volte con importi diversi; tenuto quello dell'ultimo file.`);
      }
      mesi.set(progressivo(c), c);
    }
    const ord = [...mesi.values()].sort((a, b) => progressivo(a) - progressivo(b));
    return costruisciProposta(cf, ord, gestionale, opzioni, avvisi);
  });
}
