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
  /** Quota tabellare: stipT + tredT */
  totTab: number;
  /** Quota ultimo miglio: ria + asili + ind64 + vig */
  totUM: number;
  /** Totale complessivo TFS */
  tot: number;
}

// ─── Costanti ────────────────────────────────────────────────────────────────

const TAB: TabellaArea[] = [
  { area: 'Funzionari ed E.Q. (Area D)', t24: 2078.47, t26: 2092.84, pos: ['D1','D2','D3','D4','D5','D6','D7'] },
  { area: 'Istruttori (Area C)',          t24: 1915.55, t26: 1928.23, pos: ['C1','C2','C3','C4','C5','C6'] },
  { area: 'Operatori Esperti (Area B)',   t24: 1704.38, t26: 1715.27, pos: ['B1','B2','B3','B4','B5','B6','B7','B8'] },
  { area: 'Operatori (Area A)',           t24: 1637.12, t26: 1646.09, pos: ['A1','A2','A3','A4','A5','A6'] },
];

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
  { id: 'stip', lbl: 'Stipendi TFS' },
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

// ─── Motore di calcolo ────────────────────────────────────────────────────────

interface CalcPensioneResult {
  a: number;
  t: number;
  voci: Array<{ id:string; n:string; v13:boolean; m:number; a:number }>;
}

