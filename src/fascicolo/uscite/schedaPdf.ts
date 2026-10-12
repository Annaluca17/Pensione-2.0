// Disegna la scheda in PDF con jsPDF (ticket 16). Il contenuto lo decide costruisciScheda.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {Scheda} from './scheda';

type ConTabella = jsPDF & {lastAutoTable?: {finalY: number}};

export function schedaPdf(scheda: Scheda, generata: string): jsPDF {
  const doc = new jsPDF({unit: 'mm', format: 'a4'}) as ConTabella;
  const larghezza = doc.internal.pageSize.getWidth();
  const dopo = () => (doc.lastAutoTable?.finalY ?? 30) + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(scheda.titolo, 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generata il ${generata}`, larghezza - 14, 18, {align: 'right'});

  const stile = {theme: 'grid' as const, styles: {fontSize: 9, cellPadding: 1.8}, headStyles: {fillColor: [30, 41, 59] as [number, number, number]}};
  autoTable(doc, {...stile, startY: 24, body: scheda.intestazione, columnStyles: {0: {cellWidth: 50, fontStyle: 'bold'}}});

  for (const blocco of scheda.blocchi) {
    if (blocco.righe && blocco.righe.length > 0) {
      autoTable(doc, {...stile, startY: dopo(), head: [[blocco.titolo, 'Valore']], body: blocco.righe, columnStyles: {1: {halign: 'right', cellWidth: 60}}});
    }
    if (blocco.motivi) {
      // Con le righe sono i mesi non preparati; da soli, la sezione bloccata.
      const testa = blocco.righe ? blocco.titolo : `${blocco.titolo}: sezione bloccata`;
      autoTable(doc, {...stile, startY: dopo(), head: [[testa]], body: blocco.motivi.map((m) => [m])});
    }
  }

  if (scheda.forzature.length > 0) {
    autoTable(doc, {
      ...stile,
      startY: dopo(),
      head: [['Forzature', 'Proposto', 'Usato', 'Forzato']],
      body: scheda.forzature.map((f) => [f.campo, f.proposto, f.usato, f.forzato]),
    });
  }
  if (scheda.avvisi.length > 0) {
    autoTable(doc, {...stile, startY: dopo(), head: [['Avvisi']], body: scheda.avvisi.map((a) => [a])});
  }

  const pagine = doc.getNumberOfPages();
  for (let p = 1; p <= pagine; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Tabelle versione ${scheda.versioneTabelle} · pagina ${p} di ${pagine}`, 14, doc.internal.pageSize.getHeight() - 8);
  }
  return doc;
}
