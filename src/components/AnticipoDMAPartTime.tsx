import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Save, ArrowRight, ArrowLeft, FileText } from 'lucide-react';

type VoceRetributivaPartTime = {
  id: string;
  voce_retributiva: string;
  flag_tfr: boolean;
  flag_tfs: boolean;
  flag_tredicesima: boolean;
  valore_intero: number;
  importo_mensile: number;
};

type MetadatiTemporali = {
  data_competenza: string;
  giorni_tredicesima: number;
  giorni_mensili: number;
  percentuale_part_time: number;
};

const VOCI_CCNL = [
  'Stipendio tabellare per 13 mensilità',
  'Differenziale storico (ex PEO) per 13 mensilità',
  'Differenziale stipendiale per 13 mensilità (nuova voce CCNL 2019 – 2021)',
  'Assegno ad personam IIS Cat. B e D per 13 mensilità',
  'Assegno ad personam riassorbibile progressione verticale per 13 mensilità',
  'Salario Individuale di Anzianità (ex R.I.A.) per 13 mensilità',
  'Retribuzione di posizione per 13 mensilità',
  'Indennità specifica (ex art.4 comma 3 CCNL 16/07/1996) per 12 mensilità 5,38',
  'Indennità di Vacanza Contrattuale (compreso Anticipo IVC) per 13 mensilità',
  'Indennità di Comparto per 12 mensilità',
  'Indennità di vigilanza per 12 mensilità',
  'Indennità Professionale personale asili nido e scolastico €. 55,40 mensili per 12 mensilità ex art. 37 c. 1 lett. c CCNL 1995 (voce 72)',
  'Indennità Aggiuntiva personale asili nido e scolastico €. 28,41 mensili per 12 mensilità ex art. 6 CCNL 2001 (voce 78)',
  'Indennità Tempo potenziato personale scolastico €. 103,28 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 74)',
  'Trattamento accessorio personale asili nido €. 61,97 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 84)',
  'Una Tantum 1,5%'
];

const VOCI_FLAGS: Record<string, { tfr: boolean; tfs: boolean; tredicesima: boolean }> = {
  'Stipendio tabellare per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Differenziale storico (ex PEO) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Differenziale stipendiale per 13 mensilità (nuova voce CCNL 2019 – 2021)': { tfr: true, tfs: true, tredicesima: true },
  'Assegno ad personam IIS Cat. B e D per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Assegno ad personam riassorbibile progressione verticale per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Salario Individuale di Anzianità (ex R.I.A.) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Retribuzione di posizione per 13 mensilità': { tfr: true, tfs: false, tredicesima: true },
  'Indennità specifica (ex art.4 comma 3 CCNL 16/07/1996) per 12 mensilità 5,38': { tfr: true, tfs: true, tredicesima: false },
  'Indennità di Vacanza Contrattuale (compreso Anticipo IVC) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Indennità di Comparto per 12 mensilità': { tfr: false, tfs: false, tredicesima: false },
  'Indennità di vigilanza per 12 mensilità': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Professionale personale asili nido e scolastico €. 55,40 mensili per 12 mensilità ex art. 37 c. 1 lett. c CCNL 1995 (voce 72)': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Aggiuntiva personale asili nido e scolastico €. 28,41 mensili per 12 mensilità ex art. 6 CCNL 2001 (voce 78)': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Tempo potenziato personale scolastico €. 103,28 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 74)': { tfr: false, tfs: false, tredicesima: false },
  'Trattamento accessorio personale asili nido €. 61,97 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 84)': { tfr: false, tfs: false, tredicesima: false },
  'Una Tantum 1,5%': { tfr: false, tfs: false, tredicesima: true }
};

