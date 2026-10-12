// Coerenza dei casi normativi del miglioramento contrattuale, senza il motore: applicabilità e
// decorrenze dalla tabella dei contratti (C21-5, C21-6), voci sostituite ricavate dagli scaglionamenti,
// Scenario A dalle voci inserite (C21-7), avvisi sulla pensione erogata (T4), TFS di miglioramento mese
// per mese contro il TFS ordinario (C21-8), 13ª TFS a frazione esatta e half-up. Il confronto col
// motore arriva col ticket 27.
import {describe, expect, it} from 'vitest';
import {tabelle} from '../tabelle';
import type {Centesimi, ContrattoDefinitivo, DataISO, MeseISO, Scaglionamento, VociMese} from '../motore';
import {casiNormativiMiglioramento, type CasoNormativoMiglioramento} from './miglioramento';

const catalogo = (voce: string) => tabelle.catalogoVoci.find((v) => v.codice === voce)!;
const definitivi = tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');
const contratto = (id: string) => tabelle.contratti.find((c) => c.id === id)!;
const trasposizione = (posizione: string) => tabelle.trasposizione.find((t) => t.posizione === posizione)!;
const ultimo = <T extends {decorrenza: string}>(lista: readonly T[]) =>
  [...lista].sort((a, b) => a.decorrenza.localeCompare(b.decorrenza)).at(-1);

function giornoDopo(data: DataISO): DataISO {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g + 1)).toISOString().slice(0, 10);
}

function mesiFinestra(al: MeseISO): MeseISO[] {
  const [a, m] = al.split('-').map(Number);
  return Array.from({length: 12}, (_, i) => {
    const t = a * 12 + m - 12 + i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
  });
}

/**
 * Scaglionamenti in vigore alla data dopo il miglioramento: del contratto scelto quelli con decorrenza
 * dentro la sua vigenza (C21-5), degli altri definitivi quelli già in vigore alla cessazione.
 */
function inVigore(scelto: ContrattoDefinitivo, data: DataISO, cessazione: DataISO): Scaglionamento[] {
  return definitivi.flatMap((c) =>
    c.scaglionamenti.filter((s) =>
      s.decorrenza <= data && (c.id === scelto.id ? s.decorrenza >= c.vigenza.dal && s.decorrenza <= c.vigenza.al : s.decorrenza <= cessazione),
    ),
  );
}

/** Voci 01, 02, 09, 10 dalle tabelle alla data (T12): tabellare + incremento successivo, differenziale, IVC 0, comparto. */
function sostituite(posizione: string, scelto: ContrattoDefinitivo, data: DataISO, cessazione: DataISO): Record<'01' | '02' | '09' | '10', Centesimi> {
  const t = trasposizione(posizione);
  const s = inVigore(scelto, data, cessazione);
  const tabellare = ultimo(s.filter((x) => x.tipo === 'tabellare'))!;
  const incremento = ultimo(s.filter((x) => x.tipo === 'incremento' && x.decorrenza >= tabellare.decorrenza));
  const chiave = (x: Scaglionamento) => (x.chiave === 'area' ? t.area : posizione);
  const comparto = ultimo(definitivi.flatMap((c) => c.indennitaComparto).filter((x) => x.decorrenza <= data))!;
  return {
    '01': tabellare.importi[chiave(tabellare)].mensile + (incremento ? incremento.importi[chiave(incremento)].mensile : 0),
    '02': tabellare.chiave === 'area' ? t.differenzialeStorico.mensile : 0,
    '09': 0,
    '10': comparto.importi[t.area].mensile,
  };
}

/** Voci del cedolino alla cessazione, prima della firma: solo contratti firmati entro la cessazione. */
function preFirma(posizione: string, mese: MeseISO, cessazione: DataISO) {
  const primo = `${mese}-01`;
  const t = trasposizione(posizione);
  const s = definitivi.filter((c) => c.firma <= cessazione).flatMap((c) => c.scaglionamenti).filter((x) => x.decorrenza <= primo);
  const tabellare = ultimo(s.filter((x) => x.tipo === 'tabellare'))!;
  const comparto = ultimo(definitivi.flatMap((c) => c.indennitaComparto).filter((x) => x.decorrenza <= primo))!;
  return {
    '01': tabellare.importi[tabellare.chiave === 'area' ? t.area : posizione].mensile,
    '02': tabellare.chiave === 'area' ? t.differenzialeBase : 0,
    '10': comparto.importi[t.area].mensile,
  };
}

const inserite = (caso: CasoNormativoMiglioramento, m: MeseISO): VociMese => ({...caso.dati.voci.base, ...caso.dati.voci.eccezioni[m]});
const senzaZeri = (v: VociMese): VociMese => Object.fromEntries(Object.entries(v).filter(([, x]) => x));

