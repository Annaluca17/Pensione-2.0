import React, { useState, useMemo } from 'react';
import styles from '../App.module.css';
import { exportTFSServizioToExcel } from '../exportTFSServizioExcel';
import { exportTFSServizioToPDF } from '../exportTFSServizioPDF';
import { round2 } from '../utils/math';

const fmtEuro = (n: number) =>
  round2(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Step = 'anagrafica' | 'stipendi' | 'voci' | 'risultato';

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'anagrafica', label: 'Anagrafica', num: 1 },
  { id: 'stipendi', label: 'Stipendi 12 Mesi', num: 2 },
  { id: 'voci', label: 'Voci Retributive', num: 3 },
  { id: 'risultato', label: 'Risultato', num: 4 },
];

interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  dataInizio: string;
  dataFine: string;
  motivoCessazione: string;
}

const emptyAnagrafica = (): Anagrafica => ({
  cognomeNome: '', codiceFiscale: '', dataInizio: '', dataFine: '', motivoCessazione: ''
});

const VOCI_RETRIBUTIVE = [
  { id: 'v1', label: 'Stipendio tabellare', valido13: false },
  { id: 'v2', label: '13^ Mensilità', valido13: true },
  { id: 'v3', label: 'Differenziale storico ex PEO', valido13: true },
  { id: 'v4', label: 'Differenziale stipendiale', valido13: true },
  { id: 'v5', label: 'Assegno personale non riassorbibile IIS', valido13: true },
  { id: 'v6', label: 'Assegno ad personam assorbibile', valido13: true },
  { id: 'v7', label: 'S.I.A. ex R.I.A.', valido13: true },
  { id: 'v8', label: 'Indennità specifica 5,38', valido13: false },
  { id: 'v9', label: 'Indennità Vacanza Contrattuale', valido13: true },
  { id: 'v10', label: 'Indennità di vigilanza', valido13: false },
  { id: 'v11', label: 'Indennità Professionale asili nido', valido13: false },
  { id: 'v12', label: 'Indennità Aggiuntiva asili nido', valido13: false },
];

interface VoceInput {
  id: string;
  importoMensile: number;
}

const emptyVoci = (): VoceInput[] => VOCI_RETRIBUTIVE.map(v => ({ id: v.id, importoMensile: 0 }));

