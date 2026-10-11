// Aritmetica delle date ISO senza Date: solo stringhe aaaa-mm-gg e interi.
import type {DataISO, MeseISO} from './tipi';

const formatoData = /^(\d{4})-(\d{2})-(\d{2})$/;

const bisestile = (anno: number) => (anno % 4 === 0 && anno % 100 !== 0) || anno % 400 === 0;

export function giorniDelMese(anno: number, mese: number): number {
  return [31, bisestile(anno) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mese - 1];
}

/** Scompone una data ISO; `null` se la stringa non è una data esistente. */
export function leggiData(data: string): {anno: number; mese: number; giorno: number} | null {
  const m = formatoData.exec(data);
  if (!m) return null;
  const [anno, mese, giorno] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > giorniDelMese(anno, mese)) return null;
  return {anno, mese, giorno};
}

const due = (n: number) => String(n).padStart(2, '0');

export const data = (anno: number, mese: number, giorno: number): DataISO => `${anno}-${due(mese)}-${due(giorno)}`;
export const meseDi = (d: DataISO): MeseISO => d.slice(0, 7);

/** Il mese `n` mesi dopo (o prima, se negativo) di un mese ISO. */
export function spostaMese(m: MeseISO, n: number): MeseISO {
  const progressivo = Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1 + n;
  return `${Math.floor(progressivo / 12)}-${due((progressivo % 12) + 1)}`;
}

/** Giorno della settimana, 0 = domenica (metodo di Sakamoto). */
export function giornoDellaSettimana(anno: number, mese: number, giorno: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const a = mese < 3 ? anno - 1 : anno;
  return (a + Math.floor(a / 4) - Math.floor(a / 100) + Math.floor(a / 400) + t[mese - 1] + giorno) % 7;
}
