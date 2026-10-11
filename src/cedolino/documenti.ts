/**
 * Punto d'ingresso del lettore: riconosce il formato di ogni pagina e
 * restituisce riepiloghi annuali per dipendente, qualunque sia la fonte.
 *
 * Formati gestiti (Halley):
 *  - Riepilogo generale dipendente — VOCI DI TESTATA (12 mesi per pagina);
 *  - cedolino mensile (un mese per pagina): i cedolini dello stesso dipendente
 *    e dello stesso anno diventano un riepilogo annuale.
 * Per un nuovo gestionale basta un altro lettore di pagina che produca
 * CedolinoMensile o RiepilogoAnnuo.
 */

import { leggiCedolinoHalley } from './leggiCedolinoHalley';
import { leggiPagina } from './leggiRiepilogo';
import type { CedolinoMensile, PaginaPdf, RiepilogoAnnuo } from './tipi';

const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                   'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export interface Lettura {
  riepiloghi: RiepilogoAnnuo[];
  /** Pagine riconosciute, per formato. */
  pagine: { riepilogo: number; cedolino: number; straordinarie: number; altre: number };
  avvisi: string[];
}

const stessiImporti = (a: CedolinoMensile, b: CedolinoMensile) =>
  JSON.stringify(a.voci) === JSON.stringify(b.voci);

/** Raggruppa i cedolini per dipendente e anno; a parità di mese vale l'ultimo letto. */
export function cedoliniInRiepiloghi(cedolini: CedolinoMensile[], avvisi: string[] = []): RiepilogoAnnuo[] {
  const perChiave = new Map<string, Map<number, CedolinoMensile>>();
  const doppi = new Map<string, number>();   // "mese anno" → dipendenti con importi diversi
  for (const c of cedolini) {
    const k = `${c.cf}|${c.anno}`;
    const mesi = perChiave.get(k) ?? new Map<number, CedolinoMensile>();
    const prec = mesi.get(c.mese);
    if (prec && !stessiImporti(prec, c)) {
      const m = `${NOMI_MESI[c.mese]} ${c.anno}`;
      doppi.set(m, (doppi.get(m) ?? 0) + 1);
    }
    mesi.set(c.mese, c);
    perChiave.set(k, mesi);
  }
  for (const [m, n] of doppi) {
    avvisi.push(`${m}: cedolino caricato due volte con importi diversi (${n} dipendent${n === 1 ? 'e' : 'i'}); `
      + 'tenuto quello dell\'ultimo file.');
  }

  return [...perChiave.values()].map(mesi => {
    const ord = [...mesi.values()].sort((a, b) => a.mese - b.mese);
    const ultimo = ord[ord.length - 1];
    const etichette = [...new Set(ord.flatMap(c => c.voci.map(v => v.etichetta)))];
    const piuRecente = (k: 'assunzione' | 'cessazione' | 'posizione' | 'partTime') =>
      [...ord].reverse().map(c => c[k]).find(Boolean) ?? '';
    return {
      anno: ultimo.anno,
      nome: ultimo.nome,
      cf: ultimo.cf,
      matricola: ultimo.matricola,
      voci: etichette.map(etichetta => {
        const valori: (number | null)[] = Array(12).fill(null);
        for (const c of ord) {
          const v = c.voci.filter(v => v.etichetta === etichetta);
          if (v.length) valori[c.mese] = v[0].importo;
        }
        return { etichetta, mesi: valori };
      }),
      assunzione: piuRecente('assunzione'),
      cessazione: piuRecente('cessazione'),
      posizione: piuRecente('posizione'),
      partTime: piuRecente('partTime'),
    };
  });
}

/** Legge le pagine di uno o più file, in qualunque formato gestito. */
export function leggiDocumenti(pagine: PaginaPdf[]): Lettura {
  const avvisi: string[] = [];
  const riepiloghi: RiepilogoAnnuo[] = [];
  const cedolini: CedolinoMensile[] = [];
  const conta = { riepilogo: 0, cedolino: 0, straordinarie: 0, altre: 0 };

  for (const p of pagine) {
    const r = leggiPagina(p);
    if (r) { riepiloghi.push(r); conta.riepilogo++; continue; }
    const c = leggiCedolinoHalley(p);
    if (!c) { conta.altre++; continue; }
    if (c.straordinaria || !c.voci.length) { conta.straordinarie++; continue; }
    cedolini.push(c);
    conta.cedolino++;
  }
  if (conta.straordinarie) {
    avvisi.push(`${conta.straordinarie} cedolin${conta.straordinarie === 1 ? 'o' : 'i'} di elaborazioni `
      + 'supplementari (arretrati, determine) senza voci di testata: non usati.');
  }

  return { riepiloghi: [...riepiloghi, ...cedoliniInRiepiloghi(cedolini, avvisi)], pagine: conta, avvisi };
}
