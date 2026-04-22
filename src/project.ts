/**
 * project.ts — Tipi per la gestione Progetti PASSWEB
 * Immedia S.p.A.
 */

export interface Dipendente {
  id: string;
  nome: string;          // Nome completo (da campo "Nominativo" anagrafica)
  cf: string;
  dataCessazione: string; // ISO 'YYYY-MM-DD'
  savedAt: string;        // ISO timestamp
}

export interface Progetto {
  id: string;
  nomeComune: string;
  createdAt: string;      // ISO timestamp
  dipendenti: Dipendente[];
}

export const LS_KEY = 'xdesk_passweb_progetti_v1';
