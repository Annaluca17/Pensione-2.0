// Coerenza dei casi normativi di pensione e TFS, senza il motore: aritmetica a frazioni BigInt con
// half-up scritto qui, voci uguali alle tabelle CCNL vere, flag e mensilità dal catalogo, righe TFS
// di D16, date di riferimento proposte dalla situazione (C20-1). Il confronto col motore arriva coi
// ticket 23 e 25.
import {describe, expect, it} from 'vitest';
import {tabelle} from '../tabelle';
import type {ContrattoDefinitivo, DataISO, MeseISO, VociMese} from '../motore';
import {casiNormativiPensioneTfs, type CasoNormativoPensioneTfs, type RigaTfs} from './pensione-tfs';

const mcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : mcd(b, a % b));
const halfUp = ([n, d]: [bigint, bigint]): number => Number((2n * n + d) / (2n * d));
const comeTesto = ([n, d]: [bigint, bigint]) => (d === 1n ? `${n}` : `${n}/${d}`);
const riduci = (n: bigint, d: bigint): [bigint, bigint] => {
  const g = mcd(n, d);
  return [n / g, d / g];
};

/** Righe dell'UM TFS e loro voci (D16); la 13ª a parte. */
const RIGHE_TFS: [RigaTfs, string[] | null][] = [
  ['tab-e', ['01', '09']],
  ['ria', ['06']],
  ['tredicesima', null],
  ['assegno-assorbibile', ['05']],
  ['asili', ['12', '13']],
  ['assegno-non-riassorbibile', ['04']],
  ['indennita-64-56', ['08']],
  ['vigilanza', ['11']],
  ['differenziali', ['02', '03']],
];

const catalogo = (voce: string) => tabelle.catalogoVoci.find((v) => v.codice === voce)!;

function mese(meseISO: MeseISO, delta: number): MeseISO {
  const [a, m] = meseISO.split('-').map(Number);
  const t = a * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

const mesiFra = (dal: MeseISO, al: MeseISO): MeseISO[] => {
  const out: MeseISO[] = [];
  for (let m = dal; m <= al; m = mese(m, 1)) out.push(m);
  return out;
};

function giornoPrima(data: DataISO): DataISO {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g - 1)).toISOString().slice(0, 10);
}

// Valori delle tabelle vere per una posizione e un mese: tabellare d'area più l'incremento d'area
// successivo (T6 precisato, aprile-dicembre 2023), differenziale storico, IVC del contratto non
// ancora definitivo (le altre valgono 0: D8, T6), comparto.
const definitivi = tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');
const idDefinitivi = new Set(definitivi.map((c) => c.id));
const ultimo = <T extends {decorrenza: string}>(lista: T[], primo: string) =>
  lista
    .filter((s) => s.decorrenza <= primo)
    .sort((a, b) => a.decorrenza.localeCompare(b.decorrenza))
    .at(-1);

function daTabella(posizione: string, meseISO: MeseISO): VociMese {
  const primo = `${meseISO}-01`;
  const t = tabelle.trasposizione.find((x) => x.posizione === posizione)!;
  const scaglionamenti = definitivi.flatMap((c) => c.scaglionamenti).filter((s) => s.chiave === 'area');
  const tabellare = ultimo(scaglionamenti.filter((s) => s.tipo === 'tabellare'), primo)!;
  const incremento = ultimo(scaglionamenti.filter((s) => s.tipo === 'incremento'), primo);
  const ivc = definitivi
    .flatMap((c) => c.ivc)
    .find((i) => !idDefinitivi.has(i.anticipa) && i.dal <= primo && (!i.al || i.al >= primo));
  const comparto = ultimo(definitivi.flatMap((c) => c.indennitaComparto), primo)!;
  const conIncremento = incremento && incremento.decorrenza >= tabellare.decorrenza;
  return {
    '01': tabellare.importi[t.area].mensile + (conIncremento ? incremento.importi[t.area].mensile : 0),
    '02': t.differenzialeStorico.mensile,
    '09': ivc ? ivc.importi[t.area].mensile : 0,
    '10': comparto.importi[t.area].mensile,
  };
}

const inserite = (caso: CasoNormativoPensioneTfs, m: MeseISO): VociMese => ({
  ...caso.dati.voci.base,
  ...caso.dati.voci.eccezioni[m],
});

const posizioneDel = (caso: CasoNormativoPensioneTfs, m: MeseISO) =>
  caso.posizionePrecedente && m <= caso.posizionePrecedente.fino
    ? caso.posizionePrecedente.posizione
    : caso.dati.anagrafica.posizione;

