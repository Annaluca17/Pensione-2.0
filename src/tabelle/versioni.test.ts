// Test d'impronta (T7, storia 86): se il contenuto delle tabelle cambia senza una riga nuova nel
// registro versioni, il test fallisce. Così nessuna correzione sfugge al confronto coi risultati
// congelati (ADR 0004).
import {describe, expect, it} from 'vitest';
import {impronta} from './impronta';
import {tabelle} from './index';
import {versioni} from './versioni';

const {versione: _versione, ...contenuto} = tabelle;
const ultima = versioni[versioni.length - 1];

describe('registro versioni', () => {
  it('righe con id aaaa-mm-gg.n in ordine crescente, motivo e file toccati', () => {
    expect(versioni.length).toBeGreaterThan(0);
    for (const v of versioni) {
      expect(v.id).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
      expect(v.motivo.trim()).not.toBe('');
      expect(v.file.length).toBeGreaterThan(0);
      expect(v.impronta).toMatch(/^[0-9a-f]{14}$/);
    }
    const ids = versioni.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < versioni.length; i++) {
      const [dPrec, nPrec] = versioni[i - 1].id.split('.');
      const [d, n] = versioni[i].id.split('.');
      expect(d > dPrec || (d === dPrec && Number(n) > Number(nPrec))).toBe(true);
    }
  });

  it('la versione delle tabelle è l\'id dell\'ultima riga', () => {
    expect(tabelle.versione).toBe(ultima.id);
  });

  it('ogni riga ha un\'impronta diversa dalla precedente', () => {
    for (let i = 1; i < versioni.length; i++) {
      expect(versioni[i].impronta).not.toBe(versioni[i - 1].impronta);
    }
  });

  it('l\'impronta del contenuto corrisponde all\'ultima riga: cambiare le tabelle richiede una riga nuova', () => {
    expect(impronta(contenuto)).toBe(ultima.impronta);
  });
});

describe('impronta', () => {
  it('non dipende dall\'ordine delle chiavi ed è sensibile a ogni valore', () => {
    expect(impronta({a: 1, b: [1, 2]})).toBe(impronta({b: [1, 2], a: 1}));
    expect(impronta({a: 1})).not.toBe(impronta({a: 2}));
    expect(impronta({a: [1, 2]})).not.toBe(impronta({a: [2, 1]}));
    expect(impronta({a: 'x'})).not.toBe(impronta({a: 'y'}));
  });
});
