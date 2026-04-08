import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Anagrafica, RisultatoCalcolo } from './types';
import { fmtEuro } from './utils/math';

export function exportToPDF(anagrafica: Anagrafica, risultato: RisultatoCalcolo) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Immedia S.p.A.', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Calcolo Ultimo Miglio TFS – Ex Dipendenti in Pensione', 14, 19);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo Calcolo', 14, 35);

  // Anagrafica
  autoTable(doc, {
    startY: 40,
    head: [['Dati Anagrafici', '']],
    body: [
      ['Cognome e Nome', anagrafica.cognomeNome || '–'],
      ['Codice Fiscale', anagrafica.codiceFiscale || '–'],
      ['Qualifica', anagrafica.qualifica || '–'],
      ['Data Pensionamento', anagrafica.dataPensione || '–'],
      ['Motivo Cessazione', anagrafica.motivoCessazione || '–'],
      ['Ente', anagrafica.ente || '–'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  // Ultimo Miglio TFS
  const startY1 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Ultimo Miglio TFS', 14, startY1);

  autoTable(doc, {
    startY: startY1 + 3,
    head: [['Componente', 'Importo (€)']],
    body: [
      ['Retribuzione Ind. di Anzianità (R.I.A.)', fmtEuro(risultato.ria)],
      ['Tredicesima mensilità', fmtEuro(risultato.tredicesima)],
      ['Stipendio tabellare TAB E (compreso differenziali, IIS, IVC)', fmtEuro(risultato.stipTabellare)],
      ['Indennità Aggiuntive asili nido (voce 72 + 78)', fmtEuro(risultato.indAsili)],
      ['Indennità di EUR 64,56 annue lorde (ex 3^ e 4^ Qualifica)', fmtEuro(risultato.ind6456)],
      ['Indennità di vigilanza', fmtEuro(risultato.indVigilanza)],
      ['TOTALE ULTIMO MIGLIO TFS', fmtEuro(risultato.totaleUltimoMiglio)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 'auto', halign: 'right' } },
    didParseCell: (data) => {
      // Evidenzia ultima riga (totale)
      const isLastRow = data.row.index === data.table.body.length - 1;
      if (isLastRow && data.section === 'body') {
        data.cell.styles.fillColor = [224, 242, 254];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
    },
  });

  // Dettaglio voci
  const startY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio Voci Retributive', 14, startY2);

  autoTable(doc, {
    startY: startY2 + 3,
    head: [['Voce', '13^', 'Mensile (€)', 'Annuo (€)']],
    body: risultato.vociAnnualizzate.map(v => [
      v.label,
      v.valido13 ? 'SI' : 'NO',
      fmtEuro(v.importoMensile),
      fmtEuro(v.importoAnnuo ?? 0),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
  });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Generato il ${new Date().toLocaleString('it-IT')} – Immedia S.p.A.`,
    14,
    footerY
  );

  doc.save(`TFS_UltimoMiglio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.pdf`);
}
