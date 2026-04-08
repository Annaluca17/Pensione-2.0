import React, { useState } from 'react';
import { Plus, Trash2, Calculator, Save, ArrowRight, ArrowLeft, FileText } from 'lucide-react';
import { round2, fmtEuro } from '../utils/math';

type VoceRetributiva = {
  id: string;
  voce_retributiva: string;
  flag_tfr: boolean;
  flag_tfs: boolean;
  flag_tredicesima: boolean;
  importo_mensile: number;
};

type MetadatiTemporali = {
  data_competenza: string;
  giorni_tredicesima: number;
  giorni_mensili: number;
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

export default function AnticipoDMATempoPieno() {
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [metadati, setMetadati] = useState<MetadatiTemporali>({
    data_competenza: new Date().toISOString().split('T')[0],
    giorni_tredicesima: 0,
    giorni_mensili: 0
  });

  const [matrice, setMatrice] = useState<VoceRetributiva[]>([
    {
      id: crypto.randomUUID(),
      voce_retributiva: VOCI_CCNL[0],
      flag_tfr: VOCI_FLAGS[VOCI_CCNL[0]].tfr,
      flag_tfs: VOCI_FLAGS[VOCI_CCNL[0]].tfs,
      flag_tredicesima: VOCI_FLAGS[VOCI_CCNL[0]].tredicesima,
      importo_mensile: 0
    }
  ]);

  const addVoce = () => {
    setMatrice([
      ...matrice,
      {
        id: crypto.randomUUID(),
        voce_retributiva: VOCI_CCNL[0],
        flag_tfr: VOCI_FLAGS[VOCI_CCNL[0]].tfr,
        flag_tfs: VOCI_FLAGS[VOCI_CCNL[0]].tfs,
        flag_tredicesima: VOCI_FLAGS[VOCI_CCNL[0]].tredicesima,
        importo_mensile: 0
      }
    ]);
  };

  const removeVoce = (id: string) => {
    setMatrice(matrice.filter(v => v.id !== id));
  };

  const updateVoce = (id: string, field: keyof VoceRetributiva, value: any) => {
    setMatrice(matrice.map(v => {
      if (v.id === id) {
        const updatedVoce = { ...v, [field]: field === 'importo_mensile' ? round2(value) : value };

        if (field === 'voce_retributiva') {
          const flags = VOCI_FLAGS[value as string];
          if (flags) {
            updatedVoce.flag_tfr = flags.tfr;
            updatedVoce.flag_tfs = flags.tfs;
            updatedVoce.flag_tredicesima = flags.tredicesima;
          }
        }

        return updatedVoce;
      }
      return v;
    }));
  };

  const totaleMensile = round2(matrice.reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const handleSave = () => {
    if (totaleMensile <= 0) {
      setError("È richiesto l'inserimento di almeno un dato contrattuale (importo maggiore di zero).");
      return;
    }
    setError(null);
    setStep(2);
  };

  // Calcoli
  const totaleTredicesima = round2(matrice.filter(v => v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFS = round2(matrice.filter(v => v.flag_tfs).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFR = round2(matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const totaleTredicesimaTFS = round2(matrice.filter(v => v.flag_tfs && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTredicesimaTFR = round2(matrice.filter(v => v.flag_tfr && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const totale365 = round2(totaleMensile);
  const totale26 = round2((totaleMensile / 26) * metadati.giorni_mensili);

  const tredicesimaCPDEL = round2((totaleTredicesima / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFS = round2((totaleTredicesimaTFS / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFR = round2((totaleTredicesimaTFR / 365) * metadati.giorni_tredicesima);

  const imponibileCPDEL = round2(totale26 + tredicesimaCPDEL);
  const imponibileFondoCredito = round2(imponibileCPDEL);
  const imponibileTFS80 = round2((((totaleTFS / 26) * metadati.giorni_mensili) + tredicesimaTFS) * 0.80);
  const imponibileTFR80 = round2((((totaleTFR / 26) * metadati.giorni_mensili) + tredicesimaTFR) * 0.80);

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">Risultati Calcolo Anticipo DMA</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Box Riepilogo Dati */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">Dati Inseriti</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Data Competenza:</span> <span className="font-medium text-slate-800">{metadati.data_competenza}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Giorni Tredicesima (su 365):</span> <span className="font-medium text-slate-800">{metadati.giorni_tredicesima}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Giorni Mensili (su 26):</span> <span className="font-medium text-slate-800">{metadati.giorni_mensili}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Voci inserite:</span> <span className="font-medium text-slate-800">{matrice.length}</span></div>
              </div>
            </div>

            {/* Box Calcoli Intermedi */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-4 border-b border-blue-200 pb-2">Calcoli Intermedi</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-blue-700">Totale su 365 giorni:</span> <span className="font-medium text-blue-900">€ {fmtEuro(totale365)}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Totale su 26 giorni:</span> <span className="font-medium text-blue-900">€ {fmtEuro(totale26)}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima CPDEL:</span> <span className="font-medium text-blue-900">€ {fmtEuro(tredicesimaCPDEL)}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima TFS:</span> <span className="font-medium text-blue-900">€ {fmtEuro(tredicesimaTFS)}</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Tredicesima TFR:</span> <span className="font-medium text-blue-900">€ {fmtEuro(tredicesimaTFR)}</span></div>
              </div>
            </div>
          </div>

          {/* Box Risultati Finali */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-8 text-white shadow-md">
            <h4 className="font-semibold text-slate-100 mb-4 border-b border-slate-600 pb-2">Risultati Imponibili</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile CPDEL:</span>
                <span className="font-bold text-xl text-white">€ {fmtEuro(imponibileCPDEL)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile Fondo Credito:</span>
                <span className="font-bold text-xl text-white">€ {fmtEuro(imponibileFondoCredito)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile TFS 80%:</span>
                <span className="font-bold text-xl text-white">€ {fmtEuro(imponibileTFS80)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Imponibile TFR 80%:</span>
                <span className="font-bold text-xl text-white">€ {fmtEuro(imponibileTFR80)}</span>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-blue-600" />
          Metadati Temporali
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Numero giorni tredicesima (su 365)
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
              Numero giorni Mensili (su 26)
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
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Matrice Retributiva</h3>
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
                <th className="py-3 px-4 font-medium text-slate-600 text-sm">Voce Retributiva</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center">TFR</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center">TFS</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center">13^</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-right">Importo Mensile (€)</th>
                <th className="py-3 px-4 font-medium text-slate-600 text-sm text-center">Azioni</th>
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
                      value={voce.importo_mensile || ''}
                      onChange={(e) => updateVoce(voce.id, 'importo_mensile', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-right"
                      placeholder="0.00"
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
                <td colSpan={4} className="py-4 px-4 text-right">Totale Mensile:</td>
                <td className="py-4 px-4 text-right">
                  € {fmtEuro(totaleMensile)}
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
