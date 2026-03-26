import jsPDF from 'jspdf';
import 'jspdf-autotable';

const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportPensioneToPDF(
  anagrafica: any,
  vociArricchite: any[],
  totaleVociFisseAnnuo: number,
  totaleTredicesimaMensilita: number
) {
  const doc = new jsPDF();

  // Intestazione
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('Calcolo Ultimo Miglio Pensione', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 28);

  // Anagrafica
  (doc as any).autoTable({
    startY: 35,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 50 },
      1: { textColor: [15, 23, 42] },
    },
    head: [],
    body: [
      ['Cognome e Nome', anagrafica.cognomeNome || '–'],
      ['Codice Fiscale', anagrafica.codiceFiscale || '–'],
      ['Data Inizio Periodo', anagrafica.dataInizio || '–'],
      ['Motivo Cessazione', anagrafica.motivoCessazione || '–'],
    ],
  });

  // Riepilogo
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  (doc as any).autoTable({
    startY: finalY,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11, cellPadding: 4 },
    head: [['Riepilogo Calcolo', 'Importo (€)']],
    body: [
      ['Totale Voci Fisse e continuative per 12 mensilità', fmtEuro(totaleVociFisseAnnuo)],
      ['Totale 13^ mensilità', fmtEuro(totaleTredicesimaMensilita)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Dettaglio Voci
  const vociY = (doc as any).lastAutoTable.finalY + 10;
  
  (doc as any).autoTable({
    startY: vociY,
    theme: 'striped',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    head: [['Voce', 'Valido 13^', 'Importo Mensile (€)', 'Importo Annuo (€)']],
    body: vociArricchite.filter(v => v.catalogo).map(v => [
      v.catalogo.nome,
      v.catalogo.valido13 ? 'SI' : 'NO',
      fmtEuro(v.importoMensile),
      fmtEuro(v.importoAnnuo)
    ]),
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  const filename = `Pensione_UltimoMiglio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
