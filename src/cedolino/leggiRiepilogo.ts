/**
 * Lettura del "Riepilogo generale dipendente — VOCI DI TESTATA".
 *
 * Struttura della pagina (A4 orizzontale, una per dipendente e per anno):
 *   titolo       Riepilogo generale dipendente: da Gennaio a Dicembre 2024 -- VOCI DI TESTATA   NOME (matr. 80)
 *   intestazione gennaio … dicembre totale
 *   righe voce   etichetta a sinistra, importi allineati a destra nella colonna del mese
 *   in fondo     Data assunzione / Data cessazione / Posizione economica / % Part time,
 *                con i valori una riga sotto l'etichetta
 * Le altre pagine del file (voci di corpo, imponibili, detrazioni) si scartano.
 */

import type { PaginaPdf, RiepilogoAnnuo, TestoPdf, VoceLetta } from './tipi';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const RE_CF   = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
const RE_TITOLO = /(\d{4})\s*--\s*VOCI DI TESTATA/i;

/** Righe "anagrafiche" in fondo alla pagina: valori testuali, non importi. */
const RIGHE_TESTO = {
  assunzione: /^data assunzione/i,
  cessazione: /^data cessazione/i,
  posizione:  /^posizione economica/i,
  partTime:   /part\s*time/i,
} as const;

/** Tolleranza verticale (pt) per considerare due frammenti sulla stessa riga. */
const TOLL_RIGA = 3;
/** Distanza massima (pt) fra un'etichetta e la riga di valori sotto di essa. */
const DIST_VALORI = 12;

interface Riga { top: number; testi: TestoPdf[] }

function righe(pagina: PaginaPdf): Riga[] {
  const ord = pagina.filter(t => t.testo.trim()).sort((a, b) => a.top - b.top || a.x - b.x);
  const out: Riga[] = [];
  for (const t of ord) {
    const ultima = out[out.length - 1];
    if (ultima && t.top - ultima.top <= TOLL_RIGA) ultima.testi.push(t);
    else out.push({ top: t.top, testi: [t] });
  }
  for (const r of out) r.testi.sort((a, b) => a.x - b.x);
  return out;
}

/** "1.503,70" → 1503.7; tutto ciò che non è un importo → null. */
export function importo(s: string): number | null {
  const m = s.trim().match(/^(-?)(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!m) return null;
  const v = parseFloat(`${m[2].replace(/\./g, '')}.${m[3]}`);
  return m[1] ? -v : v;
}

const testoRiga = (r: Riga) => r.testi.map(t => t.testo).join(' ');

/** Legge una pagina; null se non è una pagina "VOCI DI TESTATA". */
export function leggiPagina(pagina: PaginaPdf): RiepilogoAnnuo | null {
  const rs = righe(pagina);

  const rTitolo = rs.find(r => RE_TITOLO.test(testoRiga(r)));
  if (!rTitolo) return null;
  const anno = Number(testoRiga(rTitolo).match(RE_TITOLO)![1]);
  const tTitolo = rTitolo.testi.find(t => RE_TITOLO.test(t.testo));
  const nome = rTitolo.testi
    .filter(t => t !== tTitolo && !/matr/i.test(t.testo) && (!tTitolo || t.x > tTitolo.x))
    .map(t => t.testo.trim()).join(' ').replace(/\s+/g, ' ');
  const matricola = testoRiga(rTitolo).match(/matr\.?\s*(\d+)/i)?.[1] ?? '';

  const cf = pagina.flatMap(t => t.testo.trim().split(/\s+/)).find(p => RE_CF.test(p)) ?? '';

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

  const voci: VoceLetta[] = [];
  const testi: Record<keyof typeof RIGHE_TESTO, string> =
    { assunzione: '', cessazione: '', posizione: '', partTime: '' };

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
      // Vale l'ultimo valore a destra: è la situazione più recente dell'anno.
      const mesi = val.filter(t => colonna(t) >= 0);
      if (mesi.length) testi[chiave] = mesi[mesi.length - 1].testo.trim();
      continue;
    }

    const mesi: (number | null)[] = Array(12).fill(null);
    for (const t of val) {
      const c = colonna(t);
      const v = importo(t.testo);
      if (c >= 0 && v != null) mesi[c] = v;
    }
    if (mesi.some(v => v != null)) voci.push({ etichetta, mesi });
  }

  return { anno, nome, cf, matricola, voci, ...testi };
}

/** Tutte le pagine "VOCI DI TESTATA" di uno o più file. */
export function leggiRiepiloghi(pagine: PaginaPdf[]): RiepilogoAnnuo[] {
  return pagine.map(leggiPagina).filter((r): r is RiepilogoAnnuo => r !== null);
}
