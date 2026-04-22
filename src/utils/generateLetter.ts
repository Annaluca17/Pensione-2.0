/**
 * generateLetter.ts — Generatore lettera ufficiale INPS PASSWEB (.docx)
 * Immedia S.p.A.
 *
 * Dipendenza: npm install docx
 * Riferimento normativo fisso: Art. 57, comma 2 — CCNL Funzioni Locali 2022/2024
 *
 * Formato pagina: A4 (11906 × 16838 DXA)
 * Margini: 2,5 cm top/bottom (1418 DXA), 3 cm left/right (1700 DXA)
 * Content width: 11906 − 3400 = 8506 DXA
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
} from 'docx';
import type { Dipendente } from '../types/project';

// ─── Costanti layout ──────────────────────────────────────────────────────────

const A4_W         = 11906;
const A4_H         = 16838;
const MARGIN_TB    = 1418;  // 2,5 cm
const MARGIN_LR    = 1700;  // 3 cm
const CONTENT_W    = A4_W - MARGIN_LR * 2;  // 8506 DXA

// Colonne tabella: N° | Cognome e Nome | Codice Fiscale | Data Cessazione
// Somma = CONTENT_W = 8506
const COL_W = [500, 3006, 2300, 2700] as const;

// ─── Helper stili ─────────────────────────────────────────────────────────────

const borderCell = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: '2E4057' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E4057' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: '2E4057' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: '2E4057' },
};

const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const run = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text, font: 'Arial', size: 22, ...opts });

const para = (children: TextRun[], opts: Record<string, unknown> = {}) =>
  new Paragraph({ children, spacing: { after: 0 }, ...opts });

const empty = () =>
  new Paragraph({ children: [run('')], spacing: { after: 0 } });

const fmtDate = (d: string): string => {
  if (!d || d.length < 10) return d || '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

// ─── Costruzione tabella dipendenti ───────────────────────────────────────────

function buildTable(dipendenti: Dipendente[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: (
      [
        { text: 'N.',               w: COL_W[0], align: AlignmentType.CENTER },
        { text: 'Cognome e Nome',   w: COL_W[1], align: AlignmentType.LEFT   },
        { text: 'Codice Fiscale',   w: COL_W[2], align: AlignmentType.LEFT   },
        { text: 'Data Cessazione',  w: COL_W[3], align: AlignmentType.LEFT   },
      ] as const
    ).map(({ text, w, align }) =>
      new TableCell({
        borders: borderCell,
        width: { size: w, type: WidthType.DXA },
        shading: { fill: '2E4057', type: ShadingType.CLEAR },
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: align,
            spacing: { after: 0 },
            children: [run(text, { bold: true, color: 'FFFFFF', size: 20 })],
          }),
        ],
      })
    ),
  });

  const dataRows = dipendenti.map((d, i) =>
    new TableRow({
      children: (
        [
          { text: String(i + 1),         w: COL_W[0], align: AlignmentType.CENTER },
          { text: d.nome,                w: COL_W[1], align: AlignmentType.LEFT   },
          { text: d.cf,                  w: COL_W[2], align: AlignmentType.LEFT   },
          { text: fmtDate(d.dataCessazione), w: COL_W[3], align: AlignmentType.LEFT },
        ] as const
      ).map(({ text, w, align }) =>
        new TableCell({
          borders: borderCell,
          width: { size: w, type: WidthType.DXA },
          shading: {
            fill: i % 2 === 0 ? 'FFFFFF' : 'EEF2F7',
            type: ShadingType.CLEAR,
          },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: align,
              spacing: { after: 0 },
              children: [run(text, { size: 20 })],
            }),
          ],
        })
      ),
    })
  );

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [...COL_W],
    rows: [headerRow, ...dataRows],
  });
}

// ─── Interfaccia pubblica ─────────────────────────────────────────────────────

export interface LetterParams {
  nomeComune:       string;
  sedeProv:         string;
  luogo:            string;
  dataPASWEB:       string;  // ISO 'YYYY-MM-DD'
  dataElaborazione: string;  // ISO 'YYYY-MM-DD'
  dipendenti:       Dipendente[];
}

export async function generateLetterDocx(params: LetterParams): Promise<void> {
  const { nomeComune, sedeProv, luogo, dataPASWEB, dataElaborazione, dipendenti } = params;

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size:   { width: A4_W, height: A4_H },
            margin: { top: MARGIN_TB, bottom: MARGIN_TB, left: MARGIN_LR, right: MARGIN_LR },
          },
        },
        children: [
          // ── Intestazione mittente ────────────────────────────────────────
          para([run(`Comune di ${nomeComune}`, { bold: true, size: 26 })], {
            spacing: { after: 120 },
          }),
          para([run('Ufficio Personale', { italics: true, color: '4A5568' })], {
            spacing: { after: 0 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 1 } },
          }),

          empty(),
          empty(),

          // ── Data e luogo (destra) ────────────────────────────────────────
          para([run(`${luogo}, ${fmtDate(dataElaborazione)}`)], {
            alignment: AlignmentType.RIGHT,
            spacing: { after: 0 },
          }),

          empty(),
          empty(),

          // ── Destinatario ─────────────────────────────────────────────────
          para([run('Alla', { italics: true })]),
          para([run(`Sede Provinciale INPS di ${sedeProv}`, { bold: true })], {
            spacing: { after: 0 },
          }),
          para([run('Ufficio Pensioni')], { spacing: { after: 0 } }),

          empty(),
          empty(),

          // ── Oggetto ───────────────────────────────────────────────────────
          para([
            run('OGGETTO:\u00A0', { bold: true }),
            run(
              'Comunicazione inserimento miglioramenti contrattuali tramite sistema PASSWEB \u2014 CCNL Funzioni Locali 2022/2024',
              { bold: true }
            ),
          ], { spacing: { after: 0 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2E4057', space: 1 } },
          }),

          empty(),
          empty(),

          // ── Corpo lettera ─────────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            children: [
              run('Con la presente si comunica che in data '),
              run(fmtDate(dataPASWEB), { bold: true }),
              run(
                ' sono stati inseriti, tramite sistema PASSWEB, i miglioramenti contrattuali' +
                ' ai sensi dell\u2019Art.\u00A057, comma\u00A02 del CCNL 2022/2024,' +
                ' per i seguenti dipendenti gi\u00E0 posti in quiescenza:'
              ),
            ],
          }),

          // ── Tabella dipendenti ────────────────────────────────────────────
          buildTable(dipendenti),

          empty(),
          empty(),
          empty(),

          // ── Chiusura ──────────────────────────────────────────────────────
          para([run('Distinti saluti,')], { spacing: { after: 1200 } }),

          para([run('')], {
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '94A3B8', space: 1 },
            },
          }),

          para([run('Firma e Timbro', { size: 20, color: '94A3B8', italics: true })], {
            spacing: { after: 0 },
          }),

          empty(),

          // ── Nota a piè ────────────────────────────────────────────────────
          para([
            run(
              `Documento generato in data ${fmtDate(dataElaborazione)} tramite XDESK \u2014 Immedia S.p.A. ` +
              `\u2014 ${dipendenti.length} dipendente${dipendenti.length !== 1 ? 'i' : ''} incluso${dipendenti.length !== 1 ? 'i' : ''}`,
              { size: 16, color: 'B0BEC5' }
            ),
          ], {
            alignment: AlignmentType.CENTER,
            border: {
              top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0', space: 1 },
            },
            spacing: { before: 200, after: 0 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `LetteraPASWEB_${nomeComune.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
