/**
 * passwebGuide.ts — Costruttore guida operativa "Inserimento pratica su PASSWEB"
 * Immedia S.p.A. — XDESK
 *
 * Modulo puro (no React): dato il RisultatoTFR dello Step 3, restituisce la
 * sequenza dei passi da eseguire su PASSWEB per inserire e certificare la
 * pratica. La procedura è fissa (11 passi); l'ADATTIVITÀ per casistica
 * (mese iniziale/finale PIENO, ≥15gg, <15gg) si applica ai passi "Decorrenze"
 * e "Dati retributivi", dove i valori e le note cambiano in base al calcolo.
 *
 * Formato MISTO: ogni passo ha testo + uno slot immagine opzionale (`img`),
 * con nome file stabile sotto /guida-passweb/. Finché il file non è presente
 * l'UI mostra un segnaposto (vedi GuidaImg in WizardTFR).
 */

import type { RisultatoTFR } from './logicTFR';

export interface GuidaStep {
  id: string;
  titolo: string;
  /** Paragrafi di testo del passo (mostrati in elenco). */
  paragrafi: string[];
  /** Descrizione della schermata (alt text + testo del segnaposto). */
  imgAlt?: string;
  /**
   * Percorso dello screenshot sotto /guida-passweb/. Se il file non esiste
   * ancora, l'UI mostra automaticamente il segnaposto (onError → fallback).
   */
  img?: string;
}

/** Helper di formattazione iniettati dal componente (riuso di eur/fmtDate). */
export interface GuidaFmt {
  eur: (n?: number) => string;
  data: (s: string) => string;
}

const IMG = (file: string) => `/guida-passweb/${file}`;

