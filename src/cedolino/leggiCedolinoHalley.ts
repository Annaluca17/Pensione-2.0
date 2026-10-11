/**
 * Lettura del cedolino mensile Halley (A4 verticale, una pagina per dipendente).
 *
 * Il cedolino è un modulo a caselle: ogni etichetta piccola (MATRICOLA, CODICE
 * FISCALE, DATA ASSUNZIONE…) ha il valore subito sotto, nella stessa colonna.
 * La fascia delle voci di testata, fra l'indirizzo e la tabella COD./DESCRIZIONE,
 * segue la stessa regola: una riga di etichette e sotto la riga degli importi,
 * ogni importo nella casella dell'etichetta che lo precede a sinistra.
 *
 *   PERIODO DI RETRIBUZIONE  Settembre 2026  [Mens.Straordinaria ( 2)]
 *   Area/ex Pos./Diff./Rapp. FUN/D1/0/TI     → posizione D1
 *   STIPENDIO BASE  IND.VACANZA CONT.  ASS.AD PERSONAM …
 *        2.092,84             20,93           107,23
 *
 * Le elaborazioni supplementari (arretrati, determine) sono "Mens.Straordinaria"
 * e non hanno voci di testata: si riconoscono e si scartano.
 */

import { codiceFiscale, importo, righe, testoRiga, type Riga } from './testo';
import type { CedolinoMensile, PaginaPdf, TestoPdf } from './tipi';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const RE_DATA = /^\d{2}-\d{2}-\d{4}$/;
/**
 * Area/ex Pos./Diff./Rapp., es. "FUN/D1/0/TI", "OE/B7/1/TI". Il segretario
 * comunale ha l'area vuota: "/SEGRETARIO C/0/TI" (posizione non A-D, va segnalata).
 */
const RE_AREA = /^[A-Z]*\/([^/]*)\/[^/]*\/[A-Z]*$/;

/** Margine orizzontale (pt) fra casella dell'etichetta e valore. */
const MARGINE = 12;
/** Il valore sta al massimo 18 pt sotto la sua etichetta. */
const DIST_VALORE = 18;

const trova = (p: PaginaPdf, re: RegExp) => p.find(t => re.test(t.testo.trim()));

/** Valore nella casella sotto l'etichetta, se corrisponde al formato atteso. */
function valoreSotto(p: PaginaPdf, etichetta: RegExp, formato: RegExp): string {
  const e = trova(p, etichetta);
  if (!e) return '';
  // Basta che il valore si sovrapponga alla casella: i nomi lunghi sono allineati
  // a sinistra e sporgono ben oltre l'etichetta.
  const candidati = p.filter(t =>
    t.top > e.top + 2 && t.top <= e.top + DIST_VALORE
    && t.x1 >= e.x - MARGINE && t.x <= e.x1 + MARGINE
    && formato.test(t.testo.trim()));
  const scarto = (t: TestoPdf) => Math.min(Math.abs(t.x - e.x), Math.abs((t.x + t.x1 - e.x - e.x1) / 2));
  candidati.sort((a, b) => a.top - b.top || scarto(a) - scarto(b));
  return candidati[0]?.testo.trim() ?? '';
}

/** Voci di testata: righe fra STIPENDIO BASE e l'intestazione COD./DESCRIZIONE. */
function vociTestata(p: PaginaPdf): CedolinoMensile['voci'] {
  const rs = righe(p);
  const inizio = rs.findIndex(r => r.testi.some(t => /^STIPENDIO (BASE|TABELLARE)/i.test(t.testo.trim())));
  if (inizio < 0) return [];
  const fine = rs.findIndex((r, i) => i > inizio && /\bCOD\.?\b/.test(testoRiga(r)) && /DESCRIZIONE/i.test(testoRiga(r)));
  const banda = rs.slice(inizio, fine < 0 ? undefined : fine);

  const voci: CedolinoMensile['voci'] = [];
  let etichette: TestoPdf[] = [];
  const isValori = (r: Riga) => r.testi.every(t => importo(t.testo) != null);
  for (const r of banda) {
    if (!isValori(r)) { etichette = r.testi; continue; }
    for (const v of r.testi) {
      const c = (v.x + v.x1) / 2;
      // La casella dell'etichetta inizia al suo bordo sinistro e finisce dove inizia la successiva.
      const e = [...etichette].reverse().find(e => e.x <= c + 2);
      if (e) voci.push({ etichetta: e.testo.trim(), importo: importo(v.testo)! });
    }
  }
  return voci;
}

/** Legge una pagina; null se non è un cedolino Halley. */
export function leggiCedolinoHalley(p: PaginaPdf): CedolinoMensile | null {
  const periodo = trova(p, /^PERIODO DI RETRIBUZIONE$/i);
  if (!periodo || !trova(p, /^CODICE FISCALE$/i)) return null;

  const zona = p.filter(t => t.top > periodo.top && t.top <= periodo.top + 50
    && t.x1 >= periodo.x - 20 && t.x <= periodo.x1 + 20);
  const mese = MESI.indexOf(zona.map(t => t.testo.trim().toLowerCase()).find(s => MESI.includes(s)) ?? '');
  const anno = Number(zona.map(t => t.testo.trim()).find(s => /^\d{4}$/.test(s)));
  if (mese < 0 || !anno) return null;

  const area = valoreSotto(p, /^Area\/ex Pos/i, RE_AREA);

  return {
    anno,
    mese,
    nome: valoreSotto(p, /^COGNOME E NOME$/i, /\S/),
    cf: codiceFiscale(p),
    matricola: valoreSotto(p, /^MATRICOLA$/i, /^\d+$/),
    straordinaria: zona.some(t => /straordinaria/i.test(t.testo)),
    voci: vociTestata(p),
    assunzione: valoreSotto(p, /^DATA ASSUNZIONE$/i, RE_DATA),
    cessazione: valoreSotto(p, /^DATA CESSAZIONE$/i, RE_DATA),
    posizione: area.match(RE_AREA)?.[1].trim() ?? '',
    partTime: valoreSotto(p, /^% PART-TIME$/i, /\d/),
  };
}
