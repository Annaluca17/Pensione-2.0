// Ultimo miglio TFS (D3, D4, D14, D16, D17, D20). Interno al motore: lo chiamano calcolaPratica e il
// miglioramento contrattuale (righe del TFS migliorato).
import {componi, totale} from './composizione';
import {conIvcDaTabella} from './contratti';
import {spostaMese} from './date';
import type {Addendo, Avviso, CodiceVoce, MeseISO, MeseRetribuzione, Operazione, RigaTfs, Tabelle, Tfs} from './tipi';

const FONTE_ANNUALIZZATO =
  'D2: con un solo mese inserito il TFS annualizza e lo segnala come semplificazione; C20-3 (un solo mese = nessuna eccezione nelle voci)';

interface Ingresso {
  /** I 12 mesi effettivi fino al mese della data di fine TFS (o meno, dal mese di assunzione). */
  mesi: MeseRetribuzione[];
  /** Un solo mese inserito (C20-3): ogni riga è il mese di fine TFS × 12. */
  annualizza: boolean;
  posizione: string;
  tabelle: Tabelle;
}

/** Calcola l'UM TFS. */
export function calcolaTfs({mesi: tutti, annualizza, posizione, tabelle}: Ingresso): {tfs: Tfs; avvisi: Avviso[]} {
  // IVC dalla tabella mese per mese (D8, T6): un avviso per ogni mese con IVC incompatibile.
  const avvisi: Avviso[] = [];
  const inseriti = annualizza ? tutti.slice(-1) : tutti;
  const fine = tutti[tutti.length - 1].mese;
  if (annualizza) avvisi.push({tipo: 'avviso', codice: 'tfs-annualizzato', mese: fine, mesi: 12, fonte: FONTE_ANNUALIZZATO});
  const mesi = inseriti.map((m) => {
    const {voci, avviso} = conIvcDaTabella(m.voci, m.mese, posizione, tabelle);
    if (avviso) avvisi.push(avviso);
    return {mese: m.mese, voci};
  });
  const operazioni: Operazione[] = annualizza
    ? [{tipo: 'moltiplica', per: 12, motivo: `mese ${fine} annualizzato (×12)`, fonte: FONTE_ANNUALIZZATO}]
    : [];
  const righe = righeTfs(
    mesi.map((m) => ({mese: m.mese, addendiDi: (voce) => ((m.voci[voce] ?? 0) !== 0 ? [{voce, mese: m.mese, importo: m.voci[voce]!}] : [])})),
    operazioni,
    tabelle,
  );
  return {
    tfs: {
      dal: annualizza ? spostaMese(fine, -11) : mesi[0].mese,
      al: fine,
      righe,
      totale: totale(righe.map((r) => r.composizione)),
      ...(annualizza && {annualizzato: true as const}),
    },
    avvisi,
  };
}

/**
 * Le 9 righe della maschera dagli addendi di ogni voce per mese (una voce dalle tabelle può averne più
 * d'uno, es. tabellare + incremento): Σ sui mesi (D3), 13ª = Σ / 12 (D20); `operazioni` prima della
 * divisione della 13ª; `fonte` si aggiunge a quella della riga (es. il miglioramento, C21-8).
 */
export function righeTfs(
  mesi: {mese: MeseISO; addendiDi: (voce: CodiceVoce) => Addendo[]}[],
  operazioni: Operazione[],
  tabelle: Tabelle,
  fonte?: string,
): RigaTfs[] {
  return tabelle.righePassweb.tfs.map((def) => ({
    id: def.id,
    etichetta: def.etichetta,
    ...(def.campoPassweb && {campoPassweb: def.campoPassweb}),
    composizione: componi({
      addendi: mesi.flatMap((m) => def.voci.flatMap(m.addendiDi)),
      // La 13ª è la Σ dei 12 mesi / 12 (D20); le altre righe la sola Σ (D3).
      operazioni: [...operazioni, ...(def.id === 'tredicesima' ? [{tipo: 'dividi' as const, per: 12, motivo: 'Σ 12 mesi / 12 (13ª)', fonte: def.fonte}] : [])],
      fonte: fonte ? `${def.fonte}; ${fonte}` : def.fonte,
    }),
  }));
}
