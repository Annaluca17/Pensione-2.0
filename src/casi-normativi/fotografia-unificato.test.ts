// Ticket 23 e 25: l'UM pensione e l'UM TFS (resTFS) del nuovo motore confrontati con la fotografia del
// vecchio Unificato (ticket 19; glossario: Fotografia del vecchio, Differenza attesa). Solo la parte di base:
// il miglioramento contrattuale (pensioneMC, tfsMC) è del ticket 27. Legge solo i dati congelati, non il reperto: resta
// dopo la pulizia (ticket 36, che sposterà fotografia.json e questo import).
// Passa se le righe non elencate valgono come il vecchio (±1 centesimo, D17) e se ogni riga elencata vale
// il nuovo importo, giustificato da decisione e fonte.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {DatiPraticaPensione, MeseISO, Tfs, UmPensione, VociMese} from '../motore';
import fotografia from '../reperti/unificato/fotografia.json';
import {tabelle} from '../tabelle';

/**
 * Adattatore confermato dall'utente (ticket 23): il vecchio non ha posizione senza miglioramento
 * contrattuale. `base-senza-mc` → C4 (01 = Tab. B col. 2 istruttori, 02 = 146,52 = differenziale di C4);
 * negli altri due la posizione del miglioramento (mcPos). La 02 è quella che il vecchio usa davvero:
 * con "PEO in base" 110,83 al posto della 100,00 digitata.
 */
const adattatore: Record<string, {posizione: string; voce02?: number; ivc2023?: number}> = {
  'base-senza-mc': {posizione: 'C4'},
  // ivc2023: IVC_TABLE_2023 del vecchio per la posizione del miglioramento (reperto calcolaUnificato.ts).
  'mc-finestra-2023-2024': {posizione: 'C3', ivc2023: 936},
  'mc-solo-pensione': {posizione: 'B4', voce02: 11083, ivc2023: 849},
};

const centesimi = (euro: number) => Math.round(euro * 100);

type Caso = (typeof fotografia.casi)[number];

/**
 * Adattatore del ticket 25: `stips`/`exc` (01 per mese) e `ivcOvr` (09 per mese) del vecchio diventano
 * eccezioni di mese nelle voci. Il vecchio dà a ogni mese l'IVC `ivcOvr[i]` se digitata, altrimenti la
 * tabella 2023 della posizione del miglioramento nel 2023, altrimenti la 09 dal 2024, altrimenti 0:
 * si scrive un'eccezione solo dove l'IVC del mese differisce da quella di base.
 */
function eccezioni(caso: Caso): Partial<Record<MeseISO, VociMese>> {
  const [anno, mese] = caso.ingressi.dataCessazione.split('-').map(Number);
  const imp: Record<string, string> = caso.ingressi.imp;
  const base09 = centesimi(parseFloat(imp['09'] ?? '0') || 0);
  const out: Partial<Record<MeseISO, VociMese>> = {};
  for (let i = 0; i < 12; i++) {
    const t = anno * 12 + (mese - 1) - (11 - i);
    const [a, m] = [Math.floor(t / 12), (t % 12) + 1];
    const digitata = caso.ingressi.ivcOvr[i];
    const ivc =
      digitata !== ''
        ? centesimi(parseFloat(digitata) || 0)
        : caso.ingressi.mcPos && a === 2023
          ? adattatore[caso.id].ivc2023!
          : a >= 2024
            ? base09
            : 0;
    const voci: VociMese = {};
    if (caso.ingressi.exc[i]) voci['01'] = centesimi(parseFloat(caso.ingressi.stips[i]) || 0);
    if (ivc !== base09) voci['09'] = ivc;
    if (Object.keys(voci).length > 0) out[`${a}-${String(m).padStart(2, '0')}`] = voci;
  }
  return out;
}

function dati(caso: Caso): DatiPraticaPensione {
  const {posizione, voce02} = adattatore[caso.id];
  const voci: VociMese = {};
  for (const [voce, valore] of Object.entries(caso.ingressi.imp)) {
    const importo = centesimi(parseFloat(valore) || 0);
    if (importo !== 0) voci[voce] = importo;
  }
  if (voce02 !== undefined) voci['02'] = voce02;
  return {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione, cessazione: caso.ingressi.dataCessazione},
    voci: {base: voci, eccezioni: eccezioni(caso)},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
    regime: 'TFS',
    situazione: {tipo: 'ordinaria'},
  };
}

/** Le righe del vecchio (per voce, 13ª, totale annui) e il loro valore nel nuovo; 0 = riga assente. */
function righe(um: UmPensione): Record<string, number> {
  const out: Record<string, number> = {tredicesima: um.tredicesima.composizione.arrotondato, totaleAnnui: um.totaleAnnui};
  for (const r of um.righe) out[r.voce] = r.composizione.arrotondato;
  return out;
}

interface DifferenzaAttesa {
  caso: string;
  /** Codice voce, `tredicesima` o `totaleAnnui`. */
  riga: string;
  /** Importo del nuovo in centesimi; `null` = la riga non c'è più. */
  nuovo: number | null;
  decisione: string;
  fonte: string;
}

