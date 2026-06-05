/**
 * passwebGuide.ts — Costruttore guida operativa "Inserimento pratica su PASSWEB"
 * Immedia S.p.A. — XDESK
 *
 * Modulo puro (no React): dato il RisultatoTFR dello Step 3, restituisce la
 * sequenza di passi da eseguire su PASSWEB. La guida è ADATTIVA: mostra solo i
 * passaggi e i valori pertinenti alla casistica calcolata (mese iniziale/finale
 * PIENO, ≥15gg, <15gg).
 *
 * Formato MISTO: ogni passo ha testo + uno slot immagine opzionale (`imgAlt`),
 * predisposto per allegare in seguito gli screenshot delle schermate reali.
 */

import type { RisultatoTFR } from './logicTFR';

export interface GuidaStep {
  id: string;
  titolo: string;
  /** Paragrafi di testo del passo (mostrati in elenco). */
  paragrafi: string[];
  /**
   * Descrizione della schermata PASSWEB da allegare a questo passo.
   * Quando presente, l'UI mostra uno slot immagine (placeholder finché `img`
   * non è valorizzato). Le immagini verranno caricate successivamente.
   */
  imgAlt?: string;
  /** Percorso/URL dello screenshot, quando disponibile. */
  img?: string;
}

/** Helper di formattazione iniettati dal componente (riuso di eur/fmtDate). */
export interface GuidaFmt {
  eur: (n?: number) => string;
  data: (s: string) => string;
}