export default function AnticipoDMAPartTime() {
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [metadati, setMetadati] = useState<MetadatiTemporali>({
    data_competenza: new Date().toISOString().split('T')[0],
    giorni_tredicesima: 0,
    giorni_mensili: 0,
    percentuale_part_time: 100
  });

  const [matrice, setMatrice] = useState<VoceRetributivaPartTime[]>([
    {
      id: crypto.randomUUID(),
      voce_retributiva: VOCI_CCNL[0],
      flag_tfr: VOCI_FLAGS[VOCI_CCNL[0]].tfr,
      flag_tfs: VOCI_FLAGS[VOCI_CCNL[0]].tfs,
      flag_tredicesima: VOCI_FLAGS[VOCI_CCNL[0]].tredicesima,
      valore_intero: 0,
      importo_mensile: 0
    }
  ]);

  useEffect(() => {
    setMatrice(prev => prev.map(v => ({
      ...v,
      importo_mensile: v.valore_intero * (metadati.percentuale_part_time / 100)
    })));
  }, [metadati.percentuale_part_time]);

  const addVoce = () => {
    setMatrice([
      ...matrice,
      {
        id: crypto.randomUUID(),
        voce_retributiva: VOCI_CCNL[0],
        flag_tfr: VOCI_FLAGS[VOCI_CCNL[0]].tfr,
        flag_tfs: VOCI_FLAGS[VOCI_CCNL[0]].tfs,
        flag_tredicesima: VOCI_FLAGS[VOCI_CCNL[0]].tredicesima,
        valore_intero: 0,
        importo_mensile: 0
      }
    ]);
  };

  const removeVoce = (id: string) => {
    setMatrice(matrice.filter(v => v.id !== id));
  };

  const updateVoce = (id: string, field: keyof VoceRetributivaPartTime, value: any) => {
    setMatrice(matrice.map(v => {
      if (v.id === id) {
        const updatedVoce = { ...v, [field]: value };
        
        if (field === 'voce_retributiva') {
          const flags = VOCI_FLAGS[value as string];
          if (flags) {
            updatedVoce.flag_tfr = flags.tfr;
            updatedVoce.flag_tfs = flags.tfs;
            updatedVoce.flag_tredicesima = flags.tredicesima;
          }
        }

        // Ricalcola importo mensile se cambia valore intero
        if (field === 'valore_intero') {
          updatedVoce.importo_mensile = updatedVoce.valore_intero * (metadati.percentuale_part_time / 100);
        }
        return updatedVoce;
      }
      return v;
    }));
  };

  const totaleMensile = matrice.reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);

  const handleSave = () => {
    if (totaleMensile <= 0) {
      setError("È richiesto l'inserimento di almeno un dato contrattuale (valore intero maggiore di zero).");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Calcoli
  const totaleTredicesima = matrice.filter(v => v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);
  const totaleTFS = matrice.filter(v => v.flag_tfs).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);
  const totaleTFR = matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);

  const totaleTredicesimaTFS = matrice.filter(v => v.flag_tfs && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);
  const totaleTredicesimaTFR = matrice.filter(v => v.flag_tfr && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0);

  const tredicesimaCPDEL = (totaleTredicesima / 365) * metadati.giorni_tredicesima;
  const tredicesimaTFS = (totaleTredicesimaTFS / 365) * metadati.giorni_tredicesima;
  const tredicesimaTFR = (totaleTredicesimaTFR / 365) * metadati.giorni_tredicesima;

  const totale365 = totaleMensile;
  const totale26 = (totaleMensile / 26) * metadati.giorni_mensili;

  const imponibileCPDEL = ((totaleMensile / 26) * metadati.giorni_mensili) + tredicesimaCPDEL;
  const imponibileFondoCredito = imponibileCPDEL;
  const imponibileTFS80 = (((totaleTFS / 26) * metadati.giorni_mensili) + tredicesimaTFS) * 0.80;
  const imponibileTFR80 = (((totaleTFR / 26) * metadati.giorni_mensili) + tredicesimaTFR) * 0.80;

  const totaleTFRIntero = matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.valore_intero || 0), 0);
  const tfrTabellareTeorico = totaleTFRIntero * (metadati.percentuale_part_time / 100);
  const tfrRivalutato = (imponibileTFR80 / 80) * 100;

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">Risultati Calcolo Anticipo DMA (Part Time / TFR)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Box Riepilogo Dati */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">Dati Inseriti</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Data Competenza:</span> <span className="font-medium text-slate-800">{new Date(metadati.data_competenza).toLocaleDateString('it-IT')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Giorni Tredicesima (su 365):</span> <span className="font-medium text-slate-800">{metadati.giorni_tredicesima}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Giorni Mensili (su 26):</span> <span className="font-medium text-slate-800">{metadati.giorni_mensili}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">% Part-Time:</span> <span className="font-medium text-slate-800">{metadati.percentuale_part_time}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Voci inserite:</span> <span className="font-medium text-slate-800">{matrice.length}</span></div>
              </div>
            </div>

            {/* Box Calcoli Intermedi */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-4 border-b border-blue-200 pb-2">Calcoli Intermedi</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-blue-700">Totale su 365 giorni:</span> <span className="font-medium text-blue-900">{totale365.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Totale su 26 giorni:</span> <span className="font-medium text-blue-900">{totale26.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima CPDEL:</span> <span className="font-medium text-blue-900">{tredicesimaCPDEL.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima TFS:</span> <span className="font-medium text-blue-900">{tredicesimaTFS.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima TFR:</span> <span className="font-medium text-blue-900">{tredicesimaTFR.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span></div>
              </div>
            </div>
          </div>

          {/* Box Risultati Finali */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8 text-white shadow-md">
            <h4 className="font-semibold text-slate-100 mb-4 border-b border-slate-600 pb-2">Risultati Imponibili</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile CPDEL:</span> 
                <span className="font-bold text-xl text-white">{imponibileCPDEL.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile Fondo Credito:</span> 
                <span className="font-bold text-xl text-white">{imponibileFondoCredito.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile TFS 80%:</span> 
                <span className="font-bold text-xl text-white">{imponibileTFS80.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile TFR 80%:</span> 
                <span className="font-bold text-xl text-white">{imponibileTFR80.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">TFR Tabellare Teorico:</span> 
                <span className="font-bold text-xl text-white">{tfrTabellareTeorico.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">TFR Rivalutato:</span> 
                <span className="font-bold text-xl text-white">{tfrRivalutato.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Modifica Dati
            </button>
            <button
              onClick={() => alert('Funzionalità di esportazione/generazione in fase di sviluppo.')}
              className="flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Genera Documento
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Metadati Temporali</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Data Competenza
            </label>
            <input
              type="date"
              value={metadati.data_competenza}
              onChange={(e) => setMetadati({ ...metadati, data_competenza: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Giorni Tredicesima (su 365)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={metadati.giorni_tredicesima}
              onChange={(e) => setMetadati({ ...metadati, giorni_tredicesima: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Giorni Mensili (su 26)
            </label>
            <input
              type="number"
              min="0"
              max="26"
              value={metadati.giorni_mensili}
              onChange={(e) => setMetadati({ ...metadati, giorni_mensili: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              % Part-Time
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={metadati.percentuale_part_time || ''}
                onChange={(e) => setMetadati({ ...metadati, percentuale_part_time: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 pr-8 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Matrice Retributiva Part-Time</h3>
          <button
            onClick={addVoce}
            className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100 transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi Voce
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 font-medium text-slate-600 text-sm min-w-[250px]">Voce Retributiva</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center w-16">TFR</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center w-16">TFS</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center w-16">13^</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-right min-w-[140px]">Valore Intero (€)</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-right min-w-[150px]">Importo Mensile (€)</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center w-16">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrice.map((voce) => (
                <tr key={voce.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="space-y-2">
                      <select
                        value={voce.voce_retributiva}
                        onChange={(e) => updateVoce(voce.id, 'voce_retributiva', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      >
                        {VOCI_CCNL.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={voce.flag_tfr}
                      readOnly
                      disabled
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 bg-slate-100 cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={voce.flag_tfs}
                      readOnly
                      disabled
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 bg-slate-100 cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={voce.flag_tredicesima}
                      readOnly
                      disabled
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 bg-slate-100 cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={voce.valore_intero || ''}
                      onChange={(e) => updateVoce(voce.id, 'valore_intero', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-right no-spin-buttons"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      readOnly
                      value={voce.importo_mensile.toFixed(2)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 outline-none text-sm text-right cursor-not-allowed"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => removeVoce(voce.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Rimuovi voce"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td colSpan={5} className="py-4 px-4 text-right">Totale Mensile Computato:</td>
                <td className="py-4 px-4 text-right">
                  {totaleMensile.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-end gap-4">
        {error && (
          <div className="text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
            {error}
          </div>
        )}
        <button 
          onClick={handleSave}
          className="flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Save className="w-5 h-5 mr-2" />
          Salva e Procedi
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}