const IVC_RIASSORBITA =
  'D8, T6: si applica l\'ultimo contratto definitivo (CCNL 2022-24, firmato il 23/02/2026) e le IVC che lo anticipano valgono 0; il vecchio sommava la 09 digitata (IVC contata due volte)';
const FONTE_IVC = 'CCNL Funzioni Locali 2022-24 art. 56; casi normativi PT-N09 (IVC 2023 nel 2024)';

const differenzeAttese: DifferenzaAttesa[] = [
  {
    caso: 'base-senza-mc',
    riga: '09',
    nuovo: 23136, // IVC 2025 1% istruttori 19,28 × 12
    decisione: 'D8: IVC presa dalla tabella (19,28, contratto successivo non definitivo), non la 13,41 digitata; avviso ivc-incompatibile',
    fonte: 'Ipotesi CCNL 2025-27 art. 35 c. 3; IVC 2025 RGS; caso normativo PT-N10',
  },
  {
    caso: 'base-senza-mc',
    riga: 'tredicesima',
    nuovo: 266403, // 2.658,16 − 13,41 + 19,28
    decisione: 'D8: la 13ª prende l\'IVC della tabella come la riga 09',
    fonte: 'Ipotesi CCNL 2025-27 art. 35 c. 3; caso normativo PT-N10',
  },
  {
    caso: 'base-senza-mc',
    riga: 'totaleAnnui',
    nuovo: 3418332, // 34.112,88 − 160,92 + 231,36
    decisione: 'D17: somma delle righe, segue la riga 09',
    fonte: 'D17',
  },
  {caso: 'mc-finestra-2023-2024', riga: '09', nuovo: null, decisione: IVC_RIASSORBITA, fonte: FONTE_IVC},
  {
    caso: 'mc-finestra-2023-2024',
    riga: 'tredicesima',
    nuovo: 195500, // 1.968,20 − 13,20
    decisione: IVC_RIASSORBITA,
    fonte: FONTE_IVC,
  },
  {
    caso: 'mc-finestra-2023-2024',
    riga: 'totaleAnnui',
    nuovo: 2400960, // 24.168,00 − 158,40
    decisione: 'D17: somma delle righe, segue la riga 09',
    fonte: 'D17',
  },
  {caso: 'mc-solo-pensione', riga: '09', nuovo: null, decisione: IVC_RIASSORBITA, fonte: FONTE_IVC},
  {
    caso: 'mc-solo-pensione',
    riga: 'tredicesima',
    nuovo: 178083, // 1.792,83 − 12,00
    decisione: IVC_RIASSORBITA,
    fonte: FONTE_IVC,
  },
  {
    caso: 'mc-solo-pensione',
    riga: 'totaleAnnui',
    nuovo: 2177544, // 21.919,44 − 144,00
    decisione: 'D17: somma delle righe, segue la riga 09',
    fonte: 'D17',
  },
];

