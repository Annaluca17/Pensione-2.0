// Ultimo miglio di pensione (storia 39; D2, D4, D15, D16, D17). Interno al motore: lo chiamano
// calcolaPratica e il miglioramento contrattuale (Scenario A e migliorati).
import {componi, totale} from './composizione';
import {avvisiIpotesi, conIvcDaTabella} from './contratti';
import {meseDi} from './date';
import type {Addendo, Avviso, CodiceVoce, DataISO, MeseISO, RigaPensione, Tabelle, UmPensione, VociMese} from './tipi';

interface Ingresso {
  /** Data di riferimento della pensione. */
  data: DataISO;
  /** Voci a tempo pieno del mese: la pensione usa la voce intera anche per i part-time (D4). */
  voci: VociMese;
  posizione: string;
  tabelle: Tabelle;
  /**
   * Col miglioramento la pensione è quella di allora (ticket 01 delle prove): le voci come inserite, IVC
   * compresa, cioè lo Scenario A (C21-7). Le tabelle non ricostruiscono l'IVC di allora (l'IVC 2019-21 non c'è).
   */
  comeInserite?: boolean;
}

/** Calcola l'UM pensione; gli avvisi vanno nel risultato. */
export function calcolaUmPensione({data, voci: inserite, posizione, tabelle, comeInserite}: Ingresso): {umPensione: UmPensione; avvisi: Avviso[]} {
  const mese = meseDi(data);
  // IVC dalla tabella del contratto applicato (D8, T6), salvo la pensione di allora; una riga per voce presente nel mese.
  const {voci, avviso} = comeInserite ? {voci: inserite, avviso: undefined} : conIvcDaTabella(inserite, mese, posizione, tabelle);
  return {
    umPensione: umDaVoci(mese, voci, tabelle),
    avvisi: [...(avviso ? [avviso] : []), ...avvisiIpotesi(tabelle, data)],
  };
}

/** UM pensione del mese dalle voci così come sono, un addendo per voce (es. Scenario A, C21-7). */
export function umDaVoci(mese: MeseISO, voci: VociMese, tabelle: Tabelle): UmPensione {
  return componiUm(mese, (voce) => ((voci[voce] ?? 0) !== 0 ? [{voce, mese, importo: voci[voce]!}] : []), tabelle);
}

/**
 * UM pensione dagli addendi di ogni voce (una voce dalle tabelle può averne più d'uno, es. tabellare +
 * incremento): una riga per voce presente (≠ 0) nell'ordine di `righePassweb.pensione`, mensile ×
 * mensilità del catalogo; 13ª = somma dei mensili delle voci della sua riga; totali D17.
 * `fonteVoce` aggiunge alla fonte della riga quella della voce, quando non è inserita.
 */
export function componiUm(mese: MeseISO, addendiDi: (voce: CodiceVoce) => Addendo[], tabelle: Tabelle, fonteVoce?: (voce: CodiceVoce) => string | undefined): UmPensione {
  const {righe: definizioni, tredicesima: definizione13} = tabelle.righePassweb.pensione;
  const presente = (voce: string) => addendiDi(voce).reduce((s, a) => s + a.importo, 0) !== 0;
  const fonte = (base: string, voci: readonly string[]) =>
    [base, ...new Set(voci.flatMap((v) => fonteVoce?.(v) ?? []))].join('; ');

  const righe: RigaPensione[] = [];
  for (const riga of definizioni) {
    for (const voce of riga.voci.filter(presente)) {
      const catalogo = tabelle.catalogoVoci.find((v) => v.codice === voce);
      if (!catalogo) throw new Error(`calcolaUmPensione: voce ${voce} assente dal catalogo`);
      const operazioni = [
        {tipo: 'moltiplica' as const, per: catalogo.mensilita, motivo: `${catalogo.mensilita} mensilità annue`, fonte: catalogo.fonte},
      ];
      righe.push({id: riga.id, etichetta: riga.etichetta, voce, composizione: componi({addendi: addendiDi(voce), operazioni, fonte: fonte(riga.fonte, [voce])})});
    }
  }
  const voci13 = definizione13.voci.filter(presente);
  const tredicesima = {
    id: definizione13.id,
    etichetta: definizione13.etichetta,
    composizione: componi({addendi: voci13.flatMap(addendiDi), operazioni: [], fonte: fonte(definizione13.fonte, voci13)}),
  };
  const totaleAnnui = totale(righe.map((r) => r.composizione));
  return {mese, righe, tredicesima, totaleAnnui, totale: totaleAnnui + tredicesima.composizione.arrotondato};
}
