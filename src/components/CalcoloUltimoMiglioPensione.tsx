import React, { useState, useMemo } from 'react';
import styles from './App.module.css';
import { exportPensioneToExcel } from '../exportPensioneExcel';
import { exportPensioneToPDF } from '../exportPensionePDF';
import { POSIZIONI_TABELLARI } from '../data/tabellaStipendiCCNL';

const fmtEuro = (n: number) =>
  n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CATALOGO_VOCI_PENSIONE = [
  { id: '01', nome: 'Stipendio tabellare', valido13: true, moltiplicatore: 12 },
  { id: '02', nome: 'Differenziale storico (ex PEO)', valido13: true, moltiplicatore: 12 },
  { id: '03', nome: 'Differenziale stipendiale (nuova voce CCNL 2019 – 2021)', valido13: true, moltiplicatore: 12 },
  { id: '04', nome: 'Assegno ad personam non riassorbibile IIS Cat. B e D', valido13: true, moltiplicatore: 12 },
  { id: '05', nome: 'Assegno ad personam riassorbibile progressione verticale', valido13: true, moltiplicatore: 12 },
  { id: '06', nome: 'Salario Individuale di Anzianità (ex R.I.A.)', valido13: true, moltiplicatore: 12 },
  { id: '07', nome: 'Retribuzione di Posizione', valido13: true, moltiplicatore: 12 },
  { id: '08', nome: 'Indennità specifica (ex art.4 comma 3 CCNL 16/07/1996) (5,38)', valido13: false, moltiplicatore: 12 },
  { id: '09', nome: 'Indennità di Vacanza Contrattuale (compreso Anticipo IVC)', valido13: true, moltiplicatore: 12 },
  { id: '10', nome: 'Indennità di Comparto', valido13: false, moltiplicatore: 12 },
  { id: '11', nome: 'Indennità di vigilanza', valido13: false, moltiplicatore: 12 },
  { id: '12', nome: 'Indennità Professionale personale asili nido e scolastico €. 55,40 mensili ex art. 37 c. 1 lett. c CCNL 1995', valido13: false, moltiplicatore: 12 },
  { id: '13', nome: 'Indennità Aggiuntiva personale asili nido e scolastico €. 28,41 mensili ex art. 6 CCNL 2001', valido13: false, moltiplicatore: 12 },
  { id: '14', nome: 'Indennità Tempo potenziato personale scolastico €. 103,28 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000', valido13: false, moltiplicatore: 10 },
  { id: '15', nome: 'Trattamento accessorio personale asili nido €. 61,97 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000', valido13: false, moltiplicatore: 10 },
];

type Step = 'anagrafica' | 'voci' | 'risultato';

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'anagrafica', label: 'Anagrafica', num: 1 },
  { id: 'voci', label: 'Voci Retributive', num: 2 },
  { id: 'risultato', label: 'Risultato', num: 3 },
];

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  motivoCessazione: string;
}

interface VoceSelezionata {
  idRiga: string;
  idVoceCatalogo: string;
  importoMensile: number;
}

