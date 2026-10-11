// Lettera TFR .docx (ticket 17, storie 71, 76-78): una per pratica di cessazione, nessun importo,
// forzatura o versione. Forma della vecchia lettera (generateLetterTFR.ts) con una sola riga di tabella;
// oggetto predefinito dalle tabelle versionate, modificabile e non salvato; data = oggi, modificabile.
import {AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType} from 'docx';
import type {Tabelle} from '../../motore';

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
  dipendente: {nome: string; codiceFiscale: string; assunzione?: string; cessazione?: string};
}

/** Oggetto predefinito: testo e riferimento normativo dalle tabelle (cambiano con la versione). */
export const oggettoPredefinito = (tabelle: Tabelle) => `${tabelle.lettere.tfr.oggetto} (${tabelle.lettere.tfr.riferimentoNormativo})`;

export const nomeFileLettera = (codiceFiscale: string, data: string) => `LetteraTFR_${codiceFiscale || 'pratica'}_${data}.docx`;

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

export function letteraTfr(p: ParametriLettera): Document {
  const d = p.dipendente;
  const riga = (valori: string[], intestazione: boolean) =>
    new TableRow({tableHeader: intestazione, children: valori.map((v, i) => cella(v, COLONNE[i], intestazione))});
  return new Document({
    styles: {default: {document: {run: {font: 'Arial', size: 22}}}},
    sections: [
      {
        properties: {
          page: {size: {width: A4_W, height: A4_H}, margin: {top: MARGINE_ALTO, bottom: MARGINE_ALTO, left: MARGINE_LATO, right: MARGINE_LATO}},
        },
        children: [
          paragrafo([testo(`Comune di ${p.nomeComune}`, {bold: true, size: 26})], {spacing: {after: 120}}),
          paragrafo([testo('Ufficio Personale', {italics: true, color: '4A5568'})], {
            border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 1}},
          }),
          vuoto(),
          vuoto(),
          paragrafo([testo(`${p.luogo}, ${giorno(p.data)}`)], {alignment: AlignmentType.RIGHT}),
          vuoto(),
          vuoto(),
          paragrafo([testo('Alla', {italics: true})]),
          paragrafo([testo(`Sede Provinciale INPS di ${p.sedeInps}`, {bold: true})]),
          paragrafo([testo('Ufficio Pensioni — Gestione Dipendenti Pubblici')]),
          vuoto(),
          vuoto(),
          paragrafo([testo('OGGETTO: ', {bold: true}), testo(p.oggetto.trim(), {bold: true})], {
            border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: '2E4057', space: 1}},
          }),
          vuoto(),
          vuoto(),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: {after: 200},
            children: [
              testo(
                "Con la presente si comunica che, ai fini dell'aggiornamento della posizione assicurativa tramite sistema " +
                  'PASSWEB, sono stati inseriti i dati utili al calcolo del Trattamento di Fine Rapporto (TFR) del seguente ' +
                  'dipendente cessato dal servizio:',
              ),
            ],
          }),
          new Table({
            width: {size: LARGHEZZA, type: WidthType.DXA},
            columnWidths: [...COLONNE],
            rows: [
              riga(['Cognome e Nome', 'Codice Fiscale', 'Data Assunzione', 'Data Cessazione'], true),
              riga([d.nome, d.codiceFiscale, giorno(d.assunzione), giorno(d.cessazione)], false),
            ],
          }),
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

export const letteraTfrBlob = (p: ParametriLettera) => Packer.toBlob(letteraTfr(p));
