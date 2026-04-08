/**
 * Formatta un valore numerico come valuta EUR (es. 1.234,56 €)
 */
export function fmtEuro(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '–';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Arrotonda a N decimali (default 2)
 */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
