// Fotografia del vecchio (Anticipo DMA, tempo pieno e part-time): il reperto deve riprodurre, al
// centesimo, gli importi congelati in fotografia.json. Descrive cosa fa il vecchio, non cosa è
// giusto (ADR 0001).
// DA CANCELLARE nella pulizia finale (ticket 36): il reperto sparisce, fotografia.json resta.
import {describe, expect, it} from 'vitest';
import fotografia from './fotografia.json';
import {calcolaPartTime, calcolaTempoPieno} from './calcolaAnticipoDMA';

describe('fotografia Anticipo DMA: il reperto riproduce gli importi congelati', () => {
  for (const caso of fotografia.casi) {
    it(caso.id, () => {
      const uscite = caso.variante === 'part-time'
        ? calcolaPartTime(caso.ingressi as Parameters<typeof calcolaPartTime>[0])
        : calcolaTempoPieno(caso.ingressi as Parameters<typeof calcolaTempoPieno>[0]);
      expect(uscite).toEqual(caso.uscite);
    });
  }
});
