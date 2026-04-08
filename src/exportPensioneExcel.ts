import * as XLSX from 'xlsx';

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  motivoCessazione: string;
}

export function exportPensioneToExcel(
  anagrafica: Anagrafica,
  vociArricchite: any[],
  totaleVociFisseAnnuo: number,
  totaleTredicesimaMensilita: number
) {
  const wb = XLSX.utils.book_new();

  const data: (string | number)[][] = [
    ['CALCOLO ULTIMO MIGLIO PENSIONE', '', '', ''],
    ['Immedia S.p.A.', '', '', ''],
    [''],
    ['DATI ANAGRAFICI', '', '', ''],
    ['Cognome e Nome', anagrafica.cognomeNome, '', ''],
    ['Codice Fiscale', anagrafica.codiceFiscale, '', ''],
    ['Data Inizio Periodo', anagrafica.dataInizio, '', ''],
    ['Motivo Cessazione', anagrafica.motivoCessazione, '', ''],
    [''],
    ['VOCI RETRIBUTIVE', '', '', ''],
    ['ID', 'Voce', 'Importo Mensile (€)', 'Importo Annuo (€)'],
    ...vociArricchite
      .filter(v => v.catalogo)
      .map(v => [v.catalogo.id, v.catalogo.nome, v.importoMensile, v.importoAnnuo]),
    [''],
    ['TOTALI', '', '', ''],
    ['Totale Voci Fisse e continuative (12 mensilità)', '', '', totaleVociFisseAnnuo],
    ['Totale 13^ mensilità', '', '', totaleTredicesimaMensilita],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 8 }, { wch: 70 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Ultimo Miglio Pensione');

  XLSX.writeFile(wb, `UltimoMiglio_Pensione_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
