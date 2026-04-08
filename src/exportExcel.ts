import * as XLSX from 'xlsx';
import type { Anagrafica, RisultatoCalcolo } from './types';
import { MESI_LABELS } from './types';

export function exportToExcel(anagrafica: Anagrafica, risultato: RisultatoCalcolo) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Riepilogo ──────────────────────────────────────────────────────
  const riepilogo: (string | number)[][] = [
    ['CALCOLO ULTIMO MIGLIO TFS – EX DIPENDENTI IN PENSIONE', '', '', ''],
    ['Immedia S.p.A. – www.immediaspa.com', '', '', ''],
    [''],
    ['DATI ANAGRAFICI', '', '', ''],
    ['Cognome e Nome', anagrafica.cognomeNome, '', ''],
    ['Codice Fiscale', anagrafica.codiceFiscale, '', ''],
    ['Qualifica', anagrafica.qualifica, '', ''],
    ['Data Pensionamento', anagrafica.dataPensione, '', ''],
    ['Motivo Cessazione', anagrafica.motivoCessazione, '', ''],
    ['Ente', anagrafica.ente, '', ''],
    [''],
    ['VOCI RETRIBUTIVE ANNUALIZZATE', '', '', ''],
    ['Voce', 'Valido 13^', 'Importo Mensile (€)', 'Importo Annuo (€)'],
    ...risultato.vociAnnualizzate.map(v => [
      v.label,
      v.valido13 ? 'SI' : 'NO',
      v.importoMensile,
      v.importoAnnuo,
    ]),
    [''],
    ['ULTIMO MIGLIO TFS', '', '', ''],
    ['Voce', '', 'Importo (€)', ''],
    ['Retribuzione Ind. di Anzianità (R.I.A.)', '', risultato.ria, ''],
    ['Tredicesima mensilità', '', risultato.tredicesima, ''],
    ['Stipendio tabellare TAB E', '', risultato.stipTabellare, ''],
    ['Indennità Aggiuntive asili nido e scolastico (voce 72 + 78)', '', risultato.indAsili, ''],
    ['Indennità di EUR 64,56 annue lorde (ex 3^ e 4^ Qualifica)', '', risultato.ind6456, ''],
    ['Indennità di vigilanza', '', risultato.indVigilanza, ''],
    ['TOTALE ULTIMO MIGLIO TFS', '', risultato.totaleUltimoMiglio, ''],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(riepilogo);
  ws1['!cols'] = [{ wch: 55 }, { wch: 12 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo');

  // ── Sheet 2: Dettaglio 12 mesi ──────────────────────────────────────────────
  const dettaglio: (string | number)[][] = [
    ['DETTAGLIO STIPENDI ULTIMI 12 MESI', '', ''],
    ['Mese', 'Stipendio mensile (€)', '13^ pro-rata (€)'],
    ...MESI_LABELS.map((m, i) => [
      m,
      risultato.stipendiMensili[i]?.stipendio ?? 0,
      risultato.stipendiMensili[i]?.tredicesima ?? 0,
    ]),
    ['TOTALE', risultato.totaleStipendi12mesi, risultato.totaleTredicesime12mesi],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(dettaglio);
  ws2['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Dettaglio 12 Mesi');

  XLSX.writeFile(wb, `TFS_UltimoMiglio_${anagrafica.codiceFiscale || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}
