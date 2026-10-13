// Lettera TFR .docx (ticket 17, storie 71, 76-78): per una o più pratiche di cessazione dello stesso ente
// (ticket 10 delle prove), nessun importo, forzatura o versione. Forma della vecchia lettera (generateLetterTFR.ts);
// oggetto predefinito dalle tabelle versionate, modificabile e non salvato; data = oggi, modificabile.
import {AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType} from 'docx';
import type {Pratica} from '../../archivio';
import {spiega} from '../../motore';
import type {Risultato, Tabelle} from '../../motore';

const A4_W = 11906;
const A4_H = 16838;
const MARGINE_ALTO = 1418; // 2,5 cm
const MARGINE_LATO = 1700; // 3 cm
const LARGHEZZA = A4_W - MARGINE_LATO * 2;
const COLONNE = [3346, 2360, 1400, 1400] as const;

/** I dati fissi della lettera, salvati sull'ente (storia 71). */
export interface DatiEnteLettera {
  nomeComune: string;
  sedeInps: string;
  luogo: string;
}

export interface ParametriLettera extends DatiEnteLettera {
  oggetto: string;
  /** aaaa-mm-gg */
  data: string;
  /** Uno o più dipendenti: una riga di tabella ciascuno, ordinati per nome. */
  dipendenti: {nome: string; codiceFiscale: string; assunzione?: string; cessazione?: string}[];
}

/** Oggetto predefinito: testo e riferimento normativo dalle tabelle (cambiano con la versione). */
export const oggettoPredefinito = (tabelle: Tabelle) => `${tabelle.lettere.tfr.oggetto} (${tabelle.lettere.tfr.riferimentoNormativo})`;

/** Oggetto predefinito del miglioramento: testo e riferimento dalle tabelle (ticket 34). */
export const oggettoPredefinitoMiglioramento = (tabelle: Tabelle) =>
  `${tabelle.lettere.miglioramento.oggetto} (${tabelle.lettere.miglioramento.riferimentoNormativo})`;

export const nomeFileLettera = (tipo: 'TFR' | 'Miglioramento', codiceFiscale: string, data: string) =>
  `Lettera${tipo}_${codiceFiscale || 'pratica'}_${data}.docx`;

/** Con più dipendenti il file porta il nome dell'ente (ripulito dai caratteri vietati nei nomi di file). */
export const nomeFileLetteraEnte = (tipo: 'TFR' | 'Miglioramento', ente: string, data: string) =>
  `Lettera${tipo}_${ente.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'ente'}_${data}.docx`;

const perNome = <T extends {nome: string}>(dipendenti: T[]) => [...dipendenti].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

const giorno = (d?: string) => (d && d.length >= 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
const testo = (t: string, opzioni: Record<string, unknown> = {}) => new TextRun({text: t, font: 'Arial', size: 22, ...opzioni});
const paragrafo = (figli: TextRun[], opzioni: Record<string, unknown> = {}) => new Paragraph({children: figli, spacing: {after: 0}, ...opzioni});
const vuoto = () => paragrafo([testo('')]);
const bordo = {style: BorderStyle.SINGLE, size: 4, color: '2E4057'};
const bordi = {top: bordo, bottom: bordo, left: bordo, right: bordo};

function cella(t: string, larghezza: number, intestazione: boolean) {
  return new TableCell({
    borders: bordi,
    width: {size: larghezza, type: WidthType.DXA},
    shading: {fill: intestazione ? '2E4057' : 'FFFFFF', type: ShadingType.CLEAR},
    margins: {top: 80, bottom: 80, left: 120, right: 120},
    children: [paragrafo([testo(t, intestazione ? {bold: true, color: 'FFFFFF', size: 20} : {size: 20})])],
  });
}

interface Struttura {
  nomeComune: string;
  sedeInps: string;
  luogo: string;
  data: string;
  oggetto: string;
  corpo: (TextRun | string)[];
  colonne: readonly number[];
  intestazioni: string[];
  righe: string[][];
  dopoTabella?: string;
}

function documento(s: Struttura): Document {
  const riga = (valori: string[], intestazione: boolean) =>
    new TableRow({tableHeader: intestazione, children: valori.map((v, i) => cella(v, s.colonne[i], intestazione))});
  return new Document({
    styles: {default: {document: {run: {font: 'Arial', size: 22}}}},
    sections: [
      {
        properties: {
          page: {size: {width: A4_W, height: A4_H}, margin: {top: MARGINE_ALTO, bottom: MARGINE_ALTO, left: MARGINE_LATO, right: MARGINE_LATO}},
        },
        children: [
          paragrafo([testo(`Comune di ${s.nomeComune}`, {bold: true, size: 26})], {spacing: {after: 120}}),
          paragrafo([testo('Ufficio Personale', {italics: true, color: '4A5568'})], {
            border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 1}},
          }),
          vuoto(),
          vuoto(),
          paragrafo([testo(`${s.luogo}, ${giorno(s.data)}`)], {alignment: AlignmentType.RIGHT}),
          vuoto(),
          vuoto(),
          paragrafo([testo('Alla', {italics: true})]),
          paragrafo([testo(`Sede Provinciale INPS di ${s.sedeInps}`, {bold: true})]),
          paragrafo([testo('Ufficio Pensioni — Gestione Dipendenti Pubblici')]),
          vuoto(),
          vuoto(),
          paragrafo([testo('OGGETTO: ', {bold: true}), testo(s.oggetto.trim(), {bold: true})], {
            border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: '2E4057', space: 1}},
          }),
          vuoto(),
          vuoto(),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: {after: 200},
            children: s.corpo.map((c) => (typeof c === 'string' ? testo(c) : c)),
          }),
          new Table({
            width: {size: LARGHEZZA, type: WidthType.DXA},
            columnWidths: [...s.colonne],
            rows: [riga(s.intestazioni, true), ...s.righe.map((r) => riga(r, false))],
          }),
          ...(s.dopoTabella
            ? [new Paragraph({alignment: AlignmentType.JUSTIFIED, spacing: {before: 200, after: 200}, children: [testo(s.dopoTabella)]})]
            : []),
          vuoto(),
          vuoto(),
          vuoto(),
          paragrafo([testo('Distinti saluti,')], {spacing: {after: 1200}}),
          paragrafo([testo('')], {border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: '94A3B8', space: 1}}}),
          paragrafo([testo('Firma e Timbro', {size: 20, color: '94A3B8', italics: true})]),
        ],
      },
    ],
  });
}

