/**
 * projectTFR.ts — Modello dati del sotto-programma "Calcolo Ultimo Miglio TFR"
 * Immedia S.p.A. — XDESK
 *
 * Chiave localStorage distinta da quella PASSWEB (xdesk_passweb_progetti_v1)
 * per evitare collisioni tra i due archivi progetti.
 */

import type { RisultatoTFR } from '../components/tfr/logicTFR';

export const LS_KEY_TFR = 'xdesk_tfr_progetti_v1';

/** Chiave archivio bozze di lavorazione (checklist persistita per (progetto + CF)). */
export const LS_KEY_TFR_BOZZE = 'xdesk_tfr_bozze_v1';

export interface ChecklistTFR {
  dateEsatte: boolean;                // 1. Verifica delle date esatte (incl. non accavallamento con altri Enti)
  tipoImpiego: boolean;               // 2. Verifica tipo impiego esatto
  codiceCessazione: boolean;          // 3. Verifica codice cessazione
  assenzaVuotiContributivi: boolean;  // 4. Verifica assenza vuoti contributivi
  congruitaImponibili: boolean;       // 5. Verifica congruità imponibili tra i mesi
  interoPeriodoTFR: boolean;          // 6. Verifica se intero periodo TFR
}

export interface DipendenteTFR {
  id: string;
  cf: string;
  cognome: string;
  nome: string;
  dataAssunzione: string;   // ISO 'YYYY-MM-DD'
  dataCessazione: string;   // ISO 'YYYY-MM-DD'
  checklist: ChecklistTFR;  // stato avanzamento persistito
  risultato?: RisultatoTFR; // popolato dopo lo Step 3 (vedi logicTFR.ts)
  savedAt: string;
}

export interface ProgettoTFR {
  id: string;
  nomeComune: string;
  createdAt: string;
  dipendenti: DipendenteTFR[];
}

/** Checklist vuota di default. */
export const emptyChecklist = (): ChecklistTFR => ({
  dateEsatte: false,
  tipoImpiego: false,
  codiceCessazione: false,
  assenzaVuotiContributivi: false,
  congruitaImponibili: false,
  interoPeriodoTFR: false,
});

/**
 * Contenuto della scheda informativa (popup "i") di una voce di verifica.
 * Spiega COSA controllare, COME farlo e DOVE trovarlo su PASSWEB.
 */
export interface VoceInfo {
  cosa: string;   // Cosa si deve controllare
  come: string;   // Come effettuare la verifica
  dove: string;   // Percorso/schermata PASSWEB dove reperire il dato
}

export interface VoceChecklist {
  key: keyof ChecklistTFR;
  label: string;
  info: VoceInfo;
}

/** Voci della checklist con etichetta, nell'ordine di lavorazione indicato. */
export const CHECKLIST_VOCI: VoceChecklist[] = [
  {
    key: 'dateEsatte',
    label: 'Verifica delle date esatte',
    info: {
      cosa: 'Verificare che le date di assunzione e cessazione presenti in PASSWEB coincidano con i dati prodotti dall’Ente. Verificare inoltre che non si accavallino date di assunzione e cessazione con altri Enti.',
      come: 'Una volta in Esecutore, selezionare l’Ente interessato e verificare le date, confrontandole anche con i periodi degli altri Enti per escludere sovrapposizioni.',
      dove: 'Interrogazioni → Lista rapporti di lavoro → Lista per Tipo impiego ed Iscrizione → selezionare l’Ente interessato.',
    },
  },
  {
    key: 'tipoImpiego',
    label: 'Verifica tipo impiego esatto',
    info: {
      cosa: 'Verificare che il tipo impiego (tempo indeterminato, determinato, parziale, ecc.) sia congruo con i dati forniti dall’Ente.',
      come: 'Consultare il rapporto di lavoro e controllare il tipo impiego rispetto a quanto comunicato dall’Ente.',
      dove: 'Interrogazioni → Lista rapporti di lavoro → Lista per Tipo impiego ed Iscrizione → selezionare l’Ente interessato.',
    },
  },
  {
    key: 'codiceCessazione',
    label: 'Verifica codice cessazione',
    info: {
      cosa: 'Controllare se è presente il codice cessazione. Spesso, in caso di contratto a tempo determinato, verificare la presenza del codice 18 (fine incarico).',
      come: 'Consultare il rapporto di lavoro e individuare il codice cessazione associato.',
      dove: 'Interrogazioni → Lista rapporti di lavoro → Lista per Tipo impiego ed Iscrizione.',
    },
  },
  {
    key: 'assenzaVuotiContributivi',
    label: 'Verifica assenza vuoti contributivi',
    info: {
      cosa: 'Verificare che non ci siano vuoti contributivi, controllando ogni anno e ogni mese e aprendo il dettaglio per ogni anno di servizio.',
      come: 'Aprire il dettaglio di ciascun anno di servizio. Consiglio: se in «Tipo impiego ed Iscrizione» è presente un periodo ininterrotto, non saranno presenti interruzioni contributive.',
      dove: 'Interrogazioni → Lista rapporti di lavoro → Lista per anno e retribuzione.',
    },
  },
  {
    key: 'congruitaImponibili',
    label: 'Verifica congruità imponibili tra i mesi',
    info: {
      cosa: 'Verificare che gli imponibili siano congrui al rapporto di lavoro e tra i mesi precedenti e successivi, per individuare eventuali errori da sistemare.',
      come: 'Confrontare gli imponibili tra i mesi. Consiglio: verificare che siano presenti Inadel e Credito.',
      dove: 'Interrogazioni → Lista rapporti di lavoro → Lista per anno e retribuzione.',
    },
  },
  {
    key: 'interoPeriodoTFR',
    label: 'Verifica se intero periodo TFR',
    info: {
      cosa: 'Verificare l’assoggettamento al solo TFR per l’intero periodo e che non vi siano periodi assoggettati a TFS.',
      come: 'Consiglio: è facilmente osservabile nella «Lista per anno e retribuzione».',
      dove: 'Interrogazioni → Lista Rapporti di Lavoro → Lista periodi per regime previdenziale.',
    },
  },
];

/**
 * Avviso operativo valido per tutte le verifiche della checklist.
 * Mostrato nello Step 2 e in calce a ogni scheda informativa.
 */
export const AVVISO_VERIFICHE =
  'In caso di messaggi di errore, fare uno screenshot o salvare il messaggio e comunicarlo al Responsabile di Area. ' +
  'In caso di incongruenze, interrompere l’inserimento TFR e valutare interventi SCAD e/o flussi a variazione con la Responsabile di Area.';

/** True se tutte le 7 voci della checklist sono flaggate. */
export const checklistCompleta = (c: ChecklistTFR): boolean =>
  CHECKLIST_VOCI.every(({ key }) => c[key]);
