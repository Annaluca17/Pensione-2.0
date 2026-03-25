import React, { useState } from 'react';
import { Calculator, UserMinus, UserCheck, FileText, ArrowLeft, Upload, Clock } from 'lucide-react';
import UltimoMiglioTFSPensione from './components/UltimoMiglioTFSPensione';
import AnticipoDMA from './components/AnticipoDMA';

type ServiceType = 'pensione' | 'tfs_pensione' | 'tfs_servizio' | 'lettere' | 'anticipo_dma' | null;

export default function App() {
  const [activeService, setActiveService] = useState<ServiceType>(null);

  const getServiceTitle = (service: ServiceType) => {
    switch (service) {
      case 'pensione': return 'Calcolo Ultimo Miglio Pensione';
      case 'tfs_pensione': return 'Ultimo miglio TFS Personale in Pensione';
      case 'tfs_servizio': return 'Ultimo miglio TFS In Servizio';
      case 'lettere': return 'Modelli Lettere';
      case 'anticipo_dma': return 'Anticipo DMA';
      default: return '';
    }
  };

  const renderServiceSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
      <ServiceCard
        title="Calcolo Ultimo Miglio Pensione"
        description="Analisi e calcolo per il trattamento pensionistico."
        icon={<Calculator className="w-8 h-8 text-blue-600" />}
        onClick={() => setActiveService('pensione')}
      />
      <ServiceCard
        title="Ultimo miglio TFS Personale in Pensione"
        description="Gestione TFS per personale già in quiescenza."
        icon={<UserMinus className="w-8 h-8 text-blue-600" />}
        onClick={() => setActiveService('tfs_pensione')}
      />
      <ServiceCard
        title="Ultimo miglio TFS In Servizio"
        description="Gestione TFS per personale attualmente in servizio."
        icon={<UserCheck className="w-8 h-8 text-blue-600" />}
        onClick={() => setActiveService('tfs_servizio')}
      />
      <ServiceCard
        title="Modelli Lettere"
        description="Generazione e gestione della modulistica e lettere."
        icon={<FileText className="w-8 h-8 text-blue-600" />}
        onClick={() => setActiveService('lettere')}
      />
      <ServiceCard
        title="Anticipo DMA"
        description="Gestione Anticipo DMA per Dipendente Tempo Pieno e Part Time/TFR."
        icon={<Clock className="w-8 h-8 text-blue-600" />}
        onClick={() => setActiveService('anticipo_dma')}
      />
    </div>
  );

  const renderActiveService = () => {
    if (activeService === 'tfs_pensione') {
      return (
        <div className="relative">
          <button
            onClick={() => setActiveService(null)}
            className="absolute top-4 left-4 z-10 flex items-center text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors bg-slate-800 px-3 py-1.5 rounded-md"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla selezione
          </button>
          <UltimoMiglioTFSPensione />
        </div>
      );
    }

    if (activeService === 'anticipo_dma') {
      return (
        <div className="relative">
          <button
            onClick={() => setActiveService(null)}
            className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla selezione
          </button>
          <AnticipoDMA />
        </div>
      );
    }

    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mt-8 max-w-4xl mx-auto">
        <button
          onClick={() => setActiveService(null)}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla selezione
        </button>
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">
          {getServiceTitle(activeService)}
        </h2>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center bg-slate-50">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 font-medium text-lg">Area di caricamento dati</p>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            In questa sezione verranno implementati i campi di input e le logiche di calcolo attualmente presenti nei file Excel.
          </p>
          <button className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Carica file Excel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {!activeService && (
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">XDESK - Gestione Enti Locali</h1>
            <p className="text-slate-500 text-sm mt-1">Analisi Ultimo Miglio e Gestione TFS/TFR</p>
          </div>
        </header>
      )}
      <main className={!activeService ? "max-w-6xl mx-auto px-8 py-8" : ""}>
        {!activeService ? renderServiceSelection() : renderActiveService()}
      </main>
    </div>
  );
}

function ServiceCard({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
    >
      <div className="p-3 bg-blue-50 rounded-lg mb-4 group-hover:bg-blue-100 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </button>
  );
}
