// Lettera TFR .docx (ticket 17). Il testo si legge dal document.xml del file (jszip arriva con docx).
import JSZip from 'jszip';
import {Packer} from 'docx';
import {describe, expect, it} from 'vitest';
import type {Pratica} from '../../archivio';
import {casiNormativiMiglioramento} from '../../casi-normativi/miglioramento';
import {casiNormativiPensioneTfs} from '../../casi-normativi/pensione-tfs';
import {calcolaPratica} from '../../motore';
import type {DatiPratica, Tabelle} from '../../motore';
import {tabelle} from '../../tabelle';
import {esitoLetteraMiglioramento, letteraMiglioramento, letteraTfr, nomeFileLettera, oggettoPredefinito, oggettoPredefinitoMiglioramento} from './lettera';
import type {ParametriLettera, ParametriLetteraMiglioramento} from './lettera';

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
    const prova: Tabelle = {...tabelle, lettere: {...tabelle.lettere, tfr: {...tabelle.lettere.tfr, riferimentoNormativo: 'RIFERIMENTO DI PROVA'}}};
    expect(oggettoPredefinito(prova)).toContain('RIFERIMENTO DI PROVA');
    expect(await testoDi({...parametri, oggetto: 'Oggetto scritto a mano'})).toContain('OGGETTO: Oggetto scritto a mano');
  });

  it('nome del file', () => {
    expect(nomeFileLettera('TFR', 'RSSMRA80A01H501U', '2026-10-12')).toBe('LetteraTFR_RSSMRA80A01H501U_2026-10-12.docx');
  });
});

// Lettera del miglioramento contrattuale (ticket 34): idoneità dal Risultato.
const praticaPensione = (dati: DatiPratica): Pratica => ({
  id: 'p1',
  enteId: 'e1',
  tipo: 'pensione',
  dati,
  congelati: [],
  creata: '2026-10-12T10:00:00.000Z',
  modificata: '2026-10-12T10:00:00.000Z',
} as Pratica);
const idoneita = (dati: DatiPratica) => esitoLetteraMiglioramento(praticaPensione(dati), calcolaPratica(dati, tabelle));
const mc = (id: string) => casiNormativiMiglioramento.find((c) => c.id === id)!.dati;

describe('lettera del miglioramento: quando si genera', () => {
  it('con la sezione calcolata e il contratto definitivo, in TFS e in TFR', () => {
    expect(idoneita(mc('MC-N01')).stato).toBe('pronta');
    expect(idoneita(mc('MC-N04')).stato).toBe('pronta');
  });

  it("non con un'ipotesi: nessun importo da inserire in PASSWEB", () => {
    const esito = idoneita(mc('MC-N05'));
    expect(esito.stato).toBe('non-generabile');
    if (esito.stato === 'non-generabile') expect(esito.motivi.join(' ')).toContain('ipotesi');
  });

  it('non con la sezione bloccata, e dice perché', () => {
    const esito = idoneita(mc('MC-N06'));
    expect(esito.stato).toBe('non-generabile');
    if (esito.stato === 'non-generabile') expect(esito.motivi.join(' ')).toContain('non applicabile');
  });

  it('non in una pratica senza miglioramento', () => {
    const senza = casiNormativiPensioneTfs[0].dati;
    expect(idoneita(senza).stato).toBe('non-generabile');
  });
});

const parametriMc: ParametriLetteraMiglioramento = {
  nomeComune: 'Prova',
  sedeInps: 'Fantasia',
  luogo: 'Prova',
  oggetto: oggettoPredefinitoMiglioramento(tabelle),
  data: '2026-10-12',
  dataPassweb: '2026-10-09',
  riferimentoNormativo: tabelle.lettere.miglioramento.riferimentoNormativo,
  regime: 'TFS',
  dipendente: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', cessazione: '2023-06-30'},
};

async function testoMc(p: ParametriLetteraMiglioramento) {
  const zip = await JSZip.loadAsync(await Packer.toBuffer(letteraMiglioramento(p)));
  const xml = await zip.file('word/document.xml')!.async('string');
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
}

describe('lettera del miglioramento contrattuale', () => {
  it('ente, data, data di inserimento in PASSWEB, anagrafica, oggetto e riferimento dalle tabelle', async () => {
    const t = await testoMc(parametriMc);
    for (const atteso of [
      'Comune di Prova',
      'Prova, 12/10/2026',
      'Sede Provinciale INPS di Fantasia',
      'in data 09/10/2026',
      `ai sensi dell’${tabelle.lettere.miglioramento.riferimentoNormativo}`,
      'Mario Rossi',
      'RSSMRA80A01H501U',
      '30/06/2023',
      `OGGETTO: ${tabelle.lettere.miglioramento.oggetto} (${tabelle.lettere.miglioramento.riferimentoNormativo})`,
    ]) {
      expect(t).toContain(atteso);
    }
  });

  it('nessun importo, forzatura o versione delle tabelle', async () => {
    const t = await testoMc(parametriMc);
    expect(t).not.toMatch(/€|\d+,\d{2}/);
    expect(t).not.toContain(tabelle.versione);
    expect(t.toLowerCase()).not.toContain('forzat');
  });

  it('in regime TFR chiede il ricalcolo del TFR per la persona; in TFS non lo nomina', async () => {
    expect(await testoMc({...parametriMc, regime: 'TFR'})).toContain('si richiede il ricalcolo del TFR');
    expect(await testoMc(parametriMc)).not.toContain('TFR');
  });

  it('il riferimento segue le tabelle; un oggetto modificato vince; nome del file', async () => {
    const prova: Tabelle = {...tabelle, lettere: {...tabelle.lettere, miglioramento: {...tabelle.lettere.miglioramento, riferimentoNormativo: 'RIFERIMENTO DI PROVA'}}};
    expect(oggettoPredefinitoMiglioramento(prova)).toContain('RIFERIMENTO DI PROVA');
    expect(await testoMc({...parametriMc, oggetto: 'Oggetto scritto a mano'})).toContain('OGGETTO: Oggetto scritto a mano');
    expect(nomeFileLettera('Miglioramento', 'RSSMRA80A01H501U', '2026-10-12')).toBe('LetteraMiglioramento_RSSMRA80A01H501U_2026-10-12.docx');
  });
});
