import React, { useState } from 'react';
import { Calculator, ArrowRight, Save } from 'lucide-react';
import AnticipoDMATempoPieno from './AnticipoDMATempoPieno';
import AnticipoDMAPartTime from './AnticipoDMAPartTime';

type TipoDipendente = 'tempo_pieno' | 'part_time_tfr' | null;

export default function AnticipoDMA() {
  const [tipoDipendente, setTipoDipendente] = useState<TipoDipendente>(null);

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Anticipo DMA</h2>
          <p className="text-slate-500 text-sm mt-1">
            Seleziona la tipologia di dipendente per procedere con l'analisi.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Selezione Tipologia */}
        <section>
          <h3 className="text-lg font-medium text-slate-800 mb-4">Tipologia Dipendente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setTipoDipendente('tempo_pieno')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                tipoDipendente === 'tempo_pieno'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <h4 className={`font-semibold text-lg mb-2 ${tipoDipendente === 'tempo_pieno' ? 'text-blue-700' : 'text-slate-700'}`}>
                Dipendente Tempo Pieno
              </h4>
              <p className="text-slate-500 text-sm">
                Seleziona questa opzione per i dipendenti con contratto a tempo pieno.
              </p>
            </button>

            <button
              onClick={() => setTipoDipendente('part_time_tfr')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                tipoDipendente === 'part_time_tfr'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <h4 className={`font-semibold text-lg mb-2 ${tipoDipendente === 'part_time_tfr' ? 'text-blue-700' : 'text-slate-700'}`}>
                Dipendente Part Time / TFR
              </h4>
              <p className="text-slate-500 text-sm">
                Seleziona questa opzione per i dipendenti con contratto part-time o in regime TFR.
              </p>
            </button>
          </div>
        </section>

        {/* Dettagli aggiuntivi (mostrati solo dopo la selezione) */}
        {tipoDipendente === 'tempo_pieno' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnticipoDMATempoPieno />
          </section>
        )}

        {tipoDipendente === 'part_time_tfr' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnticipoDMAPartTime />
          </section>
        )}
      </div>
    </div>
  );
}