function calcPensione(
  imp: Record<string, string>,
  overrideTab?: number,
): CalcPensioneResult {
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

function calcTFS(
  stipEff: Array<{ s: number; t: number }>,
  imp: Record<string, string>,
): RisultatoTFS {
  const vm = (id: string) => r2(parseFloat(imp[id]) || 0);
  const sS   = r2(stipEff.reduce((s, v) => s + v.s, 0));
  const sT   = r2(stipEff.reduce((s, v) => s + v.t, 0));
  // Quota tabellare (Tab. E PASSWEB)
  const stipT = r2(sS + (vm('02') + vm('03') + vm('04') + vm('05') + vm('09')) * 12);
  const tredT = r2(sT + vm('02') + vm('03') + vm('04') + vm('05') + vm('09') + vm('06'));
  // Quota ultimo miglio
  const ria   = r2(vm('06') * 12);
  const asili = r2((vm('12') + vm('13')) * 12);
  const ind64 = r2(vm('08') * 12);
  const vig   = r2(vm('11') * 12);

  const totTab = r2(stipT + tredT);
  const totUM  = r2(ria + asili + ind64 + vig);

  return { stipT, tredT, ria, asili, ind64, vig, totTab, totUM, tot: r2(totTab + totUM) };
}

// ─── Export Excel (SheetJS) ───────────────────────────────────────────────────

function exportXLSX(
  ana: Anagrafica,
  pensione: CalcPensioneResult,
  tfs: RisultatoTFS,
  pensioneMC: CalcPensioneResult | null,
  tfsMC: RisultatoTFS | null,
  mcPos: string,
  mcDec: DecId,
  nuovoTab: number,
): void {
  const wb = XLSX.utils.book_new();

  const wsPensioneData = [
    ['ULTIMO MIGLIO PENSIONE'],
    ['Nominativo', ana.nome, 'CF', ana.cf, 'Data inizio', ana.data, 'Motivo', ana.motivo],
    [],
    ['Voce Retributiva', '13^', 'Mensile (€)', 'Annuo (€)'],
    ...pensione.voci.filter(v => v.m > 0).map(v => [v.n, v.v13 ? 'SÌ' : 'NO', v.m, v.a]),
    [],
    ['TOTALE VOCI FISSE ANNUO', '', '', pensione.a],
    ['13^ MENSILITÀ', '', '', pensione.t],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsPensioneData), 'Pensione');

  const wsTFSData = [
    ['ULTIMO MIGLIO TFS PENSIONATI'],
    [],
    ['Componente', 'Importo annuo (€)'],
    ['Retribuzione Ind. Anzianità (R.I.A.)',                        tfs.ria],
    ['Tredicesima mensilità',                                       tfs.tredT],
    ['Stipendio tabellare (TAB E)',                                  tfs.stipT],
    ['Indennità aggiuntive personale asili nido e scolastico',      tfs.asili],
    ['Indennità specifica ex art.4 comma 3 ccnl 1996',              tfs.ind64],
    ['Indennità di vigilanza per 12 mensilità',                     tfs.vig],
    [],
    ['TOTALE TFS PENSIONATI',                                       tfs.tot],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsTFSData), 'TFS Pensionati');

  if (pensioneMC && tfsMC) {
    const wsMCData = [
      ['CONFRONTO MIGLIORAMENTO CONTRATTUALE CCNL 2022-2024'],
      ['Posizione', mcPos, 'Decorrenza', '01.01.' + mcDec, 'Nuovo tabellare mensile', nuovoTab],
      [],
      ['Indicatore', 'CCNL 2019-2021', 'CCNL 2022-2024', 'Variazione (€)', 'Var. (%)'],
      ['Pensione — Tot. voci fisse annuo', pensione.a,   pensioneMC.a,   r2(pensioneMC.a - pensione.a),   +(((pensioneMC.a - pensione.a) / pensione.a) * 100).toFixed(2)],
      ['Pensione — 13^ mensilità',         pensione.t,   pensioneMC.t,   r2(pensioneMC.t - pensione.t),   +(((pensioneMC.t - pensione.t) / pensione.t) * 100).toFixed(2)],
      ...[
        ['TFS — Retribuzione Ind. Anzianità (R.I.A.)',                   tfs.ria,    tfsMC.ria,    r2(tfsMC.ria - tfs.ria),       tfs.ria > 0    ? +(((tfsMC.ria - tfs.ria) / tfs.ria) * 100).toFixed(2)       : 0],
        ['TFS — Tredicesima mensilità',                                   tfs.tredT,  tfsMC.tredT,  r2(tfsMC.tredT - tfs.tredT),   tfs.tredT > 0  ? +(((tfsMC.tredT - tfs.tredT) / tfs.tredT) * 100).toFixed(2)   : 0],
        ['TFS — Stipendio tabellare (TAB E)',                             tfs.stipT,  tfsMC.stipT,  r2(tfsMC.stipT - tfs.stipT),   tfs.stipT > 0  ? +(((tfsMC.stipT - tfs.stipT) / tfs.stipT) * 100).toFixed(2)   : 0],
        ['TFS — Indennità aggiuntive personale asili nido e scolastico', tfs.asili,  tfsMC.asili,  r2(tfsMC.asili - tfs.asili),   tfs.asili > 0  ? +(((tfsMC.asili - tfs.asili) / tfs.asili) * 100).toFixed(2)   : 0],
        ['TFS — Indennità specifica ex art.4 comma 3 ccnl 1996',        tfs.ind64,  tfsMC.ind64,  r2(tfsMC.ind64 - tfs.ind64),   tfs.ind64 > 0  ? +(((tfsMC.ind64 - tfs.ind64) / tfs.ind64) * 100).toFixed(2)   : 0],
        ['TFS — Indennità di vigilanza per 12 mensilità',               tfs.vig,    tfsMC.vig,    r2(tfsMC.vig - tfs.vig),       tfs.vig > 0    ? +(((tfsMC.vig - tfs.vig) / tfs.vig) * 100).toFixed(2)         : 0],
      ].filter(r => (r[1] as number) > 0),
      ['TFS — Totale complessivo',                                        tfs.tot,    tfsMC.tot,    r2(tfsMC.tot - tfs.tot),       tfs.tot > 0    ? +(((tfsMC.tot - tfs.tot) / tfs.tot) * 100).toFixed(2)         : 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsMCData), 'Miglioramento Contrattuale');
  }

  XLSX.writeFile(wb, `UltimoMiglio_${ana.cf || 'export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── Export PDF (jsPDF + autoTable) ──────────────────────────────────────────

function exportPDF(
  ana: Anagrafica,
  pensione: CalcPensioneResult,
  tfs: RisultatoTFS,
  pensioneMC: CalcPensioneResult | null,
  tfsMC: RisultatoTFS | null,
  mcPos: string,
  mcDec: DecId,
  nuovoTab: number,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ts  = new Date().toLocaleString('it-IT');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CALCOLO UNIFICATO ULTIMO MIGLIO — INPS PASSWEB', 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Immedia S.p.A. — CCNL Funzioni Locali — Generato: ${ts}`, 14, 24);
  doc.setLineWidth(0.3);
  doc.line(14, 27, 196, 27);

  autoTable(doc, {
    startY: 30,
    head: [['Nominativo', 'CF', 'Data inizio', 'Motivo']],
    body: [[ana.nome, ana.cf, ana.data, ana.motivo]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PENSIONE — Ultimo Miglio', 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Voce Retributiva', '13^', 'Mensile (€)', 'Annuo (€)']],
    body: [
      ...pensione.voci.filter(v => v.m > 0).map(v => [v.n, v.v13 ? 'SÌ' : 'NO', eur(v.m), eur(v.a)]),
      [{ content: 'TOTALE VOCI FISSE ANNUO', styles: { fontStyle: 'bold' } }, '', '', { content: '€ ' + eur(pensione.a), styles: { fontStyle: 'bold' } }],
      [{ content: '13^ MENSILITÀ',           styles: { fontStyle: 'bold' } }, '', '', { content: '€ ' + eur(pensione.t), styles: { fontStyle: 'bold' } }],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TFS PENSIONATI — Ultimo Miglio (Tabellare + Ultimo Miglio)', 14, y);
  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Importo annuo (€)']],
    body: [
      ['Retribuzione Ind. Anzianità (R.I.A.)',                       eur(tfs.ria)],
      ['Tredicesima mensilità',                                      eur(tfs.tredT)],
      ['Stipendio tabellare (TAB E)',                                 eur(tfs.stipT)],
      ['Indennità aggiuntive personale asili nido e scolastico',     eur(tfs.asili)],
      ['Indennità specifica ex art.4 comma 3 ccnl 1996',             eur(tfs.ind64)],
      ['Indennità di vigilanza per 12 mensilità',                    eur(tfs.vig)],
      [
        { content: 'TOTALE TFS PENSIONATI', styles: { fontStyle: 'bold', fillColor: [30,41,59], textColor: [255,255,255] } },
        { content: '€ ' + eur(tfs.tot), styles: { fontStyle: 'bold', fillColor: [30,41,59], textColor: [255,255,255] } },
      ],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 1: { halign: 'right' } },
  });

  if (pensioneMC && tfsMC) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`MIGLIORAMENTO CONTRATTUALE CCNL 2022-2024 — ${mcPos} — decorrenza 01.01.${mcDec}`, 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Nuovo tabellare mensile: € ${eur(nuovoTab)}`, 14, 24);
    autoTable(doc, {
      startY: 28,
      head: [['Indicatore', 'CCNL 2019-2021', 'CCNL 2022-2024', 'Variazione']],
      body: [
        ['Pensione — Tot. voci fisse annuo', '€ ' + eur(pensione.a), '€ ' + eur(pensioneMC.a), (pensioneMC.a >= pensione.a ? '+' : '') + '€ ' + eur(pensioneMC.a - pensione.a)],
        ['Pensione — 13^ mensilità',         '€ ' + eur(pensione.t), '€ ' + eur(pensioneMC.t), (pensioneMC.t >= pensione.t ? '+' : '') + '€ ' + eur(pensioneMC.t - pensione.t)],
        ...[
          ['TFS — Retribuzione Ind. Anzianità (R.I.A.)',                   tfs.ria,   tfsMC.ria  ],
          ['TFS — Tredicesima mensilità',                                   tfs.tredT, tfsMC.tredT],
          ['TFS — Stipendio tabellare (TAB E)',                             tfs.stipT, tfsMC.stipT],
          ['TFS — Indennità aggiuntive personale asili nido e scolastico', tfs.asili, tfsMC.asili],
          ['TFS — Indennità specifica ex art.4 comma 3 ccnl 1996',        tfs.ind64, tfsMC.ind64],
          ['TFS — Indennità di vigilanza per 12 mensilità',               tfs.vig,   tfsMC.vig  ],
        ].filter(r => (r[1] as number) > 0)
          .map(r => {
            const b = r[1] as number; const m = r[2] as number;
            return [r[0] as string, '€ ' + eur(b), '€ ' + eur(m), (m >= b ? '+' : '') + '€ ' + eur(r2(m - b))];
          }),
        ['TFS — Totale complessivo', '€ ' + eur(tfs.tot), '€ ' + eur(tfsMC.tot), (tfsMC.tot >= tfs.tot ? '+' : '') + '€ ' + eur(r2(tfsMC.tot - tfs.tot))],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
  }

  doc.save(`UltimoMiglio_${ana.cf || 'export'}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function CalcoloUnificatoUltimoMiglio() {
  const [step, setStep] = useState<StepId>('ana');
  const [ana, setAna] = useState<Anagrafica>({ nome:'', cf:'', data:'', motivo:'' });
  const [imp, setImp] = useState<Record<string, string>>({});
  const setVoce = (id: string, v: string) => setImp(p => ({ ...p, [id]: v }));

  const [mcOn,  setMcOn]  = useState(false);
  const [mcPos, setMcPos] = useState('');
  const [mcDec, setMcDec] = useState<DecId>('2024');

  const base = r2(parseFloat(imp['01']) || 0);
  const [stips, setStips] = useState<string[]>(Array(12).fill(''));
  const [exc,   setExc]   = useState<boolean[]>(Array(12).fill(false));

  const baseStr  = String(base);
  const stipsEff = stips.map((s, i) => exc[i] ? s : baseStr);

  const stipEff = stipsEff.map(s => {
    const v = r2(parseFloat(s) || 0);
    return { s: v, t: r2(v / 12) };
  });

  const nuovoTab = useMemo(() => getNuovoTab(mcPos, mcDec), [mcPos, mcDec]);

  const resPensione = useMemo(() => calcPensione(imp), [imp]);
  const resTFS      = useMemo(() => calcTFS(stipEff, imp), [stipsEff, imp]);

  const resPensioneMC = useMemo(
    () => mcOn && mcPos ? calcPensione(imp, nuovoTab) : null,
    [mcOn, mcPos, imp, nuovoTab],
  );

  // FIX: usa idx come nome dell'indice nel map per evitare il bug _ vs i
  const resTFSMC = useMemo(
    () => mcOn && mcPos
      ? calcTFS(
          stipsEff.map((_s, idx) => {
            const v = exc[idx] ? r2(parseFloat(stipsEff[idx]) || 0) : nuovoTab;
            return { s: v, t: r2(v / 12) };
          }),
          { ...imp, '01': String(nuovoTab) },
        )
      : null,
    [mcOn, mcPos, nuovoTab, stipsEff, exc, imp],
  );

  const goTo = (s: StepId) => setStep(s);
  const stepIdx = STEPS.findIndex(s => s.id === step);

  // ── Render Anagrafica ──────────────────────────────────────────────────────
  const renderAna = () => (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold text-slate-800">Dati Anagrafici</h2>
      {(['nome','cf','data','motivo'] as const).map(k => (
        <div key={k}>
          <label className="block text-sm font-medium text-slate-600 mb-1 capitalize">
            {k === 'cf' ? 'Codice Fiscale' : k === 'data' ? 'Data inizio servizio' : k === 'motivo' ? 'Motivo cessazione' : 'Nominativo'}
          </label>
          <input
            type={k === 'data' ? 'date' : 'text'}
            value={ana[k]}
            onChange={e => setAna(p => ({ ...p, [k]: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
      <button
        onClick={() => goTo('voci')}
        disabled={!ana.nome || !ana.cf}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        Avanti →
      </button>
    </div>
  );

  // ── Render Voci ────────────────────────────────────────────────────────────
  const renderVoci = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Voci Retributive — Inserimento Unificato</h2>
      <p className="text-xs text-slate-500">Inserimento unico: i dati alimentano sia il calcolo Pensione che TFS</p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={mcOn} onChange={e => setMcOn(e.target.checked)} className="w-4 h-4 accent-amber-600" />
          <span className="text-sm font-medium text-amber-800">Applica Miglioramento Contrattuale CCNL 2022-2024</span>
        </label>
        <p className="text-xs text-amber-700 mt-1 ml-6">
          Flag globale: sostituisce stipendio tabellare (Pensione) e importo base mensile TFS con nuovo Tab. G.
        </p>
        {mcOn && (
          <div className="mt-3 ml-6 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Posizione economica</label>
              <select value={mcPos} onChange={e => setMcPos(e.target.value)} className="border border-amber-300 rounded px-2 py-1 text-sm bg-white">
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
              <select value={mcDec} onChange={e => setMcDec(e.target.value as DecId)} className="border border-amber-300 rounded px-2 py-1 text-sm bg-white">
                <option value="2024">01.01.2024</option>
                <option value="2026">01.01.2026</option>
              </select>
            </div>
            {mcPos && (
              <div className="flex items-end pb-1">
                <span className="text-sm font-semibold text-amber-800">
                  <strong>{mcPos}</strong>{' '}· Nuovo tabellare: <strong>€ {eur(nuovoTab)}</strong>{' '}· Impatto: <strong>Pensione + TFS (quota tabellare)</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Voce Retributiva</th>
              <th className="px-3 py-2 text-center w-20">Impatto</th>
              <th className="px-3 py-2 text-center w-16">13^ P</th>
              <th className="px-3 py-2 text-center w-16">Molt.</th>
              <th className="px-3 py-2 text-right w-36">Mensile (€)</th>
              <th className="px-3 py-2 text-right w-36">Annuo (€)</th>
            </tr>
          </thead>
          <tbody>
            {VOCI.map((v, i) => {
              const m = r2(parseFloat(imp[v.id]) || 0);
              const a = r2(m * v.x);
              return (
                <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 text-slate-700">
                    <span className="text-slate-400 text-xs mr-1">#{v.id}</span>{v.n}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {v.tfs ? <span className="text-xs text-blue-600 font-medium">P+TFS</span> : <span className="text-xs text-slate-400">Solo P</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center text-slate-500 text-xs">{v.v13 ? 'SÌ' : '–'}</td>
                  <td className="px-3 py-1.5 text-center text-slate-500 text-xs">×{v.x}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number" min="0" step="0.01"
                      value={imp[v.id] ?? ''}
                      onChange={e => setVoce(v.id, e.target.value)}
                      className="w-full text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-sm" style={{ color: a > 0 ? '#0f172a' : '#94a3b8' }}>
                    € {eur(a)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => goTo('ana')} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">← Indietro</button>
        <button onClick={() => goTo('stip')} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Avanti →</button>
      </div>
    </div>
  );

  // ── Render Stipendi TFS ────────────────────────────────────────────────────
  const renderStip = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Stipendi Ultimi 12 Mesi (per calcolo TFS)</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <strong>Nota TFS:</strong> Importo base auto-popolato dalla voce 01. Spunta &ldquo;Eccezione&rdquo; solo per mesi con importo effettivo diverso.
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Mese</th>
              <th className="px-3 py-2 text-center w-24">Eccezione</th>
              <th className="px-3 py-2 text-right w-40">Stipendio mensile (€)</th>
              <th className="px-3 py-2 text-right w-36">Quota 13^ (€)</th>
            </tr>
          </thead>
          <tbody>
            {MESI.map((m, i) => {
              const effV = r2(parseFloat(stipsEff[i]) || 0);
              return (
                <tr key={m} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 text-slate-700">{m}</td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox" checked={exc[i]}
                      onChange={e => {
                        const ne = [...exc]; ne[i] = e.target.checked; setExc(ne);
                        if (!e.target.checked) { const ns = [...stips]; ns[i] = base.toString(); setStips(ns); }
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number" min="0" step="0.01"
                      disabled={!exc[i]}
                      value={exc[i] ? stips[i] : String(base)}
                      onChange={e => { const ns = [...stips]; ns[i] = e.target.value; setStips(ns); }}
                      className="w-full text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-600">€ {eur(r2(effV / 12))}</td>
                </tr>
              );
            })}
            <tr className="bg-slate-800 text-white font-semibold">
              <td className="px-3 py-2" colSpan={2}>Totale 12 mesi:</td>
              <td className="px-3 py-2 text-right font-mono">Stip: € {eur(stipEff.reduce((s, v) => s + v.s, 0))}</td>
              <td className="px-3 py-2 text-right font-mono">13^: € {eur(stipEff.reduce((s, v) => s + r2(v.t), 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => goTo('voci')} className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">← Indietro</button>
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
          <button onClick={() => exportXLSX(ana, resPensione, resTFS, resPensioneMC, resTFSMC, mcPos, mcDec, nuovoTab)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            ↓ Excel
          </button>
          <button onClick={() => exportPDF(ana, resPensione, resTFS, resPensioneMC, resTFSMC, mcPos, mcDec, nuovoTab)}
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
        <span><strong>Motivo:</strong> {ana.motivo}</span>
      </div>

      {/* Pannelli Pensione + TFS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* PENSIONE */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h3 className="font-semibold text-sm">PENSIONE — Ultimo Miglio</h3>
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
                  <tr key={v.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-1.5 text-slate-700">{v.n}</td>
                    <td className="px-3 py-1.5 text-center text-xs text-slate-500">{v.v13 ? 'SÌ' : 'NO'}</td>
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

        {/* TFS — solo quota tabellare (stipendio tabellare + tredicesima) */}
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
                  { label: 'Retribuzione Ind. Anzianità (R.I.A.)',                           val: resTFS.ria   },
                  { label: 'Tredicesima mensilità',                                          val: resTFS.tredT },
                  { label: 'Stipendio tabellare (TAB E)',                                     val: resTFS.stipT },
                  { label: 'Indennità aggiuntive personale asili nido e scolastico',         val: resTFS.asili },
                  { label: 'Indennità specifica ex art.4 comma 3 ccnl 1996',                val: resTFS.ind64 },
                  { label: 'Indennità di vigilanza per 12 mensilità',                       val: resTFS.vig   },
                ] as { label: string; val: number }[]).map(({ label, val }, i) =>
                  val > 0 ? (
                    <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
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

      {/* Miglioramento Contrattuale */}
      {mcOn && mcPos && resPensioneMC && resTFSMC && (() => {
        // Righe MC: [label, base, mc, nota?]
        type MCRow = { label: string; base: number; mc: number; nota?: string };
        const rows: MCRow[] = [
          { label: 'Pensione — Tot. voci fisse annuo',                                    base: resPensione.a,  mc: resPensioneMC.a  },
          { label: 'Pensione — 13^ mensilità',                                             base: resPensione.t,  mc: resPensioneMC.t  },
          ...[
            { label: 'TFS — Retribuzione Ind. Anzianità (R.I.A.)',                        base: resTFS.ria,     mc: resTFSMC.ria     },
            { label: 'TFS — Tredicesima mensilità',                                        base: resTFS.tredT,   mc: resTFSMC.tredT   },
            { label: 'TFS — Stipendio tabellare (TAB E)',                                  base: resTFS.stipT,   mc: resTFSMC.stipT   },
            { label: 'TFS — Indennità aggiuntive personale asili nido e scolastico',      base: resTFS.asili,   mc: resTFSMC.asili   },
            { label: 'TFS — Indennità specifica ex art.4 comma 3 ccnl 1996',             base: resTFS.ind64,   mc: resTFSMC.ind64   },
            { label: 'TFS — Indennità di vigilanza per 12 mensilità',                    base: resTFS.vig,     mc: resTFSMC.vig     },
          ].filter(r => r.base > 0),
          { label: 'TFS — Totale complessivo',                                             base: resTFS.tot,     mc: resTFSMC.tot     },
        ];
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-700 text-white px-4 py-3">
              <h3 className="font-semibold text-sm">
                MIGLIORAMENTO CONTRATTUALE CCNL 2022-2024 — {mcPos} · Decorrenza: 01.01.{mcDec} · Nuovo tabellare mensile: € {eur(nuovoTab)}
              </h3>
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
                  {rows.map(({ label, base, mc, nota }, i) => {
                    const delta = r2(mc - base);
                    const pct   = base > 0 ? ((delta / base) * 100).toFixed(2) : null;
                    const isZero = delta === 0;
                    return (
                      <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/50'}>
                        <td className="px-3 py-1.5 text-slate-700">
                          {label}
                          {nota && <span className="block text-xs text-slate-400 italic">{nota}</span>}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">€ {eur(base)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">€ {eur(mc)}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold"
                          style={{ color: isZero ? '#64748b' : delta > 0 ? '#166534' : '#b91c1c' }}>
                          {isZero
                            ? <span className="text-slate-400 font-normal italic">= invariata</span>
                            : <>{delta > 0 ? '+' : ''}€ {eur(delta)}{pct ? ` (${pct}%)` : ''}</>
                          }
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

  // ── Layout principale ──────────────────────────────────────────────────────
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
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step === s.id
                    ? 'bg-blue-600 text-white'
                    : stepIdx > i
                    ? 'bg-slate-600 text-slate-200 hover:bg-slate-500'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i + 1}</span>
                {s.lbl}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {step === 'ana'  && renderAna()}
          {step === 'voci' && renderVoci()}
          {step === 'stip' && renderStip()}
          {step === 'ris'  && renderRis()}
        </div>
      </div>
    </div>
  );
}
