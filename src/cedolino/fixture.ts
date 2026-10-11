/**
 * Pagine "VOCI DI TESTATA" costruite a mano per i test, con le stesse
 * coordinate dei riepiloghi reali (Comune di Patti). Dati di fantasia:
 * nessun nome o codice fiscale vero.
 */

import type { PaginaPdf, TestoPdf } from './tipi';

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

/** Dodici volte lo stesso importo, oppure null fuori dai mesi indicati. */
export const per = (v: number, da = 0, a = 11): (number | null)[] =>
  Array.from({ length: 12 }, (_, i) => (i >= da && i <= a ? v : null));

export const testoPer = (v: string, da = 0, a = 11): (string | null)[] =>
  Array.from({ length: 12 }, (_, i) => (i >= da && i <= a ? v : null));
