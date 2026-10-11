import {describe, expect, it} from 'vitest';
import {z} from 'zod';

// Verifica solo che Zod sia installato e importabile; nessun codice di prodotto lo usa ancora.
describe('zod', () => {
  it('e importabile e valida', () => {
    const schema = z.object({codiceFiscale: z.string().length(16)});
    expect(schema.safeParse({codiceFiscale: 'RSSMRA80A01H501U'}).success).toBe(true);
    expect(schema.safeParse({codiceFiscale: 'x'}).success).toBe(false);
  });
});
