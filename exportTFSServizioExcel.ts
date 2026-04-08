import * as XLSX from 'xlsx';

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  dataFine: string;
  motivoCessazione: string;
}

export function exportTFSServizioToExcel(
  anagrafica: Anagrafica,
  vociCalcolate: any[],
  risultato: any,
  mesiCalcolati: any[],
  totale13Step2: number
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Riepilogo
  const riepilogo: (string | number)[][] = [
    ['CALCOLO ULTIMO MIGLIO TFS – PERSONALE IN SERVIZIO', '', ''],
    ['Immedia S.p.A.', '', ''],
    [''],
    ['DATI ANAGRAFICI', '', ''],
    ['Cognome e Nome', anagrafica.cognomeNome, ''],
    ['Codice Fiscale', anagrafica.codiceFiscale, ''],
    ['Data Inizio Periodo', anagrafica.dataInizio, ''],
    ['Data Fine Periodo', anagrafica.dataFine, ''],
    ['Motivo Cessazione', anagrafica.motivoCessazione, ''],
    [''],
    ['RISULTATO FINALE – TABELLA G', '', ''],
    ['Componente', '', 'Importo Annuo (€)'],
    ['Stipendio tabellare nuove Aree Tab G', '', risultato.r1],
    ['Retribuzione Ind. di Anzianità RIA', '', risultato.r2],
    ['Tredicesima mensilità', '', risultato.r3],
    ['Assegno ad personam assorbibile progressione verticale', '', risultato.r4],
    ['Indennità Aggiuntive personale asili nido', '', risultato.r5],
    ['Assegno personale non riassorbibile art 29', '', risultato.r6],
    ['Indennità 64,56 annue lorde ex 3^ 4^ qualifica', '', risultato.r7],
    ['Indennità di vigilanza', '', risultato.r8],
    ['Differenziali stipendiali', '', risultato.r9],
    ['TOTALE GENERALE', '', risultato.totale],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(riepilogo);
  ws1['!cols'] = [{ wch: 55 }, { wch: 10 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

  // Sheet 2: Voci retributive
  const voci: (string | number)[][] = [
    ['DETTAGLIO VOCI RETRIBUTIVE', '', '', ''],
    ['Voce', 'Valido 13^', 'Mensile (€)', 'Annuo (€)'],
    ...vociCalcolate.map(v => [v.label, v.valido13 ? 'SI' : 'NO', v.importoMensile, v.importoAnnuo]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(voci);
  ws2['!cols'] = [{ wch: 50 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Voci Retributive');

  // Sheet 3: Mesi
  const mesi: (string | number)[][] = [
    ['DETTAGLIO STIPENDI MENSILI', '', ''],
    ['Mese', 'Importo Effettivo (€)', 'Quota 13^ (€)'],
    ...mesiCalcolati.map(m => [`Mese ${m.meseId}`, m.importoMensileEffettivo, m.quota13]),
    ['TOTALE 13^ Step 2', '', totale13Step2],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(mesi);
  ws3['!cols'] = [{ wch: 15 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Dettaglio Mesi');

  XLSX.writeFile(wb, `TFS_Servizio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