export function letteraTfr(p: ParametriLettera): Document {
  const dipendenti = perNome(p.dipendenti);
  const plurale = dipendenti.length > 1;
  return documento({
    ...p,
    corpo: [
      "Con la presente si comunica che, ai fini dell'aggiornamento della posizione assicurativa tramite sistema " +
        `PASSWEB, sono stati inseriti i dati utili al calcolo del Trattamento di Fine Rapporto (TFR) ${plurale ? 'dei seguenti ' : 'del seguente '}` +
        `${plurale ? 'dipendenti cessati' : 'dipendente cessato'} dal servizio:`,
    ],
    colonne: COLONNE,
    intestazioni: ['Cognome e Nome', 'Codice Fiscale', 'Data Assunzione', 'Data Cessazione'],
    righe: dipendenti.map((d) => [d.nome, d.codiceFiscale, giorno(d.assunzione), giorno(d.cessazione)]),
  });
}

export interface ParametriLetteraMiglioramento extends DatiEnteLettera {
  oggetto: string;
  /** aaaa-mm-gg */
  data: string;
  /** Il giorno in cui i miglioramenti sono stati inseriti in PASSWEB, aaaa-mm-gg. */
  dataPassweb: string;
  /** Il riferimento normativo del corpo, dalle tabelle versionate. */
  riferimentoNormativo: string;
  /** Uno o più dipendenti, ordinati per nome; in regime TFR la lettera chiede anche il ricalcolo del TFR (C21-8). */
  dipendenti: {nome: string; codiceFiscale: string; cessazione?: string; regime: 'TFS' | 'TFR'}[];
}

const COLONNE_MIGLIORAMENTO = [3346, 2860, 2300] as const;

export function letteraMiglioramento(p: ParametriLetteraMiglioramento): Document {
  const dipendenti = perNome(p.dipendenti);
  const plurale = dipendenti.length > 1;
  const inTfr = dipendenti.filter((d) => d.regime === 'TFR').map((d) => d.nome);
  const ricalcolo = !inTfr.length
    ? undefined
    : plurale
      ? `Per i seguenti dipendenti si richiede anche il ricalcolo del TFR: ${inTfr.join(', ')}.`
      : 'Per il dipendente indicato si richiede il ricalcolo del TFR.';
  return documento({
    ...p,
    corpo: [
      'Con la presente si comunica che in data ',
      testo(giorno(p.dataPassweb), {bold: true}),
      ` sono stati inseriti, tramite sistema PASSWEB, i miglioramenti contrattuali ai sensi dell’${p.riferimentoNormativo} ` +
        (plurale ? 'per i seguenti dipendenti già posti in quiescenza:' : 'per il seguente dipendente già posto in quiescenza:'),
    ],
    colonne: COLONNE_MIGLIORAMENTO,
    intestazioni: ['Cognome e Nome', 'Codice Fiscale', 'Data Cessazione'],
    righe: dipendenti.map((d) => [d.nome, d.codiceFiscale, giorno(d.cessazione)]),
    dopoTabella: ricalcolo,
  });
}

export const letteraTfrBlob = (p: ParametriLettera) => Packer.toBlob(letteraTfr(p));
export const letteraMiglioramentoBlob = (p: ParametriLetteraMiglioramento) => Packer.toBlob(letteraMiglioramento(p));

export type EsitoLetteraMiglioramento = {stato: 'pronta'} | {stato: 'non-generabile'; motivi: string[]};

/** La lettera del miglioramento si genera solo con la sezione calcolata e il contratto definitivo (ticket 34). */
export function esitoLetteraMiglioramento(pratica: Pratica, risultato: Risultato): EsitoLetteraMiglioramento {
  const m = risultato.sezioni.miglioramento;
  if (pratica.tipo !== 'pensione' || !pratica.dati.miglioramento || !m) {
    return {stato: 'non-generabile', motivi: ['La pratica non ha il miglioramento contrattuale.']};
  }
  if (m.esito === 'bloccata') return {stato: 'non-generabile', motivi: m.motivi.map((b) => spiega(b))};
  if (m.stato === 'ipotesi') {
    return {stato: 'non-generabile', motivi: [`Il contratto ${m.contratto} è ancora un'ipotesi: nessun miglioramento da comunicare finché non è firmato.`]};
  }
  return {stato: 'pronta'};
}
