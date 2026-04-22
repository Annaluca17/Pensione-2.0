/**
 * ProjectShell.tsx
 * Immedia S.p.A. — Shell di gestione Progetti PASSWEB
 *
 * Funzionalità:
 *   - CRUD progetti (un progetto = un Ente/Comune)
 *   - Persistenza localStorage (chiave: xdesk_passweb_progetti_v1)
 *   - Raccolta dipendenti via callback onSaveToProject iniettata in CalcoloUnificatoUltimoMiglio
 *   - Generazione lettera .docx (Art. 57 c.2 CCNL 2022/2024) con selezione checkbox
 *
 * Entry point suggerito in App.tsx:
 *   import ProjectShell from './components/ProjectShell';
 *   export default function App() { return <ProjectShell />; }
 */

import { useState, useEffect, useCallback } from 'react';
import CalcoloUnificatoUltimoMiglio from './CalcoloUnificatoUltimoMiglio';
import { generateLetterDocx }         from '../utils/generateLetter';
import type { Dipendente, Progetto }  from '../types/project';
import { LS_KEY }                     from '../types/project';

// ─── Utils ────────────────────────────────────────────────────────────────────

const uid     = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = (): string => new Date().toISOString().slice(0, 10);
const fmtDate  = (d: string): string => {
  if (!d || d.length < 10) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

function loadProjects(): Progetto[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Progetto[]) : [];
  } catch {
    return [];
  }
}

function persistProjects(ps: Progetto[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ps)); }
  catch (e) { console.error('[ProjectShell] localStorage write failed', e); }
}

// ─── Tipi interni ─────────────────────────────────────────────────────────────

type View = 'projects' | 'project' | 'calcolo' | 'lettera';

