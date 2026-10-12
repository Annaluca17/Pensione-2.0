/**
 * REPERTO — copia fedele del calcolo dell'Unificato attuale
 * (src/components/CalcoloUnificatoUltimoMiglio.tsx: costanti TAB / IVC_TABLE_2023 / PEO_TABLE /
 * MESI / VOCI, r2, getNuovoTab, getUltimi12Mesi, calcPensione, calcTFS e la catena di useMemo del
 * componente), presa per produrre la fotografia del vecchio (ADR 0001, ticket 19).
 *
 * Nel componente il calcolo è intrecciato con lo stato React; qui la catena di useMemo è estratta
 * tale e quale in una funzione pura. Ingressi = lo stato che la catena legge (dataCessazione, imp,
 * mcOn, mcPos, mcDec, peoInBase, stips, exc, ivcOvr); uscite = resPensione, resTFS, resPensioneMC,
 * resTFSMC.
 *
 * DA CANCELLARE nella pulizia finale (ticket 36), insieme al vecchio modulo; gli importi in
 * fotografia.json restano.
 *
 * Non correggere nulla: descrive cosa fa il vecchio, non cosa è giusto. Isolato: nessun import dal
 * motore, dalle tabelle o dal resto del sito.
 */

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface VocePensione {
  id: string;
  n: string;
  v13: boolean;
  x: number;
  tfs: boolean;
}

interface TabellaArea {
  area: string;
  t24: number;
  t26: number;
  pos: string[];
}

export interface RisultatoTFS {
  tabG:        number;
  ria:         number;
  tred:        number;
  assAss:      number;
  asili:       number;
  assNonRiass: number;
  ind64:       number;
  vig:         number;
  diff:        number;
  tot:         number;
}

interface MeseRif {
  mese: string;
  anno: number;
  meseIdx: number;
  isEligibilePerMC: boolean;
}

type DecId = '2024' | '2026';

// ─── Costanti ────────────────────────────────────────────────────────────────

const TAB: TabellaArea[] = [
  { area: 'Funzionari ed E.Q. (Area D)', t24: 2078.47, t26: 2092.84, pos: ['D1','D2','D3','D4','D5','D6','D7'] },
  { area: 'Istruttori (Area C)',          t24: 1915.55, t26: 1928.23, pos: ['C1','C2','C3','C4','C5','C6'] },
  { area: 'Operatori Esperti (Area B)',   t24: 1704.38, t26: 1715.27, pos: ['B1','B2','B3','B4','B5','B6','B7','B8'] },
  { area: 'Operatori (Area A)',           t24: 1637.12, t26: 1646.09, pos: ['A1','A2','A3','A4','A5','A6'] },
];

const IVC_TABLE_2023: Record<string, number> = {
  D7: 13.50, D6: 12.85, D5: 12.02, D4: 11.52, D3: 11.06, D2: 10.13, D1: 9.67,
  C6: 10.27, C5: 10.00, C4:  9.65, C3:  9.36, C2:  9.12, C1:  8.91,
  B8:  9.30, B7:  9.10, B6:  8.77, B5:  8.62, B4:  8.49, B3:  8.36, B2:  8.06, B1: 7.93,
  A6:  8.20, A5:  8.06, A4:  7.90, A3:  7.77, A2:  7.62, A1:  7.52,
};

