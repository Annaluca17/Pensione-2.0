// Il contratto col Portale Strumenti Interni (ticket 36, ADR 0002): ogni ?modulo=<id>, vecchio o nuovo,
// apre la scrivania col filtro per tipo di pratica.
import {describe, expect, it} from 'vitest';
import {filtroDaModulo, idPortale} from './portale';

describe('filtroDaModulo', () => {
  it.each(['unificato', 'pensione', 'tfs_pensione', 'anticipo_dma', 'tfs_servizio'])(
    'il vecchio modulo %s apre la scrivania filtrata sulle pratiche di pensione',
    (modulo) => expect(filtroDaModulo(modulo)).toBe('pensione'),
  );

  it('il vecchio modulo tfr apre la scrivania filtrata sulle pratiche di cessazione', () => {
    expect(filtroDaModulo('tfr')).toBe('cessazione');
  });

  it('il vecchio modulo lettere apre la scrivania senza filtro', () => {
    expect(filtroDaModulo('lettere')).toBe('tutti');
  });

  it('gli id nuovi aprono la scrivania col proprio filtro', () => {
    expect(filtroDaModulo('scrivania')).toBe('tutti');
    expect(filtroDaModulo('pensione')).toBe('pensione');
    expect(filtroDaModulo('cessazione')).toBe('cessazione');
  });

  it.each([null, '', 'sconosciuto', 'constructor'])('senza un id riconosciuto (%s) la scrivania non ha filtro', (modulo) => {
    expect(filtroDaModulo(modulo)).toBe('tutti');
  });
});

describe('idPortale', () => {
  it("comunica al Portale l'id della scrivania col filtro che mostra", () => {
    expect(idPortale('tutti')).toBe('scrivania');
    expect(idPortale('pensione')).toBe('pensione');
    expect(idPortale('cessazione')).toBe('cessazione');
  });
});