interface LetterFields {
  sedeProv:  string;
  luogo:     string;
  dataPASWEB: string;
  dataElab:  string;
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function ProjectShell() {
  const [view,      setView]      = useState<View>('projects');
  const [progetti,  setProgetti]  = useState<Progetto[]>(loadProjects);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [newComune, setNewComune] = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const [letterErr, setLetterErr] = useState('');
  const [toast,     setToast]     = useState<string | null>(null);
  const [letterFields, setLetterFields] = useState<LetterFields>({
    sedeProv: '', luogo: '', dataPASWEB: '', dataElab: todayISO(),
  });

  const active = progetti.find(p => p.id === activeId) ?? null;

  // Persist on every change
  useEffect(() => { persistProjects(progetti); }, [progetti]);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = (msg: string, ms = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // ── Progetti CRUD ───────────────────────────────────────────────────────────
  const createProject = () => {
    if (!newComune.trim()) return;
    const p: Progetto = {
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
    if (!confirm('Eliminare il progetto e tutti i conteggi salvati? Operazione irreversibile.')) return;
    setProgetti(ps => ps.filter(p => p.id !== id));
    if (activeId === id) { setActiveId(null); setView('projects'); }
  };

  // ── Dipendenti ──────────────────────────────────────────────────────────────
  const onSaveToProject = useCallback(
    (d: { nome: string; cf: string; dataCessazione: string }) => {
      if (!activeId) return;
      const dip: Dipendente = {
        id: uid(), nome: d.nome, cf: d.cf,
        dataCessazione: d.dataCessazione,
        savedAt: new Date().toISOString(),
      };
      setProgetti(ps =>
        ps.map(p => p.id === activeId ? { ...p, dipendenti: [...p.dipendenti, dip] } : p)
      );
      showToast(`✓ ${d.nome} salvato nel progetto`);
    },
    [activeId]
  );

  const deleteDipendente = (dipId: string) => {
    if (!activeId) return;
    setProgetti(ps =>
      ps.map(p =>
        p.id === activeId
          ? { ...p, dipendenti: p.dipendenti.filter(d => d.id !== dipId) }
          : p
      )
    );
    setSelected(s => { const n = new Set(s); n.delete(dipId); return n; });
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
    if (dips.length === 0)              { setLetterErr('Selezionare almeno un dipendente.'); return; }
    if (!letterFields.sedeProv.trim())  { setLetterErr('Indicare la sede provinciale INPS di destinazione.'); return; }
    if (!letterFields.dataPASWEB)       { setLetterErr('Inserire la data di inserimento PASSWEB.'); return; }
    if (!letterFields.luogo.trim())     { setLetterErr('Indicare il luogo del mittente.'); return; }
    setLetterErr('');
    try {
      await generateLetterDocx({
        nomeComune:       active.nomeComune,
        sedeProv:         letterFields.sedeProv,
        luogo:            letterFields.luogo,
        dataPASWEB:       letterFields.dataPASWEB,
        dataElaborazione: letterFields.dataElab || todayISO(),
        dipendenti:       dips,
      });
      showToast(`✓ Lettera generata — ${dips.length} dipendente${dips.length !== 1 ? 'i' : ''}`);
    } catch (e) {
      setLetterErr('Errore durante la generazione del documento. Verificare la console.');
      console.error('[ProjectShell] generateLetterDocx error', e);
    }
  };

  // ── Render: Lista Progetti ──────────────────────────────────────────────────
  const renderProjects = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Progetti PASSWEB</h2>
          <p className="text-xs text-slate-400 mt-0.5">Un progetto per ogni Ente / Comune richiedente</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nuovo Progetto
        </button>
      </div>

      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-blue-700 mb-1">
              Denominazione Ente / Comune
            </label>
            <input
              autoFocus
              value={newComune}
              onChange={e => setNewComune(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createProject()}
              placeholder="es. Comune di Reggio Calabria"
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={createProject}
            disabled={!newComune.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Crea
          </button>
          <button
            onClick={() => { setShowNew(false); setNewComune(''); }}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
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
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                {p.nomeComune.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate">{p.nomeComune}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Creato il {fmtDate(p.createdAt.slice(0, 10))}
                  {' · '}
                  <span className={p.dipendenti.length > 0 ? 'text-blue-600 font-medium' : ''}>
                    {p.dipendenti.length} dipendente{p.dipendenti.length !== 1 ? 'i' : ''} registrat{p.dipendenti.length !== 1 ? 'i' : 'o'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { setActiveId(p.id); setView('project'); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Apri →
                </button>
                <button
                  onClick={() => deleteProject(p.id)}
                  className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
                  title="Elimina progetto"
                >
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button
            onClick={() => setView('projects')}
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            Progetti
          </button>
          <span className="text-slate-300">/</span>
          <h2 className="font-semibold text-slate-800">{active.nomeComune}</h2>
        </div>

        {/* Azioni */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setView('calcolo')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nuovo Conteggio
          </button>
          {active.dipendenti.length > 0 && (
            <button
              onClick={() => { setSelected(new Set()); setLetterErr(''); setView('lettera'); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              📄 Genera Lettera INPS
            </button>
          )}
        </div>

        {/* Lista dipendenti */}
        {active.dipendenti.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm">Nessun dipendente registrato.</p>
            <p className="text-xs mt-1">Avvia un Nuovo Conteggio e usa "Salva nel Progetto" al termine.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left">Nominativo</th>
                  <th className="px-4 py-2.5 text-left">Codice Fiscale</th>
                  <th className="px-4 py-2.5 text-left">Data Cessazione</th>
                  <th className="px-4 py-2.5 text-left">Registrato il</th>
                  <th className="px-4 py-2.5 text-center w-16"></th>
                </tr>
              </thead>
              <tbody>
                {active.dipendenti.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 font-medium text-slate-800">{d.nome}</td>
                    <td className="px-4 py-2 font-mono text-slate-600 text-xs">{d.cf}</td>
                    <td className="px-4 py-2 text-slate-600">{fmtDate(d.dataCessazione)}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">{fmtDate(d.savedAt.slice(0, 10))}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => deleteDipendente(d.id)}
                        className="text-red-400 hover:text-red-600 transition-colors text-xs px-1 py-0.5 hover:bg-red-50 rounded"
                        title="Rimuovi dal progetto"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 text-xs text-slate-500">
                <tr>
                  <td colSpan={5} className="px-4 py-2">
                    Totale: {active.dipendenti.length} dipendente{active.dipendenti.length !== 1 ? 'i' : ''}
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

    const field = (key: keyof LetterFields, label: string, type: 'text' | 'date', placeholder?: string) => (
      <div key={key}>
        <label className="block text-xs font-medium text-emerald-700 mb-1">{label}</label>
        <input
          type={type}
          value={letterFields[key]}
          onChange={e => setLetterFields(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>
    );

    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <button
            onClick={() => setView('projects')}
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            Progetti
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => setView('project')}
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            {active.nomeComune}
          </button>
          <span className="text-slate-300">/</span>
          <h2 className="font-semibold text-slate-800">Genera Lettera INPS</h2>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 flex gap-2">
          <span className="shrink-0">ℹ️</span>
          <span>
            Lettera ai sensi dell'<strong>Art. 57, comma 2 — CCNL Funzioni Locali 2022/2024</strong>.
            Compilare i campi, selezionare i dipendenti, esportare in <strong>.docx</strong>.
          </span>
        </div>

        {/* Dati lettera */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-emerald-800">Dati Lettera</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('luogo',      'Luogo mittente',                      'text', 'es. Reggio Calabria')}
            {field('sedeProv',   'Sede Provinciale INPS destinataria ★', 'text', 'es. Reggio Calabria')}
            {field('dataPASWEB', 'Data inserimento PASSWEB ★',           'date')}
            {field('dataElab',   'Data elaborazione lettera',            'date')}
          </div>
        </div>

        {/* Selezione dipendenti */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-slate-700">
              Dipendenti da includere nella lettera
            </h3>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
            >
              {selected.size === active.dipendenti.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2 text-center w-10">✓</th>
                  <th className="px-3 py-2 text-left">Nominativo</th>
                  <th className="px-3 py-2 text-left">Codice Fiscale</th>
                  <th className="px-3 py-2 text-left">Data Cessazione</th>
                </tr>
              </thead>
              <tbody>
                {active.dipendenti.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => toggleSelect(d.id)}
                    className={[
                      'cursor-pointer transition-colors',
                      selected.has(d.id)
                        ? 'bg-emerald-50 hover:bg-emerald-100'
                        : i % 2 === 0
                          ? 'bg-white hover:bg-slate-50'
                          : 'bg-slate-50 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="w-4 h-4 accent-emerald-600"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800">{d.nome}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 text-xs">{d.cf}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(d.dataCessazione)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400">
            {selArr.length} di {active.dipendenti.length} selezionati
          </p>
        </div>

        {/* Errore */}
        {letterErr && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex gap-2">
            <span className="shrink-0">⚠️</span>
            <span>{letterErr}</span>
          </div>
        )}

        {/* Azioni */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleGenerateLetter}
            disabled={selArr.length === 0}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            ↓ Scarica Lettera .docx
          </button>
          <button
            onClick={() => setView('project')}
            className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            ← Annulla
          </button>
        </div>
      </div>
    );
  };

  // ── Layout: vista Calcolo (full-page, sovrascrive shell) ───────────────────
  if (view === 'calcolo') {
    return (
      <div className="relative">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2">
            {toast}
          </div>
        )}
        {/* Banner progetto attivo */}
        <div className="bg-emerald-800 text-white px-6 py-2.5 flex items-center gap-3 text-sm flex-wrap">
          <button
            onClick={() => setView('project')}
            className="hover:text-emerald-300 transition-colors font-medium"
          >
            ← {active?.nomeComune}
          </button>
          <span className="text-emerald-600">|</span>
          <span className="text-emerald-300 text-xs">
            Al termine del calcolo, usa il pulsante <strong className="text-white">"Salva nel Progetto"</strong> per registrare il dipendente.
          </span>
        </div>
        <CalcoloUnificatoUltimoMiglio onSaveToProject={onSaveToProject} />
      </div>
    );
  }

  // ── Layout: shell con header ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Toast globale */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white rounded-xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white font-bold text-lg tracking-tight">
            PASSWEB Suite — Gestione Miglioramenti Contrattuali
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            CCNL Funzioni Locali · INPS PASSWEB · Immedia S.p.A.
          </p>
        </div>
      </div>

      {/* Contenuto */}
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
