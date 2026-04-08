import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtEuro } from './utils/math';

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  motivoCessazione: string;
}

export function exportPensioneToPDF(
  anagrafica: Anagrafica,
  vociArricchite: any[],
  totaleVociFisseAnnuo: number,
  totaleTredicesimaMensilita: number
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Immedia S.p.A.', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Calcolo Ultimo Miglio Pensione', 14, 19);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo Calcolo', 14, 35);

  autoTable(doc, {
    startY: 40,
    head: [['Dati Anagrafici', '']],
    body: [
      ['Cognome e Nome', anagrafica.cognomeNome || '–'],
      ['Codice Fiscale', anagrafica.codiceFiscale || '–'],
      ['Data Inizio Periodo', anagrafica.dataInizio || '–'],
      ['Motivo Cessazione', anagrafica.motivoCessazione || '–'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const startY1 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Totali', 14, startY1);

  autoTable(doc, {
    startY: startY1 + 3,
    body: [
      ['Totale Voci Fisse e continuative (12 mensilità)', `€ ${fmtEuro(totaleVociFisseAnnuo)}`],
      ['Totale 13^ mensilità', `€ ${fmtEuro(totaleTredicesimaMensilita)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 'auto', halign: 'right' } },
  });

  const startY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio Voci Retributive', 14, startY2);

  autoTable(doc, {
    startY: startY2 + 3,
    head: [['ID', 'Voce', '13^', 'Mensile (€)', 'Annuo (€)']],
    body: vociArricchite
      .filter(v => v.catalogo)
      .map(v => [
        v.catalogo.id,
        v.catalogo.nome,
        v.catalogo.valido13 ? 'SI' : 'NO',
        fmtEuro(v.importoMensile),
        fmtEuro(v.importoAnnuo),
      ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 105 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generato il ${new Date().toLocaleString('it-IT')} – Immedia S.p.A.`, 14, footerY);

  doc.save(`UltimoMiglio_Pensione_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.pdf`);
}