export function buildPasswebGuide(r: RisultatoTFR, fmt: GuidaFmt): GuidaStep[] {
  const steps: GuidaStep[] = [];
  const entrambiPieni = r.casoIniziale === 'PIENO' && r.casoFinale === 'PIENO';

  // ── 1. Accesso e ricerca iscritto ─────────────────────────────────────────
  steps.push({
    id: 'accesso',
    titolo: 'Accesso a PASSWEB e ricerca dell’iscritto',
    paragrafi: [
      'Accedere a PASSWEB con le proprie credenziali e selezionare l’Ente di riferimento.',
      'Ricercare l’iscritto tramite Codice Fiscale e aprirne la posizione assicurativa.',
    ],
    imgAlt: 'Schermata di ricerca iscritto per Codice Fiscale',
  });

  // ── 2. Apertura sezione / nuova pratica ───────────────────────────────────
  steps.push({
    id: 'apertura',
    titolo: 'Apertura della sezione “Dati Retributivi utili al TFR”',
    paragrafi: [
      'Dalla posizione assicurativa accedere alla maschera “Inserimento Dati Retributivi utili al TFR”.',
      'Individuare il periodo di riferimento corretto (assunzione → cessazione) su cui operare.',
    ],
    imgAlt: 'Menu di accesso alla maschera Dati Retributivi utili al TFR',
  });

  // ── 3. Inserimento decorrenze (sempre presenti) ───────────────────────────
  steps.push({
    id: 'decorrenze',
    titolo: 'Inserimento delle decorrenze',
    paragrafi: [
      `Decorrenza Giuridica: ${fmt.data(r.decorrenzaGiuridica)}.`,
      `Decorrenza Economica: ${fmt.data(r.decorrenzaEconomica)}.`,
      `Data Cessazione: ${fmt.data(r.dataCessazione)}.`,
      r.casoIniziale === 'PARZIALE_LT15'
        ? 'Attenzione: il mese di assunzione è parziale < 15 giorni, perciò la Decorrenza Economica è posticipata al primo giorno del mese successivo rispetto alla Decorrenza Giuridica.'
        : 'Decorrenza Economica e Giuridica coincidono.',
    ],
    imgAlt: 'Schermata inserimento decorrenze giuridica/economica e data cessazione',
  });

  // ── Caso “tutto pieno”: nessun dato retributivo ───────────────────────────
  if (entrambiPieni) {
    steps.push({
      id: 'nessun-dato',
      titolo: 'Nessun dato retributivo da inserire',
      paragrafi: [
        'Per questo periodo di riferimento i mesi di assunzione e cessazione sono entrambi interi (PIENO).',
        'Non devono essere inseriti Dati Retributivi: proseguire direttamente al controllo e invio.',
      ],
    });
  }

  // ── 4a. Mese iniziale parziale ≥ 15 gg ────────────────────────────────────
  if (r.casoIniziale === 'PARZIALE_GE15') {
    steps.push({
      id: 'mese-iniziale-ge15',
      titolo: 'Dato economico — mese iniziale (rateo 13ª teorica primo anno)',
      paragrafi: [
        'Il primo mese di servizio è parziale ma ≥ 15 giorni: va valorizzato il rateo di 13ª teorica del primo anno.',
        `Valore del rateo mensile da indicare: ${fmt.eur(r.rateoPrimoAnno)}.`,
        'Impostare la Modalità di pagamento su “Parziale”.',
        'Valorizzare il campo “retribuzione valutabile” con il dato esposto su PASSWEB per il primo mese intero.',
      ],
      imgAlt: 'Schermata inserimento rateo 13ª teorica del primo anno con modalità Parziale',
    });
  }

  // ── 5a. Mese finale PIENO (ma non entrambi pieni) ─────────────────────────
  if (r.casoFinale === 'PIENO' && !entrambiPieni) {
    steps.push({
      id: 'mese-finale-pieno',
      titolo: 'Mese finale — nessun dato economico',
      paragrafi: [
        'Il mese di cessazione è intero (PIENO): non è necessario inserire alcun dato economico per il mese finale.',
      ],
    });
  }

  // ── 5b. Mese finale parziale ≥ 15 gg ──────────────────────────────────────
  if (r.casoFinale === 'PARZIALE_GE15') {
    steps.push({
      id: 'mese-finale-ge15',
      titolo: 'Dato economico — mese finale (rateo 13ª teorica cessazione)',
      paragrafi: [
        'Il mese di cessazione è parziale ma ≥ 15 giorni: conta come mese pieno e va valorizzato il rateo di 13ª teorica.',
        `Valore del rateo mensile da indicare: ${fmt.eur(r.rateoCessazione)}.`,
        'Impostare la Modalità di pagamento su “Parziale”.',
        'Usare il valore dell’ultimo mese pieno disponibile su PASSWEB: non sottrarre i giorni non utili.',
      ],
      imgAlt: 'Schermata inserimento rateo 13ª teorica del mese di cessazione con modalità Parziale',
    });
  }

  // ── 5c. Mese finale parziale < 15 gg ──────────────────────────────────────
  if (r.casoFinale === 'PARZIALE_LT15') {
    steps.push({
      id: 'mese-finale-lt15',
      titolo: 'Dato economico — mese finale (< 15 giorni, per cassa)',
      paragrafi: [
        'Il mese di cessazione è parziale < 15 giorni: va valorizzato il campo “Tredicesima ed emolumenti valutabili arretrati per cassa”.',
        `Valore da inserire: ${fmt.eur(r.tredicesimaEmolumentiCassa)}.`,
        'Quota giorno = Tredicesima totale / Giorni lavorati nell’anno; il dato è la quota giorno × (giorni lavorati anno − giorni lavorati ultimo mese), più eventuali emolumenti valutabili arretrati.',
        'Verificare nell’ultimo cedolino la presenza di arretrati utili ai fini TFR da sommare alla quota calcolata.',
      ],
      imgAlt: 'Schermata inserimento Tredicesima ed emolumenti valutabili arretrati per cassa',
    });
  }

  // ── Controllo e invio (sempre) ────────────────────────────────────────────
  steps.push({
    id: 'invio',
    titolo: 'Controllo finale e invio della pratica',
    paragrafi: [
      'Rileggere i valori inseriti confrontandoli con la scheda dello Step 3 (decorrenze, ratei, importi).',
      'Salvare i dati e procedere con l’invio/consolidamento della pratica secondo la procedura PASSWEB.',
    ],
    imgAlt: 'Schermata di riepilogo e invio della pratica',
  });

  return steps;
}
