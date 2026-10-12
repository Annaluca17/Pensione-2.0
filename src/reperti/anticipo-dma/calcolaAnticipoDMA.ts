/**
 * REPERTO — copia fedele del calcolo di Anticipo DMA attuale, tempo pieno
 * (src/components/AnticipoDMATempoPieno.tsx) e part-time (src/components/AnticipoDMAPartTime.tsx),
 * e del round2 che usano (src/utils/math.ts), presa per produrre la fotografia del vecchio
 * (ADR 0001, ticket 19).
 *
 * Nei componenti il calcolo sta nel corpo del componente React e legge lo stato (`metadati`,
 * `matrice`); qui è estratto tale e quale in due funzioni pure. Ingressi = ciò che l'operatore
 * inserisce (giorni, voci con importo); le assegnazioni di `updateVoce` (round2 dell'importo,
 * flag ricavati dall'etichetta, % part-time) sono ripetute com'erano. Uscite = i valori mostrati
 * a video. `data_competenza` è solo mostrata e resta fuori.
 *
 * DA CANCELLARE nella pulizia finale (ticket 36), insieme al vecchio modulo; gli importi in
 * fotografia.json restano.
 *
 * Non correggere nulla: descrive cosa fa il vecchio, non cosa è giusto. Isolato: nessun import dal
 * motore, dalle tabelle o dal resto del sito.
 */

// ─── round / round2 (copia di src/utils/math.ts) ───────────────────────────────

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function round2(value: number): number {
  return round(value, 2);
}

// ─── Catalogo voci (copia identica nei due componenti) ─────────────────────────

const VOCI_FLAGS: Record<string, { tfr: boolean; tfs: boolean; tredicesima: boolean }> = {
  'Stipendio tabellare per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Differenziale storico (ex PEO) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Differenziale stipendiale per 13 mensilità (nuova voce CCNL 2019 – 2021)': { tfr: true, tfs: true, tredicesima: true },
  'Assegno ad personam IIS Cat. B e D per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Assegno ad personam riassorbibile progressione verticale per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Salario Individuale di Anzianità (ex R.I.A.) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Retribuzione di posizione per 13 mensilità': { tfr: true, tfs: false, tredicesima: true },
  'Indennità specifica (ex art.4 comma 3 CCNL 16/07/1996) per 12 mensilità 5,38': { tfr: true, tfs: true, tredicesima: false },
  'Indennità di Vacanza Contrattuale (compreso Anticipo IVC) per 13 mensilità': { tfr: true, tfs: true, tredicesima: true },
  'Indennità di Comparto per 12 mensilità': { tfr: false, tfs: false, tredicesima: false },
  'Indennità di vigilanza per 12 mensilità': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Professionale personale asili nido e scolastico €. 55,40 mensili per 12 mensilità ex art. 37 c. 1 lett. c CCNL 1995 (voce 72)': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Aggiuntiva personale asili nido e scolastico €. 28,41 mensili per 12 mensilità ex art. 6 CCNL 2001 (voce 78)': { tfr: true, tfs: true, tredicesima: false },
  'Indennità Tempo potenziato personale scolastico €. 103,28 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 74)': { tfr: false, tfs: false, tredicesima: false },
  'Trattamento accessorio personale asili nido €. 61,97 mensili per 10 mensilità ex art. 37 c. 7 CCNL 2000 (voce 84)': { tfr: false, tfs: false, tredicesima: false },
  'Una Tantum 1,5%': { tfr: false, tfs: false, tredicesima: true }
};

function flagsDi(voce_retributiva: string) {
  const flags = VOCI_FLAGS[voce_retributiva];
  return { flag_tfr: flags.tfr, flag_tfs: flags.tfs, flag_tredicesima: flags.tredicesima };
}

// ─── Tempo pieno (AnticipoDMATempoPieno.tsx) ───────────────────────────────────

export interface IngressiTempoPieno {
  giorni_tredicesima: number;
  giorni_mensili: number;
  voci: Array<{ voce_retributiva: string; importo_mensile: number }>;
}

export interface UsciteTempoPieno {
  totaleMensile: number;
  totale365: number;
  totale26: number;
  tredicesimaCPDEL: number;
  tredicesimaTFS: number;
  tredicesimaTFR: number;
  imponibileCPDEL: number;
  imponibileFondoCredito: number;
  imponibileTFS80: number;
  imponibileTFR80: number;
}

