// Coerenza dei casi normativi delle DMA previste, senza il motore: mesi e limite (C21-1), giorni D9 e
// 365esimi ricontati col calendario, voci uguali alle tabelle CCNL vere, campi e voci da
// `righePassweb.dma`, valore pieno a frazioni BigInt e half-up scritto qui. Il confronto col motore
// arriva col ticket 26.
import {describe, expect, it} from 'vitest';
import {tabelle} from '../tabelle';
import type {ContrattoDefinitivo, MeseISO, VociMese} from '../motore';
import {casiNormativiDma, type CasoNormativoDma} from './dma-previste';

type Frazione = [bigint, bigint];
const mcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : mcd(b, a % b));
const riduci = ([n, d]: Frazione): Frazione => {
  const g = mcd(n, d) || 1n;
  return [n / g, d / g];
};
const somma = ([a, b]: Frazione, [c, d]: Frazione): Frazione => riduci([a * d + c * b, b * d]);
const per = ([a, b]: Frazione, [c, d]: Frazione): Frazione => riduci([a * c, b * d]);
const halfUp = ([n, d]: Frazione): number => Number((2n * n + d) / (2n * d));
const comeTesto = ([n, d]: Frazione) => (d === 1n ? `${n}` : `${n}/${d}`);

const giorniDelMese = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const domenica = (a: number, m: number, g: number) => new Date(Date.UTC(a, m - 1, g)).getUTCDay() === 0;
const giornoAnno = (a: number, m: number, g: number) => (Date.UTC(a, m - 1, g) - Date.UTC(a, 0, 1)) / 86_400_000 + 1;

function mesiFra(dal: MeseISO, al: MeseISO): MeseISO[] {
  const out: MeseISO[] = [];
  let [a, m] = dal.split('-').map(Number);
  for (;;) {
    const mese = `${a}-${String(m).padStart(2, '0')}`;
    if (mese > al) return out;
    out.push(mese);
    m += 1;
    if (m > 12) [a, m] = [a + 1, 1];
  }
}

// Tabelle vere nel mese: tabellare d'area dell'ultimo definitivo, differenziale storico, IVC del
// contratto non ancora definitivo (D8, T6), comparto. I mesi delle DMA sono tutti dal 2026.
const definitivi = tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');
const idDefinitivi = new Set(definitivi.map((c) => c.id));
const ultimo = <T extends {decorrenza: string}>(lista: readonly T[], data: string) =>
  [...lista].filter((s) => s.decorrenza <= data).sort((a, b) => a.decorrenza.localeCompare(b.decorrenza)).at(-1);

function daTabella(posizione: string, mese: MeseISO): VociMese {
  const primo = `${mese}-01`;
  const t = tabelle.trasposizione.find((x) => x.posizione === posizione)!;
  const tabellare = ultimo(definitivi.flatMap((c) => c.scaglionamenti).filter((s) => s.tipo === 'tabellare' && s.chiave === 'area'), primo)!;
  const ivc = definitivi.flatMap((c) => c.ivc).find((i) => !idDefinitivi.has(i.anticipa) && i.dal <= primo && (!i.al || i.al >= primo));
  return {
    '01': tabellare.importi[t.area].mensile,
    '02': t.differenzialeStorico.mensile,
    '09': ivc ? ivc.importi[t.area].mensile : 0,
    '10': ultimo(definitivi.flatMap((c) => c.indennitaComparto), primo)!.importi[t.area].mensile,
  };
}

const inserite = (caso: CasoNormativoDma, m: MeseISO): VociMese => ({...caso.dati.voci.base, ...caso.dati.voci.eccezioni[m]});
const percentuale = (caso: CasoNormativoDma, m: MeseISO) => (caso.dati.partTime.eccezioni[m] ?? caso.dati.partTime.base).percentuale;

/** Codice servizio e regime del mese dalla situazione (C21-2). */
function situazioneDelMese(caso: CasoNormativoDma, m: MeseISO): {codice?: 83 | 49; regime: 'TFS' | 'TFR'} {
  const s = caso.dati.situazione;
  const dopo = s.tipo !== 'ordinaria' && m >= s.dal.slice(0, 7);
  if (dopo && s.tipo === 'sospensione-cautelare') return {codice: 83, regime: caso.dati.regime};
  if (dopo && s.tipo === 'congedo-104') return {codice: 49, regime: caso.dati.regime};
  if (dopo && s.tipo === 'optante-tfr') return {regime: 'TFR'};
  return {regime: caso.dati.regime};
}

