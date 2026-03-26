import * as XLSX from 'xlsx';

const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportPensioneToExcel(
  anagrafica: any,
  vociArricchite: any[],
  totaleVociFisseAnnuo: number,
  totaleTredicesimaMensilita: number
) {
  const wb = XLSX.utils.book_new();

  // Foglio 1: Riepilogo
  const ws1Data = [
    ['CALCOLO ULTIMO MIGLIO PENSIONE'],
    [''],
    ['DATI ANAGRAFICI', '', '', ''],
    ['Cognome e Nome', anagrafica.cognomeNome, '', ''],
    ['Codice Fiscale', anagrafica.codiceFiscale, '', ''],
    ['Data Inizio Periodo', anagrafica.dataInizio, '', ''],
    ['Motivo Cessazione', anagrafica.motivoCessazione, '', ''],
    [''],
    ['RIEPILOGO CALCOLO', '', '', ''],
    ['Totale Voci Fisse e continuative per 12 mensilità', totaleVociFisseAnnuo, '', ''],
    ['Totale 13^ mensilità', totaleTredicesimaMensilita, '', ''],
    [''],
    ['DETTAGLIO VOCI INSERITE', '', '', ''],
    ['Voce', 'Valido 13^', 'Importo Mensile (€)', 'Importo Annuo (€)'],
    ...vociArricchite.filter(v => v.catalogo).map(v => [
      v.catalogo.nome,
      v.catalogo.valido13 ? 'SI' : 'NO',
      v.importoMensile,
      v.importoAnnuo
    ])
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

  XLSX.writeFile(wb, `Pensione_UltimoMiglio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
