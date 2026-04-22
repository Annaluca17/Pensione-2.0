import { useState, useCallback } from 'react';
import type { Anagrafica, VoceRetributiva, Step, RisultatoCalcolo } from '../types';
import { VOCI_RETRIBUTIVE, MESI_LABELS, calcolaRisultato } from '../types';
import { exportToExcel } from '../exportExcel';
import { exportToPDF } from '../exportPDF';
import { round2 } from '../utils/math';
import styles from './App.module.css';

const fmtEuro = (n: number) =>
  round2(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'anagrafica', label: 'Anagrafica', num: 1 },
  { id: 'stipendi', label: 'Stipendi 12 Mesi', num: 2 },
  { id: 'voci', label: 'Voci Retributive', num: 3 },
  { id: 'risultato', label: 'Risultato', num: 4 },
];

// FIX: aggiunto motivoCessazione richiesto dall'interfaccia Anagrafica
const emptyAnagrafica = (): Anagrafica => ({
  cognomeNome: '', codiceFiscale: '', qualifica: '', dataPensione: '', ente: '', motivoCessazione: ''
});

const emptyVoci = (): VoceRetributiva[] =>
  VOCI_RETRIBUTIVE.map(v => ({ ...v, importoMensile: 0 }));

export default function UltimoMiglioTFSPensione() {
  const [step, setStep] = useState<Step>('anagrafica');
  const [anagrafica, setAnagrafica] = useState<Anagrafica>(emptyAnagrafica());
  const [voci, setVoci] = useState<VoceRetributiva[]>(emptyVoci());
  const [importoBaseStipendio, setImportoBaseStipendio] = useState<number>(0);
  const [importoBaseTredicesima, setImportoBaseTredicesima] = useState<number>(0);
  const [stipendiMensili, setStipendiMensili] = useState<{stipendio: number, tredicesima: number}[]>(Array(12).fill({ stipendio: 0, tredicesima: 0 }));
  const [eccezioni, setEccezioni] = useState<boolean[]>(Array(12).fill(false));
  const [risultato, setRisultato] = useState<RisultatoCalcolo | null>(null);
  const [calcolato, setCalcolato] = useState(false);

  const currentStepIdx = STEPS.findIndex(s => s.id === step);
  const go = (s: Step) => setStep(s);

  const applicaBase = useCallback(() => {
    setStipendiMensili(prev =>
      prev.map((v, i) => eccezioni[i] ? v : { stipendio: importoBaseStipendio, tredicesima: importoBaseTredicesima })
    );
  }, [importoBaseStipendio, importoBaseTredicesima, eccezioni]);

  const calcola = () => {
    const res = calcolaRisultato(voci, stipendiMensili);
    setRisultato(res);
    setCalcolato(true);
    setStep('risultato');
  };

  const reset = () => {
    setStep('anagrafica');
    setAnagrafica(emptyAnagrafica());
    setVoci(emptyVoci());
    setImportoBaseStipendio(0);
    setImportoBaseTredicesima(0);
    setStipendiMensili(Array(12).fill({ stipendio: 0, tredicesima: 0 }));
    setEccezioni(Array(12).fill(false));
    setRisultato(null);
    setCalcolato(false);
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
          <span>TFS</span>
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
          <span>Enti Locali - INPS</span>
          <span>Pensionati in essere</span>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>
              {step === 'anagrafica' && 'Dati Anagrafici'}
              {step === 'voci' && 'Voci Retributive Annualizzate'}
              {step === 'stipendi' && 'Stipendi Ultimi 12 Mesi'}
              {step === 'risultato' && 'Risultato Calcolo'}
            </h1>
            <p className={styles.pageDesc}>
              {step === 'anagrafica' && 'Inserire i dati identificativi del dipendente pensionato'}
              {step === 'voci' && 'Inserire gli importi mensili per ciascuna voce retributiva'}
              {step === 'stipendi' && 'Definire gli stipendi effettivi degli ultimi 12 mesi'}
              {step === 'risultato' && 'Risultato non modificabile - generato automaticamente dal calcolo'}
            </p>
          </div>
          <div className={styles.stepBadge}>Step {currentStepIdx + 1} / {STEPS.length}</div>
        </header>

        <div className={styles.content}>
          {step === 'anagrafica' && (
            <div className={styles.card}>
              <div className={styles.grid2}>
                <FormField label="Cognome e Nome" required>
                  <input className={styles.input} type="text" value={anagrafica.cognomeNome}
                    onChange={e => setAnagrafica(a => ({ ...a, cognomeNome: e.target.value }))} placeholder="es. Rossi Mario" />
                </FormField>
                <FormField label="Codice Fiscale">
                  <input className={styles.input} type="text" value={anagrafica.codiceFiscale}
                    onChange={e => setAnagrafica(a => ({ ...a, codiceFiscale: e.target.value.toUpperCase() }))}
                    placeholder="es. RSSMRA80A01H501Z" maxLength={16} />
                </FormField>
                <FormField label="Qualifica / Profilo">
                  <input className={styles.input} type="text" value={anagrafica.qualifica}
                    onChange={e => setAnagrafica(a => ({ ...a, qualifica: e.target.value }))} placeholder="es. Istruttore Cat. C" />
                </FormField>
                <FormField label="Data Pensionamento">
                  <input className={styles.input} type="date" value={anagrafica.dataPensione}
                    onChange={e => setAnagrafica(a => ({ ...a, dataPensione: e.target.value }))} />
                </FormField>
                <FormField label="Ente di appartenenza" wide>
                  <input className={styles.input} type="text" value={anagrafica.ente}
                    onChange={e => setAnagrafica(a => ({ ...a, ente: e.target.value }))} placeholder="es. Comune di Roma" />
                </FormField>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnPrimary} onClick={() => go('stipendi')}>Continua</button>
              </div>
            </div>
          )}

          {step === 'stipendi' && (
            <div className={styles.card}>
              <div className={styles.baseImportoRow}>
                <div className={styles.baseImportoLabel}>
                  <strong>Importo base mensile</strong>
                  <span>Verra applicato a tutti i mesi senza eccezione</span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stipendio</label>
                    <input className={styles.inputNumLarge} type="number" min={0} step="0.01"
                      value={importoBaseStipendio || ''} placeholder="0,00"
                      onChange={e => {
                        const val = round2(parseFloat(e.target.value) || 0);
                        setImportoBaseStipendio(val);
                        setImportoBaseTredicesima(round2(val / 12));
                      }} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">13^ mensilita</label>
                    <input className={styles.inputNumLarge} type="number" min={0} step="0.01"
                      value={importoBaseTredicesima || ''} placeholder="0,00"
                      onChange={e => setImportoBaseTredicesima(round2(parseFloat(e.target.value) || 0))} />
                  </div>
                </div>
                <button className={styles.btnApply} onClick={applicaBase}>Applica a tutti</button>
              </div>

              <div className={styles.mesiGrid}>
                {MESI_LABELS.map((mese, i) => (
                  <div key={mese} className={`${styles.meseCard} ${eccezioni[i] ? styles.meseEccezione : ''}`}>
                    <div className={styles.meseHeader}>
                      <span className={styles.meseName}>{mese}</span>
                      <label className={styles.eccezioneToggle}>
                        <input type="checkbox" checked={eccezioni[i]}
                          onChange={e => {
                            const checked = e.target.checked;
                            setEccezioni(prev => prev.map((x, j) => j === i ? checked : x));
                          }} />
                        <span>Eccezione</span>
                      </label>
                    </div>
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Stipendio</label>
                        <input className={styles.inputNum} type="number" min={0} step="0.01"
                          value={stipendiMensili[i]?.stipendio || ''} placeholder="0,00"
                          onChange={e => {
                            const val = round2(parseFloat(e.target.value) || 0);
                            setStipendiMensili(prev => prev.map((x, j) => j === i ? { ...x, stipendio: val, tredicesima: round2(val / 12) } : x));
                            if (!eccezioni[i]) setEccezioni(prev => prev.map((x, j) => j === i ? true : x));
                          }} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">13^ mensilita</label>
                        <input className={styles.inputNum} type="number" min={0} step="0.01"
                          value={stipendiMensili[i]?.tredicesima || ''} placeholder="0,00"
                          onChange={e => {
                            const val = round2(parseFloat(e.target.value) || 0);
                            setStipendiMensili(prev => prev.map((x, j) => j === i ? { ...x, tredicesima: val } : x));
                            if (!eccezioni[i]) setEccezioni(prev => prev.map((x, j) => j === i ? true : x));
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.totaleMesiRow}>
                <span>Totale Stipendi 12 mesi:</span>
                <strong>{fmtEuro(stipendiMensili.reduce((s, v) => s + v.stipendio, 0))}</strong>
                <span style={{ marginLeft: 24 }}>Totale 13^ mensilita:</span>
                <strong>{fmtEuro(stipendiMensili.reduce((s, v) => s + v.tredicesima, 0))}</strong>
              </div>
              <div className={styles.actions}>
                <button className={styles.btnSecondary} onClick={() => go('anagrafica')}>Indietro</button>
                <button className={styles.btnPrimary} onClick={() => go('voci')}>Continua</button>
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
                      <th style={{ width: '25%' }}>Importo Mensile</th>
                      <th style={{ width: '20%' }}>Importo Annuo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voci.map((v, i) => {
                      const isReadOnly = v.id === 'stip_tab' || v.id === 'tredicesima';
                      const annuo = v.id === 'stip_tab'
                        ? round2(stipendiMensili.reduce((s, val) => s + val.stipendio, 0))
                        : v.id === 'tredicesima'
                        ? round2(stipendiMensili.reduce((s, val) => s + val.tredicesima, 0))
                        : round2(v.importoMensile * 12);
                      return (
                        <tr key={v.id} className={i % 2 === 0 ? styles.rowEven : ''}>
                          <td className={styles.tdLabel}>{v.label}</td>
                          <td className={styles.tdCenter}>
                            <span className={v.valido13 ? styles.badgeSi : styles.badgeNo}>{v.valido13 ? 'SI' : 'NO'}</span>
                          </td>
                          <td>
                            {isReadOnly ? (
                              <div className="text-slate-400 text-sm italic text-center">Calcolato da 12 mesi</div>
                            ) : (
                              <input className={styles.inputNum} type="number" min={0} step="0.01"
                                value={v.importoMensile || ''} placeholder="0,00"
                                onChange={e => {
                                  const val = round2(parseFloat(e.target.value) || 0);
                                  setVoci(prev => prev.map((x, j) => j === i ? { ...x, importoMensile: val } : x));
                                }} />
                            )}
                          </td>
                          <td className={styles.tdAnnuo}>{fmtEuro(annuo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.infoBox}>
                <span className={styles.infoIcon}>i</span>
                Gli importi devono essere annualizzati e a tempo pieno.
              </div>
              <div className={styles.actions}>
                <button className={styles.btnSecondary} onClick={() => go('stipendi')}>Indietro</button>
                <button className={styles.btnCalcola} onClick={calcola}>Calcola Risultato</button>
              </div>
            </div>
          )}

          {step === 'risultato' && risultato && calcolato && (
            <div>
              <div className={styles.risultatoLock}>
                <span className={styles.lockIcon}>🔒</span>
                Risultato calcolato il {new Date().toLocaleString('it-IT')} - non modificabile
              </div>
              <div className={styles.card} style={{ marginBottom: 16 }}>
                <div className={styles.anagraficaRiepilogo}>
                  <div><label>Nominativo</label><span>{anagrafica.cognomeNome || '-'}</span></div>
                  <div><label>Codice Fiscale</label><span>{anagrafica.codiceFiscale || '-'}</span></div>
                  <div><label>Qualifica</label><span>{anagrafica.qualifica || '-'}</span></div>
                  <div><label>Pensionamento</label><span>{anagrafica.dataPensione || '-'}</span></div>
                  <div><label>Ente</label><span>{anagrafica.ente || '-'}</span></div>
                </div>
              </div>
              <div className={styles.card}>
                <h2 className={styles.sectionTitle}>Ultimo Miglio TFS</h2>
                <table className={styles.table}>
                  <thead><tr><th>Componente</th><th style={{ textAlign: 'right' }}>Importo</th></tr></thead>
                  <tbody>
                    {[
                      { label: 'Retribuzione Ind. di Anzianita (R.I.A.)', val: risultato.ria },
                      { label: 'Tredicesima mensilita', val: risultato.tredicesima },
                      { label: 'Stipendio tabellare TAB E', val: risultato.stipTabellare },
                      { label: 'Indennita Aggiuntive asili nido (voce 72 + 78)', val: risultato.indAsili },
                      { label: 'Indennita di EUR 64,56 annue lorde (ex 3^ e 4^ Qualifica)', val: risultato.ind6456 },
                      { label: 'Indennita di vigilanza', val: risultato.indVigilanza },
                    ].map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? styles.rowEven : ''}>
                        <td className={styles.tdLabel}>{r.label}</td>
                        <td className={styles.tdRight}>{fmtEuro(r.val)}</td>
                      </tr>
                    ))}
                    <tr className={styles.totalRow}>
                      <td><strong>TOTALE ULTIMO MIGLIO TFS</strong></td>
                      <td className={styles.tdRight}><strong>{fmtEuro(risultato.totaleUltimoMiglio)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className={styles.actions} style={{ marginTop: 24 }}>
                <button className={styles.btnSecondary} onClick={reset}>Nuovo Calcolo</button>
                <button className={styles.btnExport} onClick={() => exportToExcel(anagrafica, risultato)}>Esporta Excel</button>
                <button className={styles.btnPdf} onClick={() => exportToPDF(anagrafica, risultato)}>Stampa / PDF</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FormField({ label, children, required, wide }: {
  label: string; children: React.ReactNode; required?: boolean; wide?: boolean;
}) {
  return (
    <div className={wide ? styles.fieldWide : styles.field}>
      <label className={styles.label}>{label} {required && <span className={styles.required}>*</span>}</label>
      {children}
    </div>
  );
}
