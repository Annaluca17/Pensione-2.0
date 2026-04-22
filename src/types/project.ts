export interface Dipendente {
  id: string;
  nome: string;
  cf: string;
  dataCessazione: string;
  savedAt: string;
}

export interface Progetto {
  id: string;
  nomeComune: string;
  createdAt: string;
  dipendenti: Dipendente[];
}

export const LS_KEY = 'xdesk_passweb_progetti_v1';
