// Ultimo miglio di pensione (storia 39; D2, D4, D15, D16, D17). Interno al motore: lo chiama solo
// calcolaPratica.
import {componi, totale} from './composizione';
import {avvisiIpotesi, conIvcDaTabella} from './contratti';
import {meseDi} from './date';
import type {Addendo, Avviso, DataISO, RigaPensione, Tabelle, UmPensione, VociMese} from './tipi';

interface Ingresso {
  /** Data di riferimento della pensione. */
  data: DataISO;
  /** Voci a tempo pieno del mese: la pensione usa la voce intera anche per i part-time (D4). */
  voci: VociMese;
  posizione: string;
  tabelle: Tabelle;
}

/** Calcola l'UM pensione; gli avvisi vanno nel risultato. */
export function calcolaUmPensione({data, voci: inserite, posizione, tabelle}: Ingresso): {umPensione: UmPensione; avvisi: Avviso[]} {
  const mese = meseDi(data);
  // IVC dalla tabella del contratto applicato (D8, T6); una riga per voce presente nel mese.
  const {voci, avviso} = conIvcDaTabella(inserite, mese, posizione, tabelle);
  const {righe: definizioni, tredicesima: definizione13} = tabelle.righePassweb.pensione;
  const presente = (voce: string) => (voci[voce] ?? 0) !== 0;
  const addendo = (voce: string): Addendo => ({voce, mese, importo: voci[voce]!});

  const righe: RigaPensione[] = [];
  for (const riga of definizioni) {
    for (const voce of riga.voci.filter(presente)) {
      const catalogo = tabelle.catalogoVoci.find((v) => v.codice === voce);
      if (!catalogo) throw new Error(`calcolaUmPensione: voce ${voce} assente dal catalogo`);
      const operazioni = [
        {tipo: 'moltiplica' as const, per: catalogo.mensilita, motivo: `${catalogo.mensilita} mensilità annue`, fonte: catalogo.fonte},
      ];
      righe.push({id: riga.id, etichetta: riga.etichetta, voce, composizione: componi({addendi: [addendo(voce)], operazioni, fonte: riga.fonte})});
    }
  }
  const tredicesima = {
    id: definizione13.id,
    etichetta: definizione13.etichetta,
    composizione: componi({addendi: definizione13.voci.filter(presente).map(addendo), operazioni: [], fonte: definizione13.fonte}),
  };
  const totaleAnnui = totale(righe.map((r) => r.composizione));
  return {
    umPensione: {mese, righe, tredicesima, totaleAnnui, totale: totaleAnnui + tredicesima.composizione.arrotondato},
    avvisi: [...(avviso ? [avviso] : []), ...avvisiIpotesi(tabelle, data)],
  };
}