export default function UltimoMiglioTFSServizio() {
  const [step, setStep] = useState<Step>('anagrafica');
  const [anagrafica, setAnagrafica] = useState<Anagrafica>(emptyAnagrafica());

  const [importoBaseMensileGlobale, setImportoBaseMensileGlobale] = useState<number>(0);
  const [stipendiMensili, setStipendiMensili] = useState<number[]>(Array(12).fill(0));
  const [eccezioni, setEccezioni] = useState<boolean[]>(Array(12).fill(false));

  const [voci, setVoci] = useState<VoceInput[]>(emptyVoci());

  const currentStepIdx = STEPS.findIndex(s => s.id === step);
  const go = (s: Step) => setStep(s);

  const mesiCalcolati = useMemo(() => {
    return stipendiMensili.map((importo, i) => {
      const effettivo = round2(eccezioni[i] ? importo : importoBaseMensileGlobale);
      return {
        meseId: i + 1,
        importoMensileEffettivo: effettivo,
        quota13: round2(effettivo / 12) // FIX: round2 applicato alla divisione
      };
    });
  }, [importoBaseMensileGlobale, stipendiMensili, eccezioni]);

  const totale13Step2 = useMemo(() => {
    return round2(mesiCalcolati.reduce((sum, m) => sum + m.quota13, 0)); // FIX: round2 sul totale
  }, [mesiCalcolati]);

  const vociCalcolate = useMemo(() => {
    return VOCI_RETRIBUTIVE.map(v => {
      const input = voci.find(x => x.id === v.id);
      let importoMensile = round2(input?.importoMensile || 0);
      let importoAnnuo = 0;

      if (v.id === 'v1') {
        importoMensile = round2(importoBaseMensileGlobale);
        importoAnnuo = round2(importoMensile * 12);
      } else if (v.id === 'v2') {
        importoMensile = round2(totale13Step2);
        importoAnnuo = importoMensile;
      } else {
        importoAnnuo = round2(importoMensile * 12);
      }

      return { ...v, importoMensile, importoAnnuo };
    });
  }, [voci, importoBaseMensileGlobale, totale13Step2]);

  const risultato = useMemo(() => {
    const getAnnuo = (id: string) => vociCalcolate.find(v => v.id === id)?.importoAnnuo || 0;
    const getMensile = (id: string) => vociCalcolate.find(v => v.id === id)?.importoMensile || 0;

    const r1 = round2(getAnnuo('v1') + getAnnuo('v9'));
    const r2 = round2(getAnnuo('v7'));
    const r3 = round2(getAnnuo('v2') + getMensile('v3') + getMensile('v4') + getMensile('v5') + getMensile('v6') + getMensile('v7') + getMensile('v9'));
    const r4 = round2(getAnnuo('v6') + getMensile('v6'));
    const r5 = round2(getAnnuo('v11') + getAnnuo('v12'));
    const r6 = round2(getAnnuo('v5'));
    const r7 = round2(getAnnuo('v8'));
    const r8 = round2(getAnnuo('v10'));
    const r9 = round2(getAnnuo('v3') + getAnnuo('v4'));
    const totale = round2(r1 + r2 + r3 + r4 + r5 + r6 + r7 + r8 + r9);

    return { r1, r2, r3, r4, r5, r6, r7, r8, r9, totale };
  }, [vociCalcolate]);

  const handleApplicaBase = () => {
    setStipendiMensili(Array(12).fill(round2(importoBaseMensileGlobale)));
    setEccezioni(Array(12).fill(false));
  };

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Immedia</span>
          <span className={styles.logoSub}>S.p.A.</span>
        </div>
        <div className={styles.appTitle}>
          <span>Calcolo</span>
          <span className={styles.highlight}>Ultimo Miglio</span>
          <span>TFS Servizio</span>
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
          <span>Personale in Servizio</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              {step === 'anagrafica' && 'Dati Anagrafici'}
              {step === 'stipendi' && 'Motore Mensile e 13^'}
              {step === 'voci' && 'Voci Retributive'}
              {step === 'risultato' && 'Risultato Calcolo'}
            </h1>
            <p className={styles.pageDesc}>
              {step === 'anagrafica' && 'Inserisci i dati del dipendente.'}
              {step === 'stipendi' && "Inserisci l'importo base e gestisci le eccezioni mensili."}
              {step === 'voci' && 'Inserisci gli importi mensili per le voci retributive.'}
              {step === 'risultato' && 'Riepilogo dei calcoli effettuati.'}
            </p>
          </div>
          <div className={styles.stepBadge}>Step {currentStepIdx + 1} / {STEPS.length}</div>
        </header>

        <div className={styles.content}>

          {step === 'anagrafica' && (
            <div className={styles.card}>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>Cognome e Nome <span className={styles.required}>*</span></label>
                  <input className={styles.input} value={anagrafica.cognomeNome}
                    onChange={e => setAnagrafica({ ...anagrafica, cognomeNome: e.target.value })} placeholder="Es. Mario Rossi" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Codice Fiscale <span className={styles.required}>*</span></label>
                  <input className={styles.input} value={anagrafica.codiceFiscale}
                    onChange={e => setAnagrafica({ ...anagrafica, codiceFiscale: e.target.value.toUpperCase().slice(0, 16) })}
                    placeholder="16 caratteri" maxLength={16} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Data Inizio Periodo</label>
                  <input className={styles.input} type="date" value={anagrafica.dataInizio}
                    onChange={e => setAnagrafica({ ...anagrafica, dataInizio: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Data Fine Periodo</label>
                  <input className={styles.input} type="date" value={anagrafica.dataFine}
                    onChange={e => setAnagrafica({ ...anagrafica, dataFine: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Motivo Cessazione</label>
                  <select className={styles.input} value={anagrafica.motivoCessazione}
                    onChange={e => setAnagrafica({ ...anagrafica, motivoCessazione: e.target.value })}>
                    <option value="">-- Seleziona --</option>
                    <option value="Pensione di Vecchiaia">Pensione di Vecchiaia</option>
                    <option value="Pensione Anticipata">Pensione Anticipata</option>
                    <option value="Altro">Altro</option>
                  </select>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={() => go('stipendi')}
                  disabled={!anagrafica.cognomeNome || !anagrafica.codiceFiscale}>
                  Continua →
                </button>
              </div>
            </div>
          )}

          {step === 'stipendi' && (
            <div className={styles.card}>
              <div className={styles.baseInputGroup}>
                <div className={styles.field}>
                  <label className={styles.label}>Importo Base Mensile Globale (€)</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <input className={styles.inputNum} type="number" min={0} step="0.01"
                      value={importoBaseMensileGlobale || ''}
                      onChange={e => setImportoBaseMensileGlobale(round2(parseFloat(e.target.value) || 0))}
                      placeholder="0,00" />
                    <button className={styles.btnSecondary} onClick={handleApplicaBase}>
                      Applica a tutti i mesi
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mese</th>
                      <th>Eccezione</th>
                      <th>Importo Mensile Effettivo (€)</th>
                      <th>Quota 13^ Calcolata (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesiCalcolati.map((m, i) => (
                      <tr key={i} className={i % 2 === 0 ? styles.rowEven : ''}>
                        <td className={styles.tdLabel}>Mese {m.meseId}</td>
                        <td className={styles.tdCenter}>
                          <input type="checkbox" checked={eccezioni[i]}
                            onChange={e => {
                              const newEcc = [...eccezioni];
                              newEcc[i] = e.target.checked;
                              setEccezioni(newEcc);
                              if (!e.target.checked) {
                                const newStip = [...stipendiMensili];
                                newStip[i] = round2(importoBaseMensileGlobale);
                                setStipendiMensili(newStip);
                              }
                            }} />
                        </td>
                        <td>
                          <input className={styles.inputNum} type="number" min={0} step="0.01"
                            value={eccezioni[i] ? (stipendiMensili[i] || '') : importoBaseMensileGlobale}
                            disabled={!eccezioni[i]}
                            onChange={e => {
                              const val = round2(parseFloat(e.target.value) || 0);
                              const newStip = [...stipendiMensili];
                              newStip[i] = val;
                              setStipendiMensili(newStip);
                            }} />
                        </td>
                        <td className={styles.tdRight}>{fmtEuro(m.quota13)}</td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td colSpan={3} style={{ textAlign: 'right' }}><strong>Totale 13^ Step 2:</strong></td>
                      <td className={styles.tdRight}><strong>{fmtEuro(totale13Step2)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.actions}>
                <button className={styles.btnSecondary} onClick={() => go('anagrafica')}>← Indietro</button>
                <button className={styles.btnPrimary} onClick={() => go('voci')}>Continua →</button>
              </div>
            </div>
          )}

          {step === 'voci' && (
            <div className={styles.card}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Voce Retributiva</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Valido 13^</th>
                      <th style={{ width: '25%', textAlign: 'right' }}>Importo Mensile (€)</th>
                      <th style={{ width: '20%', textAlign: 'right' }}>Importo Annuo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vociCalcolate.map((v, i) => {
                      const isReadOnly = v.id === 'v1' || v.id === 'v2';
                      return (
                        <tr key={v.id} className={i % 2 === 0 ? styles.rowEven : ''}>
                          <td className={styles.tdLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{v.label}</td>
                          <td className={styles.tdCenter}>
                            <div className="flex justify-center items-center">
                              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.valido13 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.valido13 ? 'translate-x-5' : 'translate-x-1'}`} />
                              </div>
                            </div>
                          </td>
                          <td className={styles.tdRight}>
                            {isReadOnly ? (
                              <div className="text-slate-500 font-medium">
                                {fmtEuro(v.importoMensile)}
                                <div className="text-xs text-slate-400 font-normal mt-1">Da Step 2</div>
                              </div>
                            ) : (
                              <input className={styles.inputNum} type="number" min={0} step="0.01"
                                value={voci.find(x => x.id === v.id)?.importoMensile || ''} placeholder="0,00"
                                onChange={e => {
                                  const val = round2(parseFloat(e.target.value) || 0);
                                  setVoci(prev => prev.map(x => x.id === v.id ? { ...x, importoMensile: val } : x));
                                }} />
                            )}
                          </td>
                          <td className={styles.tdRight}>{fmtEuro(v.importoAnnuo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnSecondary} onClick={() => go('stipendi')}>← Indietro</button>
                <button className={styles.btnCalcola} onClick={() => go('risultato')}>🧮 Calcola Risultato</button>
              </div>
            </div>
          )}

          {step === 'risultato' && (
            <div>
              <div className={styles.risultatoLock}>
                <span className={styles.lockIcon}>🔒</span>
                Risultato calcolato il {new Date().toLocaleString('it-IT')} – non modificabile
              </div>

              <div className={styles.card} style={{ marginBottom: 16 }}>
                <div className={styles.anagraficaRiepilogo}>
                  <div><label>Nominativo</label><span>{anagrafica.cognomeNome || '–'}</span></div>
                  <div><label>Codice Fiscale</label><span>{anagrafica.codiceFiscale || '–'}</span></div>
                  <div><label>Data Inizio</label><span>{anagrafica.dataInizio || '–'}</span></div>
                  <div><label>Data Fine</label><span>{anagrafica.dataFine || '–'}</span></div>
                  <div><label>Motivo Cessazione</label><span>{anagrafica.motivoCessazione || '–'}</span></div>
                </div>
              </div>

              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Calcolo Ultimo Miglio TFS - Tabella G</h2>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Componente</th>
                      <th style={{ textAlign: 'right' }}>Importo Annuo (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Stipendio tabellare nuove Aree Tab G', val: risultato.r1 },
                      { label: 'Retribuzione Ind. di Anzianità RIA', val: risultato.r2 },
                      { label: 'Tredicesima mensilità', val: risultato.r3 },
                      { label: 'Assegno ad personam assorbibile progressione verticale per 13 mensilità', val: risultato.r4 },
                      { label: 'Indennità Aggiuntive personale asili nido per 12 mensilità', val: risultato.r5 },
                      { label: 'Assegno personale non riassorbibile art 29', val: risultato.r6 },
                      { label: 'Indennità 64,56 annue lorde ex 3^ 4^ qualifica', val: risultato.r7 },
                      { label: 'Indennità di vigilanza per 12 mensilità', val: risultato.r8 },
                      { label: 'Differenziali stipendiali', val: risultato.r9 },
                    ].map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? styles.rowEven : ''}>
                        <td className={styles.tdLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{r.label}</td>
                        <td className={styles.tdRight}>{fmtEuro(r.val)}</td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td><strong>TOTALE GENERALE</strong></td>
                      <td className={styles.tdRight}><strong>{fmtEuro(risultato.totale)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className={styles.card} style={{ marginTop: 16 }}>
                <h2 className={styles.sectionTitle}>Dettaglio Voci Retributive</h2>
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
                      {vociCalcolate.map((v, i) => (
                        <tr key={v.id} className={i % 2 === 0 ? styles.rowEven : ''}>
                          <td className={styles.tdLabel} style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{v.label}</td>
                          <td className={styles.tdCenter}>
                            <div className="flex justify-center items-center">
                              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${v.valido13 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${v.valido13 ? 'translate-x-5' : 'translate-x-1'}`} />
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

              <div className={styles.actions} style={{ marginTop: 24 }}>
                <button className={styles.btnSecondary} onClick={() => go('voci')}>← Modifica Dati</button>
                <button className={styles.btnExport} onClick={() => exportTFSServizioToExcel(anagrafica, vociCalcolate, risultato, mesiCalcolati, totale13Step2)}>
                  Esporta Excel
                </button>
                <button className={styles.btnPdf} onClick={() => exportTFSServizioToPDF(anagrafica, vociCalcolate, risultato, mesiCalcolati, totale13Step2)}>
                  Esporta PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