export default function CalcoloUltimoMiglioPensione() {
  const [step, setStep] = useState<Step>('anagrafica');
  const [anagrafica, setAnagrafica] = useState<Anagrafica>({
    cognomeNome: '',
    codiceFiscale: '',
    dataInizio: '',
    motivoCessazione: ''
  });
  const [voci, setVoci] = useState<VoceSelezionata[]>([
    { idRiga: 'row-1', idVoceCatalogo: '01', importoMensile: 0 }
  ]);
  const [error, setError] = useState<string | null>(null);

  // ─── Stato Miglioramento Contrattuale ────────────────────────────────────
  const [miglioramentoContrattuale, setMiglioramentoContrattuale] = useState(false);
  const [mansioneMC, setMansioneMC] = useState<string>('');
  const [dataDecorrenzaMC, setDataDecorrenzaMC] = useState<'2024' | '2026'>('2024');

  const currentStepIdx = STEPS.findIndex(s => s.id === step);
  const go = (s: Step) => setStep(s);

  const addRow = () => {
    setVoci(prev => [...prev, { idRiga: `row-${Date.now()}`, idVoceCatalogo: '', importoMensile: 0 }]);
  };

  const removeRow = (idRiga: string) => {
    setVoci(prev => prev.filter(v => v.idRiga !== idRiga));
  };

  const updateRow = (idRiga: string, field: keyof VoceSelezionata, value: any) => {
    setVoci(prev => prev.map(v => v.idRiga === idRiga ? { ...v, [field]: value } : v));
  };

  // ─── Calcolo base ────────────────────────────────────────────────────────
  const vociArricchite = useMemo(() => {
    return voci.map(v => {
      const catalogo = CATALOGO_VOCI_PENSIONE.find(c => c.id === v.idVoceCatalogo);
      return {
        ...v,
        catalogo,
        importoAnnuo: catalogo ? v.importoMensile * catalogo.moltiplicatore : 0
      };
    });
  }, [voci]);

  const totaleVociFisseAnnuo = useMemo(() => {
    return vociArricchite.reduce((sum, v) => sum + v.importoAnnuo, 0);
  }, [vociArricchite]);

  const totaleTredicesimaMensilita = useMemo(() => {
    return vociArricchite.reduce((sum, v) => {
      if (v.catalogo?.valido13) {
        return sum + v.importoMensile;
      }
      return sum;
    }, 0);
  }, [vociArricchite]);

  // ─── Calcolo parallelo Miglioramento Contrattuale ────────────────────────
  const posizioneSelezionata = useMemo(
    () => POSIZIONI_TABELLARI.find(p => p.codice === mansioneMC) ?? null,
    [mansioneMC]
  );

  const nuovoTabellare = useMemo(() => {
    if (!posizioneSelezionata) return 0;
    return dataDecorrenzaMC === '2024'
      ? posizioneSelezionata.tabellareMensile2024
      : posizioneSelezionata.tabellareMensile2026;
  }, [posizioneSelezionata, dataDecorrenzaMC]);

  const vociArricchiteMC = useMemo(() => {
    if (!miglioramentoContrattuale || !posizioneSelezionata) return null;
    return voci.map(v => {
      const catalogo = CATALOGO_VOCI_PENSIONE.find(c => c.id === v.idVoceCatalogo);
      // Solo lo stipendio tabellare (voce '01') viene aggiornato con il nuovo valore CCNL
      const importoMensile = v.idVoceCatalogo === '01' ? nuovoTabellare : v.importoMensile;
      return {
        ...v,
        importoMensile,
        catalogo,
        importoAnnuo: catalogo ? importoMensile * catalogo.moltiplicatore : 0
      };
    });
  }, [miglioramentoContrattuale, posizioneSelezionata, nuovoTabellare, voci]);

  const totaleVociFisseAnnuoMC = useMemo(
    () => vociArricchiteMC
      ? vociArricchiteMC.reduce((s, v) => s + v.importoAnnuo, 0)
      : 0,
    [vociArricchiteMC]
  );

  const totaleTredicesimaMensilita_MC = useMemo(
    () => vociArricchiteMC
      ? vociArricchiteMC.reduce((s, v) => v.catalogo?.valido13 ? s + v.importoMensile : s, 0)
      : 0,
    [vociArricchiteMC]
  );

  const handleCalcola = () => {
    const stipendioTabellare = vociArricchite.find(v => v.idVoceCatalogo === '01');
    if (!stipendioTabellare || stipendioTabellare.importoMensile <= 0) {
      setError('Errore: Lo Stipendio Tabellare (01) deve essere inserito con un importo maggiore di zero.');
      return;
    }
    if (miglioramentoContrattuale && !mansioneMC) {
      setError('Errore: Selezionare la Mansione per il calcolo comparativo del Miglioramento Contrattuale.');
      return;
    }
    setError(null);
    go('risultato');
  };

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Immedia</span>
          <span className={styles.logoSub}>S.p.A.</span>
        </div>
        <div className={styles.appTitle}>
          <span>Calcolo</span>
          <span className={styles.highlight}>Ultimo Miglio</span>
          <span>Pensione</span>
        </div>
        <nav className={styles.nav}>
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`${styles.navItem} ${step === s.id ? styles.navActive : ''} ${i < currentStepIdx ? styles.navDone : ''}`}
              onClick={() => i <= currentStepIdx ? go(s.id) : undefined}
              disabled={i > currentStepIdx}
            >
              <span className={styles.navNum}>{i < currentStepIdx ? '✓' : s.num}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span>Enti Locali – INPS</span>
          <span>Pensionandi</span>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              {step === 'anagrafica' && 'Dati Anagrafici'}
              {step === 'voci' && 'Motore di Calcolo Voci - Ultimo Miglio'}
              {step === 'risultato' && 'Risultato Calcolo'}
            </h1>
            <p className={styles.pageDesc}>
              {step === 'anagrafica' && 'Inserisci i dati del dipendente.'}
              {step === 'voci' && 'Inserisci le voci retributive per il calcolo della pensione.'}
              {step === 'risultato' && 'Riepilogo dei calcoli effettuati.'}
            </p>
          </div>
          <div className={styles.stepBadge}>Step {currentStepIdx + 1} / {STEPS.length}</div>
        </header>

        {/* Content */}
        <div className={styles.content}>

          {/* ─── STEP 1: Anagrafica ─────────────────────────────────────── */}
          {step === 'anagrafica' && (
            <div className={styles.card}>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Cognome e Nome <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    value={anagrafica.cognomeNome}
                    onChange={e => setAnagrafica({ ...anagrafica, cognomeNome: e.target.value })}
                    placeholder="Es. Mario Rossi"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Codice Fiscale <span className={styles.required}>*</span></label>
                  <input
                    className={styles.input}
                    value={anagrafica.codiceFiscale}
                    onChange={e => setAnagrafica({ ...anagrafica, codiceFiscale: e.target.value.toUpperCase().slice(0, 16) })}
                    placeholder="16 caratteri"
                    maxLength={16}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Data Inizio Periodo</label>
                  <input
                    className={styles.input}
                    type="date"
                    value={anagrafica.dataInizio}
                    onChange={e => setAnagrafica({ ...anagrafica, dataInizio: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Motivo Cessazione</label>
                  <select
                    className={styles.input}
                    value={anagrafica.motivoCessazione}
                    onChange={e => setAnagrafica({ ...anagrafica, motivoCessazione: e.target.value })}
                  >
                    <option value="">-- Seleziona --</option>
                    <option value="Limiti di età">Limiti di età</option>
                    <option value="Pensione di Vecchiaia">Pensione di Vecchiaia</option>
                    <option value="Pensione Anticipata">Pensione Anticipata</option>
                    <option value="Dimissioni volontarie">Dimissioni volontarie</option>
                    <option value="Inabilità">Inabilità</option>
                    <option value="Decesso">Decesso</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  onClick={() => go('voci')}
                  disabled={!anagrafica.cognomeNome || !anagrafica.codiceFiscale}
                >
                  Continua →
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Voci Retributive ──────────────────────────────── */}
          {step === 'voci' && (
            <div className={styles.card}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  <p>{error}</p>
                </div>
              )}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Nome Voce</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Valido 13^</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Moltiplicatore</th>
                      <th style={{ width: '25%' }}>Importo Mensile (€)</th>
                      <th style={{ width: '20%' }}>Importo Annuo (€)</th>
                      <th style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vociArricchite.map((v, i) => (
                      <tr key={v.idRiga} className={i % 2 === 0 ? styles.rowEven : ''}>
                        <td>
                          <select
                            className={styles.input}
                            style={{ whiteSpace: 'normal', wordWrap: 'break-word', width: '100%' }}
                            value={v.idVoceCatalogo}
                            onChange={(e) => updateRow(v.idRiga, 'idVoceCatalogo', e.target.value)}
                            disabled={v.idVoceCatalogo === '01'}
                          >
                            <option value="">-- Seleziona Voce --</option>
                            {CATALOGO_VOCI_PENSIONE.map(c => (
                              <option key={c.id} value={c.id} disabled={c.id === '01' && v.idVoceCatalogo !== '01'}>
                                {c.id} - {c.nome}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className={styles.tdCenter}>
                          {v.catalogo ? (
                            <div className="flex justify-center items-center">
                              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.catalogo.valido13 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.catalogo.valido13 ? 'translate-x-5' : 'translate-x-1'}`} />
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className={styles.tdCenter}>
                          {v.catalogo ? v.catalogo.moltiplicatore : '-'}
                        </td>
                        <td>
                          <input
                            className={styles.inputNum}
                            type="number"
                            min={0}
                            step="0.01"
                            value={v.importoMensile || ''}
                            placeholder="0,00"
                            onChange={e => updateRow(v.idRiga, 'importoMensile', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className={styles.tdAnnuo}>
                          {fmtEuro(v.importoAnnuo)}
                        </td>
                        <td className={styles.tdCenter}>
                          {v.idVoceCatalogo !== '01' && (
                            <button
                              onClick={() => removeRow(v.idRiga)}
                              className="text-red-500 hover:text-red-700 font-bold px-2"
                              title="Rimuovi riga"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 mb-6">
                <button
                  onClick={addRow}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                  <span className="mr-2">+</span> Aggiungi Voce
                </button>
              </div>

              {/* Totali base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">
                    Totale Voci Fisse e continuative per 12 mensilità
                  </label>
                  <div className="text-2xl font-bold text-slate-800">
                    € {fmtEuro(totaleVociFisseAnnuo)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">
                    Totale 13^ mensilità
                  </label>
                  <div className="text-2xl font-bold text-slate-800">
                    € {fmtEuro(totaleTredicesimaMensilita)}
                  </div>
                </div>
              </div>

              {/* ─── Sezione Miglioramento Contrattuale ──────────────── */}
              <div
                className="mt-6 p-5 rounded-lg border-2"
                style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}
              >
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={miglioramentoContrattuale}
                    onChange={e => {
                      setMiglioramentoContrattuale(e.target.checked);
                      if (!e.target.checked) setMansioneMC('');
                    }}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#d97706' }}
                  />
                  <span className="font-semibold text-base" style={{ color: '#92400e' }}>
                    Calcolo Comparativo – Miglioramento Contrattuale CCNL 2022-2024
                  </span>
                </label>
                <p className="mt-1 ml-7 text-sm" style={{ color: '#b45309' }}>
                  Esegue un calcolo parallelo sostituendo solo lo stipendio tabellare con il nuovo valore Tab. G del CCNL 2022-2024.
                </p>

                {miglioramentoContrattuale && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={styles.field}>
                      <label className={styles.label}>Mansione / Ex Posizione Economica</label>
                      <select
                        className={styles.input}
                        value={mansioneMC}
                        onChange={e => setMansioneMC(e.target.value)}
                      >
                        <option value="">-- Seleziona Mansione --</option>
                        <optgroup label="Funzionari ed E.Q. (Area D)">
                          {POSIZIONI_TABELLARI.filter(p => p.area === 'Funzionari ed E.Q.').map(p => (
                            <option key={p.codice} value={p.codice}>
                              {p.area} – {p.codice}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Istruttori (Area C)">
                          {POSIZIONI_TABELLARI.filter(p => p.area === 'Istruttori').map(p => (
                            <option key={p.codice} value={p.codice}>
                              {p.area} – {p.codice}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Operatori Esperti (Area B)">
                          {POSIZIONI_TABELLARI.filter(p => p.area === 'Operatori Esperti').map(p => (
                            <option key={p.codice} value={p.codice}>
                              {p.area} – {p.codice}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Operatori (Area A)">
                          {POSIZIONI_TABELLARI.filter(p => p.area === 'Operatori').map(p => (
                            <option key={p.codice} value={p.codice}>
                              {p.area} – {p.codice}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Decorrenza CCNL 2022-2024</label>
                      <select
                        className={styles.input}
                        value={dataDecorrenzaMC}
                        onChange={e => setDataDecorrenzaMC(e.target.value as '2024' | '2026')}
                      >
                        <option value="2024">Dal 01.01.2024</option>
                        <option value="2026">Dal 01.01.2026 (con conglobamento parz. Ind. Comparto)</option>
                      </select>
                    </div>

                    {mansioneMC && posizioneSelezionata && (
                      <div
                        className="md:col-span-2 text-sm font-medium px-4 py-3 rounded-md"
                        style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#78350f' }}
                      >
                        Area: <strong>{posizioneSelezionata.area} – {mansioneMC}</strong>
                        {'  ·  '}
                        Nuovo stipendio tabellare mensile (Tab. G):
                        <strong> € {fmtEuro(nuovoTabellare)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.actions} style={{ marginTop: '2rem' }}>
                <button className={styles.btnSecondary} onClick={() => go('anagrafica')}>
                  ← Indietro
                </button>
                <button className={styles.btnCalcola} onClick={handleCalcola}>
                  🧮 Calcola Risultato
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Risultato ─────────────────────────────────────── */}
          {step === 'risultato' && (
            <div>
              <div className={styles.risultatoLock}>
                <span className={styles.lockIcon}>🔒</span>
                Risultato calcolato il {new Date().toLocaleString('it-IT')} – non modificabile
              </div>

              {/* Anagrafica riepilogo */}
              <div className={styles.card} style={{ marginBottom: 16 }}>
                <div className={styles.anagraficaRiepilogo}>
                  <div><label>Nominativo</label><span>{anagrafica.cognomeNome || '–'}</span></div>
                  <div><label>Codice Fiscale</label><span>{anagrafica.codiceFiscale || '–'}</span></div>
                  <div><label>Data Inizio</label><span>{anagrafica.dataInizio || '–'}</span></div>
                  <div><label>Motivo Cessazione</label><span>{anagrafica.motivoCessazione || '–'}</span></div>
                </div>
              </div>

              {/* Totali base */}
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Riepilogo Calcolo Ultimo Miglio Pensione</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                    <label className="block text-sm font-medium text-blue-600 mb-1">
                      Totale Voci Fisse e continuative per 12 mensilità
                    </label>
                    <div className="text-3xl font-bold text-blue-900">
                      € {fmtEuro(totaleVociFisseAnnuo)}
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                    <label className="block text-sm font-medium text-indigo-600 mb-1">
                      Totale 13^ mensilità
                    </label>
                    <div className="text-3xl font-bold text-indigo-900">
                      € {fmtEuro(totaleTredicesimaMensilita)}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-slate-800 mb-4">Dettaglio Voci Inserite</h3>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Voce</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>13^</th>
                      <th style={{ width: '25%', textAlign: 'right' }}>Mensile (€)</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Annuo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vociArricchite.filter(v => v.catalogo).map((v, i) => (
                      <tr key={v.idRiga} className={i % 2 === 0 ? styles.rowEven : ''}>
                        <td className={styles.tdLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{v.catalogo?.nome}</td>
                        <td className={styles.tdCenter}>
                          <div className="flex justify-center items-center">
                            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.catalogo?.valido13 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.catalogo?.valido13 ? 'translate-x-5' : 'translate-x-1'}`} />
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdRight}>{fmtEuro(v.importoMensile)}</td>
                        <td className={styles.tdRight}>{fmtEuro(v.importoAnnuo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.actions} style={{ marginTop: '2rem' }}>
                  <button className={styles.btnSecondary} onClick={() => go('voci')}>
                    ← Modifica Dati
                  </button>
                  <button className={styles.btnExport} onClick={() => exportPensioneToExcel(anagrafica, vociArricchite, totaleVociFisseAnnuo, totaleTredicesimaMensilita)}>
                    Esporta Excel
                  </button>
                  <button className={styles.btnPdf} onClick={() => exportPensioneToPDF(anagrafica, vociArricchite, totaleVociFisseAnnuo, totaleTredicesimaMensilita)}>
                    Esporta PDF
                  </button>
                </div>
              </div>

              {/* ─── Calcolo Comparativo Miglioramento Contrattuale ──── */}
              {miglioramentoContrattuale && vociArricchiteMC && posizioneSelezionata && (
                <div
                  className={styles.card}
                  style={{ marginTop: 20, borderColor: '#f59e0b', borderWidth: 2 }}
                >
                  <h2 className={styles.sectionTitle} style={{ color: '#b45309' }}>
                    Calcolo Comparativo – CCNL 2022-2024 (dal 01.01.{dataDecorrenzaMC})
                  </h2>

                  {/* Banner informativo */}
                  <div
                    className="text-sm mb-6 px-4 py-3 rounded-md font-medium"
                    style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#78350f' }}
                  >
                    Mansione: <strong>{posizioneSelezionata.area} – {mansioneMC}</strong>
                    {'  ·  '}
                    Variabile modificata: <strong>Stipendio tabellare (voce 01)</strong>
                    {'  ·  '}
                    Nuovo valore mensile (Tab. G): <strong>€ {fmtEuro(nuovoTabellare)}</strong>
                  </div>

                  {/* Tabella comparativa totali */}
                  <h3 className="text-base font-semibold text-slate-700 mb-3">Confronto Totali</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#64748b' }}>
                        CCNL 2019-2021 – Totale voci fisse annuo
                      </label>
                      <div className="text-2xl font-bold" style={{ color: '#334155' }}>
                        € {fmtEuro(totaleVociFisseAnnuo)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#b45309' }}>
                        CCNL 2022-2024 – Totale voci fisse annuo
                      </label>
                      <div className="text-2xl font-bold" style={{ color: '#92400e' }}>
                        € {fmtEuro(totaleVociFisseAnnuoMC)}
                      </div>
                      {totaleVociFisseAnnuoMC !== totaleVociFisseAnnuo && totaleVociFisseAnnuo > 0 && (
                        <div
                          className="text-sm font-semibold mt-1"
                          style={{ color: totaleVociFisseAnnuoMC >= totaleVociFisseAnnuo ? '#16a34a' : '#dc2626' }}
                        >
                          {totaleVociFisseAnnuoMC >= totaleVociFisseAnnuo ? '+' : ''}
                          € {fmtEuro(totaleVociFisseAnnuoMC - totaleVociFisseAnnuo)}
                          {' '}
                          ({((totaleVociFisseAnnuoMC - totaleVociFisseAnnuo) / totaleVociFisseAnnuo * 100).toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#64748b' }}>
                        CCNL 2019-2021 – 13^ mensilità
                      </label>
                      <div className="text-2xl font-bold" style={{ color: '#334155' }}>
                        € {fmtEuro(totaleTredicesimaMensilita)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
                      <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#b45309' }}>
                        CCNL 2022-2024 – 13^ mensilità
                      </label>
                      <div className="text-2xl font-bold" style={{ color: '#92400e' }}>
                        € {fmtEuro(totaleTredicesimaMensilita_MC)}
                      </div>
                      {totaleTredicesimaMensilita_MC !== totaleTredicesimaMensilita && (
                        <div
                          className="text-sm font-semibold mt-1"
                          style={{ color: totaleTredicesimaMensilita_MC >= totaleTredicesimaMensilita ? '#16a34a' : '#dc2626' }}
                        >
                          {totaleTredicesimaMensilita_MC >= totaleTredicesimaMensilita ? '+' : ''}
                          € {fmtEuro(totaleTredicesimaMensilita_MC - totaleTredicesimaMensilita)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dettaglio voci CCNL 2022-2024 */}
                  <h3 className="text-base font-semibold mb-3" style={{ color: '#334155' }}>
                    Dettaglio Voci – CCNL 2022-2024
                  </h3>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '45%' }}>Voce</th>
                          <th style={{ width: '10%', textAlign: 'center' }}>13^</th>
                          <th style={{ width: '25%', textAlign: 'right' }}>Mensile (€)</th>
                          <th style={{ width: '20%', textAlign: 'right' }}>Annuo (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vociArricchiteMC.filter(v => v.catalogo).map((v, i) => (
                          <tr
                            key={v.idRiga}
                            className={i % 2 === 0 ? styles.rowEven : ''}
                            style={v.idVoceCatalogo === '01' ? { backgroundColor: '#fef9c3' } : undefined}
                          >
                            <td className={styles.tdLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                              {v.catalogo?.nome}
                              {v.idVoceCatalogo === '01' && (
                                <span
                                  className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: '#fbbf24', color: '#78350f' }}
                                >
                                  AGGIORNATO
                                </span>
                              )}
                            </td>
                            <td className={styles.tdCenter}>
                              <div className="flex justify-center items-center">
                                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.catalogo?.valido13 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.catalogo?.valido13 ? 'translate-x-5' : 'translate-x-1'}`} />
                                </div>
                              </div>
                            </td>
                            <td className={styles.tdRight}>{fmtEuro(v.importoMensile)}</td>
                            <td className={styles.tdRight}>{fmtEuro(v.importoAnnuo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
