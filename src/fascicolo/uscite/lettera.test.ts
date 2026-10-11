// Lettera TFR .docx (ticket 17). Il testo si legge dal document.xml del file (jszip arriva con docx).
import JSZip from 'jszip';
import {Packer} from 'docx';
import {describe, expect, it} from 'vitest';
import type {Tabelle} from '../../motore';
import {tabelle} from '../../tabelle';
import {letteraTfr, nomeFileLettera, oggettoPredefinito} from './lettera';
import type {ParametriLettera} from './lettera';

const parametri: ParametriLettera = {
  nomeComune: 'Prova',
  sedeInps: 'Fantasia',
  luogo: 'Prova',
  oggetto: oggettoPredefinito(tabelle),
  data: '2026-10-12',
  dipendente: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', assunzione: '2012-09-01', cessazione: '2026-10-20'},
};

async function testoDi(p: ParametriLettera) {
  const zip = await JSZip.loadAsync(await Packer.toBuffer(letteraTfr(p)));
  const xml = await zip.file('word/document.xml')!.async('string');
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
}

describe('lettera TFR', () => {
  it('anagrafica e date del dipendente, ente, data e oggetto con il riferimento delle tabelle', async () => {
    const t = await testoDi(parametri);
    for (const atteso of [
      'Comune di Prova',
      'Prova, 12/10/2026',
      'Sede Provinciale INPS di Fantasia',
      'Mario Rossi',
      'RSSMRA80A01H501U',
      '01/09/2012',
      '20/10/2026',
      `OGGETTO: ${tabelle.lettere.tfr.oggetto} (${tabelle.lettere.tfr.riferimentoNormativo})`,
    ]) {
      expect(t).toContain(atteso);
    }
  });

  it('nessun importo, forzatura o versione delle tabelle', async () => {
    const t = await testoDi(parametri);
    expect(t).not.toMatch(/€|\d+,\d{2}/);
    expect(t).not.toContain(tabelle.versione);
    expect(t.toLowerCase()).not.toContain('forzat');
  });

  it('il riferimento normativo segue le tabelle; un oggetto modificato vince', async () => {
    const prova: Tabelle = {...tabelle, lettere: {tfr: {...tabelle.lettere.tfr, riferimentoNormativo: 'RIFERIMENTO DI PROVA'}}};
    expect(oggettoPredefinito(prova)).toContain('RIFERIMENTO DI PROVA');
    expect(await testoDi({...parametri, oggetto: 'Oggetto scritto a mano'})).toContain('OGGETTO: Oggetto scritto a mano');
  });

  it('nome del file', () => {
    expect(nomeFileLettera('RSSMRA80A01H501U', '2026-10-12')).toBe('LetteraTFR_RSSMRA80A01H501U_2026-10-12.docx');
  });
});
