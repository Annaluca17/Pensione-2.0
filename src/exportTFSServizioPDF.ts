import jsPDF from 'jspdf';
import 'jspdf-autotable';

const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportTFSServizioToPDF(
  anagrafica: any,
  vociCalcolate: any[],
  risultato: any,
  mesiCalcolati: any[],
  totale13Step2: number
) {
  const doc = new jsPDF();

  // Intestazione
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('Calcolo Ultimo Miglio TFS - Tabella G', 14, 20);

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
      ['Data Fine Periodo', anagrafica.dataFine || '–'],
      ['Motivo Cessazione', anagrafica.motivoCessazione || '–'],
    ],
  });

  // Risultati Finali
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  (doc as any).autoTable({
    startY: finalY,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11, cellPadding: 4 },
    head: [['Componente', 'Importo Annuo (€)']],
    body: [
      ['Stipendio tabellare nuove Aree Tab G', fmtEuro(risultato.r1)],
      ['Retribuzione Ind. di Anzianità RIA', fmtEuro(risultato.r2)],
      ['Tredicesima mensilità', fmtEuro(risultato.r3)],
      ['Assegno ad personam assorbibile progressione verticale per 13 mensilità', fmtEuro(risultato.r4)],
      ['Indennità Aggiuntive personale asili nido per 12 mensilità', fmtEuro(risultato.r5)],
      ['Assegno personale non riassorbibile art 29', fmtEuro(risultato.r6)],
      ['Indennità 64,56 annue lorde ex 3^ 4^ qualifica', fmtEuro(risultato.r7)],
      ['Indennità di vigilanza per 12 mensilità', fmtEuro(risultato.r8)],
      ['Differenziali stipendiali', fmtEuro(risultato.r9)],
      ['TOTALE GENERALE', fmtEuro(risultato.totale)]
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
    head: [['Voce', 'Valido 13^', 'Mensile (€)', 'Annuo (€)']],
    body: vociCalcolate.map(v => [
      v.label,
      v.valido13 ? 'SI' : 'NO',
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

  const filename = `TFSServizio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
