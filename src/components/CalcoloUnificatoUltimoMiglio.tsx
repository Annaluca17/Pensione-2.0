/**
 * CalcoloUnificatoUltimoMiglio.tsx
 * Immedia S.p.A. — Tool unificato Pensione + TFS Pensionati
 * CCNL Funzioni Locali — INPS PASSWEB
 *
 * Dipendenze: react, xlsx (SheetJS), jspdf, jspdf-autotable
 * npm install xlsx jspdf jspdf-autotable
 */

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface Anagrafica {
  nome: string;
  cf: string;
  data: string;
  dataCessazione: string;
  motivo: string;
}

interface VocePensione {
  id: string;
  n: string;
  v13: boolean;
  x: number;
  tfs: boolean;
}

interface TabellaArea {
  area: string;
  t24: number;
  t26: number;
  pos: string[];
}

interface RisultatoTFS {
  stipT: number;
  tredT: number;
  ria: number;
  asili: number;
  ind64: number;
  vig: number;
  totTab: number;
  totUM: number;
  tot: number;
}

interface MeseRif {
  mese: string;
  anno: number;
  meseIdx: number;
  isEligibilePerMC: boolean;
}

// ─── Costanti ────────────────────────────────────────────────────────────────

const TAB: TabellaArea[] = [
  { area: 'Funzionari ed E.Q. (Area D)', t24: 2078.47, t26: 2092.84, pos: ['D1','D2','D3','D4','D5','D6','D7'] },
  { area: 'Istruttori (Area C)',          t24: 1915.55, t26: 1928.23, pos: ['C1','C2','C3','C4','C5','C6'] },
  { area: 'Operatori Esperti (Area B)',   t24: 1704.38, t26: 1715.27, pos: ['B1','B2','B3','B4','B5','B6','B7','B8'] },
  { area: 'Operatori (Area A)',           t24: 1637.12, t26: 1646.09, pos: ['A1','A2','A3','A4','A5','A6'] },
];

/**
 * Differenziale storico (ex PEO) mensile per posizione economica.
 * Fonte: CCNL 2019-2021 / 2022-2024 — valore identico per entrambe le decorrenze.
 */
const PEO_TABLE: Record<string, number> = {
  D7: 764.82, D6: 634.82, D5: 468.93, D4: 369.86, D3: 278.45, D2: 91.30, D1: 0,
  C6: 271.84, C5: 216.41, C4: 146.52, C3:  89.74, C2:  41.14, C1:    0,
  B8: 273.99, B7: 234.15, B6: 168.45, B5: 138.15, B4: 110.83, B3: 86.53, B2: 25.10, B1: 0,
  A6: 136.05, A5: 108.38, A4:  77.02, A3:  50.74, A2:  19.91, A1:    0,
};

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const VOCI: VocePensione[] = [
  { id:'01', n:'Stipendio tabellare',                                v13:true,  x:12, tfs:false },
  { id:'02', n:'Differenziale storico (ex PEO)',                     v13:true,  x:12, tfs:true  },
  { id:'03', n:'Differenziale stipendiale CCNL 2019-2021',           v13:true,  x:12, tfs:true  },
  { id:'04', n:'Assegno ad personam non riassorbibile IIS',          v13:true,  x:12, tfs:true  },
  { id:'05', n:'Assegno ad personam riassorbibile prog. verticale',  v13:true,  x:12, tfs:true  },
  { id:'06', n:'Salario Individuale di Anzianità (ex R.I.A.)',       v13:true,  x:12, tfs:true  },
  { id:'07', n:'Retribuzione di Posizione',                          v13:true,  x:12, tfs:false },
  { id:'08', n:'Indennità specifica ex art.4 CCNL (€ 5,38/mese)',   v13:false, x:12, tfs:true  },
  { id:'09', n:'Indennità di Vacanza Contrattuale (IVC)',            v13:true,  x:12, tfs:true  },
  { id:'10', n:'Indennità di Comparto',                              v13:false, x:12, tfs:false },
  { id:'11', n:'Indennità di vigilanza',                             v13:false, x:12, tfs:true  },
  { id:'12', n:'Ind. Professionale asili nido (€ 55,40/mese)',      v13:false, x:12, tfs:true  },
  { id:'13', n:'Ind. Aggiuntiva asili nido (€ 28,41/mese)',         v13:false, x:12, tfs:true  },
  { id:'14', n:'Ind. Tempo potenziato scolastico (× 10 mesi)',      v13:false, x:10, tfs:false },
  { id:'15', n:'Trattamento accessorio asili nido (× 10 mesi)',     v13:false, x:10, tfs:false },
];

const STEPS = [
  { id: 'ana',  lbl: 'Anagrafica' },
  { id: 'voci', lbl: 'Voci Retributive' },
  { id: 'ris',  lbl: 'Risultato' },
] as const;

type StepId = typeof STEPS[number]['id'];
type DecId = '2024' | '2026';

// ─── Utils ───────────────────────────────────────────────────────────────────

