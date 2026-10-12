/**
 * Pagine "VOCI DI TESTATA" costruite a mano per i test, con le stesse
 * coordinate dei riepiloghi reali di un Comune Halley. Dati di fantasia:
 * nessun nome o codice fiscale vero.
 */

import type { PaginaPdf, TestoPdf } from '../tipi';

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const X_MESE = [176, 225, 278, 329, 375, 426, 478, 525, 570, 624, 669, 720];
/** Bordo destro degli importi nella colonna del mese (allineati a destra). */
const DESTRA = (i: number) => 208 + i * 49.7;

const t = (testo: string, x: number, top: number, larg = testo.length * 3.6): TestoPdf =>
  ({ testo, x, x1: x + larg, top });

const eur = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface DatiPagina {
  anno: number;
  nome?: string;
  cf?: string;
  matricola?: string;
  voci: Array<[string, (number | null)[]]>;
  assunzione?: (string | null)[];
  cessazione?: (string | null)[];
  posizione?: (string | null)[];
  partTime?: (string | null)[];
  sezione?: string;
}

export function paginaTestata(d: DatiPagina): PaginaPdf {
  const p: PaginaPdf = [];
  p.push(t('1 COMUNE DI PROVA', 36, 42), t('Stampa del 10-04-2026', 718, 42));
  p.push(t(`Riepilogo generale dipendente: da Gennaio a Dicembre ${d.anno} -- ${d.sezione ?? 'VOCI DI TESTATA'}`, 36, 65, 385));
  p.push(t(d.nome ?? 'ROSSI MARIO', 696, 65), t(`(matr. ${d.matricola ?? '17'})`, 762, 65));
  p.push(t('Codice fiscale', 36, 84), t(d.cf ?? 'RSSMRA80A01H501U', 95, 84), t('nato a', 252, 84));
  MESI.forEach((m, i) => p.push(t(m, X_MESE[i], 119, m.length * 3.1)));
  p.push(t('totale', 775, 119, 17));

  let top = 130;
  for (const [etichetta, valori] of d.voci) {
    p.push(t(etichetta, 38, top));
    let tot = 0;
    valori.forEach((v, i) => {
      if (v == null) return;
      tot += v;
      const s = eur(v), w = s.length * 2.9;
      p.push(t(s, DESTRA(i) - w, top, w));
    });
    const s = eur(tot), w = s.length * 2.9;
    p.push(t(s, 803 - w, top, w));
    top += 11.5;
  }

  const righeTesto: Array<[string, (string | null)[] | undefined]> = [
    ['Data assunzione', d.assunzione], ['Data cessazione', d.cessazione],
    ['Posizione economica', d.posizione], ['% Part time', d.partTime],
  ];
  top += 20;
  for (const [etichetta, valori] of righeTesto) {
    p.push(t(etichetta, 38, top));
    valori?.forEach((v, i) => { if (v) p.push(t(v, X_MESE[i] - 3, top + 6, v.length * 3.1)); });
    top += 17;
  }
  p.push(t('21', 795, 545));
  return p;
}

export interface DatiCedolino {
  mese: string;          // 'Settembre'
  anno: number;
  nome?: string;
  cf?: string;
  matricola?: string;
  area?: string;         // 'FUN/D1/0/TI'
  assunzione?: string;
  cessazione?: string;
  partTime?: string;
  straordinaria?: boolean;
  /** Voci di testata in ordine; più di 7 vanno su una seconda riga. */
  testata: Array<[string, number]>;
}

/** Cedolino mensile Halley (A4 verticale), coordinate di un cedolino reale. */
export function cedolinoHalley(d: DatiCedolino): PaginaPdf {
  const p: PaginaPdf = [];
  p.push(t('PERIODO DI RETRIBUZIONE', 485, 22, 80), t(d.mese, 503, 40, 44), t('1 - COMUNE DI PROVA', 138, 41, 235));
  p.push(t(String(d.anno), 513, 55, 24));
  if (d.straordinaria) p.push(t('Mens.Straordinaria ( 2)', 487, 66, 76));
  p.push(t('02917610822', 397, 67, 49));
  p.push(t('MATRICOLA', 37, 79, 32), t('COGNOME E NOME', 85, 79, 49), t('CODICE FISCALE', 373, 79, 42));
  const nome = d.nome ?? 'ROSSI MARIO';
  p.push(t(d.matricola ?? '17', 63, 90, 9), t(nome, 85, 90, nome.length * 5.1), t(d.cf ?? 'RSSMRA80A01H501U', 372, 90, 82));
  p.push(t('PROFILO PROFESSIONALE', 92, 97, 65), t('Area/ex Pos./Diff./Rapp.', 253, 98, 64));
  if (d.area) p.push(t(d.area, 265, 107, 39));
  p.push(t('ISTRUTTORE AMMINISTRATIVO', 54, 108, 156));
  p.push(t('DATA NASCITA', 45, 115, 39), t('DATA ASSUNZIONE', 111, 115, 49), t('DATA CESSAZIONE', 184, 115, 48));
  p.push(t('Data I.Prog.Econ.', 254, 116, 47), t('Miss.Prog./Capitolo-Art.', 364, 116, 63));
  p.push(t('01-01-1980', 42, 126, 41), t('03-01 / 0000001400-00000', 352, 126, 97));
  if (d.assunzione) p.push(t(d.assunzione, 115, 126, 41), t(d.assunzione, 259, 126, 41));
  if (d.cessazione) p.push(t(d.cessazione, 188, 126, 41));
  p.push(t('% PART-TIME', 47, 133, 33), t('Ore Part-Time', 113, 134, 38));
  if (d.partTime) p.push(t(d.partTime, 55, 143, 18));
  p.push(t('SIG.', 325, 176, 20), t(d.nome ?? 'ROSSI MARIO', 325, 190, 107), t('VIA ROMA 1', 325, 204, 60));

  // Fascia voci di testata: caselle larghe ~78 pt, importi allineati a destra nella casella.
  const X_CASELLA = [38, 109, 186, 265, 337, 416, 498];
  d.testata.forEach(([etichetta, valore], i) => {
    const riga = Math.floor(i / 7), col = i % 7;
    const top = 279 + riga * 22;
    p.push(t(etichetta, X_CASELLA[col], top, etichetta.length * 3.3));
    const s = eur(valore), w = s.length * 3.3;
    p.push(t(s, X_CASELLA[col] + 45 - w, top + 10, w));
  });

  p.push(t('COD.', 32, 335, 17), t('DESCRIZIONE', 60, 335, 47), t('COMPETENZE', 509, 335, 47));
  p.push(t('304', 39, 351, 12), t('Retribuzione mensile', 57, 351, 65), t('2.366,57', 536, 351, 27));
  p.push(t('8118', 35, 417, 16), t('Ritenute c.p.d.e.l.', 57, 417, 54), t('2.366,57', 353, 417, 27), t('8,850', 402, 417, 18));
  p.push(t('IMPONIBILE IRPEF', 41, 655, 46), t('2.102,25', 64, 665, 27));
  p.push(t('NETTO IN BUSTA', 476, 773, 76), t('1.782,17', 523, 791, 39));
  return p;
}

/** Dodici volte lo stesso importo, oppure null fuori dai mesi indicati. */
export const per = (v: number, da = 0, a = 11): (number | null)[] =>
  Array.from({ length: 12 }, (_, i) => (i >= da && i <= a ? v : null));

export const testoPer = (v: string, da = 0, a = 11): (string | null)[] =>
  Array.from({ length: 12 }, (_, i) => (i >= da && i <= a ? v : null));
