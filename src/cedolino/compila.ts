/**
 * Dai riepiloghi annuali di un dipendente ai campi del Calcolo Unificato:
 * anagrafica, posizione economica, voci 01-11 e tabella degli ultimi 12 mesi.
 *
 * Nulla viene deciso in silenzio: ogni scelta discutibile finisce in `avvisi`,
 * e l'utente può correggere tutto nei passi successivi.
 */

import type { Compilazione, MeseCompilato, MeseFinestra, RiepilogoAnnuo } from './tipi';
import { classifica, VOCI_DA_SOMMARE, VOCI_GESTITE, type Destinazione } from './voci';

const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
                   'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const r2 = (n: number) => Math.round(n * 100) / 100;
const nomeMese = (m: MeseFinestra) => `${NOMI_MESI[m.mese]} ${m.anno}`;
const fmt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "30-09-2024" → "2024-09-30"; altro → ''. */
export function dataISO(s: string): string {
  const m = s.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** "EX-C5", "B3-PEO", "c5" → "C5"; '' se non è una posizione A1-D7. */
export function posizioneEconomica(s: string): string {
  const p = s.trim().toUpperCase().replace(/^EX-/, '').replace(/-PEO$/, '');
  return /^[ABCD][1-8]$/.test(p) ? p : '';
}

/**
 * Finestra PASSWEB: 12 mesi inclusivi del mese di cessazione, dal più vecchio.
 * Stessa regola di getUltimi12Mesi in CalcoloUnificatoUltimoMiglio.
 */
export function ultimi12Mesi(dataCessazioneISO: string): MeseFinestra[] {
  const [y, m] = dataCessazioneISO.split('-').map(Number);
  if (!y || !m) return [];
  return Array.from({ length: 12 }, (_, k) => {
    const idx = y * 12 + (m - 1) - (11 - k);
    return { anno: Math.floor(idx / 12), mese: idx % 12 };
  });
}

const fineMese = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return d === new Date(y, m, 0).getDate();
};

type VociMensili = Partial<Record<Destinazione, (number | null)[]>>;

/** Voci di un anno, già ricondotte alle destinazioni del calcolatore. */
function vociAnno(r: RiepilogoAnnuo, nonRiconosciute: Set<string>, avvisi: string[]): VociMensili {
  const out: VociMensili = {};
  for (const v of r.voci) {
    const dest = classifica(v.etichetta);
    if (dest == null) { nonRiconosciute.add(v.etichetta); continue; }
    if (dest === 'ignora') continue;
    const acc = out[dest] ??= Array(12).fill(null);
    v.mesi.forEach((val, i) => {
      if (val == null) return;
      if (acc[i] == null) acc[i] = val;
      else if (VOCI_DA_SOMMARE.has(dest)) acc[i] = r2(acc[i]! + val);
      else if (acc[i] !== val) {
        avvisi.push(`${NOMI_MESI[i]} ${r.anno}: due righe per la voce ${dest} con importi diversi `
          + `(${fmt(acc[i]!)} e ${fmt(val)}); tenuto il primo.`);
      }
    });
  }
  return out;
}

export interface OpzioniCompila {
  /** Somma l'Elemento perequativo al tabellare (voce 01). */
  perequativo: boolean;
  /** Data di cessazione già nota, usata se il riepilogo non la riporta (aaaa-mm-gg). */
  dataCessazione?: string;
}