/** Voci usate nel mese: quelle inserite, con l'IVC presa dalla tabella (D8: l'inserita non si somma). */
function usate(caso: CasoNormativoPensioneTfs, m: MeseISO): VociMese {
  const v: VociMese = {...inserite(caso, m), '09': daTabella(posizioneDel(caso, m), m)['09']};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x));
}

/** Date di riferimento proposte dalla situazione (C20-1). */
function dateProposte(caso: CasoNormativoPensioneTfs) {
  const {situazione} = caso.dati;
  const cessazione = caso.dati.anagrafica.cessazione!;
  if (situazione.tipo === 'ordinaria') return {pensione: cessazione, fineServizio: cessazione};
  const prima = giornoPrima(situazione.dal);
  if (situazione.tipo === 'congedo-104' || situazione.tipo === 'optante-tfr')
    return {pensione: cessazione, fineServizio: prima};
  return {pensione: prima, fineServizio: prima};
}

describe('casi normativi di pensione e TFS: coerenza dei dati, senza il motore', () => {
  it('ci sono 14 casi con id unici, solo dati di fantasia', () => {
    expect(casiNormativiPensioneTfs.map((c) => c.id)).toEqual(
      Array.from({length: 14}, (_, i) => `PT-N${String(i + 1).padStart(2, '0')}`),
    );
    for (const caso of casiNormativiPensioneTfs) expect(caso.dati.anagrafica.codiceFiscale).toBe('RSSMRA80A01H501U');
  });

  it("HITL: ogni risultato atteso è validato dall'utente", () => {
    for (const caso of casiNormativiPensioneTfs) expect(caso.validazione.stato, caso.id).toBe('validato');
  });

  it('una situazione per tipo (D19), optante compreso (D14)', () => {
    const tipi = new Set(casiNormativiPensioneTfs.map((c) => c.dati.situazione.tipo));
    expect([...tipi].sort()).toEqual(
      ['congedo-104', 'optante-tfr', 'ordinaria', 'sospensione-cautelare', 'trattenuta-malattia'].sort(),
    );
  });

  it('tipi di part-time O, V e M presenti, con % che cambia', () => {
    const tipi = new Set(
      casiNormativiPensioneTfs.flatMap((c) => [c.dati.partTime.base, ...Object.values(c.dati.partTime.eccezioni)].map((p) => p?.tipo)),
    );
    for (const t of ['O', 'V', 'M']) expect(tipi.has(t as 'O')).toBe(true);
  });

  for (const caso of casiNormativiPensioneTfs) {
    describe(caso.id, () => {
      const {atteso} = caso;
      const finestraTfs = mesiFra(atteso.tfs.mesi.dal, atteso.tfs.mesi.al);

      it('date di riferimento proposte dalla situazione (C20-1)', () => {
        expect(atteso.dateRiferimento).toEqual(dateProposte(caso));
        expect(atteso.pensione.mese).toBe(atteso.dateRiferimento.pensione.slice(0, 7));
        expect(atteso.tfs.mesi.al).toBe(atteso.dateRiferimento.fineServizio.slice(0, 7));
        expect(finestraTfs).toHaveLength(12);
      });

      it('le eccezioni stanno dentro le voci richieste: 12 mesi TFS fino al mese della pensione (C20-2)', () => {
        const al = [atteso.pensione.mese, atteso.tfs.mesi.al].sort().at(-1)!;
        for (const m of Object.keys(caso.dati.voci.eccezioni)) {
          expect(m >= atteso.tfs.mesi.dal && m <= al, m).toBe(true);
        }
      });

      it('le voci 01, 02, 09, 10 sono quelle delle tabelle CCNL vere, salvo gli scostamenti voluti', () => {
        const al = [atteso.pensione.mese, atteso.tfs.mesi.al].sort().at(-1)!;
        for (const m of mesiFra(atteso.tfs.mesi.dal, al)) {
          const attese = daTabella(posizioneDel(caso, m), m);
          const v = inserite(caso, m);
          for (const voce of ['01', '02', '09', '10'] as const) {
            if (caso.scostamentiVolutiDalleTabelle?.some((s) => s.mese === m && s.voce === voce)) continue;
            expect(v[voce] ?? 0, `${m} voce ${voce}`).toBe(attese[voce]);
          }
        }
      });

      it('UM pensione: una riga per voce del mese, mensile × mensilità; 13ª dai mensili; totali', () => {
        const v = usate(caso, atteso.pensione.mese);
        const voci = Object.keys(v).filter((k) => catalogo(k).utile.pensione).sort();
        expect(atteso.pensione.righe.map((r) => r.voce)).toEqual(voci);
        for (const r of atteso.pensione.righe) {
          expect(r.mensile, r.voce).toBe(v[r.voce]);
          expect(r.mensilita, r.voce).toBe(catalogo(r.voce).mensilita);
          expect(r.valore, r.voce).toBe(r.mensile * r.mensilita);
        }
        const con13 = voci.filter((k) => catalogo(k).utile.tredicesima);
        expect(atteso.pensione.tredicesima.voci).toEqual(con13);
        expect(atteso.pensione.tredicesima.valore).toBe(con13.reduce((s, k) => s + v[k]!, 0));
        const annui = atteso.pensione.righe.reduce((s, r) => s + r.valore, 0);
        expect(atteso.pensione.totaleAnnui).toBe(annui);
        expect(atteso.pensione.totale).toBe(annui + atteso.pensione.tredicesima.valore);
      });

      it('UM TFS: 9 righe di D16, Σ dei 12 mesi; 13ª = Σ / 12 a frazione esatta e half-up', () => {
        expect(atteso.tfs.righe.map((r) => r.riga)).toEqual(RIGHE_TFS.map(([id]) => id));
        for (const [id, voci] of RIGHE_TFS) {
          const riga = atteso.tfs.righe.find((r) => r.riga === id)!;
          if (voci) {
            for (const k of voci) expect(catalogo(k).utile.tfs, k).toBe(true);
            expect(riga.voci).toEqual(voci);
            const somma = finestraTfs.reduce((s, m) => s + voci.reduce((t, k) => t + (usate(caso, m)[k] ?? 0), 0), 0);
            expect(riga.divisore).toBe(1);
            expect(riga.pieno, id).toBe(String(somma));
            expect(riga.valore, id).toBe(somma);
          } else {
            let n = 0n;
            const voci13 = new Set<string>();
            for (const m of finestraTfs) {
              for (const [k, x] of Object.entries(usate(caso, m))) {
                if (catalogo(k).utile.tfs && catalogo(k).utile.tredicesima) {
                  voci13.add(k);
                  n += BigInt(x!);
                }
              }
            }
            expect(riga.voci).toEqual([...voci13].sort());
            expect(riga.divisore).toBe(12);
            const frazione = riduci(n, 12n);
            expect(riga.pieno).toBe(comeTesto(frazione));
            expect(riga.valore).toBe(halfUp(frazione));
          }
        }
        expect(atteso.tfs.totale).toBe(atteso.tfs.righe.reduce((s, r) => s + r.valore, 0));
      });

      it('voci fuori dal TFS (07 posizione, 10 comparto, 14, 15) in nessuna riga TFS', () => {
        const nelleRighe = new Set(atteso.tfs.righe.flatMap((r) => r.voci));
        for (const k of ['07', '10', '14', '15']) {
          expect(catalogo(k).utile.tfs).toBe(false);
          expect(nelleRighe.has(k)).toBe(false);
        }
      });

      it('avvisi: annualizzazione senza eccezioni (C20-3), IVC incompatibile per mese (D8), ipotesi (T5)', () => {
        const codici = (c: string) => atteso.avvisi.filter((a) => a.codice === c);
        expect(codici('tfs-annualizzato').length).toBe(Object.keys(caso.dati.voci.eccezioni).length === 0 ? 1 : 0);
        const ivcDiverse = finestraTfs.filter(
          (m) => (inserite(caso, m)['09'] ?? 0) !== daTabella(posizioneDel(caso, m), m)['09'],
        );
        expect(codici('ivc-incompatibile').map((a) => a.dati.mese)).toEqual(ivcDiverse);
        const nellIpotesi = caso.dati.anagrafica.cessazione! >= '2025-01-01';
        expect(codici('contratto-in-ipotesi').length).toBe(nellIpotesi ? 1 : 0);
        expect(atteso.avvisi.length).toBe(
          codici('tfs-annualizzato').length + codici('ivc-incompatibile').length + codici('contratto-in-ipotesi').length,
        );
      });

      it('ogni riga porta decisioni e fonte', () => {
        for (const r of [...atteso.pensione.righe, ...atteso.tfs.righe]) {
          expect(r.decisioni.length).toBeGreaterThan(0);
          expect(r.fonte.length).toBeGreaterThan(20);
        }
        expect(caso.passi.length).toBeGreaterThan(0);
      });
    });
  }
});
