// Fotografia del vecchio (TFR): il reperto deve riprodurre, al centesimo, gli importi congelati in
// fotografia.json. Descrive cosa fa il vecchio, non cosa è giusto (ADR 0001).
// DA CANCELLARE nella pulizia finale (ticket 36): il reperto sparisce, fotografia.json resta.
import {describe, expect, it} from 'vitest';
import fotografia from './fotografia.json';
import {calcolaTFR} from './calcolaTFR';

describe('fotografia TFR: il reperto riproduce gli importi congelati', () => {
  for (const caso of fotografia.casi) {
    it(caso.id, () => {
      expect(calcolaTFR(caso.ingressi)).toEqual(caso.uscite);
    });
  }
});
