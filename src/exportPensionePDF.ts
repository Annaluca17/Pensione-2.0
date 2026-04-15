import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtEuro } from './utils/math';

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  motivoCessazione: string;
}

interface MiglioramentoContrattuale {
  attivo: boolean;
  mansione: string;
  area: string;
  decorrenza: '2024' | '2026';
  nuovoTabellare: number;
  vociArricchiteMC: any[];
  totaleVociFisseAnnuoMC: number;
  totaleTredicesimaMensilita_MC: number;
}

export function exportPensioneToPDF(
  anagrafica: Anagrafica,
  vociArricchite: any[],
  totaleVociFisseAnnuo: number,
  totaleTredicesimaMensilita: number,
  mc?: MiglioramentoContrattuale
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
      ['Cognome e Nome', anagrafica.cognomeNome || '-'],
      ['Codice Fiscale', anagrafica.codiceFiscale || '-'],
      ['Data Inizio Periodo', anagrafica.dataInizio || '-'],
      ['Motivo Cessazione', anagrafica.motivoCessazione || '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
  });

  const startY1 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Totali - CCNL 2019-2021 (situazione attuale)', 14, startY1);
  autoTable(doc, {
    startY: startY1 + 3,
    body: [
      ['Totale Voci Fisse e continuative (12 mensilita)', `EUR ${fmtEuro(totaleVociFisseAnnuo)}`],
      ['Totale 13^ mensilita', `EUR ${fmtEuro(totaleTredicesimaMensilita)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 'auto', halign: 'right' } },
  });

  const startY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio Voci Retributive - CCNL 2019-2021', 14, startY2);
  autoTable(doc, {
    startY: startY2 + 3,
    head: [['ID', 'Voce', '13^', 'Mensile (EUR)', 'Annuo (EUR)']],
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

  if (mc && mc.attivo && mc.vociArricchiteMC && mc.vociArricchiteMC.length > 0) {
    doc.addPage();

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
    doc.setTextColor(180, 83, 9);
    doc.text('Miglioramento Contrattuale - CCNL 2022-2024', 14, 35);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 40,
      head: [['Dati Miglioramento Contrattuale - Valori da inserire in PASSWEB']],
      body: [
        [`Area / Posizione: ${mc.area} - ${mc.mansione}`],
        [`Decorrenza CCNL 2022-2024: dal 01.01.${mc.decorrenza}`],
        [`Nuovo stipendio tabellare mensile (Tab. G): EUR ${fmtEuro(mc.nuovoTabellare)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontStyle: 'bold', textColor: [120, 53, 15] },
      styles: { fontSize: 9, cellPadding: 2.5, fillColor: [255, 251, 235] },
    });

    const startMC1 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Confronto Totali - Situazione da inserire in PASSWEB', 14, startMC1);
    autoTable(doc, {
      startY: startMC1 + 3,
      head: [['Voce', 'CCNL 2019-2021 (EUR)', 'CCNL 2022-2024 (EUR)', 'Differenza (EUR)']],
      body: [
        [
          'Totale Voci Fisse annuo (12 mensilita)',
          fmtEuro(totaleVociFisseAnnuo),
          fmtEuro(mc.totaleVociFisseAnnuoMC),
          (mc.totaleVociFisseAnnuoMC >= totaleVociFisseAnnuo ? '+' : '') +
            fmtEuro(mc.totaleVociFisseAnnuoMC - totaleVociFisseAnnuo),
        ],
        [
          'Totale 13^ mensilita',
          fmtEuro(totaleTredicesimaMensilita),
          fmtEuro(mc.totaleTredicesimaMensilita_MC),
          (mc.totaleTredicesimaMensilita_MC >= totaleTredicesimaMensilita ? '+' : '') +
            fmtEuro(mc.totaleTredicesimaMensilita_MC - totaleTredicesimaMensilita),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 33, halign: 'right' },
        2: { cellWidth: 33, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 33, halign: 'right' },
      },
    });

    const startMC2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dettaglio Voci da inserire in PASSWEB - CCNL 2022-2024', 14, startMC2);
    autoTable(doc, {
      startY: startMC2 + 3,
      head: [['ID', 'Voce', '13^', 'Mensile (EUR)', 'Annuo (EUR)', 'Nota PASSWEB']],
      body: mc.vociArricchiteMC
        .filter((v: any) => v.catalogo)
        .map((v: any) => [
          v.catalogo.id,
          v.catalogo.nome,
          v.catalogo.valido13 ? 'SI' : 'NO',
          fmtEuro(v.importoMensile),
          fmtEuro(v.importoAnnuo),
          v.idVoceCatalogo === '01' ? 'AGGIORNATO - nuovo Tab. G' : '',
        ]),
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 72 },
        2: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 42, fontStyle: 'bold', textColor: [120, 53, 15] },
      },
      didParseCell: (data: any) => {
        if (data.column.index === 5 && data.cell.raw !== '') {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      },
    });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Generato il ${new Date().toLocaleString('it-IT')} - Immedia S.p.A. | Pag. ${i} di ${pageCount}`,
      14,
      footerY
    );
  }

  doc.save(`UltimoMiglio_Pensione_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