function um(v: VociMese) {
  const voci = Object.keys(v).filter((k) => catalogo(k).utile.pensione).sort();
  const righe = voci.map((voce) => ({voce, mensile: v[voce]!, valore: v[voce]! * catalogo(voce).mensilita}));
  const con13 = voci.filter((k) => catalogo(k).utile.tredicesima);
  const totaleAnnui = righe.reduce((s, r) => s + r.valore, 0);
  const tredicesima = con13.reduce((s, k) => s + v[k]!, 0);
  return {righe, tredicesima: {voci: con13, valore: tredicesima}, totaleAnnui, totale: totaleAnnui + tredicesima};
}

/** Le 9 righe TFS (D16): Σ dei 12 mesi, 13ª = Σ / 12 half-up (D20). */
function righeTfs(vociDi: (m: MeseISO) => VociMese, finestra: MeseISO[]) {
  return tabelle.righePassweb.tfs.map((riga) => {
    if (riga.id !== 'tredicesima') {
      const n = finestra.reduce((s, m) => s + riga.voci.reduce((t, k) => t + (vociDi(m)[k] ?? 0), 0), 0);
      return {riga: riga.id, pieno: String(n), valore: n};
    }
    const n = BigInt(finestra.reduce((s, m) => s + riga.voci.reduce((t, k) => t + (vociDi(m)[k] ?? 0), 0), 0));
    const mcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : mcd(b, a % b));
    const g = mcd(n, 12n);
    const [num, d] = [n / g, 12n / g];
    return {riga: riga.id, pieno: d === 1n ? `${num}` : `${num}/${d}`, valore: Number((2n * n + 12n) / 24n)};
  });
}

