import * as XLSX from 'xlsx';

const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function exportTFSServizioToExcel(
  anagrafica: any,
  vociCalcolate: any[],
  risultato: any,
  mesiCalcolati: any[],
  totale13Step2: number
) {
  const wb = XLSX.utils.book_new();

  // Foglio 1: Riepilogo
  const ws1Data = [
    ['CALCOLO ULTIMO MIGLIO TFS - TABELLA G'],
    [''],
    ['DATI ANAGRAFICI', '', '', ''],
    ['Cognome e Nome', anagrafica.cognomeNome, '', ''],
    ['Codice Fiscale', anagrafica.codiceFiscale, '', ''],
    ['Data Inizio Periodo', anagrafica.dataInizio, '', ''],
    ['Data Fine Periodo', anagrafica.dataFine, '', ''],
    ['Motivo Cessazione', anagrafica.motivoCessazione, '', ''],
    [''],
    ['RISULTATI FINALI', '', '', ''],
    ['Stipendio tabellare nuove Aree Tab G', risultato.r1, '', ''],
    ['Retribuzione Ind. di Anzianità RIA', risultato.r2, '', ''],
    ['Tredicesima mensilità', risultato.r3, '', ''],
    ['Assegno ad personam assorbibile progressione verticale per 13 mensilità', risultato.r4, '', ''],
    ['Indennità Aggiuntive personale asili nido per 12 mensilità', risultato.r5, '', ''],
    ['Assegno personale non riassorbibile art 29', risultato.r6, '', ''],
    ['Indennità 64,56 annue lorde ex 3^ 4^ qualifica', risultato.r7, '', ''],
    ['Indennità di vigilanza per 12 mensilità', risultato.r8, '', ''],
    ['Differenziali stipendiali', risultato.r9, '', ''],
    ['TOTALE GENERALE', risultato.totale, '', ''],
    [''],
    ['DETTAGLIO VOCI', '', '', ''],
    ['Voce', 'Valido 13^', 'Importo Mensile (€)', 'Importo Annuo (€)'],
    ...vociCalcolate.map(v => [
      v.label,
      v.valido13 ? 'SI' : 'NO',
      v.importoMensile,
      v.importoAnnuo
    ]),
    [''],
    ['DETTAGLIO MESI', '', '', ''],
    ['Mese', 'Importo Mensile Effettivo (€)', 'Quota 13^ Calcolata (€)', ''],
    ...mesiCalcolati.map(m => [
      `Mese ${m.meseId}`,
      m.importoMensileEffettivo,
      m.quota13,
      ''
    ]),
    ['Totale 13^', '', totale13Step2, '']
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!cols'] = [{ wch: 60 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

  XLSX.writeFile(wb, `TFSServizio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
