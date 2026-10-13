// Registro versioni delle tabelle, tenuto a mano (T7): una riga per modifica, con id `aaaa-mm-gg.n`,
// il motivo (è il titolo della causa in scrivania quando una pratica torna da rilavorare), i file
// toccati e l'impronta del contenuto dopo la modifica. versioni.test.ts fallisce se il contenuto
// cambia senza una riga nuova: aggiungere la riga in fondo, con l'impronta che il test indica
// (`versione` in index.ts segue l'ultima riga).

export interface VersioneTabelle {
  id: string;
  motivo: string;
  file: readonly string[];
  impronta: string;
}

export const versioni: readonly VersioneTabelle[] = [
  {
    id: '2026-10-11.1',
    motivo: 'Prima versione: CCNL 2019-21 e 2022-24, Ipotesi 2025-27, trasposizione, catalogo voci e righe del TFR',
    file: [
      'ccnl-2019-21.ts',
      'ccnl-2022-24.ts',
      'ccnl-2025-27.ts',
      'trasposizione.ts',
      'differenziali-art14.ts',
      'catalogo.ts',
      'righe-tfr.ts',
      'parametri.ts',
      'lettere.ts',
    ],
    impronta: '03e80529ee546e',
  },
  {
    id: '2026-10-12.1',
    motivo: 'Mappe voce → riga PASSWEB per pensione, TFS (9 righe) e DMA previste; nessun importo cambiato',
    file: ['righe-passweb.ts', 'index.ts'],
    impronta: '14248a02a28e21',
  },
  {
    id: '2026-10-12.2',
    motivo: 'Parametro limite delle DMA previste (6, D12); nessun importo cambiato',
    file: ['parametri.ts'],
    impronta: '09206ca56c226b',
  },
  {
    id: '2026-10-12.3',
    motivo: 'Oggetto e riferimento normativo della lettera del miglioramento contrattuale; nessun importo cambiato',
    file: ['lettere.ts', 'index.ts'],
    impronta: '0d40ab497aca36',
  },
  {
    id: '2026-10-13.1',
    motivo: 'IVC 2019-21 per posizione (RGS: 0,42% apr-giu 2019, 0,70% dal 07/2019); applicato il CCNL 2019-21 vale 0, nessun importo calcolato cambia',
    file: ['ccnl-2019-21.ts'],
    impronta: '09eca845b0e444',
  },
];