describe('casi normativi del miglioramento contrattuale: coerenza dei dati, senza il motore', () => {
  it('casi MC-N01… con id unici, solo dati di fantasia', () => {
    expect(casiNormativiMiglioramento.map((c) => c.id)).toEqual(
      Array.from({length: casiNormativiMiglioramento.length}, (_, i) => `MC-N${String(i + 1).padStart(2, '0')}`),
    );
    for (const caso of casiNormativiMiglioramento) expect(caso.dati.anagrafica.codiceFiscale).toBe('RSSMRA80A01H501U');
  });

  it("HITL: ogni risultato atteso è validato dall'utente", () => {
    for (const caso of casiNormativiMiglioramento) expect(caso.validazione.stato, caso.id).toBe('validato');
  });

  it('copertura: pensione erogata uguale, diversa, assente e superiore al migliorato; regime TFR; 2019-21; ipotesi; blocco', () => {
    const codici = casiNormativiMiglioramento.flatMap((c) => c.atteso.avvisi.map((a) => a.codice));
    for (const c of ['pensione-erogata-diversa', 'nessun-miglioramento-reale', 'tfs-da-modificare', 'contratto-in-ipotesi']) expect(codici, c).toContain(c);
    const esiti = new Set(casiNormativiMiglioramento.map((c) => c.atteso.esito));
    expect(esiti).toEqual(new Set(['calcolato', 'senza-importi', 'bloccato']));
    expect(casiNormativiMiglioramento.some((c) => c.atteso.esito === 'calcolato' && !c.dati.pensioneErogata)).toBe(true);
    expect(casiNormativiMiglioramento.some((c) => c.dati.regime === 'TFR' && c.atteso.esito === 'calcolato')).toBe(true);
    expect(new Set(casiNormativiMiglioramento.map((c) => c.dati.miglioramento.contratto))).toEqual(new Set(['ccnl-2019-21', 'ccnl-2022-24', 'ccnl-2025-27']));
  });

  for (const caso of casiNormativiMiglioramento) {
    describe(caso.id, () => {
      const {atteso, dati} = caso;
      const cessazione = dati.anagrafica.cessazione!;
      const scelto = contratto(dati.miglioramento.contratto);
      const applicabile = cessazione >= scelto.vigenza.dal && cessazione <= scelto.vigenza.al && scelto.firma > cessazione;

      it('esito dalla tabella dei contratti: vigenza e firma (C21-5), ipotesi senza importi (T5)', () => {
        if (!applicabile) {
          expect(atteso.esito).toBe('bloccato');
          expect(atteso.blocchi).toEqual([
            expect.objectContaining({codice: 'miglioramento-non-applicabile', contratto: scelto.id, vigenzaDal: scelto.vigenza.dal, vigenzaAl: scelto.vigenza.al, firma: scelto.firma}),
          ]);
          expect(atteso.avvisi).toEqual([]);
          return;
        }
        expect(atteso.blocchi).toEqual([]);
        if (scelto.stato === 'ipotesi') {
          expect(atteso.esito).toBe('senza-importi');
          expect(atteso.avvisi).toEqual([expect.objectContaining({codice: 'contratto-in-ipotesi', dati: {contratto: scelto.id, vigenzaDal: scelto.vigenza.dal}})]);
          expect(atteso.scenarioA).toBeUndefined();
          return;
        }
        expect(atteso.esito).toBe('calcolato');
      });

      if (atteso.esito !== 'calcolato') return;
      const def = scelto as ContrattoDefinitivo;
      const mesePensione = cessazione.slice(0, 7);

      it('voci inserite = cedolino prima della firma (01, 02, 10 dei contratti firmati entro la cessazione)', () => {
        if (caso.vociPreFirmaFuoriTabelle) return;
        const attese = preFirma(dati.anagrafica.posizione, mesePensione, cessazione);
        const v = inserite(caso, mesePensione);
        for (const voce of ['01', '02', '10'] as const) expect(v[voce] ?? 0, voce).toBe(attese[voce]);
      });

      it('Scenario A = UM dalle voci inserite così come sono, IVC compresa (C21-7)', () => {
        expect(atteso.scenarioA).toEqual({...um(senzaZeri(inserite(caso, mesePensione))), mese: mesePensione});
      });

      it('decorrenze: il giorno dopo la pensione se c\'è uno scaglionamento fino alla cessazione, poi uno per scaglionamento successivo nella vigenza (C21-6)', () => {
        const nella = def.scaglionamenti.filter((s) => s.decorrenza >= def.vigenza.dal && s.decorrenza <= def.vigenza.al);
        const attese = [
          ...(nella.some((s) => s.decorrenza <= cessazione) ? [giornoDopo(cessazione)] : []),
          ...[...new Set(nella.filter((s) => s.decorrenza > cessazione).map((s) => s.decorrenza))].sort(),
        ];
        expect(atteso.migliorati!.map((b) => b.decorrenza)).toEqual(attese);
      });

      it('Scenario B per decorrenza: 01, 02, 09, 10 dalle tabelle, le altre voci inserite (T12); differenza su fissi e 13ª', () => {
        for (const b of atteso.migliorati!) {
          const sost = sostituite(dati.anagrafica.posizione, def, b.decorrenza, cessazione);
          expect(b.sostituite, b.decorrenza).toEqual(sost);
          const atteso_ = um(senzaZeri({...inserite(caso, mesePensione), ...sost}));
          expect({righe: b.righe, tredicesima: b.tredicesima, totaleAnnui: b.totaleAnnui, totale: b.totale}, b.decorrenza).toEqual(atteso_);
          expect(b.differenza).toEqual({annui: b.totaleAnnui - atteso.scenarioA!.totaleAnnui, tredicesima: b.tredicesima.valore - atteso.scenarioA!.tredicesima.valore});
        }
      });

      it('avvisi sulla pensione erogata (T4): diversa da A; nessun miglioramento reale per decorrenza', () => {
        const codici = (c: string) => atteso.avvisi.filter((a) => a.codice === c);
        const e = dati.pensioneErogata;
        const A = atteso.scenarioA!;
        const diversa = !!e && (e.fissi !== A.totaleAnnui || e.tredicesima !== A.tredicesima.valore);
        expect(codici('pensione-erogata-diversa').length).toBe(diversa ? 1 : 0);
        const reali = e ? atteso.migliorati!.filter((b) => b.totale <= e.fissi + e.tredicesima).map((b) => b.decorrenza) : [];
        expect(codici('nessun-miglioramento-reale').map((a) => a.dati.decorrenza)).toEqual(reali);
      });

      it('TFS: di miglioramento mese per mese con gli scaglionamenti fino alla cessazione; avviso se diverso dal TFS ordinario (C21-8); TFR mai', () => {
        const codici = atteso.avvisi.filter((a) => a.codice === 'tfs-da-modificare');
        if (dati.regime === 'TFR') {
          expect(atteso.tfs).toBeUndefined();
          expect(codici).toEqual([]);
          return;
        }
        const finestra = mesiFinestra(mesePensione);
        expect(atteso.tfs!.mesi).toEqual({dal: finestra[0], al: finestra[11]});
        // TFS ordinario sulle voci inserite: l'IVC 2020-2023 vale 0 con le tabelle di oggi (D8, T6).
        const ordinario = righeTfs((m) => ({...inserite(caso, m), ...(inserite(caso, m)['09'] !== undefined && {'09': 0})}), finestra);
        const migliorato = righeTfs((m) => ({...inserite(caso, m), ...sostituite(dati.anagrafica.posizione, def, `${m}-01`, cessazione)}), finestra);
        expect(atteso.tfs!.ordinario).toEqual(ordinario.map((r) => ({riga: r.riga, valore: r.valore})));
        expect(atteso.tfs!.righe).toEqual(migliorato);
        expect(atteso.tfs!.totale).toBe(migliorato.reduce((s, r) => s + r.valore, 0));
        const diverse = migliorato.filter((r, i) => r.valore !== ordinario[i].valore).map((r) => r.riga);
        expect(codici.map((a) => a.dati.righe)).toEqual(diverse.length ? [diverse.join(',')] : []);
      });

      it('passi presenti, ogni UM migliorato con decisioni e fonte', () => {
        expect(caso.passi.length).toBeGreaterThan(0);
        for (const b of atteso.migliorati!) {
          expect(b.decisioni.length).toBeGreaterThan(0);
          expect(b.fonte.length).toBeGreaterThan(20);
        }
      });
    });
  }
});
