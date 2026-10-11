// Coerenza dei casi normativi TFR, senza il motore: aritmetica a frazioni BigInt con half-up scritto
// qui, voci uguali alle tabelle CCNL vere, flag del catalogo, giorni contati sul calendario.
// Il confronto col motore arriva col ticket 08.
import {describe, expect, it} from 'vitest';
import {tabelle} from '../tabelle';
import type {ContrattoDefinitivo, MeseISO, VociMese} from '../motore';
import {casiNormativiTfr, type RigaAttesa} from './tfr';

const mcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : mcd(b, a % b));

/** Valore pieno della riga come frazione ridotta [n, d] di centesimi. */
function pieno(riga: RigaAttesa): [bigint, bigint] {
  let n = 0n;
  const d = 100n * BigInt(riga.divisore);
  for (const t of riga.termini) {
    const somma = Object.values(t.voci).reduce((s, v) => s + BigInt(v ?? 0), 0n);
    n += somma * BigInt(t.percentuale) * BigInt(t.giorni ?? 1);
  }
  const g = mcd(n, d);
  return [n / g, d / g];
}

const halfUp = ([n, d]: [bigint, bigint]): number => Number((2n * n + d) / (2n * d));
const comeTesto = ([n, d]: [bigint, bigint]) => (d === 1n ? `${n}` : `${n}/${d}`);

/** Voci del mese espanse da base ed eccezioni (un'eccezione sostituisce solo le voci che elenca). */
const vociDel = (caso: (typeof casiNormativiTfr)[number], mese: MeseISO): VociMese => ({
  ...caso.dati.voci.base,
  ...caso.dati.voci.eccezioni[mese],
});

const percentualeDel = (caso: (typeof casiNormativiTfr)[number], mese: MeseISO) =>
  (caso.dati.partTime.eccezioni[mese] ?? caso.dati.partTime.base).percentuale;

function mesiFinestra(assunzione: string, cessazione: string): MeseISO[] {
  const out: MeseISO[] = [];
  let [a, m] = cessazione.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const mese = `${a}-${String(m).padStart(2, '0')}`;
    if (mese < assunzione.slice(0, 7)) break;
    out.unshift(mese);
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return out;
}

// Valori delle tabelle vere per una posizione e un mese (dal 2024: tabellare, IVC, comparto, 02).
const definitivi = tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');
const idDefinitivi = new Set(definitivi.map((c) => c.id));

function daTabella(posizione: string, mese: MeseISO): VociMese {
  const primo = `${mese}-01`;
  const t = tabelle.trasposizione.find((x) => x.posizione === posizione)!;
  const tabellari = definitivi
    .flatMap((c) => c.scaglionamenti)
    .filter((s) => s.tipo === 'tabellare' && s.chiave === 'area' && s.decorrenza <= primo)
    .sort((a, b) => a.decorrenza.localeCompare(b.decorrenza));
  const ivc = definitivi
    .flatMap((c) => c.ivc)
    .find((i) => !idDefinitivi.has(i.anticipa) && i.dal <= primo && (!i.al || i.al >= primo));
  const comparto = definitivi
    .flatMap((c) => c.indennitaComparto)
    .filter((s) => s.decorrenza <= primo)
    .sort((a, b) => a.decorrenza.localeCompare(b.decorrenza))
    .at(-1)!;
  return {
    '01': tabellari.at(-1)!.importi[t.area].mensile,
    '02': t.differenzialeStorico.mensile,
    '09': ivc ? ivc.importi[t.area].mensile : 0,
    '10': comparto.importi[t.area].mensile,
  };
}

const giorniDelMese = (mese: MeseISO) => {
  const [a, m] = mese.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
};