export function buildPasswebGuide(r: RisultatoTFR, fmt: GuidaFmt): GuidaStep[] {
  const entrambiPieni = r.casoIniziale === 'PIENO' && r.casoFinale === 'PIENO';

  // ── Decorrenze (adattivo) ──────────────────────────────────────────────────
  const decorrenze: string[] = [
    `Decorrenza Giuridica: ${fmt.data(r.decorrenzaGiuridica)}.`,
    `Decorrenza Economica: ${fmt.data(r.decorrenzaEconomica)}.`,
    `Data Cessazione: ${fmt.data(r.dataCessazione)}.`,
    r.casoIniziale === 'PARZIALE_LT15'
      ? 'Attenzione: il mese di assunzione è parziale < 15 giorni, perciò la Decorrenza Economica è posticipata al primo giorno del mese successivo rispetto alla Decorrenza Giuridica.'
      : 'Decorrenza Economica e Giuridica coincidono.',
  ];

  // ── Dati retributivi (adattivo) ─────────────────────────────────────────────
  const datiRetributivi: string[] = [];
  if (entrambiPieni) {
    datiRetributivi.push(
      'Mesi di assunzione e cessazione entrambi interi (PIENO): non devono essere inseriti Dati Retributivi per questo periodo.',
    );
  } else {
    if (r.casoIniziale === 'PARZIALE_GE15') {
      datiRetributivi.push(
        `Mese iniziale (≥ 15 gg): rateo di 13ª teorica del primo anno = ${fmt.eur(r.rateoPrimoAnno)}, Modalità di pagamento "Parziale".`,
        'Valorizzare il campo "retribuzione valutabile" con il dato esposto su PASSWEB per il primo mese intero.',
      );
    }
    if (r.casoFinale === 'PIENO') {
      datiRetributivi.push('Mese finale intero (PIENO): nessun dato economico da inserire per il mese di cessazione.');
    } else if (r.casoFinale === 'PARZIALE_GE15') {
      datiRetributivi.push(
        `Mese finale (≥ 15 gg): rateo di 13ª teorica del mese di cessazione = ${fmt.eur(r.rateoCessazione)}, Modalità di pagamento "Parziale".`,
        'Usare il valore dell’ultimo mese pieno disponibile su PASSWEB: non sottrarre i giorni non utili.',
      );
    } else if (r.casoFinale === 'PARZIALE_LT15') {
      datiRetributivi.push(
        `Mese finale (< 15 gg): "Tredicesima ed emolumenti valutabili arretrati per cassa" = ${fmt.eur(r.tredicesimaEmolumentiCassa)}.`,
        'Quota giorno = Tredicesima totale / Giorni lavorati anno; dato = quota giorno × (giorni lavorati anno − giorni lavorati ultimo mese) + eventuali emolumenti valutabili arretrati.',
      );
    }
  }

  // ── Sequenza dei 11 passi ───────────────────────────────────────────────────
  return [
    {
      id: 'presa-in-carico',
      titolo: 'Presa in carico e selezione del dipendente',
      paragrafi: [
        'Dopo aver preso in carico il dipendente da PASSWEB (opzione "Nuova", Ricerca Iscritto), andare in Esecutore.',
        'Selezionare il dipendente su cui operare.',
      ],
      imgAlt: 'Ricerca iscritto ed Esecutore con selezione del dipendente',
      img: IMG('step01.png'),
    },
    {
      id: 'dati-comuni',
      titolo: 'Inserimento dati comuni (prescrizione TFR)',
      paragrafi: [
        'Andare in Interrogazioni → Lista dati integrativi.',
        'Funzioni → Inserisci dati comuni.',
        'Tipo prescrizione: TFR; Data validità = data odierna; Data riferimento = data cessazione (' + fmt.data(r.dataCessazione) + ').',
        'Salvare il dato.',
      ],
      imgAlt: 'Inserimento dati comuni con tipo prescrizione TFR',
      img: IMG('step02.png'),
    },
    {
      id: 'periodo-riferimento',
      titolo: 'Dati utili ai fini TFR — periodo di riferimento',
      paragrafi: [
        'Accedere a "Dati utili ai fini TFR".',
        'Inserire il periodo di riferimento corretto (assunzione e cessazione) su cui operare.',
        `Periodo: ${fmt.data(r.decorrenzaGiuridica)} → ${fmt.data(r.dataCessazione)}.`,
      ],
      imgAlt: 'Inserimento del periodo di riferimento (assunzione e cessazione)',
      img: IMG('step03.png'),
    },
    {
      id: 'decorrenze',
      titolo: 'Inserimento delle decorrenze',
      paragrafi: decorrenze,
      imgAlt: 'Inserimento decorrenze giuridica/economica e data cessazione',
      img: IMG('step04.png'),
    },
    {
      id: 'dati-retributivi',
      titolo: 'Dati retributivi',
      paragrafi: datiRetributivi,
      imgAlt: 'Inserimento dati retributivi utili al TFR',
      img: IMG('step05.png'),
    },
    {
      id: 'fine-lavorazione',
      titolo: 'Fine lavorazione',
      paragrafi: [
        'Andare su Funzioni → Lista richieste.',
        'Flag e Fine lavorazione → Fine lavorazione.',
      ],
      imgAlt: 'Lista richieste con flag e fine lavorazione',
      img: IMG('step06.png'),
    },
    {
      id: 'validatore',
      titolo: 'Validatore — accesso alla lista dati integrativi',
      paragrafi: [
        'Tornare alla scrivania virtuale e andare in Validatore.',
        'Selezionare il lavoratore e attivare il Flag.',
        'In alto: Interrogazioni → Lista dati integrativi.',
      ],
      imgAlt: 'Validatore: selezione lavoratore e lista dati integrativi',
      img: IMG('step07.png'),
    },
    {
      id: 'certificazione-tfr',
      titolo: 'Certificazione "Dati utili ai fini TFR"',
      paragrafi: [
        'Accedere a "Dati utili ai fini TFR".',
        'Cliccare sulla "C" di certificazione.',
      ],
      imgAlt: 'Certificazione Dati utili ai fini TFR (pulsante C)',
      img: IMG('step08.png'),
    },
    {
      id: 'certificazione-retributivi',
      titolo: 'Certificazione "Dati retributivi utili al TFR"',
      paragrafi: [
        'Ripetere la certificazione per "Dati retributivi utili al TFR" (cliccare sulla "C").',
      ],
      imgAlt: 'Certificazione Dati retributivi utili al TFR (pulsante C)',
      img: IMG('step09.png'),
    },
    {
      id: 'verifica-certificazioni',
      titolo: 'Verifica delle certificazioni',
      paragrafi: [
        'In alto: Funzioni → Lista richieste.',
        'Verificare che entrambi i blocchi risultino certificati.',
      ],
      imgAlt: 'Lista richieste: verifica di entrambe le certificazioni',
      img: IMG('step10.png'),
    },
    {
      id: 'approvazione',
      titolo: 'Approvazione finale',
      paragrafi: [
        'Attivare il flag.',
        'Funzioni → Approva → Ok.',
      ],
      imgAlt: 'Approvazione finale della pratica',
      img: IMG('step11.png'),
    },
  ];
}