const PEO_TABLE: Record<string, number> = {
  D7: 764.82, D6: 634.82, D5: 468.93, D4: 369.86, D3: 278.45, D2: 91.30, D1: 0,
  C6: 271.84, C5: 216.41, C4: 146.52, C3:  89.74, C2:  41.14, C1:   0,
  B8: 273.99, B7: 234.15, B6: 168.45, B5: 138.15, B4: 110.83, B3: 86.53, B2: 25.10, B1: 0,
  A6: 136.05, A5: 108.38, A4:  77.02, A3:  50.74, A2:  19.91, A1:   0,
};

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const VOCI: VocePensione[] = [
  { id:'01', n:'Stipendio tabellare',                                v13:true,  x:12, tfs:false },
  { id:'02', n:'Differenziale storico (ex PEO)',                     v13:true,  x:12, tfs:true  },
  { id:'03', n:'Differenziale stipendiale CCNL 2019-2021',           v13:true,  x:12, tfs:true  },
  { id:'04', n:'Assegno ad personam non riassorbibile IIS (art. 29 c.4 CCNL 2004)', v13:true, x:12, tfs:true },
  { id:'05', n:'Assegno ad personam assorbibile prog. verticale',    v13:true,  x:12, tfs:true  },
  { id:'06', n:'Salario Individuale di Anzianità (ex R.I.A.)',       v13:true,  x:12, tfs:true  },
  { id:'07', n:'Retribuzione di Posizione',                          v13:true,  x:12, tfs:false },
  { id:'08', n:'Indennità specifica ex art.4 CCNL (€ 5,38/mese)',   v13:false, x:12, tfs:true  },
  { id:'09', n:'Indennità di Vacanza Contrattuale (IVC)',            v13:true,  x:12, tfs:false },
  { id:'10', n:'Indennità di Comparto',                              v13:false, x:12, tfs:false },
  { id:'11', n:'Indennità di vigilanza',                             v13:false, x:12, tfs:true  },
  { id:'12', n:'Ind. Professionale asili nido (€ 55,40/mese)',      v13:false, x:12, tfs:true  },
  { id:'13', n:'Ind. Aggiuntiva asili nido (€ 28,41/mese)',         v13:false, x:12, tfs:true  },
  { id:'14', n:'Ind. Tempo potenziato scolastico (× 10 mesi)',      v13:false, x:10, tfs:false },
  { id:'15', n:'Trattamento accessorio asili nido (× 10 mesi)',     v13:false, x:10, tfs:false },
];

// ─── Utils ───────────────────────────────────────────────────────────────────

const r2  = (n: number): number => Math.round((n || 0) * 100) / 100;

function getNuovoTab(pos: string, dec: DecId): number {
  if (!pos) return 0;
  const ltr = pos[0].toUpperCase() as 'D'|'C'|'B'|'A';
  const idx  = { D:0, C:1, B:2, A:3 }[ltr];
  if (idx == null) return 0;
  return dec === '2024' ? TAB[idx].t24 : TAB[idx].t26;
}

function getUltimi12Mesi(dataCessazione: string): MeseRif[] {
  if (!dataCessazione || dataCessazione.length < 7) return [];
  const [y, m] = dataCessazione.split('-').map(Number);
  const result: MeseRif[] = [];
  for (let i = 11; i >= 0; i--) {
    let mi = (m - 1) - i;
    let yi = y;
    while (mi < 0) { mi += 12; yi--; }
    result.push({ mese: MESI[mi], anno: yi, meseIdx: mi, isEligibilePerMC: yi >= 2024 });
  }
  return result;
}

// ─── Motori di calcolo ────────────────────────────────────────────────────────

export interface CalcPensioneResult {
  a: number;
  t: number;
  voci: Array<{ id:string; n:string; v13:boolean; m:number; a:number }>;
}

function calcPensione(imp: Record<string, string>, overrideTab?: number): CalcPensioneResult {
  const voci = VOCI.map(v => {
    const m = v.id === '01' && overrideTab != null
      ? overrideTab
      : r2(parseFloat(imp[v.id]) || 0);
    return { id:v.id, n:v.n, v13:v.v13, m, a:r2(m * v.x) };
  });
  return {
    a: r2(voci.reduce((s, v) => s + v.a, 0)),
    t: r2(voci.filter(v => v.v13).reduce((s, v) => s + v.m, 0)),
    voci,
  };
}

