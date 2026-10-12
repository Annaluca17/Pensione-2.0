// Fotografia del vecchio (Unificato, pensione + TFS pensionati): il reperto deve riprodurre, al
// centesimo, gli importi congelati in fotografia.json. Descrive cosa fa il vecchio, non cosa è
// giusto (ADR 0001).
// DA CANCELLARE nella pulizia finale (ticket 36): il reperto sparisce, fotografia.json resta.
import {describe, expect, it} from 'vitest';
import fotografia from './fotografia.json';
import {calcolaUnificato, type IngressiUnificato} from './calcolaUnificato';

describe('fotografia Unificato: il reperto riproduce gli importi congelati', () => {
  for (const caso of fotografia.casi) {
    it(caso.id, () => {
      expect(calcolaUnificato(caso.ingressi as IngressiUnificato)).toEqual(caso.uscite);
    });
  }
});