describe('casi normativi TFR: coerenza dei dati, senza il motore', () => {
  it('ci sono 14 casi con id unici, solo dati di fantasia', () => {
    expect(casiNormativiTfr.map((c) => c.id)).toEqual(
      Array.from({length: 14}, (_, i) => `TFR-N${String(i + 1).padStart(2, '0')}`),
    );
    for (const caso of casiNormativiTfr) expect(caso.dati.anagrafica.codiceFiscale).toBe('RSSMRA80A01H501U');
  });

  it('HITL: ogni risultato atteso è validato dall\'utente', () => {
    for (const caso of casiNormativiTfr) expect(caso.validazione.stato, caso.id).toBe('validato');
  });

  for (const caso of casiNormativiTfr) {
    describe(caso.id, () => {
      const {assunzione, cessazione, posizione} = caso.dati.anagrafica;

      it('le voci inserite sono quelle delle tabelle CCNL vere, salvo gli scostamenti voluti', () => {
        if (cessazione! < tabelle.coperturaDal) return; // caso di blocco: le voci non si leggono
        for (const mese of mesiFinestra(assunzione!, cessazione!)) {
          const attese = daTabella(posizione, mese);
          const inserite = vociDel(caso, mese);
          for (const voce of ['01', '02', '09', '10'] as const) {
            if (caso.scostamentiVolutiDalleTabelle?.some((s) => s.mese === mese && s.voce === voce)) continue;
            expect(inserite[voce] ?? 0, `${mese} voce ${voce}`).toBe(attese[voce]);
          }
        }
      });

      if (caso.atteso.esito !== 'calcolata') return;
      const atteso = caso.atteso;

      it('date: decorrenze e mesi delle estremità', () => {
        expect(atteso.decorrenzaGiuridica).toBe(assunzione);
        expect(atteso.dataCessazione).toBe(cessazione);
        expect(atteso.meseIniziale.mese).toBe(assunzione!.slice(0, 7));
        expect(atteso.meseFinale.mese).toBe(cessazione!.slice(0, 7));
      });

      it('giorni contati sul calendario: lun-sab (domeniche escluse) e calendario, soglia 15', () => {
        for (const [estremo, dato] of [
          ['iniziale', atteso.meseIniziale],
          ['finale', atteso.meseFinale],
        ] as const) {
          const [a, m] = dato.mese.split('-').map(Number);
          const dal = estremo === 'iniziale' ? Number(assunzione!.slice(8)) : 1;
          const al = estremo === 'finale' ? Number(cessazione!.slice(8)) : giorniDelMese(dato.mese);
          if (dal === 1 && al === giorniDelMese(dato.mese)) {
            expect(dato.esito).toBe('intero');
            continue;
          }
          let lavorativi = 0;
          for (let g = dal; g <= al; g++) if (new Date(Date.UTC(a, m - 1, g)).getUTCDay() !== 0) lavorativi++;
          expect(dato.giorni).toEqual({lavorativiLunSab: lavorativi, calendario: al - dal + 1});
          expect(dato.esito).toBe(lavorativi >= 15 ? 'utile' : 'non-utile');
          const divergono = lavorativi >= 15 !== al - dal + 1 >= 15;
          expect(atteso.avvisi.some((x) => x.codice === 'soglia-quindici-giorni-altra-regola' && x.dati.estremo === estremo)).toBe(
            divergono,
          );
        }
      });

      for (const riga of atteso.righe) {
        it(`${riga.estremo} ${riga.riga}: frazione esatta e half-up al centesimo`, () => {
          const frazione = pieno(riga);
          expect(comeTesto(frazione)).toBe(riga.pieno);
          expect(halfUp(frazione)).toBe(riga.valore);
        });

        it(`${riga.estremo} ${riga.riga}: voci dal catalogo e dai dati, % e giorni del mese`, () => {
          const idRiga = riga.riga === 'retribuzione-valutabile' ? 'retribuzione-valutabile' : 'rateo-tredicesima-teorica';
          const ammesse = tabelle.righeTfr.find((r) => r.id === idRiga)!.voci as readonly string[];
          for (const t of riga.termini) {
            const inserite = vociDel(caso, t.mese);
            const attese = Object.fromEntries(
              Object.entries(inserite).filter(([voce]) => ammesse.includes(voce)),
            );
            for (const s of caso.scostamentiVolutiDalleTabelle ?? []) if (s.mese === t.mese) attese[s.voce] = 0; // D8
            expect(t.voci, t.mese).toEqual(attese);
            expect(t.percentuale, t.mese).toBe(percentualeDel(caso, t.mese));
            if (riga.riga === 'tredicesima-emolumenti-cassa') expect(t.giorni, t.mese).toBe(giorniDelMese(t.mese));
          }
        });
      }

      it('ratei per cassa: tutti i mesi dal 1/1 (o dall\'assunzione) al mese prima della cessazione', () => {
        const cassa = atteso.righe.find((r) => r.riga === 'tredicesima-emolumenti-cassa');
        if (!cassa) return expect(atteso.meseFinale.esito).not.toBe('non-utile');
        const dal = Math.max(Number(`${cessazione!.slice(0, 4)}01`), Number(assunzione!.slice(0, 7).replace('-', '')));
        const al = Number(cessazione!.slice(0, 7).replace('-', ''));
        const mesi = [];
        for (let x = dal; x < al; x++) mesi.push(`${String(x).slice(0, 4)}-${String(x).slice(4)}`);
        expect(cassa.termini.map((t) => t.mese)).toEqual(mesi);
      });
    });
  }
});