/** Giorni D9 del mese e 365esimi della 13ª (C21-3), ricontati col calendario. */
function giorni(caso: CasoNormativoDma, m: MeseISO) {
  const [a, mm] = m.split('-').map(Number);
  const [aa, am, ag] = caso.dati.anagrafica.assunzione!.split('-').map(Number);
  const [ca, cm, cg] = caso.dati.anagrafica.cessazione!.split('-').map(Number);
  const da = aa === a && am === mm ? ag : 1;
  const cessazione = ca === a && cm === mm;
  const al = cessazione ? cg : giorniDelMese(a, mm);
  let lunSab = 0;
  for (let g = da; g <= al; g++) if (!domenica(a, mm, g)) lunSab += 1;
  const d9 = da === 1 && al === giorniDelMese(a, mm) ? 26 : Math.min(lunSab, 26);
  let tredicesima = 0;
  if (mm === 12 || cessazione) {
    const inizio = aa === a ? giornoAnno(aa, am, ag) : 1;
    const fine = cessazione ? giornoAnno(a, mm, cg) : giornoAnno(a, 12, 31);
    tredicesima = Math.min(fine - inizio + 1, 365);
  }
  return {da, al, d9, tredicesima};
}

describe('casi normativi delle DMA previste: coerenza dei dati, senza il motore', () => {
  it('casi DM-N01… con id unici, solo dati di fantasia', () => {
    expect(casiNormativiDma.map((c) => c.id)).toEqual(
      Array.from({length: casiNormativiDma.length}, (_, i) => `DM-N${String(i + 1).padStart(2, '0')}`),
    );
    for (const caso of casiNormativiDma) expect(caso.dati.anagrafica.codiceFiscale).toBe('RSSMRA80A01H501U');
  });

  it("HITL: ogni risultato atteso è validato dall'utente", () => {
    for (const caso of casiNormativiDma) expect(caso.validazione.stato, caso.id).toBe('validato');
  });

  it('copertura: regime TFS e TFR, codici 83 e 49, trattenuta, optante, Credito non iscritto, 7ª bloccata, part-time', () => {
    const periodi = casiNormativiDma.flatMap((c) => c.atteso.periodi);
    expect(new Set(periodi.map((p) => p.regime))).toEqual(new Set(['TFS', 'TFR']));
    expect(new Set(periodi.map((p) => p.codiceServizio).filter(Boolean))).toEqual(new Set([83, 49]));
    const tipi = new Set(casiNormativiDma.map((c) => c.dati.situazione.tipo));
    for (const t of ['ordinaria', 'sospensione-cautelare', 'trattenuta-malattia', 'congedo-104', 'optante-tfr']) expect(tipi.has(t as 'ordinaria'), t).toBe(true);
    expect(casiNormativiDma.some((c) => !c.dati.iscrittoCredito)).toBe(true);
    expect(casiNormativiDma.some((c) => c.atteso.blocchi.length > 0)).toBe(true);
    expect(periodi.some((p) => p.percentuale < 100)).toBe(true);
  });

  it('arrotonda half-up su un valore pieno esattamente a x,xx5 (n + ½ centesimo)', () => {
    const mezzi = casiNormativiDma.flatMap((c) => c.atteso.periodi.flatMap((p) => p.campi)).filter((c) => c.pieno.endsWith('/2'));
    expect(mezzi.length).toBeGreaterThan(0);
    for (const c of mezzi) {
      const [n] = c.pieno.split('/').map(BigInt);
      expect(c.valore).toBe(Number((n + 1n) / 2n));
    }
  });

  for (const caso of casiNormativiDma) {
    describe(caso.id, () => {
      const {atteso, dati} = caso;
      const mesi = mesiFra(dati.dmaPreviste.dal, dati.anagrafica.cessazione!.slice(0, 7));
      // D12: limite di PASSWEB (manuale v1.20); il parametro con fonte entra nelle tabelle col ticket 26.
      const limite = 6;

      it('un periodo per mese solare da `dal` alla cessazione, al massimo 6; dal 7º blocco (D12, C21-1)', () => {
        if (dati.situazione.tipo === 'trattenuta-malattia') {
          expect(atteso.periodi).toEqual([]);
          expect(atteso.blocchi).toEqual([]);
          expect(atteso.avvisi.map((a) => a.codice)).toEqual(['dma-non-prevista']);
          return;
        }
        expect(atteso.periodi.map((p) => p.mese)).toEqual(mesi.slice(0, limite));
        expect(atteso.blocchi.map((b) => b.mese)).toEqual(mesi.slice(limite));
        for (const b of atteso.blocchi) expect(b).toMatchObject({codice: 'dma-oltre-limite', limite});
        expect(atteso.avvisi).toEqual([]);
      });

      it('giorni D9 (lun-sab, tetto 26, mese intero = 26) e 365esimi della 13ª solo a dicembre e alla cessazione (D11, C21-3)', () => {
        for (const p of atteso.periodi) {
          const g = giorni(caso, p.mese);
          expect(p.dal, p.mese).toBe(`${p.mese}-${String(g.da).padStart(2, '0')}`);
          expect(p.al, p.mese).toBe(`${p.mese}-${String(g.al).padStart(2, '0')}`);
          expect(p.giorni, p.mese).toBe(g.d9);
          expect(p.giorniTredicesima, p.mese).toBe(g.tredicesima);
        }
      });

      it('regime, codice servizio e % part-time del mese (C21-2, D4)', () => {
        for (const p of atteso.periodi) {
          const s = situazioneDelMese(caso, p.mese);
          expect(p.regime, p.mese).toBe(s.regime);
          expect(p.codiceServizio, p.mese).toBe(s.codice);
          expect(p.percentuale, p.mese).toBe(percentuale(caso, p.mese));
        }
      });

      it('voci 01, 02, 09, 10 dalle tabelle CCNL vere, salvo gli scostamenti voluti', () => {
        for (const p of atteso.periodi) {
          const attese = daTabella(dati.anagrafica.posizione, p.mese);
          const v = inserite(caso, p.mese);
          for (const voce of ['01', '02', '09', '10'] as const) {
            if (caso.scostamentiVolutiDalleTabelle?.some((s) => s.mese === p.mese && s.voce === voce)) continue;
            expect(v[voce] ?? 0, `${p.mese} voce ${voce}`).toBe(attese[voce]);
          }
        }
      });

      it('campi di righePassweb.dma per regime e Credito, valore pieno a frazione esatta e half-up (D17, R1-R5)', () => {
        for (const p of atteso.periodi) {
          const campi = tabelle.righePassweb.dma.filter(
            (c) => (!('regime' in c) || c.regime === p.regime) && (!('condizione' in c) || dati.iscrittoCredito),
          );
          expect(p.campi.map((c) => c.campo), p.mese).toEqual(campi.map((c) => c.id));
          const v = inserite(caso, p.mese);
          const pct: Frazione = riduci([BigInt(Math.round(p.percentuale * 100)), 10_000n]);
          for (const campo of campi) {
            const teorica = campo.id === 'retribuzione-teorica-tfr';
            const azzerato = p.codiceServizio !== undefined && campo.id !== 'imponibile-pensionistico' && campo.id !== 'imponibile-credito' && !teorica;
            let pieno: Frazione = [0n, 1n];
            if (!azzerato) {
              for (const k of campo.voci) {
                if (!v[k]) continue;
                const quota: Frazione = teorica ? [1n, 1n] : [BigInt(p.giorni), 26n];
                pieno = somma(pieno, per(per([BigInt(v[k]!), 1n], pct), quota));
              }
              for (const k of campo.tredicesima) {
                if (!v[k] || !p.giorniTredicesima) continue;
                pieno = somma(pieno, per(per([BigInt(v[k]!), 1n], pct), [BigInt(p.giorniTredicesima), 365n]));
              }
              pieno = per(pieno, [BigInt(campo.percentuale), 100n]);
            }
            const atteso = p.campi.find((c) => c.campo === campo.id)!;
            expect(atteso.pieno, `${p.mese} ${campo.id}`).toBe(comeTesto(pieno));
            expect(atteso.valore, `${p.mese} ${campo.id}`).toBe(halfUp(pieno));
          }
          const cpdel = p.campi.find((c) => c.campo === 'imponibile-pensionistico')!;
          const credito = p.campi.find((c) => c.campo === 'imponibile-credito');
          if (credito) expect(credito.valore).toBe(cpdel.valore);
        }
      });

      it('ogni campo porta decisioni e fonte; ci sono i passi', () => {
        for (const c of atteso.periodi.flatMap((p) => p.campi)) {
          expect(c.decisioni.length).toBeGreaterThan(0);
          expect(c.fonte.length).toBeGreaterThan(20);
        }
        expect(caso.passi.length).toBeGreaterThan(0);
      });
    });
  }
});