describe('fotografia Unificato: UM pensione del nuovo = vecchio ±1 centesimo, salvo differenze attese', () => {
  for (const caso of fotografia.casi) {
    it(caso.id, () => {
      const sezione = calcolaPratica(dati(caso), tabelle).sezioni.umPensione;
      if (sezione?.esito !== 'calcolata') throw new Error(`UM pensione non calcolata: ${JSON.stringify(sezione)}`);
      const nuovo = righe(sezione);
      const vecchio: Record<string, number> = {
        tredicesima: centesimi(caso.uscite.pensione.t),
        totaleAnnui: centesimi(caso.uscite.pensione.a),
      };
      for (const v of caso.uscite.pensione.voci) vecchio[v.id] = centesimi(v.a);

      for (const riga of new Set([...Object.keys(vecchio), ...Object.keys(nuovo)])) {
        const attesa = differenzeAttese.find((d) => d.caso === caso.id && d.riga === riga);
        if (attesa) {
          expect(nuovo[riga] ?? null, `${riga}: ${attesa.decisione}`).toBe(attesa.nuovo);
          expect(attesa.fonte).not.toBe('');
        } else {
          expect(Math.abs((nuovo[riga] ?? 0) - (vecchio[riga] ?? 0)), `${riga}: nuovo ${nuovo[riga]}, vecchio ${vecchio[riga]}`).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  it('ogni differenza attesa riguarda un caso della fotografia', () => {
    const casi = new Set(fotografia.casi.map((c) => c.id));
    for (const d of differenzeAttese) expect(casi.has(d.caso), d.caso).toBe(true);
  });
});

// --- UM TFS (ticket 25) ---------------------------------------------------------------------------------

/** Chiavi del vecchio (resTFS) e riga del nuovo. */
const righeTfs: [string, string][] = [
  ['tabG', 'tab-e'],
  ['ria', 'ria'],
  ['tred', 'tredicesima'],
  ['assAss', 'assegno-assorbibile'],
  ['asili', 'asili'],
  ['assNonRiass', 'assegno-non-riassorbibile'],
  ['ind64', 'indennita-64-56'],
  ['vig', 'vigilanza'],
  ['diff', 'differenziali'],
  ['tot', 'totale'],
];

const valoriTfs = (t: Tfs): Record<string, number> => ({
  ...Object.fromEntries(t.righe.map((r) => [r.id, r.composizione.arrotondato])),
  totale: t.totale,
});

const IVC_TABELLA =
  "D8, T6: la IVC si prende dalla tabella mese per mese e le IVC che anticipano l'ultimo contratto definitivo valgono 0; il vecchio sommava la 09 digitata (o la tabella 2023 della posizione del miglioramento)";
const TRED_SIGMA12 =
  "D20, D3: 13ª = Σ 12 mesi / 12 delle voci con 13ª, IVC compresa, un solo arrotondamento; il vecchio prendeva l'IVC dell'ultimo mese e arrotondava ogni rateo (r2)";
const FONTE_TFS = 'Circ. INPS 125/2022 §3.2; D3, D20 (ticket 06 del rifacimento); casi normativi PT-N03, PT-N09, PT-N10';

const differenzeAtteseTfs: DifferenzaAttesa[] = [
  // base-senza-mc: IVC 2025 di tabella 19,28 al posto della 13,41 digitata (annualizzato: mese di fine TFS × 12).
  {caso: 'base-senza-mc', riga: 'tab-e', nuovo: 2337012, decisione: `${IVC_TABELLA}; 12 × 1.928,23 + 12 × 19,28`, fonte: FONTE_TFS},
  {caso: 'base-senza-mc', riga: 'tredicesima', nuovo: 216403, decisione: `${TRED_SIGMA12}; 1.928,23 + 146,52 + 30,00 + 40,00 + 19,28`, fonte: FONTE_TFS},
  {caso: 'base-senza-mc', riga: 'totale', nuovo: 2979775, decisione: 'D17: somma delle righe, segue tab-e e 13ª (+70,44 e +5,82)', fonte: 'D17'},
  // mc-finestra-2023-2024: IVC tutte a 0 (CCNL 2022-24 applicato).
  {caso: 'mc-finestra-2023-2024', riga: 'tab-e', nuovo: 2215000, decisione: `${IVC_TABELLA}; 1.800,00 + 11 × 1.850,00, nessuna IVC`, fonte: FONTE_TFS},
  {caso: 'mc-finestra-2023-2024', riga: 'tredicesima', nuovo: 195083, decisione: `${TRED_SIGMA12}; (22.150,00 + 12 × 80,00 + 12 × 25,00) / 12`, fonte: FONTE_TFS},
  {caso: 'mc-finestra-2023-2024', riga: 'totale', nuovo: 2536083, decisione: 'D17: somma delle righe, segue tab-e e 13ª (−137,16 e −15,04)', fonte: 'D17'},
  // mc-solo-pensione: IVC 2023 riassorbita.
  {caso: 'mc-solo-pensione', riga: 'tab-e', nuovo: 1980000, decisione: `${IVC_TABELLA}; 12 × 1.650,00, nessuna IVC`, fonte: FONTE_TFS},
  {caso: 'mc-solo-pensione', riga: 'tredicesima', nuovo: 178083, decisione: `${TRED_SIGMA12}; 1.650,00 + 110,83 + 20,00`, fonte: FONTE_TFS},
  {caso: 'mc-solo-pensione', riga: 'totale', nuovo: 2355627, decisione: 'D17: somma delle righe, segue tab-e e 13ª (−42,45 e −8,49)', fonte: 'D17'},
];

describe('fotografia Unificato: UM TFS del nuovo = vecchio ±1 centesimo, salvo differenze attese', () => {
  for (const caso of fotografia.casi) {
    it(caso.id, () => {
      const sezione = calcolaPratica(dati(caso), tabelle).sezioni.tfs;
      if (sezione?.esito !== 'calcolata') throw new Error(`TFS non calcolata: ${JSON.stringify(sezione)}`);
      const nuovo = valoriTfs(sezione);
      for (const [chiave, riga] of righeTfs) {
        const vecchio = centesimi(caso.uscite.tfs[chiave as keyof typeof caso.uscite.tfs]);
        const attesa = differenzeAtteseTfs.find((d) => d.caso === caso.id && d.riga === riga);
        if (attesa) {
          expect(nuovo[riga], `${riga}: ${attesa.decisione}`).toBe(attesa.nuovo);
          expect(attesa.fonte).not.toBe('');
        } else {
          expect(Math.abs(nuovo[riga] - vecchio), `${riga}: nuovo ${nuovo[riga]}, vecchio ${vecchio}`).toBeLessThanOrEqual(1);
        }
      }
    });
  }

  it('ogni differenza attesa riguarda un caso e una riga della fotografia', () => {
    const casi = new Set(fotografia.casi.map((c) => c.id));
    const righe = new Set(righeTfs.map(([, r]) => r));
    for (const d of differenzeAtteseTfs) {
      expect(casi.has(d.caso), d.caso).toBe(true);
      expect(righe.has(d.riga), d.riga).toBe(true);
    }
  });
});
