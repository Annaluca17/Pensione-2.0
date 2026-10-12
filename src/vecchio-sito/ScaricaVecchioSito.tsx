import { useState } from 'react';
import { Download } from 'lucide-react';
import { contenutoVecchioSito, nomeFileVecchioSito } from './scarica';

// Salva le tre chiavi grezze del vecchio sito (ticket 35); resta dopo la pulizia, le chiavi non si cancellano.
export default function ScaricaVecchioSito() {
  const [errore, setErrore] = useState<string | null>(null);

  const scarica = () => {
    try {
      const testo = contenutoVecchioSito(localStorage);
      const url = URL.createObjectURL(new Blob([testo], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeFileVecchioSito(new Date());
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setErrore(null);
    } catch (e) {
      console.error('[ScaricaVecchioSito] lettura o download fallito', e);
      setErrore('Impossibile leggere i dati salvati nel browser.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Dati del vecchio sito</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-4">
        Scarica in un file JSON i dati salvati dai vecchi moduli in questo browser, così come sono.
        Il download non modifica né cancella nulla.
      </p>
      <button
        onClick={scarica}
        className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Scarica i dati del vecchio sito
      </button>
      {errore && <p role="alert" className="text-red-600 text-sm mt-3">{errore}</p>}
    </div>
  );
}
