/**
 * generateLetterTFR.ts — Generatore lettera INPS Ultimo Miglio TFR (.docx)
 * Immedia S.p.A.
 *
 * Adattamento di generateLetter.ts. Differenze principali:
 *   - Oggetto/riferimento normativo EDITABILE (passato come parametro, non cablato).
 *   - Tabella a 5 colonne: N. | Cognome e Nome | Codice Fiscale | Data Assunzione | Data Cessazione.
 *
 * Formato pagina: A4 (11906 × 16838 DXA)
 * Margini: 2,5 cm top/bottom (1418 DXA), 3 cm left/right (1700 DXA)
 * Content width: 11906 − 3400 = 8506 DXA
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
} from 'docx';
import type { DipendenteTFR } from '../types/projectTFR';

// ─── Costanti layout ──────────────────────────────────────────────────────────

const A4_W      = 11906;
const A4_H      = 16838;
const MARGIN_TB = 1418;  // 2,5 cm
const MARGIN_LR = 1700;  // 3 cm
const CONTENT_W = A4_W - MARGIN_LR * 2;  // 8506 DXA

// Colonne: N° | Cognome e Nome | Codice Fiscale | Data Assunzione | Data Cessazione
// Somma = CONTENT_W = 8506
const COL_W = [460, 2746, 2100, 1600, 1600] as const;

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

function buildTable(dipendenti: DipendenteTFR[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: (
      [
        { text: 'N.',              w: COL_W[0], align: AlignmentType.CENTER },
        { text: 'Cognome e Nome',  w: COL_W[1], align: AlignmentType.LEFT   },
        { text: 'Codice Fiscale',  w: COL_W[2], align: AlignmentType.LEFT   },
        { text: 'Data Assunzione', w: COL_W[3], align: AlignmentType.LEFT   },
        { text: 'Data Cessazione', w: COL_W[4], align: AlignmentType.LEFT   },
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
          { text: String(i + 1),                          w: COL_W[0], align: AlignmentType.CENTER },
          { text: `${d.cognome} ${d.nome}`.trim(),        w: COL_W[1], align: AlignmentType.LEFT   },
          { text: d.cf,                                   w: COL_W[2], align: AlignmentType.LEFT   },
          { text: fmtDate(d.dataAssunzione),              w: COL_W[3], align: AlignmentType.LEFT   },
          { text: fmtDate(d.dataCessazione),              w: COL_W[4], align: AlignmentType.LEFT   },
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

export const DEFAULT_OGGETTO_TFR =
  'Comunicazione dati retributivi utili al calcolo del TFR — inserimento PASSWEB';

export interface LetterTFRParams {
  nomeComune:       string;
  sedeProv:         string;
  luogo:            string;
  oggetto:          string;  // riferimento normativo EDITABILE
  dataElaborazione: string;  // ISO 'YYYY-MM-DD'
  dipendenti:       DipendenteTFR[];
}

export async function generateLetterTFRDocx(params: LetterTFRParams): Promise<void> {
  const { nomeComune, sedeProv, luogo, oggetto, dataElaborazione, dipendenti } = params;
  const oggettoText = (oggetto && oggetto.trim()) ? oggetto.trim() : DEFAULT_OGGETTO_TFR;

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
          para([run('Ufficio Pensioni — Gestione Dipendenti Pubblici')], { spacing: { after: 0 } }),

          empty(),
          empty(),

          // ── Oggetto (editabile) ───────────────────────────────────────────
          para([
            run('OGGETTO: ', { bold: true }),
            run(oggettoText, { bold: true }),
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
              run(
                'Con la presente si trasmettono, ai fini dell’aggiornamento della posizione assicurativa ' +
                'tramite sistema PASSWEB, i dati retributivi utili al calcolo del Trattamento di Fine Rapporto (TFR) ' +
                'relativi ai seguenti dipendenti cessati dal servizio:'
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
              `Documento generato in data ${fmtDate(dataElaborazione)} tramite XDESK — Immedia S.p.A. ` +
              `— ${dipendenti.length} dipendente${dipendenti.length !== 1 ? 'i' : ''} incluso${dipendenti.length !== 1 ? 'i' : ''}`,
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
  a.download = `LetteraTFR_${nomeComune.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