function calcTFS(
  stipEff: Array<{ s: number; t: number; ivc: number }>,
  imp: Record<string, string>,
): RisultatoTFS {
  const vm   = (id: string) => r2(parseFloat(imp[id]) || 0);
  const sS   = r2(stipEff.reduce((acc, v) => acc + v.s,   0));
  const sT   = r2(stipEff.reduce((acc, v) => acc + v.t,   0));
  const sIVC = r2(stipEff.reduce((acc, v) => acc + v.ivc, 0));

  const tabG        = r2(sS + sIVC);
  const ria         = r2(vm('06') * 12);
  const ivcUltimo   = stipEff.length > 0 ? stipEff[stipEff.length - 1].ivc : 0;
  const tred        = r2(sT + vm('02') + vm('03') + vm('04') + vm('05') + vm('06') + ivcUltimo);
  const assAss      = r2(vm('05') * 12);
  const asili       = r2((vm('12') + vm('13')) * 12);
  const assNonRiass = r2(vm('04') * 12);
  const ind64       = r2(vm('08') * 12);
  const vig         = r2(vm('11') * 12);
  const diff        = r2((vm('02') + vm('03')) * 12);
  const tot         = r2(tabG + ria + tred + assAss + asili + assNonRiass + ind64 + vig + diff);

  return { tabG, ria, tred, assAss, asili, assNonRiass, ind64, vig, diff, tot };
}

// ─── Catena del componente (i useMemo di CalcoloUnificatoUltimoMiglio) ───────

export interface IngressiUnificato {
  dataCessazione: string;
  imp: Record<string, string>;
  mcOn: boolean;
  mcPos: string;
  mcDec: DecId;
  peoInBase: boolean;
  stips: string[];
  exc: boolean[];
  ivcOvr: string[];
}

export interface UsciteUnificato {
  pensione: CalcPensioneResult;
  tfs: RisultatoTFS;
  pensioneMC: CalcPensioneResult | null;
  tfsMC: RisultatoTFS | null;
}

export function calcolaUnificato(ingressi: IngressiUnificato): UsciteUnificato {
  const { imp, mcOn, mcPos, mcDec, peoInBase, stips, exc, ivcOvr } = ingressi;
  const ana = { dataCessazione: ingressi.dataCessazione };

  const base     = r2(parseFloat(imp['01']) || 0);
  const nuovoTab = getNuovoTab(mcPos, mcDec);

  const peoDiff = mcOn && mcPos ? (PEO_TABLE[mcPos] ?? 0) : 0;

  const effImpBase = peoInBase && mcOn && mcPos ? { ...imp, '02': String(peoDiff) } : imp;

  const effImpMC = mcOn && mcPos ? { ...imp, '02': String(peoDiff) } : imp;

  const isMCEligibile    = ana.dataCessazione.length === 10 && ana.dataCessazione >= '2022-01-01';
  const isMCTFSEligibile = ana.dataCessazione.length === 10 && ana.dataCessazione >= '2024-01-01';

  const ultimi12 = getUltimi12Mesi(ana.dataCessazione);

  const ivcEff = (() => {
    const ivc09 = r2(parseFloat(imp['09']) || 0);
    return ultimi12.map((m, i) => {
      if (ivcOvr[i] !== '') return r2(parseFloat(ivcOvr[i]) || 0);
      if (mcPos && m.anno === 2023) return IVC_TABLE_2023[mcPos] ?? 0;
      if (m.anno >= 2024) return ivc09;
      return 0;
    });
  })();

  const stipsEffBase = ultimi12.map((_, i) => exc[i] ? stips[i] : String(base));

  const stipsEffMC = ultimi12.map((m, i) =>
    exc[i]
      ? stips[i]
      : (isMCTFSEligibile && mcOn && mcPos && m.isEligibilePerMC ? String(nuovoTab) : String(base))
  );

  const stipEffBase = stipsEffBase.map((s, i) => {
    const v = r2(parseFloat(s) || 0);
    return { s: v, t: r2(v / 12), ivc: ivcEff[i] };
  });

  const stipEffMC = stipsEffMC.map((s, i) => {
    const v = r2(parseFloat(s) || 0);
    return { s: v, t: r2(v / 12), ivc: ivcEff[i] };
  });

  const resPensione   = calcPensione(effImpBase);
  const resTFS        = calcTFS(stipEffBase, effImpBase);

  const resPensioneMC = isMCEligibile && mcOn && mcPos ? calcPensione(effImpMC, nuovoTab) : null;

  const resTFSMC = isMCTFSEligibile && mcOn && mcPos ? calcTFS(stipEffMC, effImpMC) : null;

  return { pensione: resPensione, tfs: resTFS, pensioneMC: resPensioneMC, tfsMC: resTFSMC };
}
