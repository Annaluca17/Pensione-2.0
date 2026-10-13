import { useEffect, useState } from 'react';
import { Spazio } from './scrivania/Spazio';
import { filtroDaModulo, idPortale, type FiltroTipo } from './portale/portale';

// Il Portale Strumenti Interni apre il sito con ?modulo=<id> (vecchio o nuovo: sempre la scrivania,
// filtrata) e chiede con ?embed=1 di non ripetere l'intestazione che il portale gia mostra.
const PARAMETRI = new URLSearchParams(window.location.search);
const INCORNICIATO = PARAMETRI.get('embed') === '1';

export default function App() {
  const [tipo, setTipo] = useState<FiltroTipo>(() => filtroDaModulo(PARAMETRI.get('modulo')));

  // Comunica al portale l'id che il sito sta mostrando, cosi puo tenere l'indirizzo allineato.
  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ tipo: 'immedia:modulo', modulo: idPortale(tipo) }, '*');
  }, [tipo]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {!INCORNICIATO && (
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">XDESK - Gestione Enti Locali</h1>
            <p className="text-slate-500 text-sm mt-1">Analisi Ultimo Miglio e Gestione TFS/TFR</p>
          </div>
        </header>
      )}
      <main>
        <Spazio tipo={tipo} onTipo={setTipo} />
      </main>
    </div>
  );
}
