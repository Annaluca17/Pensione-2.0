// Lettore di pagina del "Riepilogo generale dipendente — VOCI DI TESTATA" Halley.
//
// Pagina A4 orizzontale, una per dipendente e per anno:
//   titolo       Riepilogo generale dipendente: da Gennaio a Dicembre 2024 -- VOCI DI TESTATA   NOME (matr. 80)
//   intestazione gennaio … dicembre totale
//   righe voce   etichetta a sinistra, importi allineati a destra nella colonna del mese
//   in fondo     Data assunzione / Data cessazione / Posizione economica / % Part time,
//                con i valori una riga sotto l'etichetta
// Le altre pagine del file (voci di corpo, imponibili, detrazioni) si scartano.

import {codiceFiscale, centesimi, righe, testoRiga} from '../testo';
import type {Centesimi} from '../../motore';
import type {PaginaPdf, RiepilogoAnnuo, TestoPdf} from '../tipi';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const RE_TITOLO = /(\d{4})\s*--\s*VOCI DI TESTATA/i;

/** Righe "anagrafiche" in fondo alla pagina: valori testuali, non importi. */
const RIGHE_TESTO = {
  assunzione: /^data assunzione/i,
  cessazione: /^data cessazione/i,
  posizione:  /^posizione economica/i,
  partTime:   /part\s*time/i,
} as const;

/** Distanza massima (pt) fra un'etichetta e la riga di valori sotto di essa. */
const DIST_VALORI = 12;

/** Legge una pagina; null se non è una pagina "VOCI DI TESTATA". */
export function leggiRiepilogo(pagina: PaginaPdf): RiepilogoAnnuo | null {
  const rs = righe(pagina);

  const rTitolo = rs.find(r => RE_TITOLO.test(testoRiga(r)));
  if (!rTitolo) return null;
  const anno = Number(testoRiga(rTitolo).match(RE_TITOLO)![1]);
  const tTitolo = rTitolo.testi.find(t => RE_TITOLO.test(t.testo));
  const nome = rTitolo.testi
    .filter(t => t !== tTitolo && !/matr/i.test(t.testo) && (!tTitolo || t.x > tTitolo.x))
    .map(t => t.testo.trim()).join(' ').replace(/\s+/g, ' ');

  const cf = codiceFiscale(pagina);

  // Colonne: centro dell'intestazione di ciascun mese, più "totale" da scartare.
  const iIntest = rs.findIndex(r =>
    r.testi.some(t => t.testo.trim().toLowerCase() === 'gennaio') &&
    r.testi.some(t => t.testo.trim().toLowerCase() === 'dicembre'));
  if (iIntest < 0) return null;
  const intest = rs[iIntest].testi;
  const centri = MESI.map(m => {
    const t = intest.find(t => t.testo.trim().toLowerCase() === m);
    return t ? (t.x + t.x1) / 2 : NaN;
  });
  if (centri.some(Number.isNaN)) return null;
  const tTot = intest.find(t => t.testo.trim().toLowerCase() === 'totale');
  const centroTot = tTot ? (tTot.x + tTot.x1) / 2 : Infinity;
  const inizioDati = intest.find(t => t.testo.trim().toLowerCase() === 'gennaio')!.x - 10;

  /** Colonna del mese (0-11) o -1 per la colonna totale. */
  const colonna = (t: TestoPdf): number => {
    const c = (t.x + t.x1) / 2;
    let best = -1, dist = Math.abs(c - centroTot);
    centri.forEach((cm, i) => { const d = Math.abs(c - cm); if (d < dist) { dist = d; best = i; } });
    return best;
  };

  const voci: RiepilogoAnnuo['voci'] = [];
  const testi: Record<keyof typeof RIGHE_TESTO, string[]> =
    { assunzione: Array(12).fill(''), cessazione: Array(12).fill(''), posizione: Array(12).fill(''), partTime: Array(12).fill('') };

  let etichetta = '';
  let topEtichetta = -Infinity;
  for (const r of rs.slice(iIntest + 1)) {
    const lbl = r.testi.filter(t => t.x < inizioDati);
    const val = r.testi.filter(t => t.x >= inizioDati);
    if (lbl.length) {
      etichetta = lbl.map(t => t.testo.trim()).join(' ');
      topEtichetta = r.top;
    } else if (r.top - topEtichetta > DIST_VALORI) {
      continue;  // riga orfana (numero di pagina, note)
    }
    if (!etichetta || !val.length) continue;

    const chiave = (Object.keys(RIGHE_TESTO) as Array<keyof typeof RIGHE_TESTO>)
      .find(k => RIGHE_TESTO[k].test(etichetta));
    if (chiave) {
      for (const t of val) if (colonna(t) >= 0) testi[chiave][colonna(t)] = t.testo.trim();
      continue;
    }

    const mesi: Array<Centesimi | null> = Array(12).fill(null);
    for (const t of val) {
      const c = colonna(t);
      const v = centesimi(t.testo);
      if (c >= 0 && v != null) mesi[c] = v;
    }
    if (mesi.some(v => v != null)) voci.push({ etichetta, mesi });
  }

  // Anagrafica: vale l'ultimo valore non vuoto, la situazione più recente dell'anno.
  const ultimo = (a: string[]) => [...a].reverse().find(Boolean) ?? '';
  return {
    formato: 'riepilogo', anno, nome, cf, voci,
    assunzione: ultimo(testi.assunzione), cessazione: ultimo(testi.cessazione), posizione: ultimo(testi.posizione),
    partTime: testi.partTime,
  };
}