/** I riepiloghi devono essere dello stesso dipendente (stesso codice fiscale). */
export function compila(riepiloghi: RiepilogoAnnuo[], opz: OpzioniCompila): Compilazione {
  const avvisi: string[] = [];
  const nonRiconosciute = new Set<string>();
  const ord = [...riepiloghi].sort((a, b) => a.anno - b.anno);
  const ultimo = ord[ord.length - 1];

  // Più fonti per lo stesso anno (riepilogo e cedolini) si uniscono mese per mese:
  // un mese già letto non viene sovrascritto da uno vuoto.
  const perAnno = new Map<number, VociMensili>();
  for (const r of ord) {
    const v = vociAnno(r, nonRiconosciute, avvisi);
    const gia = perAnno.get(r.anno);
    if (!gia) { perAnno.set(r.anno, v); continue; }
    const mesiGia = new Set(Array.from({ length: 12 }, (_, i) => i).filter(i => gia['01']?.[i] != null));
    for (const [dest, valori] of Object.entries(v) as Array<[Destinazione, (number | null)[]]>) {
      const acc = gia[dest] ??= Array(12).fill(null);
      valori.forEach((x, i) => { if (x != null && !mesiGia.has(i)) acc[i] = x; });
    }
  }
  const valore = (dest: Destinazione, m: MeseFinestra): number | null =>
    perAnno.get(m.anno)?.[dest]?.[m.mese] ?? null;

  const haPerequativo = [...perAnno.values()].some(v => v.perequativo?.some(x => x != null));
  const tabellare = (m: MeseFinestra): number | null => {
    const t = valore('01', m);
    if (t == null) return null;
    return opz.perequativo ? r2(t + (valore('perequativo', m) ?? 0)) : t;
  };

  // Più recente prima: l'ultimo anno caricato ha la situazione aggiornata.
  const piuRecente = (k: 'assunzione' | 'cessazione' | 'posizione' | 'partTime') =>
    [...ord].reverse().map(r => r[k]).find(Boolean) ?? '';

  const cessazionePdf = dataISO(piuRecente('cessazione'));
  const cessazione = cessazionePdf || opz.dataCessazione || '';
  if (!cessazionePdf) {
    avvisi.push(cessazione
      ? 'Data di cessazione non presente nei documenti: usata quella già inserita.'
      : 'Data di cessazione non presente nei documenti: inseriscila qui sotto per compilare i 12 mesi.');
  }

  const posGrezza = piuRecente('posizione');
  const posizione = posizioneEconomica(posGrezza);
  if (posGrezza && !posizione) avvisi.push(`Posizione economica "${posGrezza}" non riconosciuta: selezionala a mano.`);

  const pt = piuRecente('partTime');
  if (pt) avvisi.push(`Part-time indicato nei documenti (${pt}): verifica gli importi prima del calcolo.`);

  if (haPerequativo) {
    avvisi.push(opz.perequativo
      ? 'Elemento perequativo sommato al tabellare.'
      : 'I documenti contengono l\'Elemento perequativo, non sommato al tabellare.');
  }

  const finestra = cessazione ? ultimi12Mesi(cessazione) : [];
  const mesi: MeseCompilato[] = finestra.map(m => {
    const t = tabellare(m);
    return { ...m, tabellare: t, ivc: t == null ? null : (valore('09', m) ?? 0) };
  });
  const mancanti = mesi.filter(m => m.tabellare == null);
  if (finestra.length && mancanti.length) {
    avvisi.push(`Mancano i dati di ${mancanti.length} mesi (${mancanti.map(nomeMese).join(', ')}): `
      + 'carica anche quei cedolini o il riepilogo dell\'anno, oppure compilali a mano.');
  }

  // Mese da cui leggere le voci: l'ultimo con il tabellare, ma non un mese
  // di cessazione incompleto (gli importi sarebbero ridotti a giorni).
  let meseVoci: MeseFinestra | null = null;
  for (let i = mesi.length - 1; i >= 0; i--) {
    if (mesi[i].tabellare == null) continue;
    if (i === mesi.length - 1 && cessazione && !fineMese(cessazione)) {
      avvisi.push(`Cessazione a metà mese: voci prese dal mese precedente, non da ${nomeMese(mesi[i])}.`);
      continue;
    }
    meseVoci = { mese: mesi[i].mese, anno: mesi[i].anno };
    break;
  }

  const imp: Record<string, string> = {};
  if (meseVoci) {
    for (const id of VOCI_GESTITE) {
      const v = id === '01' ? tabellare(meseVoci) : valore(id, meseVoci);
      imp[id] = v ? String(v) : '';
    }
    const base = tabellare(meseVoci);
    const cambi = mesi.filter(m => m.anno >= 2024 && m.tabellare != null && m.tabellare !== base);
    if (cambi.length) {
      avvisi.push(`Tabellare diverso da quello di ${nomeMese(meseVoci)} in ${cambi.map(nomeMese).join(', ')}: `
        + 'quei mesi diventano eccezioni e nello scenario MC restano col valore letto.');
    }
  }

  return {
    nome: ultimo?.nome ?? '',
    cf: ultimo?.cf ?? '',
    assunzione: dataISO(piuRecente('assunzione')),
    cessazione,
    posizione,
    imp,
    meseVoci,
    mesi,
    haPerequativo,
    nonRiconosciute: [...nonRiconosciute],
    avvisi,
  };
}