const r2  = (n: number): number => Math.round((n || 0) * 100) / 100;
const eur = (n: number): string =>
  r2(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getNuovoTab(pos: string, dec: DecId): number {
  if (!pos) return 0;
  const ltr = pos[0].toUpperCase() as 'D'|'C'|'B'|'A';
  const idx  = { D:0, C:1, B:2, A:3 }[ltr];
  if (idx == null) return 0;
  return dec === '2024' ? TAB[idx].t24 : TAB[idx].t26;
}

function getUltimi12Mesi(dataCessazione: string): MeseRif[] {
  if (!dataCessazione || dataCessazione.length < 7) return [];
  const [y, m] = dataCessazione.split('-').map(Number);
  const result: MeseRif[] = [];
  for (let i = 11; i >= 0; i--) {
    let mi = (m - 1) - i;
    let yi = y;
    while (mi < 0) { mi += 12; yi--; }
    result.push({ mese: MESI[mi], anno: yi, meseIdx: mi, isEligibilePerMC: yi >= 2024 });
  }
  return result;
}

// ─── Motore di calcolo ────────────────────────────────────────────────────────

interface CalcPensioneResult {
  a: number;
  t: number;
  voci: Array<{ id:string; n:string; v13:boolean; m:number; a:number }>;
}

function calcPensione(imp: Record<string, string>, overrideTab?: number): CalcPensioneResult {
  const voci = VOCI.map(v => {
    const m = v.id === '01' && overrideTab != null
      ? overrideTab
      : r2(parseFloat(imp[v.id]) || 0);
    return { id:v.id, n:v.n, v13:v.v13, m, a:r2(m * v.x) };
  });
  return {
    a: r2(voci.reduce((s, v) => s + v.a, 0)),
    t: r2(voci.filter(v => v.v13).reduce((s, v) => s + v.m, 0)),
    voci,
  };
}

function calcTFS(stipEff: Array<{ s: number; t: number }>, imp: Record<string, string>): RisultatoTFS {
  const vm    = (id: string) => r2(parseFloat(imp[id]) || 0);
  const sS    = r2(stipEff.reduce((s, v) => s + v.s, 0));
  const sT    = r2(stipEff.reduce((s, v) => s + v.t, 0));
  const stipT = r2(sS + (vm('02') + vm('03') + vm('04') + vm('05') + vm('09')) * 12);
  const tredT = r2(sT + vm('02') + vm('03') + vm('04') + vm('05') + vm('09') + vm('06'));
  const ria   = r2(vm('06') * 12);
  const asili = r2((vm('12') + vm('13')) * 12);
  const ind64 = r2(vm('08') * 12);
  const vig   = r2(vm('11') * 12);
  const totTab = r2(stipT + tredT);
  const totUM  = r2(ria + asili + ind64 + vig);
  return { stipT, tredT, ria, asili, ind64, vig, totTab, totUM, tot: r2(totTab + totUM) };
}

// ─── Export Excel ─────────────────────────────────────────────────────────────

function exportXLSX(
  ana: Anagrafica,
  pensione: CalcPensioneResult,
  tfs: RisultatoTFS,
  pensioneMC: CalcPensioneResult | null,
  tfsMC: RisultatoTFS | null,
  mcPos: string,
  mcDec: DecId,
  nuovoTab: number,
  peoDiff: number,
): void {
  const wb = XLSX.utils.book_new();
  const ANA_HDR = ['Nominativo', ana.nome, '', 'CF', ana.cf, '', 'Data inizio', ana.data,
                   '', 'Data cessazione', ana.dataCessazione, '', 'Motivo', ana.motivo];

  const buildSheet = (p: CalcPensioneResult, t: RisultatoTFS | null, label: string, tabellare: number) => [
    [label],
    ANA_HDR,
    [],
    ['── PENSIONE — Ultimo Miglio ──'],
    ['Campo PASSWEB', 'Voce Retributiva', '13^', 'Mensile (€)', 'Annuo (€)'],
    ...p.voci.filter(v => v.m > 0).map(v => [
      v.id === '01' ? 'Stipendio tabellare (Tab. G)' : '',
      v.n, v.v13 ? 'SÌ' : 'NO', v.m, v.a,
    ]),
    [],
    ['', 'TOTALE VOCI FISSE ANNUO (→ "Retribuzione annua" PASSWEB)', '', '', p.a],
    ['', '13^ MENSILITÀ (→ "Tredicesima" PASSWEB)',                  '', '', p.t],
    [],
    ...(t ? [
      ['── TFS PENSIONATI — Ultimo Miglio ──'],
      ['Campo PASSWEB', 'Componente', '', '', 'Importo annuo (€)'],
      ['Retribuzione Ind. Anzianità',  'Retribuzione Ind. Anzianità (R.I.A.)',                                        '', '', t.ria  ],
      ['Tredicesima mensilità',        'Tredicesima mensilità',                                                       '', '', t.tredT],
      ['Stipendio tabellare (Tab. E)', `Stipendio tabellare (TAB E) — tab. mensile: € ${tabellare.toFixed(2)}`,       '', '', t.stipT],
      ...(t.asili > 0 ? [['Ind. aggiuntive asili nido', 'Indennità aggiuntive personale asili nido e scolastico',    '', '', t.asili]] : []),
      ...(t.ind64 > 0 ? [['Ind. specifica art.4',       'Indennità specifica ex art.4 comma 3 ccnl 1996',            '', '', t.ind64]] : []),
      ...(t.vig   > 0 ? [['Ind. vigilanza',             'Indennità di vigilanza per 12 mensilità',                   '', '', t.vig  ]] : []),
      [],
      ['', 'TOTALE TFS PENSIONATI (→ "Trattamento Fine Servizio" PASSWEB)', '', '', t.tot],
    ] : [
      ['── TFS PENSIONATI ──'],
      ['NOTA', 'Cessazione ante 01/01/2024 — ricalcolo MC TFS non applicabile.',              '', '', ''],
      ['',     'Utilizzare i valori TFS del foglio "PASSWEB – Base" per PASSWEB.',            '', '', ''],
    ]),
  ];

  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.aoa_to_sheet(buildSheet(pensione, tfs, 'DATI PASSWEB — CCNL 2019-2021 (BASE)',
      r2(pensione.voci.find(v => v.id === '01')?.m ?? 0))),
    'PASSWEB – Base');

  if (pensioneMC) {
    const breakdown = peoDiff > 0
      ? `tab. € ${nuovoTab.toFixed(2)} + diff. storico € ${peoDiff.toFixed(2)} = € ${(nuovoTab + peoDiff).toFixed(2)}`
      : `tab. € ${nuovoTab.toFixed(2)}`;
    const labelMC = tfsMC
      ? `DATI PASSWEB — CCNL 2022-2024 (MC dal 01.01.${mcDec} — ${mcPos} — ${breakdown})`
      : `DATI PASSWEB — CCNL 2022-2024 — SOLO PENSIONE (cessazione ante 01/01/2024 — ${mcPos})`;
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet(buildSheet(pensioneMC, tfsMC, labelMC, nuovoTab)),
      `PASSWEB – MC ${mcDec}`);

    const delta = (b: number, mc: number) => r2(mc - b);
    const pct   = (b: number, mc: number) => b > 0 ? +((delta(b,mc)/b)*100).toFixed(2) : 0;
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.aoa_to_sheet([
        ['CONFRONTO SCENARI — CCNL 2019-2021 vs CCNL 2022-2024'],
        ANA_HDR,
        ['', 'Posizione', mcPos, 'Decorrenza', `01.01.${mcDec}`,
          'Tab. MC', nuovoTab, 'Diff. storico', peoDiff, 'Totale MC', nuovoTab + peoDiff],
        [],
        ['Campo', 'CCNL 2019-2021', 'CCNL 2022-2024', 'Δ (€)', 'Δ (%)'],
        ['Pensione — Tot. voci fisse annuo', pensione.a, pensioneMC.a, delta(pensione.a, pensioneMC.a), pct(pensione.a, pensioneMC.a)],
        ['Pensione — 13^ mensilità',         pensione.t, pensioneMC.t, delta(pensione.t, pensioneMC.t), pct(pensione.t, pensioneMC.t)],
        ...(tfsMC ? [
          ...[
            ['TFS — Retribuzione Ind. Anzianità (R.I.A.)',        tfs.ria,   tfsMC.ria  ],
            ['TFS — Tredicesima mensilità',                        tfs.tredT, tfsMC.tredT],
            ['TFS — Stipendio tabellare (TAB E)',                  tfs.stipT, tfsMC.stipT],
            ['TFS — Ind. aggiuntive asili nido e scolastico',      tfs.asili, tfsMC.asili],
            ['TFS — Ind. specifica ex art.4',                      tfs.ind64, tfsMC.ind64],
            ['TFS — Ind. vigilanza',                               tfs.vig,   tfsMC.vig  ],
          ].filter(r => (r[1] as number) > 0).map(r => {
            const b = r[1] as number, mc = r[2] as number;
            return [r[0], b, mc, delta(b,mc), pct(b,mc)];
          }),
          ['TFS — Totale complessivo', tfs.tot, tfsMC.tot, delta(tfs.tot,tfsMC.tot), pct(tfs.tot,tfsMC.tot)],
        ] : [
          ['NOTA TFS', 'Cessazione ante 01/01/2024 — confronto MC TFS non applicabile', '', '', ''],
        ]),
      ]),
      'Confronto');
  }

  XLSX.writeFile(wb, `UltimoMiglio_${ana.cf || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── Export PDF ───────────────────────────────────────────────────────────────

function exportPDF(
  ana: Anagrafica,
  pensione: CalcPensioneResult,
  tfs: RisultatoTFS,
  pensioneMC: CalcPensioneResult | null,
  tfsMC: RisultatoTFS | null,
  mcPos: string,
  mcDec: DecId,
  nuovoTab: number,
  peoDiff: number,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ts  = new Date().toLocaleString('it-IT');
  const HDR_BASE = [30, 41, 59] as [number,number,number];
  const HDR_MC   = [120, 53, 15] as [number,number,number];

  const printScenario = (
    p: CalcPensioneResult, t: RisultatoTFS | null,
    tabellare: number, hdrColor: [number,number,number], startY: number,
  ): number => {
    autoTable(doc, {
      startY,
      head: [['Campo PASSWEB', 'Voce Retributiva', '13^', 'Mensile (€)', 'Annuo (€)']],
      body: [
        ...p.voci.filter(v => v.m > 0).map(v => [
          v.id === '01' ? 'Tab. G — Stipendio' : '',
          v.n, v.v13 ? 'SÌ' : 'NO', eur(v.m), eur(v.a),
        ]),
        [{ content: '→ Retribuzione annua PASSWEB', styles:{fontStyle:'bold'} },
         { content: 'TOTALE VOCI FISSE ANNUO',      styles:{fontStyle:'bold'} }, '', '',
         { content: '€ '+eur(p.a),                  styles:{fontStyle:'bold'} }],
        [{ content: '→ Tredicesima PASSWEB',         styles:{fontStyle:'bold'} },
         { content: '13^ MENSILITÀ',                 styles:{fontStyle:'bold'} }, '', '',
         { content: '€ '+eur(p.t),                   styles:{fontStyle:'bold'} }],
      ],
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: hdrColor },
      columnStyles: { 3: { halign:'right' }, 4: { halign:'right' } },
    });
    let y2 = (doc as any).lastAutoTable.finalY + 5;
    if (t) {
      autoTable(doc, {
        startY: y2,
        head: [['Campo PASSWEB', 'Componente', 'Importo annuo (€)']],
        body: [
          ['Retribuzione Ind. Anzianità',  'Retribuzione Ind. Anzianità (R.I.A.)',                            '€ '+eur(t.ria)  ],
          ['Tredicesima mensilità',        'Tredicesima mensilità',                                           '€ '+eur(t.tredT)],
          ['Stipendio tabellare (Tab. E)', `Stipendio tabellare (TAB E) — tab. mensile: € ${eur(tabellare)}`, '€ '+eur(t.stipT)],
          ...(t.asili > 0 ? [['Ind. aggiuntive asili nido', 'Ind. aggiuntive pers. asili nido e scolastico', '€ '+eur(t.asili)]] : []),
          ...(t.ind64 > 0 ? [['Ind. specifica art.4',       'Ind. specifica ex art.4 comma 3 ccnl 1996',     '€ '+eur(t.ind64)]] : []),
          ...(t.vig   > 0 ? [['Ind. vigilanza',             'Ind. di vigilanza per 12 mensilità',            '€ '+eur(t.vig)  ]] : []),
          [{ content:'→ TFS Pensionati PASSWEB', styles:{fontStyle:'bold',fillColor:hdrColor,textColor:[255,255,255]} },
           { content:'TOTALE TFS PENSIONATI',    styles:{fontStyle:'bold',fillColor:hdrColor,textColor:[255,255,255]} },
           { content:'€ '+eur(t.tot),            styles:{fontStyle:'bold',fillColor:hdrColor,textColor:[255,255,255]} }],
        ],
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: hdrColor },
        columnStyles: { 2: { halign:'right' } },
      });
    } else {
      autoTable(doc, {
        startY: y2,
        head: [['Nota TFS']],
        body: [['Cessazione ante 01/01/2024 — ricalcolo MC TFS non applicabile.\nUsare valori TFS Scenario A per PASSWEB.']],
        styles: { fontSize: 7.5, textColor: [120,53,15] },
        headStyles: { fillColor: hdrColor },
      });
    }
    return (doc as any).lastAutoTable.finalY;
  };

  // Pag. 1 — Scenario BASE
  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('CALCOLO UNIFICATO ULTIMO MIGLIO — INPS PASSWEB', 14, 18);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`Immedia S.p.A. — CCNL Funzioni Locali — Generato: ${ts}`, 14, 24);
  doc.setLineWidth(0.3); doc.line(14, 27, 196, 27);
  autoTable(doc, {
    startY: 30,
    head: [['Nominativo','CF','Data inizio','Data cessazione','Motivo']],
    body: [[ana.nome, ana.cf, ana.data, ana.dataCessazione, ana.motivo]],
    styles: { fontSize:8 }, headStyles: { fillColor: HDR_BASE },
  });
  let y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(30,41,59);
  doc.text('SCENARIO A — CCNL 2019-2021 (Base pre-aggiornamento tabellare)', 14, y);
  doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0); y += 4;
  printScenario(pensione, tfs, r2(pensione.voci.find(v=>v.id==='01')?.m ?? 0), HDR_BASE, y);

  // Pag. 2 — Scenario MC
  if (pensioneMC) {
    doc.addPage();
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(120,53,15);
    doc.text('CALCOLO UNIFICATO ULTIMO MIGLIO — INPS PASSWEB', 14, 18);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(`Immedia S.p.A. — CCNL Funzioni Locali — Generato: ${ts}`, 14, 24);
    doc.setTextColor(0,0,0); doc.setLineWidth(0.3); doc.line(14, 27, 196, 27);
    autoTable(doc, {
      startY: 30,
      head: [['Nominativo','CF','Data inizio','Data cessazione','Motivo']],
      body: [[ana.nome, ana.cf, ana.data, ana.dataCessazione, ana.motivo]],
      styles: { fontSize:8 }, headStyles: { fillColor: HDR_MC },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    const breakdownPDF = peoDiff > 0
      ? `Tab. € ${eur(nuovoTab)} + Diff. storico € ${eur(peoDiff)} = € ${eur(nuovoTab+peoDiff)}`
      : `Tab. mensile: € ${eur(nuovoTab)}`;
    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(120,53,15);
    doc.text(`SCENARIO B — CCNL 2022-2024 (MC dal 01.01.${mcDec} — ${mcPos} — ${breakdownPDF})`, 14, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(0,0,0); y += 4;
    printScenario(pensioneMC, tfsMC, nuovoTab, HDR_MC, y);

    // Pag. 3 — Confronto
    doc.addPage();
    const tabBase = r2(parseFloat(pensione.voci.find(v=>v.id==='01')?.m?.toString() || '0'));
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(`CONFRONTO SCENARI A vs B — ${mcPos} · dal 01.01.${mcDec}`, 14, 18);
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    const varLine = peoDiff > 0
      ? `Tab. MC: € ${eur(nuovoTab)} + Diff. storico: € ${eur(peoDiff)} = € ${eur(nuovoTab+peoDiff)}  (var. su BASE: +€ ${eur(nuovoTab+peoDiff-tabBase)})`
      : `Var. tabellare mensile: € ${eur(nuovoTab)} (+€ ${eur(nuovoTab-tabBase)})`;
    doc.text(varLine, 14, 24);

    const row = (lbl: string, b: number, mc: number) => {
      const d = r2(mc-b);
      return [lbl, '€ '+eur(b), '€ '+eur(mc), (d>=0?'+':'')+'€ '+eur(d),
              b > 0 ? ((d/b)*100).toFixed(2)+' %' : '—'];
    };
    autoTable(doc, {
      startY: 28,
      head: [['Campo','Scenario A — CCNL 2019-2021','Scenario B — CCNL 2022-2024','Δ (€)','Δ (%)']],
      body: [
        row('Pensione — Tot. voci fisse annuo', pensione.a, pensioneMC.a),
        row('Pensione — 13^ mensilità',          pensione.t, pensioneMC.t),
        ...(tfsMC ? [
          ...[
            ['TFS — Retribuzione Ind. Anzianità (R.I.A.)', tfs.ria,   tfsMC.ria  ],
            ['TFS — Tredicesima mensilità',                 tfs.tredT, tfsMC.tredT],
            ['TFS — Stipendio tabellare (TAB E)',           tfs.stipT, tfsMC.stipT],
            ['TFS — Ind. aggiuntive asili nido',            tfs.asili, tfsMC.asili],
            ['TFS — Ind. specifica ex art.4',               tfs.ind64, tfsMC.ind64],
            ['TFS — Ind. vigilanza',                        tfs.vig,   tfsMC.vig  ],
          ].filter(r => (r[1] as number) > 0).map(r => row(r[0] as string, r[1] as number, r[2] as number)),
          row('TFS — Totale complessivo', tfs.tot, tfsMC.tot),
        ] : [
          [{ content:'TFS — Confronto non applicabile (cessazione ante 01/01/2024)',
             colSpan:5, styles:{fontStyle:'italic',textColor:[120,53,15]} }],
        ]),
      ],
      styles: { fontSize:8 },
      headStyles: { fillColor: HDR_BASE },
      columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'}, 4:{halign:'right'} },
      didParseCell: (data) => {
        if (data.section==='body' && data.column.index===3) {
          const v = data.cell.raw as string;
          if (typeof v==='string' && v.startsWith('+')) data.cell.styles.textColor=[22,163,74];
          if (typeof v==='string' && v.startsWith('-')) data.cell.styles.textColor=[220,38,38];
        }
      },
    });
  }

  doc.save(`UltimoMiglio_${ana.cf || 'export'}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function CalcoloUnificatoUltimoMiglio() {
  const [step, setStep] = useState<StepId>('ana');
  const [ana, setAna]   = useState<Anagrafica>({ nome:'', cf:'', data:'', dataCessazione:'', motivo:'' });
  const [imp, setImp]   = useState<Record<string, string>>({});
  const setVoce = (id: string, v: string) => setImp(p => ({ ...p, [id]: v }));

  const [mcOn,  setMcOn]  = useState(false);
  const [mcPos, setMcPos] = useState('');
  const [mcDec, setMcDec] = useState<DecId>('2024');

  /**
   * peoInBase: include il differenziale storico (PEO) anche nello Scenario BASE
   * per consentire la verifica dell'inserimento storico in PASSWEB.
   * Default OFF: il PEO è calcolato esclusivamente per il Miglioramento Contrattuale.
   */
  const [peoInBase, setPeoInBase] = useState(false);

  const [stips, setStips] = useState<string[]>(Array(12).fill(''));
  const [exc,   setExc]   = useState<boolean[]>(Array(12).fill(false));

  const base     = r2(parseFloat(imp['01']) || 0);
  const nuovoTab = useMemo(() => getNuovoTab(mcPos, mcDec), [mcPos, mcDec]);

  /** Differenziale storico mensile per la posizione MC selezionata */
  const peoDiff = useMemo(
    () => mcOn && mcPos ? (PEO_TABLE[mcPos] ?? 0) : 0,
    [mcOn, mcPos],
  );

  /**
   * effImpBase: imp per lo Scenario BASE (CCNL 2019-2021).
   * - peoInBase OFF: usa imp['02'] manuale (cedolino storico as-is).
   * - peoInBase ON:  sostituisce '02' con PEO_TABLE[mcPos] per verifica storica.
   */
  const effImpBase = useMemo(
    () => peoInBase && mcOn && mcPos
      ? { ...imp, '02': String(peoDiff) }
      : imp,
    [imp, peoInBase, mcOn, mcPos, peoDiff],
  );

  /**
   * effImpMC: imp per lo Scenario MC (CCNL 2022-2024).
   * Voce '02' sempre = PEO_TABLE[mcPos] quando MC attivo + posizione selezionata.
   * Voce '01' viene sovrascritta da overrideTab=nuovoTab nella calcPensione;
   * effImpMC['02']=peoDiff garantisce la corretta alimentazione del TFS.
   */
  const effImpMC = useMemo(
    () => mcOn && mcPos
      ? { ...imp, '02': String(peoDiff) }
      : imp,
    [imp, mcOn, mcPos, peoDiff],
  );

  const isMCEligibile    = ana.dataCessazione.length === 10 && ana.dataCessazione >= '2022-01-01';
  const isMCTFSEligibile = ana.dataCessazione.length === 10 && ana.dataCessazione >= '2024-01-01';

  const ultimi12 = useMemo(() => getUltimi12Mesi(ana.dataCessazione), [ana.dataCessazione]);

  const stipsEffBase = useMemo(
    () => ultimi12.map((_, i) => exc[i] ? stips[i] : String(base)),
    [ultimi12, exc, stips, base],
  );

  const stipsEffMC = useMemo(
    () => ultimi12.map((m, i) =>
      exc[i]
        ? stips[i]
        : (isMCEligibile && mcOn && mcPos && m.isEligibilePerMC ? String(nuovoTab) : String(base))
    ),
    [ultimi12, exc, stips, isMCEligibile, mcOn, mcPos, nuovoTab, base],
  );

  const stipEffBase = useMemo(
    () => stipsEffBase.map(s => { const v = r2(parseFloat(s)||0); return { s:v, t:r2(v/12) }; }),
    [stipsEffBase],
  );
  const stipEffMC = useMemo(
    () => stipsEffMC.map(s => { const v = r2(parseFloat(s)||0); return { s:v, t:r2(v/12) }; }),
    [stipsEffMC],
  );

  const resPensione   = useMemo(() => calcPensione(effImpBase), [effImpBase]);
  const resTFS        = useMemo(() => calcTFS(stipEffBase, effImpBase), [stipEffBase, effImpBase]);
  const resPensioneMC = useMemo(
    () => isMCEligibile && mcOn && mcPos ? calcPensione(effImpMC, nuovoTab) : null,
    [isMCEligibile, mcOn, mcPos, effImpMC, nuovoTab],
  );
  const resTFSMC = useMemo(
    () => isMCTFSEligibile && mcOn && mcPos ? calcTFS(stipEffMC, effImpMC) : null,
    [isMCTFSEligibile, mcOn, mcPos, stipEffMC, effImpMC],
  );

  const goTo    = (s: StepId) => setStep(s);
  const stepIdx = STEPS.findIndex(s => s.id === step);
  const showMCCol = isMCEligibile && mcOn && !!mcPos;

  // ── Render Anagrafica ──────────────────────────────────────────────────────
  const renderAna = () => (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold text-slate-800">Dati Anagrafici</h2>
      {(['nome','cf','data','dataCessazione','motivo'] as const).map(k => (
        <div key={k}>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            {k==='cf' ? 'Codice Fiscale' : k==='data' ? 'Data inizio servizio'
              : k==='dataCessazione' ? 'Data cessazione' : k==='motivo' ? 'Motivo cessazione' : 'Nominativo'}
          </label>
          <input
            type={k==='data'||k==='dataCessazione' ? 'date' : 'text'}
            value={ana[k]}
            onChange={e => setAna(p => ({ ...p, [k]: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
      {ana.dataCessazione.length===10 && !isMCEligibile && (
        <div className="flex items-start gap-2 bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs text-slate-600">
          <span className="mt-0.5 shrink-0">ℹ️</span>
          <span>Cessazione antecedente al 01/01/2022 — MC CCNL 2022-2024 <strong>non applicabile</strong>.</span>
        </div>
      )}
      {ana.dataCessazione.length===10 && isMCEligibile && !isMCTFSEligibile && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-700">
          <span className="mt-0.5 shrink-0">ℹ️</span>
          <span>Cessazione 01/01/2022–31/12/2023 — MC si applica alla <strong>sola Pensione</strong>. TFS su tabellare CCNL 2019-2021.</span>
        </div>
      )}
      <button
        onClick={() => goTo('voci')}
        disabled={!ana.nome || !ana.cf || !ana.dataCessazione}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >Avanti →</button>
    </div>
  );

  // ── Render Voci ────────────────────────────────────────────────────────────
  const renderVoci = () => (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-800">Voci Retributive — Inserimento Unificato</h2>
      <p className="text-xs text-slate-500">Inserimento unico: i dati alimentano sia il calcolo Pensione che TFS</p>

      {/* ── Sezione MC ── */}
      <div className={`border rounded-lg p-4 ${isMCEligibile ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-300'}`}>
        {!isMCEligibile && (
          <div className="mb-3 flex items-start gap-2 rounded bg-slate-200 border border-slate-400 px-3 py-2 text-xs text-slate-700">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span><strong>MC non applicabile.</strong> Cessazione ({ana.dataCessazione||'—'}) ante 01/01/2022.</span>
          </div>
        )}
        {isMCEligibile && !isMCTFSEligibile && mcOn && (
          <div className="mb-3 flex items-start gap-2 rounded bg-amber-50 border border-amber-300 px-3 py-2 text-xs text-amber-800">
            <span className="mt-0.5 shrink-0">ℹ️</span>
            <span><strong>MC applicato solo alla Pensione.</strong> Cessazione ante 01/01/2024 — TFS non ricalcolato.</span>
          </div>
        )}

        <label className={`flex items-center gap-2 ${isMCEligibile ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <input type="checkbox" checked={mcOn && isMCEligibile} disabled={!isMCEligibile}
            onChange={e => isMCEligibile && setMcOn(e.target.checked)}
            className="w-4 h-4 accent-amber-600 disabled:opacity-40" />
          <span className={`text-sm font-medium ${isMCEligibile ? 'text-amber-800' : 'text-slate-400'}`}>
            Applica Miglioramento Contrattuale CCNL 2022-2024
          </span>
        </label>

        {isMCEligibile && mcOn && (
          <div className="mt-3 ml-6 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Posizione economica</label>
              <select value={mcPos} onChange={e => setMcPos(e.target.value)}
                className="border border-amber-300 rounded px-2 py-1 text-sm bg-white">
                <option value="">— seleziona —</option>
                {TAB.map(t => (
                  <optgroup key={t.area} label={t.area}>
                    {t.pos.map(p => <option key={p} value={p}>{p}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Decorrenza</label>
              <select value={mcDec} onChange={e => setMcDec(e.target.value as DecId)}
                className="border border-amber-300 rounded px-2 py-1 text-sm bg-white">
                <option value="2024">01.01.2024</option>
                <option value="2026">01.01.2026</option>
              </select>
            </div>
            {/* Breakdown tabellare + differenziale storico → totale */}
            {mcPos && (
              <div className="flex items-end pb-1">
                <div className="text-sm text-amber-800 space-x-1">
                  <strong>{mcPos}</strong>
                  <span>·</span>
                  <span className="font-mono">Tab. € {eur(nuovoTab)}</span>
                  {peoDiff > 0 && (
                    <>
                      <span className="text-amber-600">+</span>
                      <span className="font-mono">Diff. storico € {eur(peoDiff)}</span>
                      <span className="text-amber-600">=</span>
                      <strong className="font-mono text-amber-900">€ {eur(nuovoTab + peoDiff)}</strong>
                    </>
                  )}
                  <span>· Impatto: <strong>Pensione + TFS</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabella Voci Retributive ── */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Voce Retributiva</th>
              <th className="px-3 py-2 text-center w-20">Impatto</th>
              <th className="px-3 py-2 text-center w-16">13^ P</th>
              <th className="px-3 py-2 text-center w-16">Molt.</th>
              <th className="px-3 py-2 text-right w-56">Mensile (€)</th>
              <th className="px-3 py-2 text-right w-36">Annuo BASE (€)</th>
            </tr>
          </thead>
          <tbody>
            {VOCI.map((v, i) => {
              const isPEO = v.id === '02';
              const baseDisplayVal = isPEO && peoInBase && mcOn && mcPos
                ? peoDiff
                : r2(parseFloat(imp[v.id] ?? '') || 0);
              const a = r2(baseDisplayVal * v.x);

              return (
                <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 text-slate-700">
                    <span className="text-slate-400 text-xs mr-1">#{v.id}</span>{v.n}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {v.tfs
                      ? <span className="text-xs text-blue-600 font-medium">P+TFS</span>
                      : <span className="text-xs text-slate-400">Solo P</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center text-slate-500 text-xs">{v.v13 ? 'SÌ' : '–'}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500 text-xs">×{v.x}</td>

                  <td className="px-3 py-1.5">
                    {isPEO ? (
                      <div className="flex flex-col gap-1.5">

                        {/* Etichetta valore auto MC */}
                        {mcOn && mcPos && (
                          <div className="flex items-center justify-between rounded bg-amber-50 border border-amber-200 px-2 py-1">
                            <span className="text-xs text-amber-600">MC auto ({mcPos}):</span>
                            <span className="text-xs font-mono font-semibold text-amber-800">
                              € {eur(peoDiff)}
                            </span>
                          </div>
                        )}

                        {/* Toggle: includi PEO nel calcolo BASE per verifica storica */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={peoInBase}
                            onChange={e => setPeoInBase(e.target.checked)}
                            className="w-3.5 h-3.5 accent-blue-600" />
                          <span className="text-xs text-slate-500">
                            Includi nel BASE{' '}
                            <span className="text-slate-400">(verifica storica PASSWEB)</span>
                          </span>
                        </label>

                        {/* Input/display BASE */}
                        {peoInBase && mcOn && mcPos ? (
                          <div className="text-right rounded border border-blue-200 bg-blue-50 px-2 py-1 text-sm font-mono font-semibold text-blue-700">
                            € {eur(peoDiff)}
                            <span className="ml-1 text-xs font-normal text-blue-400">(= MC)</span>
                          </div>
                        ) : (
                          <input type="number" min="0" step="0.01"
                            value={imp[v.id] ?? ''}
                            onChange={e => setVoce(v.id, e.target.value)}
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="0,00" />
                        )}
                      </div>
                    ) : (
                      <input type="number" min="0" step="0.01"
                        value={imp[v.id] ?? ''}
                        onChange={e => setVoce(v.id, e.target.value)}
                        className="w-full text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="0,00" />
                    )}
                  </td>

                  <td className="px-3 py-1.5 text-right font-mono text-sm"
                    style={{ color: a > 0 ? '#0f172a' : '#94a3b8' }}>
                    € {eur(a)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Tabella 12 mesi TFS ── */}
      {ultimi12.length > 0 && (
        <div className="space-y-2 pt-1">
          <h3 className="text-sm font-semibold text-slate-700">Tabellare Ultimi 12 Mesi — TFS (riferimento PASSWEB)</h3>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-xs text-blue-700">
            <strong>Nota:</strong> I mesi ≥ 01/01/2024 con MC attivo vengono aggiornati al nuovo tabellare.
            Spunta <strong>Eccez.</strong> per mesi con importo difforme (part-time, assenze non retribuite, ecc.).
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Mese / Anno</th>
                  <th className="px-3 py-2 text-center w-14">MC</th>
                  <th className="px-3 py-2 text-right w-36">Tab. base (€)</th>
                  {showMCCol && <th className="px-3 py-2 text-right w-36">Tab. MC (€)</th>}
                  <th className="px-3 py-2 text-center w-16">Eccez.</th>
                  <th className="px-3 py-2 text-right w-36">Override (€)</th>
                </tr>
              </thead>
              <tbody>
                {ultimi12.map((m, i) => {
                  const baseVal = r2(parseFloat(stipsEffBase[i])||0);
                  const mcVal   = showMCCol ? r2(parseFloat(stipsEffMC[i])||0) : null;
                  const isMCRow = m.isEligibilePerMC && showMCCol && !exc[i];
                  return (
                    <tr key={i} className={[i%2===0?'bg-white':'bg-slate-50', isMCRow?'ring-1 ring-inset ring-amber-300':''].join(' ')}>
                      <td className="px-3 py-1.5 font-medium text-slate-700">{m.mese} {m.anno}</td>
                      <td className="px-3 py-1.5 text-center text-xs">
                        {isMCRow ? <span className="font-semibold text-amber-600">✓ MC</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-600">€ {eur(baseVal)}</td>
                      {showMCCol && (
                        <td className="px-3 py-1.5 text-right font-mono font-semibold"
                          style={{ color: isMCRow ? '#92400e' : '#94a3b8' }}>
                          {mcVal != null ? `€ ${eur(mcVal)}` : '—'}
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-center">
                        <input type="checkbox" checked={exc[i]}
                          onChange={e => {
                            const ne=[...exc]; ne[i]=e.target.checked; setExc(ne);
                            if (!e.target.checked) { const ns=[...stips]; ns[i]=''; setStips(ns); }
                          }}
                          className="w-4 h-4 accent-blue-600" />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" min="0" step="0.01" disabled={!exc[i]}
                          value={exc[i] ? stips[i] : ''} placeholder={exc[i] ? '0,00' : '—'}
                          onChange={e => { const ns=[...stips]; ns[i]=e.target.value; setStips(ns); }}
                          className="w-full text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-semibold text-xs">
                <tr>
                  <td className="px-3 py-2 text-slate-300" colSpan={2}>Σ Stipendio 12 mesi</td>
                  <td className="px-3 py-2 text-right font-mono">€ {eur(stipEffBase.reduce((s,v)=>s+v.s,0))}</td>
                  {showMCCol && <td className="px-3 py-2 text-right font-mono text-amber-300">MC: € {eur(stipEffMC.reduce((s,v)=>s+v.s,0))}</td>}
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => goTo('ana')} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">← Indietro</button>
        <button onClick={() => goTo('ris')} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Calcola Risultato →</button>
      </div>
    </div>
  );

  // ── Render Risultato ───────────────────────────────────────────────────────
  const renderRis = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Risultato Calcolo Unificato — PASSWEB</h2>
          <p className="text-xs text-slate-400 mt-0.5">Calcolato il {new Date().toLocaleString('it-IT')} — non modificabile</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportXLSX(ana, resPensione, resTFS, resPensioneMC, resTFSMC, mcPos, mcDec, nuovoTab, peoDiff)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            ↓ Excel
          </button>
          <button onClick={() => exportPDF(ana, resPensione, resTFS, resPensioneMC, resTFSMC, mcPos, mcDec, nuovoTab, peoDiff)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            ↓ PDF
          </button>
          <button onClick={() => goTo('voci')} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">← Modifica</button>
        </div>
      </div>

      <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm text-slate-700 flex flex-wrap gap-4">
        <span><strong>Nominativo:</strong> {ana.nome}</span>
        <span><strong>CF:</strong> {ana.cf}</span>
        <span><strong>Data inizio:</strong> {ana.data}</span>
        <span><strong>Data cessazione:</strong> {ana.dataCessazione}</span>
        <span><strong>Motivo:</strong> {ana.motivo}</span>
      </div>

      {/* Banner PEO scope */}
      {isMCEligibile && mcOn && mcPos && !peoInBase && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <span className="mt-0.5 shrink-0">ℹ️</span>
          <span>
            Differenziale storico (ex PEO) escluso dal calcolo BASE — applicato esclusivamente allo{' '}
            <strong>Scenario MC</strong>. Per includerlo nel BASE a fini di verifica storica,
            attivare il toggle nella voce <strong>#02</strong>.
          </span>
        </div>
      )}

      {/* Pannelli BASE affiancati */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* PENSIONE BASE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3 flex items-center gap-2">
            <h3 className="font-semibold text-sm">PENSIONE — Ultimo Miglio</h3>
            {isMCEligibile && mcOn && mcPos && (
              <span className={`text-xs font-normal px-2 py-0.5 rounded ${peoInBase ? 'bg-blue-500' : 'bg-slate-600'}`}>
                {peoInBase ? 'BASE con PEO (verifica)' : 'BASE senza PEO'}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-600">Voce</th>
                  <th className="px-3 py-2 text-center text-slate-600">13^</th>
                  <th className="px-3 py-2 text-right text-slate-600">Mensile (€)</th>
                  <th className="px-3 py-2 text-right text-slate-600">Annuo (€)</th>
                </tr>
              </thead>
              <tbody>
                {resPensione.voci.filter(v => v.m > 0).map((v, i) => (
                  <tr key={v.id} className={i%2===0?'bg-white':'bg-slate-50'}>
                    <td className="px-3 py-1.5 text-slate-700">{v.n}</td>
                    <td className="px-3 py-1.5 text-center text-xs text-slate-500">{v.v13?'SÌ':'NO'}</td>
                    <td className="px-3 py-1.5 text-right font-mono">€ {eur(v.m)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">€ {eur(v.a)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-slate-700">TOTALE VOCI FISSE ANNUO</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-800">€ {eur(resPensione.a)}</td>
                </tr>
                <tr className="border-t border-blue-200">
                  <td colSpan={3} className="px-3 py-2 text-slate-700">13^ MENSILITÀ</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-800">€ {eur(resPensione.t)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* TFS BASE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h3 className="font-semibold text-sm">TFS PENSIONATI — Ultimo Miglio</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-600">Componente</th>
                  <th className="px-3 py-2 text-right text-slate-600">Importo annuo (€)</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label:'Retribuzione Ind. Anzianità (R.I.A.)',                   val:resTFS.ria   },
                  { label:'Tredicesima mensilità',                                  val:resTFS.tredT },
                  { label:'Stipendio tabellare (TAB E)',                             val:resTFS.stipT },
                  { label:'Indennità aggiuntive personale asili nido e scolastico', val:resTFS.asili },
                  { label:'Indennità specifica ex art.4 comma 3 ccnl 1996',        val:resTFS.ind64 },
                  { label:'Indennità di vigilanza per 12 mensilità',               val:resTFS.vig   },
                ] as {label:string;val:number}[]).map(({label,val},i) =>
                  val > 0 ? (
                    <tr key={label} className={i%2===0?'bg-white':'bg-slate-50'}>
                      <td className="px-3 py-1.5 text-slate-700">{label}</td>
                      <td className="px-3 py-1.5 text-right font-mono">€ {eur(val)}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50 font-semibold border-t border-blue-200">
                  <td className="px-3 py-2 text-blue-800">TOTALE TFS PENSIONATI</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-800">€ {eur(resTFS.tot)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── Pannello MC ── */}
      {isMCEligibile && mcOn && mcPos && resPensioneMC && (() => {
        type MCRow = { label:string; base:number; mc:number };
        const rows: MCRow[] = [
          { label:'Pensione — Tot. voci fisse annuo', base:resPensione.a, mc:resPensioneMC.a },
          { label:'Pensione — 13^ mensilità',          base:resPensione.t, mc:resPensioneMC.t },
          ...(resTFSMC ? [
            ...[
              { label:'TFS — Retribuzione Ind. Anzianità (R.I.A.)',                   base:resTFS.ria,   mc:resTFSMC.ria   },
              { label:'TFS — Tredicesima mensilità',                                   base:resTFS.tredT, mc:resTFSMC.tredT },
              { label:'TFS — Stipendio tabellare (TAB E)',                             base:resTFS.stipT, mc:resTFSMC.stipT },
              { label:'TFS — Indennità aggiuntive personale asili nido e scolastico', base:resTFS.asili, mc:resTFSMC.asili },
              { label:'TFS — Indennità specifica ex art.4 comma 3 ccnl 1996',        base:resTFS.ind64, mc:resTFSMC.ind64 },
              { label:'TFS — Indennità di vigilanza per 12 mensilità',               base:resTFS.vig,   mc:resTFSMC.vig   },
            ].filter(r => r.base > 0 || r.mc > 0),
            { label:'TFS — Totale complessivo', base:resTFS.tot, mc:resTFSMC.tot },
          ] : []),
        ];
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-700 text-white px-4 py-3">
              <h3 className="font-semibold text-sm">
                MIGLIORAMENTO CONTRATTUALE CCNL 2022-2024 — {mcPos} · Decorrenza: 01.01.{mcDec}
              </h3>
              {/* Breakdown tabellare + differenziale → totale */}
              <p className="text-xs font-normal mt-1 text-amber-200">
                Tab. mensile: € {eur(nuovoTab)}
                {peoDiff > 0 && (
                  <> + Diff. storico (ex PEO): € {eur(peoDiff)} ={' '}
                    <strong className="text-white">€ {eur(nuovoTab + peoDiff)}</strong>
                  </>
                )}
                {!isMCTFSEligibile && (
                  <span className="ml-3 bg-amber-900/50 px-2 py-0.5 rounded">Solo Pensione — TFS non ricalcolato</span>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-amber-800">Indicatore</th>
                    <th className="px-3 py-2 text-right text-amber-800">CCNL 2019-2021</th>
                    <th className="px-3 py-2 text-right text-amber-800">CCNL 2022-2024</th>
                    <th className="px-3 py-2 text-right text-amber-800">Variazione</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ label, base, mc }, i) => {
                    const delta  = r2(mc - base);
                    const pct    = base > 0 ? ((delta/base)*100).toFixed(2) : null;
                    const isZero = delta === 0;
                    return (
                      <tr key={label} className={i%2===0?'bg-white':'bg-amber-50/50'}>
                        <td className="px-3 py-1.5 text-slate-700">{label}</td>
                        <td className="px-3 py-1.5 text-right font-mono">€ {eur(base)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">€ {eur(mc)}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold"
                          style={{ color: isZero ? '#64748b' : delta > 0 ? '#166534' : '#b91c1c' }}>
                          {isZero
                            ? <span className="font-normal italic text-slate-400">= invariata</span>
                            : <>{delta>0?'+':''}€ {eur(delta)}{pct?` (${pct}%)`:''}</>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white font-bold text-lg tracking-tight">
            Calcolo Unificato Ultimo Miglio — Pensione + TFS Pensionati
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">CCNL Funzioni Locali · INPS PASSWEB · Immedia S.p.A.</p>
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <button key={s.id} onClick={() => goTo(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step===s.id ? 'bg-blue-600 text-white'
                  : stepIdx>i  ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                               : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i+1}</span>
                {s.lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {step==='ana'  && renderAna()}
          {step==='voci' && renderVoci()}
          {step==='ris'  && renderRis()}
        </div>
      </div>
    </div>
  );
}
