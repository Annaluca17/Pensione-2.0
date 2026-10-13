// Selezione dei contratti per data (T5, T6, D8): interno al motore.
import type {Avviso, ContrattoDefinitivo, DataISO, MeseISO, Tabelle, VociMese} from './tipi';

export const FONTE_IVC =
  'D8: IVC del mese = quella del contratto successivo a quello applicato (CCNL 2022-24 art. 56; Ipotesi 2025-27 art. 35 c. 3)';

const FONTE_IPOTESI =
  "T5: un'ipotesi è caricata ma non applicata, non produce importi; alla firma cambia la versione delle tabelle e la pratica torna da rilavorare (ADR 0003, 0004)";

const VOCE_IVC = '09';

/** Un avviso per ogni ipotesi nella cui vigenza cade la data (T5). */
export function avvisiIpotesi(tabelle: Tabelle, data: DataISO): Avviso[] {
  return tabelle.contratti
    .filter((c) => c.stato === 'ipotesi' && c.vigenza.dal <= data && data <= c.vigenza.al)
    .map((c) => ({tipo: 'avviso', codice: 'contratto-in-ipotesi', contratto: c.id, vigenzaDal: c.vigenza.dal, fonte: FONTE_IPOTESI}));
}

/** Contratti definitivi = quelli applicati con tutti i loro scaglionamenti (D8). */
const definitivi = (tabelle: Tabelle) =>
  tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');

/**
 * IVC utile del mese (D8): un periodo di IVC vale solo se il contratto che anticipa non è applicato;
 * quella di un contratto definitivo è riassorbita nel suo tabellare. `firmatiEntro` (ticket 01): con il
 * miglioramento la pensione usa le tabelle di allora, quindi conta solo ciò che era firmato a quella data;
 * i periodi stanno nel contratto che li riassorbe, anche se firmato dopo, e valgono se questo non è applicato.
 */
export function ivcDaTabella(
  tabelle: Tabelle,
  posizione: string,
  mese: MeseISO,
  firmatiEntro?: DataISO,
): {importo: number; contratto: string; mancante?: {chiave: string; fonte: string}} {
  const primo = `${mese}-01`;
  const tutti = definitivi(tabelle);
  const applicati = firmatiEntro ? tutti.filter((c) => c.firma <= firmatiEntro) : tutti;
  const ids = new Set(applicati.map((c) => c.id));
  const contratto = applicati.filter((c) => c.vigenza.dal <= primo).sort((x, y) => x.vigenza.dal.localeCompare(y.vigenza.dal)).at(-1);
  const area = tabelle.trasposizione.find((t) => t.posizione === posizione)?.area;
  const periodo = tutti
    .flatMap((c) => c.ivc)
    .find((i) => !ids.has(i.anticipa) && i.dal <= primo && (!i.al || i.al >= primo));
  const chiave = periodo?.chiave === 'posizione' ? posizione : area;
  const valore = periodo && chiave ? periodo.importi[chiave] : undefined;
  // Un periodo non riassorbito senza il valore per la chiave: la tabella non lo ha (ticket 24), diverso da 'riassorbita' (0).
  const mancante = periodo && !valore ? {chiave: chiave ?? posizione, fonte: periodo.fonte} : undefined;
  return {importo: valore?.mensile ?? 0, contratto: contratto?.id ?? '', ...(mancante && {mancante})};
}

/**
 * Le voci del mese con l'IVC della tabella al posto di quella inserita (D8, storia 50): un'IVC diversa
 * non si somma e dà un avviso; un'IVC non inserita resta assente (il motore non aggiunge importi).
 */
export function conIvcDaTabella(
  voci: VociMese,
  mese: MeseISO,
  posizione: string,
  tabelle: Tabelle,
  firmatiEntro?: DataISO,
): {voci: VociMese; avviso?: Avviso} {
  const inserita = voci[VOCE_IVC];
  if (inserita === undefined) return {voci};
  const ivc = ivcDaTabella(tabelle, posizione, mese, firmatiEntro);
  const avviso: Avviso | undefined =
    inserita === ivc.importo
      ? undefined
      : ivc.mancante
        ? {tipo: 'avviso', codice: 'ivc-non-tabulata', mese, inserita, chiave: ivc.mancante.chiave, contrattoApplicato: ivc.contratto, fonte: ivc.mancante.fonte}
        : {tipo: 'avviso', codice: 'ivc-incompatibile', mese, inserita, daTabella: ivc.importo, contrattoApplicato: ivc.contratto, fonte: FONTE_IVC};
  return {voci: {...voci, [VOCE_IVC]: ivc.importo}, ...(avviso && {avviso})};
}