export function calcolaTempoPieno(ingressi: IngressiTempoPieno): UsciteTempoPieno {
  const metadati = { giorni_tredicesima: ingressi.giorni_tredicesima, giorni_mensili: ingressi.giorni_mensili };
  // updateVoce: l'importo passa da round2, i flag dall'etichetta
  const matrice = ingressi.voci.map(v => ({
    ...flagsDi(v.voce_retributiva),
    importo_mensile: round2(v.importo_mensile),
  }));

  const totaleMensile = round2(matrice.reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  // Calcoli — tutti arrotondati a 2 decimali alla sorgente
  const totaleTredicesima = round2(matrice.filter(v => v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFS = round2(matrice.filter(v => v.flag_tfs).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFR = round2(matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const totaleTredicesimaTFS = round2(matrice.filter(v => v.flag_tfs && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTredicesimaTFR = round2(matrice.filter(v => v.flag_tfr && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const totale365 = round2(totaleMensile);
  const totale26 = round2((totaleMensile / 26) * metadati.giorni_mensili);

  const tredicesimaCPDEL = round2((totaleTredicesima / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFS = round2((totaleTredicesimaTFS / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFR = round2((totaleTredicesimaTFR / 365) * metadati.giorni_tredicesima);

  const imponibileCPDEL = round2(totale26 + tredicesimaCPDEL);
  const imponibileFondoCredito = round2(imponibileCPDEL);
  const imponibileTFS80 = round2((((totaleTFS / 26) * metadati.giorni_mensili) + tredicesimaTFS) * 0.80);
  const imponibileTFR80 = round2((((totaleTFR / 26) * metadati.giorni_mensili) + tredicesimaTFR) * 0.80);

  return {
    totaleMensile, totale365, totale26,
    tredicesimaCPDEL, tredicesimaTFS, tredicesimaTFR,
    imponibileCPDEL, imponibileFondoCredito, imponibileTFS80, imponibileTFR80,
  };
}

// ─── Part-time (AnticipoDMAPartTime.tsx) ───────────────────────────────────────

export interface IngressiPartTime {
  giorni_tredicesima: number;
  giorni_mensili: number;
  percentuale_part_time: number;
  voci: Array<{ voce_retributiva: string; valore_intero: number }>;
}

export interface UscitePartTime extends UsciteTempoPieno {
  tfrTabellareTeorico: number;
  tfrRivalutato: number;
}

export function calcolaPartTime(ingressi: IngressiPartTime): UscitePartTime {
  const metadati = {
    giorni_tredicesima: ingressi.giorni_tredicesima,
    giorni_mensili: ingressi.giorni_mensili,
    percentuale_part_time: ingressi.percentuale_part_time,
  };
  // updateVoce / useEffect: valore intero da round2, importo = round2(intero × %)
  const matrice = ingressi.voci.map(v => {
    const valore_intero = round2(v.valore_intero);
    return {
      ...flagsDi(v.voce_retributiva),
      valore_intero,
      importo_mensile: round2(valore_intero * (metadati.percentuale_part_time / 100)),
    };
  });

  const totaleMensile = round2(matrice.reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  // Calcoli — tutti arrotondati a 2 decimali alla sorgente
  const totaleTredicesima = round2(matrice.filter(v => v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFS = round2(matrice.filter(v => v.flag_tfs).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTFR = round2(matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const totaleTredicesimaTFS = round2(matrice.filter(v => v.flag_tfs && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));
  const totaleTredicesimaTFR = round2(matrice.filter(v => v.flag_tfr && v.flag_tredicesima).reduce((acc, curr) => acc + (curr.importo_mensile || 0), 0));

  const tredicesimaCPDEL = round2((totaleTredicesima / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFS = round2((totaleTredicesimaTFS / 365) * metadati.giorni_tredicesima);
  const tredicesimaTFR = round2((totaleTredicesimaTFR / 365) * metadati.giorni_tredicesima);

  const totale365 = round2(totaleMensile);
  const totale26 = round2((totaleMensile / 26) * metadati.giorni_mensili);

  const imponibileCPDEL = round2(((totaleMensile / 26) * metadati.giorni_mensili) + tredicesimaCPDEL);
  const imponibileFondoCredito = round2(imponibileCPDEL);
  const imponibileTFS80 = round2((((totaleTFS / 26) * metadati.giorni_mensili) + tredicesimaTFS) * 0.80);
  const imponibileTFR80 = round2((((totaleTFR / 26) * metadati.giorni_mensili) + tredicesimaTFR) * 0.80);

  const totaleTFRIntero = round2(matrice.filter(v => v.flag_tfr).reduce((acc, curr) => acc + (curr.valore_intero || 0), 0));
  const tfrTabellareTeorico = round2(totaleTFRIntero * (metadati.percentuale_part_time / 100));
  const tfrRivalutato = round2((imponibileTFR80 / 80) * 100);

  return {
    totaleMensile, totale365, totale26,
    tredicesimaCPDEL, tredicesimaTFS, tredicesimaTFR,
    imponibileCPDEL, imponibileFondoCredito, imponibileTFS80, imponibileTFR80,
    tfrTabellareTeorico, tfrRivalutato,
  };
}
