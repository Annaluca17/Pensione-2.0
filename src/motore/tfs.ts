// Ultimo miglio TFS (D3, D4, D14, D16, D17, D20). Interno al motore: lo chiama solo calcolaPratica.
import {componi, totale} from './composizione';
import {conIvcDaTabella} from './contratti';
import {spostaMese} from './date';
import type {Addendo, Avviso, MeseRetribuzione, Operazione, RigaTfs, Tabelle, Tfs} from './tipi';

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
  const addendi = (voci: readonly string[]): Addendo[] =>
    mesi.flatMap((m) =>
      voci
        .filter((voce) => (m.voci[voce] ?? 0) !== 0)
        .map((voce) => ({voce, mese: m.mese, importo: m.voci[voce]!})),
    );
  const righe: RigaTfs[] = tabelle.righePassweb.tfs.map((def) => {
    // La 13ª è la Σ dei 12 mesi / 12 (D20); le altre righe la sola Σ (D3).
    const operazioni: Operazione[] = [
      ...(annualizza ? [{tipo: 'moltiplica' as const, per: 12, motivo: `mese ${fine} annualizzato (×12)`, fonte: FONTE_ANNUALIZZATO}] : []),
      ...(def.id === 'tredicesima' ? [{tipo: 'dividi' as const, per: 12, motivo: 'Σ 12 mesi / 12 (13ª)', fonte: def.fonte}] : []),
    ];
    return {
      id: def.id,
      etichetta: def.etichetta,
      ...(def.campoPassweb && {campoPassweb: def.campoPassweb}),
      composizione: componi({addendi: addendi(def.voci), operazioni, fonte: def.fonte}),
    };
  });
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
