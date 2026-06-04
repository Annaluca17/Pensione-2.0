/**
 * WizardTFR.tsx — Wizard 3 step "Calcolo Ultimo Miglio TFR"
 * Immedia S.p.A. — XDESK
 *
 * Step 1 Anagrafica → Step 2 Checklist (gate bloccante + bozza persistita) →
 * Step 3 Motore di analisi + replica maschera PASSWEB "Dati Retributivi utili al TFR".
 *
 * La logica di calcolo è interamente delegata a logicTFR.ts (motore puro).
 */

import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Info } from 'lucide-react';
import { round2 } from '../../utils/math';
import {
  calcolaTFR, giorniNelMese, giornoDelMese, giorniResiduiMeseIniziale,
  type InputTFR, type RisultatoTFR,
} from './logicTFR';
import {
  CHECKLIST_VOCI, checklistCompleta, emptyChecklist,
  LS_KEY_TFR_BOZZE,
  type ChecklistTFR, type DipendenteTFR,
} from '../../types/projectTFR';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface WizardTFRProps {
  progettoId: string;
  /** Dipendente esistente da modificare (riapertura pratica). */
  existing?: DipendenteTFR | null;
  onSave: (dip: DipendenteTFR) => void;
  onCancel: () => void;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const NO_SPIN =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden';

const fmtDate = (d: string): string => {
  if (!d || d.length < 10) return d || '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const eur = (n: number | undefined): string =>
  n == null
    ? '—'
    : '€ ' + round2(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (s: string): number => round2(parseFloat((s || '').replace(',', '.')) || 0);

// ─── Persistenza bozze checklist (per progetto + CF) ────────────────────────────

const draftKey = (progettoId: string, cf: string) => `${progettoId}__${cf.trim().toUpperCase()}`;

function loadDraft(progettoId: string, cf: string): ChecklistTFR | null {
  if (!cf || cf.trim().length !== 16) return null;
  try {
    const raw = localStorage.getItem(LS_KEY_TFR_BOZZE);
    const all = raw ? (JSON.parse(raw) as Record<string, ChecklistTFR>) : {};
    return all[draftKey(progettoId, cf)] ?? null;
  } catch {
    return null;
  }
}

function persistDraft(progettoId: string, cf: string, checklist: ChecklistTFR): void {
  if (!cf || cf.trim().length !== 16) return;
  try {
    const raw = localStorage.getItem(LS_KEY_TFR_BOZZE);
    const all = raw ? (JSON.parse(raw) as Record<string, ChecklistTFR>) : {};
    all[draftKey(progettoId, cf)] = checklist;
    localStorage.setItem(LS_KEY_TFR_BOZZE, JSON.stringify(all));
  } catch (e) {
    console.error('[WizardTFR] persistDraft failed', e);
  }
}

function clearDraft(progettoId: string, cf: string): void {
  try {
    const raw = localStorage.getItem(LS_KEY_TFR_BOZZE);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, ChecklistTFR>;
    delete all[draftKey(progettoId, cf)];
    localStorage.setItem(LS_KEY_TFR_BOZZE, JSON.stringify(all));
  } catch (e) {
    console.error('[WizardTFR] clearDraft failed', e);
  }
}

// ─── Tooltip / nota guida ───────────────────────────────────────────────────────

function NotaGuida({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export default function WizardTFR({ progettoId, existing, onSave, onCancel }: WizardTFRProps) {
  const [step, setStep] = useState<Step>(1);

  // Anagrafica
  const [cf, setCf]                       = useState(existing?.cf ?? '');
  const [cognome, setCognome]             = useState(existing?.cognome ?? '');
  const [nome, setNome]                   = useState(existing?.nome ?? '');
  const [dataAssunzione, setDataAssunzione] = useState(existing?.dataAssunzione ?? '');
  const [dataCessazione, setDataCessazione] = useState(existing?.dataCessazione ?? '');

  // Checklist (bozza persistita)
  const [checklist, setChecklist] = useState<ChecklistTFR>(existing?.checklist ?? emptyChecklist());

  // Input economici Step 3 (string per binding controllato)
  const [retrPrimoMesePieno,  setRetrPrimoMesePieno]  = useState(
    existing?.risultato?.inputs.retrVirtualePrimoMesePieno != null
      ? String(existing.risultato.inputs.retrVirtualePrimoMesePieno) : '');
  const [retrUltimoMesePieno, setRetrUltimoMesePieno] = useState(
    existing?.risultato?.inputs.retrVirtualeUltimoMesePieno != null
      ? String(existing.risultato.inputs.retrVirtualeUltimoMesePieno) : '');
  const [giorniTotMatur, setGiorniTotMatur]   = useState(
    existing?.risultato?.inputs.giorniTotaliMaturazione != null
      ? String(existing.risultato.inputs.giorniTotaliMaturazione) : '');
  const [tredAnnua, setTredAnnua]             = useState(
    existing?.risultato?.inputs.tredicesimaAnnua != null
      ? String(existing.risultato.inputs.tredicesimaAnnua) : '');
  const [emolValutabili, setEmolValutabili]   = useState(
    existing?.risultato?.inputs.emolumentiValutabili != null
      ? String(existing.risultato.inputs.emolumentiValutabili) : '');

  const [anaErr, setAnaErr] = useState('');

  const cfValid = cf.trim().length === 16;

  // ── Validazione anagrafica ────────────────────────────────────────────────
  const validateAna = (): string => {
    if (!cfValid) return 'Il Codice Fiscale deve essere di 16 caratteri.';
    if (!cognome.trim()) return 'Indicare il Cognome.';
    if (!nome.trim()) return 'Indicare il Nome.';
    if (dataAssunzione.length !== 10) return 'Indicare una data di assunzione valida.';
    if (dataCessazione.length !== 10) return 'Indicare una data di cessazione valida.';
    if (dataCessazione < dataAssunzione)
      return 'Accavallamento date: la cessazione non può precedere l’assunzione.';
    return '';
  };

  const goStep2 = () => {
    const err = validateAna();
    if (err) { setAnaErr(err); return; }
    setAnaErr('');
    // Carica bozza esistente per (progetto + CF), se presente.
    const draft = loadDraft(progettoId, cf);
    if (draft) setChecklist(draft);
    setStep(2);
  };

  const toggleCheck = (key: keyof ChecklistTFR) => {
    setChecklist(prev => {
      const next = { ...prev, [key]: !prev[key] };
      persistDraft(progettoId, cf, next);  // requisito critico: persiste subito
      return next;
    });
  };

  // ── Motore di calcolo (live) ──────────────────────────────────────────────
  const risultato: RisultatoTFR | null = useMemo(() => {
    if (dataAssunzione.length !== 10 || dataCessazione.length !== 10) return null;
    const input: InputTFR = {
      dataAssunzione,
      dataCessazione,
      retrVirtualePrimoMesePieno:  num(retrPrimoMesePieno),
      retrVirtualeUltimoMesePieno: num(retrUltimoMesePieno),
      giorniTotaliMaturazione:     num(giorniTotMatur),
      tredicesimaAnnua:            num(tredAnnua),
      giorniUltimoMese:            giornoDelMese(dataCessazione),
      emolumentiValutabili:        num(emolValutabili),
    };
    return calcolaTFR(input);
  }, [dataAssunzione, dataCessazione, retrPrimoMesePieno, retrUltimoMesePieno,
      giorniTotMatur, tredAnnua, emolValutabili]);

  // ── Salvataggio nel progetto ──────────────────────────────────────────────
  const handleSave = () => {
    if (!risultato) return;
    const dip: DipendenteTFR = {
      id: existing?.id ?? uid(),
      cf: cf.trim().toUpperCase(),
      cognome: cognome.trim(),
      nome: nome.trim(),
      dataAssunzione,
      dataCessazione,
      checklist,
      risultato,
      savedAt: new Date().toISOString(),
    };
    clearDraft(progettoId, cf);
    onSave(dip);
  };

  // ── Export PDF scheda ─────────────────────────────────────────────────────
  const exportSchedaPDF = () => {
    if (!risultato) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const ts = new Date().toLocaleString('it-IT');
    const SL: [number, number, number] = [30, 41, 59];

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Immedia S.p.A. — Ultimo Miglio TFR', 14, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Scheda Dati Retributivi utili al TFR — maschera PASSWEB', 14, 24);
    doc.text(`Generato: ${ts}`, 14, 29);
    doc.setLineWidth(0.3); doc.line(14, 32, 196, 32);

    autoTable(doc, {
      startY: 35,
      head: [['Cognome e Nome', 'Codice Fiscale', 'Data Assunzione', 'Data Cessazione']],
      body: [[`${cognome} ${nome}`.trim(), cf.toUpperCase(), fmtDate(dataAssunzione), fmtDate(dataCessazione)]],
      styles: { fontSize: 8 }, headStyles: { fillColor: SL },
    });
    let y = (doc as any).lastAutoTable.finalY + 6;

    const rows: Array<[string, string]> = [
      ['Decorrenza Giuridica', fmtDate(risultato.decorrenzaGiuridica)],
      ['Decorrenza Economica', fmtDate(risultato.decorrenzaEconomica)],
      ['Data Cessazione', fmtDate(risultato.dataCessazione)],
    ];

    if (risultato.casoIniziale === 'PARZIALE_GE15') {
      rows.push(['Rateo mensile 13^ teorica primo anno di servizio', eur(risultato.rateoPrimoAnno)]);
      rows.push(['Modalità di pagamento (rateo primo anno)', 'Parziale']);
    }
    if (risultato.casoFinale === 'PARZIALE_GE15') {
      rows.push(['Rateo 13^ teorica mese di cessazione', eur(risultato.rateoCessazione)]);
      rows.push(['Modalità di pagamento (rateo cessazione)', 'Parziale']);
    } else if (risultato.casoFinale === 'PARZIALE_LT15') {
      rows.push(['Tredicesima ed emolumenti valutabili arretrati per cassa', eur(risultato.tredicesimaEmolumentiCassa)]);
    }
    if (risultato.casoIniziale === 'PIENO' && risultato.casoFinale === 'PIENO') {
      rows.push(['Esito', 'Per questo periodo di riferimento non devono essere inseriti i Dati Retributivi.']);
    } else if (risultato.casoFinale === 'PIENO') {
      rows.push(['Dato economico mese finale', 'Dato economico non necessario (mese pieno).']);
    }

    autoTable(doc, {
      startY: y,
      head: [['Campo PASSWEB', 'Valore']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: SL },
      columnStyles: { 1: { halign: 'right', cellWidth: 70 } },
    });
    y = (doc as any).lastAutoTable.finalY;

    doc.save(`SchedaTFR_${cf.toUpperCase() || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ── Indicatore step ───────────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 text-xs">
      {([[1, 'Anagrafica'], [2, 'Checklist'], [3, 'Output PASSWEB']] as const).map(([n, lbl], i) => (
        <div key={n} className="flex items-center gap-2">
          <span className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium',
            step === n ? 'bg-blue-600 text-white'
              : step > n ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
          ].join(' ')}>
            <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-[11px]">{n}</span>
            {lbl}
          </span>
          {i < 2 && <span className="text-slate-300">→</span>}
        </div>
      ))}
    </div>
  );

  // ── Render Step 1 — Anagrafica ────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold text-slate-800">Step 1 — Anagrafica</h2>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Codice Fiscale ★</label>
        <input
          value={cf}
          onChange={e => setCf(e.target.value.toUpperCase())}
          maxLength={16}
          placeholder="16 caratteri"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className={`text-xs mt-1 ${cfValid ? 'text-emerald-600' : 'text-slate-400'}`}>
          {cf.length}/16 caratteri
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Cognome ★</label>
          <input value={cognome} onChange={e => setCognome(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nome ★</label>
          <input value={nome} onChange={e => setNome(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Data assunzione ★</label>
          <input type="date" value={dataAssunzione} onChange={e => setDataAssunzione(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Data cessazione ★</label>
          <input type="date" value={dataCessazione} onChange={e => setDataCessazione(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {anaErr && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex gap-2">
          <span className="shrink-0">⚠️</span><span>{anaErr}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          ← Annulla
        </button>
        <button onClick={goStep2}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Avanti →
        </button>
      </div>
    </div>
  );

  // ── Render Step 2 — Checklist ─────────────────────────────────────────────
  const renderStep2 = () => {
    const completa = checklistCompleta(checklist);
    return (
      <div className="space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold text-slate-800">Step 2 — Checklist di verifica</h2>
        <p className="text-xs text-slate-500">
          Spuntare tutte le voci per sbloccare l’analisi. Lo stato è salvato automaticamente come
          <strong> bozza di lavorazione</strong> e ricompare riaprendo la pratica (stesso progetto + stesso CF).
        </p>

        <div className="space-y-2">
          {CHECKLIST_VOCI.map(({ key, label }, i) => (
            <label key={key}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                checklist[key] ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}>
              <input type="checkbox" checked={checklist[key]} onChange={() => toggleCheck(key)}
                className="w-4 h-4 accent-emerald-600" />
              <span className="text-sm text-slate-700">
                <span className="text-slate-400 text-xs mr-1.5">{i + 1}.</span>{label}
              </span>
            </label>
          ))}
        </div>

        {!completa && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800 flex gap-2">
            <span className="shrink-0">ℹ️</span>
            <span>Lo Step 3 (analisi e output PASSWEB) è accessibile solo dopo aver spuntato <strong>tutte e 7</strong> le voci.</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={() => setStep(1)}
            className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            ← Indietro
          </button>
          <button onClick={() => setStep(3)} disabled={!completa}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Avanti →
          </button>
        </div>
      </div>
    );
  };

  // ── Render Step 3 — Output PASSWEB ────────────────────────────────────────
  const renderStep3 = () => {
    if (!risultato) return null;
    const r = risultato;
    const entrambiPieni = r.casoIniziale === 'PIENO' && r.casoFinale === 'PIENO';

    const residui = giorniResiduiMeseIniziale(dataAssunzione);
    const giornoCess = giornoDelMese(dataCessazione);
    const gMeseCess = giorniNelMese(dataCessazione);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Step 3 — Dati Retributivi utili al TFR (PASSWEB)</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors">
              💾 Salva nel Progetto
            </button>
            <button onClick={exportSchedaPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              ↓ Esporta PDF scheda
            </button>
            <button onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              ← Modifica
            </button>
          </div>
        </div>

        {/* Riepilogo anagrafica */}
        <div className="bg-slate-100 rounded-lg px-4 py-3 text-sm text-slate-700 flex flex-wrap gap-4">
          <span><strong>Dipendente:</strong> {cognome} {nome}</span>
          <span><strong>CF:</strong> <span className="font-mono">{cf.toUpperCase()}</span></span>
          <span><strong>Assunzione:</strong> {fmtDate(dataAssunzione)}</span>
          <span><strong>Cessazione:</strong> {fmtDate(dataCessazione)}</span>
        </div>

        {/* Scheda PASSWEB — Dati economici */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h3 className="font-semibold text-sm">Inserimento Dati Retributivi utili al TFR — Dati economici</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Decorrenze sempre presenti */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldRO label="Decorrenza Giuridica" value={fmtDate(r.decorrenzaGiuridica)} />
              <FieldRO label="Decorrenza Economica" value={fmtDate(r.decorrenzaEconomica)} />
              <FieldRO label="Data Cessazione" value={fmtDate(r.dataCessazione)} />
            </div>

            {entrambiPieni && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-medium">
                Per questo periodo di riferimento non devono essere inseriti i Dati Retributivi.
              </div>
            )}

            {/* ── Blocco mese iniziale ── */}
            {r.casoIniziale === 'PARZIALE_GE15' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Mese iniziale — rateo 13^ teorica primo anno</h4>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Retribuzione virtuale TFR (PASSWEB) del 1° mese pieno
                  </label>
                  <input type="number" min="0" step="0.01" value={retrPrimoMesePieno}
                    onChange={e => setRetrPrimoMesePieno(e.target.value)} placeholder="0,00"
                    className={`w-full max-w-xs text-right border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPIN}`} />
                </div>
                <NotaGuida>
                  Inserire il valore della retribuzione virtuale ai fini TFR così come esposto su PASSWEB nel
                  primo mese intero di servizio. Usando il dato PASSWEB si evita il calcolo da cedolino
                  (imponibile / 13 × 1,25 riproporzionato al part-time): il valore PASSWEB è già al netto della riproporzione.
                </NotaGuida>
                <div className="rounded-lg bg-white border border-blue-200 px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">
                    Indicare il valore del rateo mensile di 13^ teorica relativo al primo anno di servizio
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-lg font-bold text-blue-700 font-mono">{eur(r.rateoPrimoAnno)}</span>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">Modalità: Parziale</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Il rateo di 13^ del primo mese di servizio è stato corrisposto e valorizzato nel campo
                    «retribuzione valutabile»? → <strong>SI / Parziale</strong>
                  </p>
                </div>
              </div>
            )}

            {/* ── Blocco mese finale ── */}
            {r.casoFinale === 'PIENO' && !entrambiPieni && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Mese finale: </span>Dato economico non necessario (mese pieno).
              </div>
            )}

            {r.casoFinale === 'PARZIALE_GE15' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Mese finale — rateo 13^ teorica cessazione (≥ 15 gg)</h4>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Retribuzione virtuale TFR (PASSWEB) dell’ultimo mese pieno
                  </label>
                  <input type="number" min="0" step="0.01" value={retrUltimoMesePieno}
                    onChange={e => setRetrUltimoMesePieno(e.target.value)} placeholder="0,00"
                    className={`w-full max-w-xs text-right border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPIN}`} />
                </div>
                <NotaGuida>
                  Prendere il valore dall’ultimo mese pieno disponibile su PASSWEB; non sottrarre i giorni non utili,
                  indicare solo Modalità di pagamento Parziale.
                </NotaGuida>
                <div className="rounded-lg bg-white border border-blue-200 px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">Valorizzazione importo rateo di 13^ teorica mese di cessazione</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-lg font-bold text-blue-700 font-mono">{eur(r.rateoCessazione)}</span>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-medium">Modalità: Parziale</span>
                  </div>
                </div>
              </div>
            )}

            {r.casoFinale === 'PARZIALE_LT15' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Mese finale — mese parziale di cessazione (&lt; 15 gg)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giorni totali di maturazione 13^</label>
                    <input type="number" min="0" step="1" value={giorniTotMatur}
                      onChange={e => setGiorniTotMatur(e.target.value)} placeholder="es. 365"
                      className={`w-full text-right border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPIN}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tredicesima annua totale</label>
                    <input type="number" min="0" step="0.01" value={tredAnnua}
                      onChange={e => setTredAnnua(e.target.value)} placeholder="0,00"
                      className={`w-full text-right border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPIN}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Giorni lavorati nell’ultimo mese</label>
                    <input type="number" value={giornoCess} readOnly
                      className="w-full text-right border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Eventuali emolumenti valutabili arretrati</label>
                    <input type="number" min="0" step="0.01" value={emolValutabili}
                      onChange={e => setEmolValutabili(e.target.value)} placeholder="0,00"
                      className={`w-full text-right border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${NO_SPIN}`} />
                  </div>
                </div>
                <NotaGuida>
                  Verificare nell’ultimo cedolino la presenza di pagamenti per arretrati utili ai fini TFR
                  (mensilità pregresse non corrisposte o casistiche specifiche) da sommare alla quota calcolata.
                </NotaGuida>
                <div className="rounded-lg bg-white border border-blue-200 px-4 py-3">
                  <p className="text-xs text-slate-500 mb-1">Tredicesima ed emolumenti valutabili arretrati per cassa</p>
                  <span className="text-lg font-bold text-blue-700 font-mono">{eur(r.tredicesimaEmolumentiCassa)}</span>
                  <p className="text-xs text-slate-400 mt-1">
                    = (Tredicesima annua / Giorni totali maturazione) × {giornoCess} giorni + emolumenti valutabili
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Diagnostica classificazione */}
        <div className="text-xs text-slate-400 flex flex-wrap gap-4">
          <span>Mese iniziale: <strong className="text-slate-600">{r.casoIniziale}</strong> (giorno {giornoDelMese(dataAssunzione)}, residui {residui})</span>
          <span>Mese finale: <strong className="text-slate-600">{r.casoFinale}</strong> (giorno {giornoCess} su {gMeseCess})</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <StepBar />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}

// ─── Sub-componenti ──────────────────────────────────────────────────────────

function FieldRO({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
