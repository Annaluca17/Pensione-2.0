/**
 * UltimoMiglioTFRShell.tsx — Shell gestione progetti "Ultimo Miglio TFR"
 * Immedia S.p.A. — XDESK
 *
 * Riusa il pattern strutturale di ProjectShell.tsx:
 *   - CRUD progetti (un progetto = un Comune)
 *   - Persistenza localStorage (chiave distinta: xdesk_tfr_progetti_v1)
 *   - Lista dipendenti lavorati (con stato checklist e caso PASSWEB)
 *   - Generazione lettera INPS .docx (oggetto editabile)
 */

import { useState, useEffect, useCallback } from 'react';
import WizardTFR from './WizardTFR';
import { generateLetterTFRDocx, DEFAULT_OGGETTO_TFR } from '../../utils/generateLetterTFR';
import { checklistCompleta, LS_KEY_TFR } from '../../types/projectTFR';
import type { DipendenteTFR, ProgettoTFR } from '../../types/projectTFR';

// ─── Utils ────────────────────────────────────────────────────────────────────

const uid     = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = (): string => new Date().toISOString().slice(0, 10);
const fmtDate  = (d: string): string => {
  if (!d || d.length < 10) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

function loadProjects(): ProgettoTFR[] {
  try {
    const raw = localStorage.getItem(LS_KEY_TFR);
    return raw ? (JSON.parse(raw) as ProgettoTFR[]) : [];
  } catch {
    return [];
  }
}

function persistProjects(ps: ProgettoTFR[]): void {
  try { localStorage.setItem(LS_KEY_TFR, JSON.stringify(ps)); }
  catch (e) { console.error('[UltimoMiglioTFRShell] localStorage write failed', e); }
}

const casoLabel = (d: DipendenteTFR): string => {
  if (!d.risultato) return '—';
  return `${d.risultato.casoIniziale} / ${d.risultato.casoFinale}`;
};

// ─── Tipi interni ─────────────────────────────────────────────────────────────

type View = 'projects' | 'project' | 'wizard' | 'lettera';

interface LetterFields {
  sedeProv: string;
  luogo:    string;
  oggetto:  string;
  dataElab: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function UltimoMiglioTFRShell() {
  const [view,      setView]      = useState<View>('projects');
  const [progetti,  setProgetti]  = useState<ProgettoTFR[]>(loadProjects);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [editing,   setEditing]   = useState<DipendenteTFR | null>(null);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [newComune, setNewComune] = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const [letterErr, setLetterErr] = useState('');
  const [toast,     setToast]     = useState<string | null>(null);
  const [letterFields, setLetterFields] = useState<LetterFields>({
    sedeProv: '', luogo: '', oggetto: DEFAULT_OGGETTO_TFR, dataElab: todayISO(),
  });

  const active = progetti.find(p => p.id === activeId) ?? null;

  useEffect(() => { persistProjects(progetti); }, [progetti]);

  const showToast = (msg: string, ms = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // ── Progetti CRUD ───────────────────────────────────────────────────────────
  const createProject = () => {
    if (!newComune.trim()) return;
    const p: ProgettoTFR = {
      id: uid(), nomeComune: newComune.trim(),
      createdAt: new Date().toISOString(), dipendenti: [],
    };
    setProgetti(ps => [...ps, p]);
    setActiveId(p.id);
    setNewComune('');
    setShowNew(false);
    setView('project');
  };

  const deleteProject = (id: string) => {
    if (!confirm('Eliminare il progetto e tutte le pratiche salvate? Operazione irreversibile.')) return;
    setProgetti(ps => ps.filter(p => p.id !== id));
    if (activeId === id) { setActiveId(null); setView('projects'); }
  };

  // ── Dipendenti (upsert dal wizard) ──────────────────────────────────────────
  const onSaveDipendente = useCallback(
    (dip: DipendenteTFR) => {
      if (!activeId) return;
      setProgetti(ps =>
        ps.map(p => {
          if (p.id !== activeId) return p;
          const exists = p.dipendenti.some(d => d.id === dip.id);
          return {
            ...p,
            dipendenti: exists
              ? p.dipendenti.map(d => (d.id === dip.id ? dip : d))
              : [...p.dipendenti, dip],
          };
        })
      );
      showToast(`✓ ${dip.cognome} ${dip.nome} salvato nel progetto`);
      setEditing(null);
      setView('project');
    },
    [activeId]
  );

  const deleteDipendente = (dipId: string) => {
    if (!activeId) return;
    setProgetti(ps =>
      ps.map(p =>
        p.id === activeId ? { ...p, dipendenti: p.dipendenti.filter(d => d.id !== dipId) } : p
      )
    );
    setSelected(s => { const n = new Set(s); n.delete(dipId); return n; });
  };

  const openWizard = (dip: DipendenteTFR | null) => {
    setEditing(dip);
    setView('wizard');
  };

  // ── Selezione per lettera ───────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    if (!active) return;
    selected.size === active.dipendenti.length
      ? setSelected(new Set())
      : setSelected(new Set(active.dipendenti.map(d => d.id)));
  };

  // ── Genera lettera ──────────────────────────────────────────────────────────
  const handleGenerateLetter = async () => {
    if (!active) return;
    const dips = active.dipendenti.filter(d => selected.has(d.id));
    if (dips.length === 0)             { setLetterErr('Selezionare almeno un dipendente.'); return; }
    if (!letterFields.sedeProv.trim()) { setLetterErr('Indicare la sede provinciale INPS di destinazione.'); return; }
    if (!letterFields.luogo.trim())    { setLetterErr('Indicare il luogo del mittente.'); return; }
    if (!letterFields.oggetto.trim())  { setLetterErr('Indicare l’oggetto della lettera.'); return; }
    setLetterErr('');
    try {
      await generateLetterTFRDocx({
        nomeComune:       active.nomeComune,
        sedeProv:         letterFields.sedeProv,
        luogo:            letterFields.luogo,
        oggetto:          letterFields.oggetto,
        dataElaborazione: letterFields.dataElab || todayISO(),
        dipendenti:       dips,
      });
      showToast(`✓ Lettera generata — ${dips.length} dipendente${dips.length !== 1 ? 'i' : ''}`);
    } catch (e) {
      setLetterErr('Errore durante la generazione del documento. Verificare la console.');
      console.error('[UltimoMiglioTFRShell] generateLetterTFRDocx error', e);
    }
  };

  // ── Render: Lista Progetti ──────────────────────────────────────────────────
  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Progetti TFR</h2>
          <p className="text-xs text-slate-400 mt-0.5">Un progetto per ogni Comune richiedente</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Nuovo Progetto
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-blue-700 mb-1">Denominazione Comune</label>
            <input autoFocus value={newComune}
              onChange={e => setNewComune(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="es. Comune di Reggio Calabria"
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={createProject} disabled={!newComune.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Crea
          </button>
          <button onClick={() => { setShowNew(false); setNewComune(''); }}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            Annulla
          </button>
        </div>
      )}

      {progetti.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          <div className="text-5xl mb-3">📁</div>
          <p className="text-sm font-medium">Nessun progetto presente</p>
          <p className="text-xs mt-1">Crea il primo progetto con il pulsante "Nuovo Progetto"</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {progetti.map(p => (
            <div key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                {p.nomeComune.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{p.nomeComune}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Creato il {fmtDate(p.createdAt.slice(0, 10))}{' · '}
                  <span className={p.dipendenti.length > 0 ? 'text-blue-600 font-medium' : ''}>
                    {p.dipendenti.length} pratica{p.dipendenti.length !== 1 ? 'he' : ''} registrat{p.dipendenti.length !== 1 ? 'e' : 'a'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setActiveId(p.id); setView('project'); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Apri →
                </button>
                <button onClick={() => deleteProject(p.id)}
                  className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
                  title="Elimina progetto">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render: Dettaglio Progetto ──────────────────────────────────────────────
  const renderProject = () => {
    if (!active) return null;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button onClick={() => setView('projects')}
            className="text-slate-400 hover:text-blue-600 transition-colors">Progetti</button>
          <span className="text-slate-300">/</span>
          <h2 className="font-semibold text-slate-800">{active.nomeComune}</h2>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={() => openWizard(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nuova Pratica TFR
          </button>
          {active.dipendenti.length > 0 && (
            <button onClick={() => { setSelected(new Set()); setLetterErr(''); setView('lettera'); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              📄 Genera Lettera INPS
            </button>
          )}
        </div>

        {active.dipendenti.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">Nessuna pratica registrata.</p>
            <p className="text-xs mt-1">Avvia una Nuova Pratica TFR e usa "Salva nel Progetto" al termine.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left">Cognome e Nome</th>
                  <th className="px-4 py-2.5 text-left">Codice Fiscale</th>
                  <th className="px-4 py-2.5 text-left">Assunzione</th>
                  <th className="px-4 py-2.5 text-left">Cessazione</th>
                  <th className="px-4 py-2.5 text-left">Caso (iniz./fin.)</th>
                  <th className="px-4 py-2.5 text-center">Checklist</th>
                  <th className="px-4 py-2.5 text-center w-24"></th>
                </tr>
              </thead>
              <tbody>
                {active.dipendenti.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 font-medium text-slate-800">{d.cognome} {d.nome}</td>
                    <td className="px-4 py-2 font-mono text-slate-600 text-xs">{d.cf}</td>
                    <td className="px-4 py-2 text-slate-600">{fmtDate(d.dataAssunzione)}</td>
                    <td className="px-4 py-2 text-slate-600">{fmtDate(d.dataCessazione)}</td>
                    <td className="px-4 py-2 text-xs font-mono text-slate-500">{casoLabel(d)}</td>
                    <td className="px-4 py-2 text-center">
                      {checklistCompleta(d.checklist)
                        ? <span className="text-xs text-emerald-600 font-medium">✓ completa</span>
                        : <span className="text-xs text-amber-600">parziale</span>}
                    </td>
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      <button onClick={() => openWizard(d)}
                        className="text-blue-500 hover:text-blue-700 text-xs px-1.5 py-0.5 hover:bg-blue-50 rounded transition-colors"
                        title="Riapri pratica">✎</button>
                      <button onClick={() => deleteDipendente(d.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 hover:bg-red-50 rounded transition-colors"
                        title="Rimuovi dal progetto">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 text-xs text-slate-500">
                <tr>
                  <td colSpan={7} className="px-4 py-2">
                    Totale: {active.dipendenti.length} pratica{active.dipendenti.length !== 1 ? 'he' : ''}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Genera Lettera ──────────────────────────────────────────────────
  const renderLettera = () => {
    if (!active) return null;
    const selArr = active.dipendenti.filter(d => selected.has(d.id));

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button onClick={() => setView('projects')}
            className="text-slate-400 hover:text-blue-600 transition-colors">Progetti</button>
          <span className="text-slate-300">/</span>
          <button onClick={() => setView('project')}
            className="text-slate-400 hover:text-blue-600 transition-colors">{active.nomeComune}</button>
          <span className="text-slate-300">/</span>
          <h2 className="font-semibold text-slate-800">Genera Lettera INPS</h2>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 flex gap-2">
          <span className="shrink-0">ℹ️</span>
          <span>
            Lettera di trasmissione dati retributivi utili al TFR. L’<strong>oggetto</strong> è editabile.
            Compilare i campi, selezionare i dipendenti, esportare in <strong>.docx</strong>.
          </span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-emerald-800">Dati Lettera</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">Luogo mittente ★</label>
              <input value={letterFields.luogo}
                onChange={e => setLetterFields(f => ({ ...f, luogo: e.target.value }))}
                placeholder="es. Reggio Calabria"
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">Sede Provinciale INPS destinataria ★</label>
              <input value={letterFields.sedeProv}
                onChange={e => setLetterFields(f => ({ ...f, sedeProv: e.target.value }))}
                placeholder="es. Reggio Calabria"
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-emerald-700 mb-1">Oggetto / riferimento normativo ★ (editabile)</label>
              <input value={letterFields.oggetto}
                onChange={e => setLetterFields(f => ({ ...f, oggetto: e.target.value }))}
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1">Data elaborazione lettera</label>
              <input type="date" value={letterFields.dataElab}
                onChange={e => setLetterFields(f => ({ ...f, dataElab: e.target.value }))}
                className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Dipendenti da includere nella lettera</h3>
            <button onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors">
              {selected.size === active.dipendenti.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-center w-10">✓</th>
                  <th className="px-3 py-2 text-left">Cognome e Nome</th>
                  <th className="px-3 py-2 text-left">Codice Fiscale</th>
                  <th className="px-3 py-2 text-left">Assunzione</th>
                  <th className="px-3 py-2 text-left">Cessazione</th>
                </tr>
              </thead>
              <tbody>
                {active.dipendenti.map((d, i) => (
                  <tr key={d.id} onClick={() => toggleSelect(d.id)}
                    className={[
                      'cursor-pointer transition-colors',
                      selected.has(d.id) ? 'bg-emerald-50 hover:bg-emerald-100'
                        : i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100',
                    ].join(' ')}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={selected.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="w-4 h-4 accent-emerald-600"
                        onClick={e => e.stopPropagation()} />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">{d.cognome} {d.nome}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 text-xs">{d.cf}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(d.dataAssunzione)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(d.dataCessazione)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">{selArr.length} di {active.dipendenti.length} selezionati</p>
        </div>

        {letterErr && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex gap-2">
            <span className="shrink-0">⚠️</span><span>{letterErr}</span>
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleGenerateLetter} disabled={selArr.length === 0}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            ↓ Scarica Lettera .docx
          </button>
          <button onClick={() => setView('project')}
            className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
            ← Annulla
          </button>
        </div>
      </div>
    );
  };

  // ── Layout: vista Wizard (full-page) ────────────────────────────────────────
  if (view === 'wizard' && active) {
    return (
      <div className="relative">
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2">
            {toast}
          </div>
        )}
        <div className="bg-blue-800 text-white px-6 py-2.5 flex items-center gap-3 text-sm flex-wrap">
          <button onClick={() => { setEditing(null); setView('project'); }}
            className="hover:text-blue-300 transition-colors font-medium">
            ← {active.nomeComune}
          </button>
          <span className="text-blue-600">|</span>
          <span className="text-blue-200 text-xs">
            Al termine, usa <strong className="text-white">"Salva nel Progetto"</strong> per registrare la pratica TFR.
          </span>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <WizardTFR
              progettoId={active.id}
              existing={editing}
              onSave={onSaveDipendente}
              onCancel={() => { setEditing(null); setView('project'); }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Layout: shell con header ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2">
          {toast}
        </div>
      )}

      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white font-bold text-lg tracking-tight">
            Ultimo Miglio TFR — Dati Retributivi PASSWEB
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Dipendenti pubblici cessati · INPS PASSWEB · Immedia S.p.A.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {view === 'projects' && renderProjects()}
          {view === 'project'  && renderProject()}
          {view === 'lettera'  && renderLettera()}
        </div>
      </div>
    </div>
  );
}
