// Una lettura (cedolino mensile o riepilogo annuo) come elenco di cedolini mensili.
import type {CedolinoMensile, Lettura} from './tipi';

/** Un riepilogo annuo vale un cedolino per ogni mese in cui ha almeno una voce. */
export function inMesi(l: Lettura): CedolinoMensile[] {
  if (l.formato === 'cedolino') return [l];
  const mesi: CedolinoMensile[] = [];
  for (let mese = 0; mese < 12; mese++) {
    const voci = l.voci.flatMap(v => (v.mesi[mese] == null ? [] : [{etichetta: v.etichetta, importo: v.mesi[mese]!}]));
    if (!voci.length) continue;
    mesi.push({
      formato: 'cedolino', anno: l.anno, mese, nome: l.nome, cf: l.cf, straordinaria: false, voci,
      assunzione: l.assunzione, cessazione: l.cessazione, posizione: l.posizione, partTime: l.partTime[mese],
    });
  }
  return mesi;
}
