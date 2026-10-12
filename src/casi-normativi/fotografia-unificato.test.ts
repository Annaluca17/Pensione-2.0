// Ticket 23: l'UM pensione del nuovo motore confrontata con la fotografia del vecchio Unificato (ticket 19;
// glossario: Fotografia del vecchio, Differenza attesa). Solo la pensione di base: il TFS è del ticket 25,
// il miglioramento contrattuale (pensioneMC) del 27. Legge solo i dati congelati, non il reperto: resta
// dopo la pulizia (ticket 36, che sposterà fotografia.json e questo import).
// Passa se le righe non elencate valgono come il vecchio (±1 centesimo, D17) e se ogni riga elencata vale
// il nuovo importo, giustificato da decisione e fonte.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {DatiPraticaPensione, UmPensione, VociMese} from '../motore';
import fotografia from '../reperti/unificato/fotografia.json';
import {tabelle} from '../tabelle';

/**
 * Adattatore confermato dall'utente (ticket 23): il vecchio non ha posizione senza miglioramento
 * contrattuale. `base-senza-mc` → C4 (01 = Tab. B col. 2 istruttori, 02 = 146,52 = differenziale di C4);
 * negli altri due la posizione del miglioramento (mcPos). La 02 è quella che il vecchio usa davvero:
 * con "PEO in base" 110,83 al posto della 100,00 digitata.
 */
const adattatore: Record<string, {posizione: string; voce02?: number}> = {
  'base-senza-mc': {posizione: 'C4'},
  'mc-finestra-2023-2024': {posizione: 'C3'},
  'mc-solo-pensione': {posizione: 'B4', voce02: 11083},
};

const centesimi = (euro: number) => Math.round(euro * 100);

function dati(caso: (typeof fotografia.casi)[number]): DatiPraticaPensione {
  const {posizione, voce02} = adattatore[caso.id];
  const voci: VociMese = {};
  for (const [voce, valore] of Object.entries(caso.ingressi.imp)) {
    const importo = centesimi(parseFloat(valore) || 0);
    if (importo !== 0) voci[voce] = importo;
  }
  if (voce02 !== undefined) voci['02'] = voce02;
  return {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione, cessazione: caso.ingressi.dataCessazione},
    voci: {base: voci, eccezioni: {}},
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
