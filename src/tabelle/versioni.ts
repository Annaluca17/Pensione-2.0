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
];
