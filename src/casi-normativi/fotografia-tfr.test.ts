// Ticket 08: il nuovo motore confrontato con la fotografia del vecchio TFR (ticket 06; glossario:
// Fotografia del vecchio, Differenza attesa). Legge solo i dati congelati, non il reperto: resta dopo
// la pulizia (ticket 36, che sposterà fotografia.json e questo import).
// Passa se le righe non elencate valgono come il vecchio (±1 centesimo, D17) e se ogni riga elencata
// vale il nuovo importo, giustificato da decisione, fonte e caso normativo.
import {describe, expect, it} from 'vitest';
import {calcolaPratica} from '../motore';
import type {DatiPratica, Risultato, Tfr} from '../motore';
import fotografia from '../reperti/tfr/fotografia.json';
import {tabelle} from '../tabelle';

type Uscite = (typeof fotografia.casi)[number]['uscite'] & {
  rateoPrimoAnno?: number;
  rateoCessazione?: number;
  tredicesimaEmolumentiCassa?: number;
};
type Ingressi = (typeof fotografia.casi)[number]['ingressi'] & {
  retrVirtualePrimoMesePieno?: number;
  retrVirtualeUltimoMesePieno?: number;
  tredicesimaAnnua?: number;
};

/**
 * Adattatore confermato dall'utente (ticket 08): la retribuzione virtuale a tempo pieno e la 13ª
 * annua del vecchio diventano la voce 01 (posizione C1) con la % del caso; giorni ed emolumenti
 * digitati non hanno corrispondente in DatiPratica e si ignorano.
 */
const adattatore: Record<string, {percentuale: number; voce01: number}> = {
  'tempo-pieno-fine-mese': {percentuale: 100, voce01: 0},
  'mese-parziale': {percentuale: 100, voce01: 240000}, // tredicesimaAnnua 2.400,00
  'part-time': {percentuale: 50, voce01: 220000}, // retribuzione virtuale a tempo pieno 2.200,00
};

/** Le righe del vecchio e dove stanno nel nuovo. */
const righe = {
  rateoPrimoAnno: {estremo: 'iniziale', id: 'rateo-tredicesima-teorica'},
  rateoCessazione: {estremo: 'finale', id: 'rateo-tredicesima-teorica'},
  tredicesimaEmolumentiCassa: {estremo: 'finale', id: 'tredicesima-emolumenti-cassa'},
  retribuzioneValutabileIniziale: {estremo: 'iniziale', id: 'retribuzione-valutabile'},
  retribuzioneValutabileFinale: {estremo: 'finale', id: 'retribuzione-valutabile'},
} as const;
type Riga = keyof typeof righe;

interface DifferenzaAttesa {
  caso: string;
  riga: Riga;
  /** Importo del nuovo in centesimi; `null` = la riga non c'è più. */
  nuovo: number | null;
  decisione: string;
  casoNormativo: string;
}

const differenzeAttese: DifferenzaAttesa[] = [
  {
    caso: 'mese-parziale',
    riga: 'rateoPrimoAnno',
    nuovo: null,
    decisione:
      'C07-4: aprile 2024 è fuori dai 12 mesi di voci (nov 2025 - ott 2026): niente rateo iniziale, avviso mese-iniziale-fuori-finestra',
    casoNormativo: 'TFR-N14',
  },
  {
    caso: 'mese-parziale',
    riga: 'tredicesimaEmolumentiCassa',
    nuovo: 179507, // 2.400,00 × 273 gg (01/01-30/09) / 365
    decisione:
      'C07-3 e CCNL FL 2019-21 art. 75 c. 3 e 5: ratei in 365esimi dal 1/1 alla fine del mese precedente, non (giorni anno - giorni ultimo mese) / giorni anno; arretrati per cassa fuori perimetro (il vecchio sommava 150,00)',
    casoNormativo: 'TFR-N03',
  },
  {
    caso: 'part-time',
    riga: 'rateoCessazione',
    nuovo: 6027, // 2.200,00 × 50% × 20 / 365
    decisione: 'C07-1: rateo in 365esimi dei giorni di calendario serviti, non un dodicesimo',
    casoNormativo: 'TFR-N04',
  },
  {
    caso: 'part-time',
    riga: 'retribuzioneValutabileFinale',
    nuovo: 110000, // 2.200,00 × 50%
    decisione: 'C07-2: retribuzione valutabile del mese pieno in ogni mese utile non intero (il vecchio non la calcolava)',
    casoNormativo: 'TFR-N04',
  },
];

const esito = {PIENO: 'intero', PARZIALE_GE15: 'utile', PARZIALE_LT15: 'non-utile'} as const;

function dati(id: string, ingressi: Ingressi): DatiPratica {
  const {percentuale, voce01} = adattatore[id];
  return {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C1', assunzione: ingressi.dataAssunzione, cessazione: ingressi.dataCessazione},
    voci: {base: {'01': voce01}, eccezioni: {}},
    partTime: {base: {percentuale}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
  };
}

const sezioneTfr = (r: Risultato): Tfr => {
  const s = r.sezioni.tfr;
  if (s.esito !== 'calcolata') throw new Error(`TFR bloccato: ${s.motivi.map((m) => m.codice)}`);
  return s;
};

describe('fotografia TFR: nuovo motore contro il vecchio', () => {
  it('ogni differenza attesa riguarda un caso della fotografia e ha decisione e caso normativo', () => {
    for (const d of differenzeAttese) {
      expect(fotografia.casi.map((c) => c.id)).toContain(d.caso);
      expect(d.decisione.length).toBeGreaterThan(0);
      expect(d.casoNormativo).toMatch(/^TFR-N\d\d$/);
    }
  });

  for (const caso of fotografia.casi) {
    describe(caso.id, () => {
      const uscite = caso.uscite as Uscite;
      const tfr = sezioneTfr(calcolaPratica(dati(caso.id, caso.ingressi as Ingressi), tabelle));

      it('decorrenze e mesi delle estremità uguali al vecchio', () => {
        expect(tfr.decorrenzaGiuridica).toBe(uscite.decorrenzaGiuridica);
        expect(tfr.decorrenzaEconomica).toBe(uscite.decorrenzaEconomica);
        expect(tfr.dataCessazione).toBe(uscite.dataCessazione);
        expect(tfr.meseIniziale.esito).toBe(esito[uscite.casoIniziale as keyof typeof esito]);
        expect(tfr.meseFinale.esito).toBe(esito[uscite.casoFinale as keyof typeof esito]);
      });

      for (const [riga, dove] of Object.entries(righe) as [Riga, (typeof righe)[Riga]][]) {
        it(`${riga}: uguale al vecchio ±1 centesimo, o differenza attesa`, () => {
          const nuova = tfr.righe.find((r) => r.estremo === dove.estremo && r.id === dove.id);
          const nuovo = nuova ? nuova.composizione.arrotondato : null;
          const vecchioEuro = (uscite as Record<string, unknown>)[riga] as number | undefined;
          const vecchio = vecchioEuro === undefined ? null : Math.round(vecchioEuro * 100);
          const attesa = differenzeAttese.find((d) => d.caso === caso.id && d.riga === riga);
          if (attesa) {
            expect(nuovo).toBe(attesa.nuovo);
            expect(nuovo === null || vecchio === null || Math.abs(nuovo - vecchio) > 1).toBe(true); // davvero diversa
            return;
          }
          if (vecchio === null || nuovo === null) expect(nuovo).toBe(vecchio);
          else expect(Math.abs(nuovo - vecchio)).toBeLessThanOrEqual(1);
        });
      }
    });
  }
});
