import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Anagrafica, RisultatoCalcolo } from './types';
import { MESI_LABELS } from './types';

const fmtEuro = (n: number) =>
  '€ ' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportToPDF(anagrafica: Anagrafica, risultato: RisultatoCalcolo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CALCOLO ULTIMO MIGLIO TFS', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Ex Dipendenti in Pensione – INPS Enti Locali', 14, 19);
  doc.text('Immedia S.p.A. – www.immediaspa.com', 14, 25);
  doc.setTextColor(26, 26, 46);
  y = 36;

  // ── Data/ora ────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(136, 136, 170);
  doc.text(`Calcolo effettuato il ${new Date().toLocaleString('it-IT')}`, W - 14, 8, { align: 'right' });
  doc.setTextColor(26, 26, 46);

  // ── Anagrafica ──────────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dati Anagrafici', 14, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [],
    body: [
      ['Cognome e Nome', anagrafica.cognomeNome || '–'],
      ['Codice Fiscale', anagrafica.codiceFiscale || '–'],
      ['Qualifica', anagrafica.qualifica || '–'],
      ['Data Pensionamento', anagrafica.dataPensione || '–'],
      ['Ente', anagrafica.ente || '–'],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 244, 240] }, 1: { cellWidth: 120 } },
    theme: 'plain',
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Voci retributive ─────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Voci Retributive Annualizzate', 14, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Voce', '13^', 'Mensile (€)', 'Annuo (€)']],
    body: risultato.vociAnnualizzate.map(v => [
      v.label,
      v.valido13 ? 'SI' : 'NO',
      fmtEuro(v.importoMensile),
      fmtEuro(v.importoAnnuo),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [26, 26, 46], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [249, 248, 245] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Ultimo Miglio TFS ─────────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ultimo Miglio TFS', 14, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Importo (€)']],
    body: [
      ['Retribuzione Ind. di Anzianità (R.I.A.)', fmtEuro(risultato.ria)],
      ['Tredicesima mensilità', fmtEuro(risultato.tredicesima)],
      ['Stipendio tabellare TAB E', fmtEuro(risultato.stipTabellare)],
      ['Indennità Aggiuntive asili nido e scolastico (voce 72 + 78)', fmtEuro(risultato.indAsili)],
      ['Indennità di EUR 64,56 annue lorde (ex 3^ e 4^ Qualifica)', fmtEuro(risultato.ind6456)],
      ['Indennità di vigilanza', fmtEuro(risultato.indVigilanza)],
      ['TOTALE ULTIMO MIGLIO TFS', fmtEuro(risultato.totaleUltimoMiglio)],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [26, 26, 46], textColor: 255 },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 32, halign: 'right' } },
    didDrawCell: (data) => {
      if (data.row.index === 6) {
        doc.setFillColor(200, 57, 43);
      }
    },
    bodyStyles: {},
    // Evidenzia ultima riga
    willDrawCell: (data) => {
      if (data.row.index === 6 && data.section === 'body') {
        data.cell.styles.fillColor = [200, 57, 43];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Dettaglio 12 mesi ─────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio Stipendi Ultimi 12 Mesi', 14, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Mese', 'Stipendio (€)', '13^ pro-rata (€)']],
    body: [
      ...MESI_LABELS.map((m, i) => [
        m,
        fmtEuro(risultato.stipendiMensili[i]?.stipendio ?? 0),
        fmtEuro(risultato.stipendiMensili[i]?.tredicesima ?? 0),
      ]),
      ['TOTALE', fmtEuro(risultato.totaleStipendi12mesi), fmtEuro(risultato.totaleTredicesime12mesi)],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [26, 26, 46], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 50, halign: 'right' },
    },
    willDrawCell: (data) => {
      if (data.row.index === 12 && data.section === 'body') {
        data.cell.styles.fillColor = [245, 240, 224];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    alternateRowStyles: { fillColor: [249, 248, 245] },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(136, 136, 170);
    doc.text(
      `Documento riservato – Immedia S.p.A. | Pagina ${i} di ${pages}`,
      W / 2, doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const filename = `TFS_UltimoMiglio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
