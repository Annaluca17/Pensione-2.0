// Coerenza dei dati inseriti con le tabelle del contratto vigente (ticket 24, storie 51-52): interno al
// motore. Gli avvisi non cambiano gli importi delle righe né fermano la sezione; le fonti vengono dalle tabelle.
import {arrotonda} from './arrotonda';
import type {Area, Avviso, ContrattoDefinitivo, Importo, MeseISO, Tabelle, VociMese} from './tipi';

const definitivi = (tabelle: Tabelle) => tabelle.contratti.filter((c): c is ContrattoDefinitivo => c.stato === 'definitivo');
const ultimo = <T extends {decorrenza: string}>(lista: readonly T[]) => [...lista].sort((a, b) => a.decorrenza.localeCompare(b.decorrenza)).at(-1);
const fonteDi = (importo: Importo | undefined, insieme: string) => importo?.fonte ?? insieme;

/** Una voce di tabella: il valore, il contratto e la fonte da cui viene. */
interface DaTabella {
  importo: number;
  contratto: string;
  fonte: string;
}

/** Tabellare e comparto del mese (stessa scelta del miglioramento, C21-7); il differenziale storico se il tabellare è per area. */
function valoriDaTabella(tabelle: Tabelle, posizione: string, mese: MeseISO) {
  const trasposizione = tabelle.trasposizione.find((t) => t.posizione === posizione);
  if (!trasposizione) return {};
  const area: Area = trasposizione.area;
  const primo = `${mese}-01`;
  const scaglionamenti = definitivi(tabelle).flatMap((c) => c.scaglionamenti.filter((s) => s.decorrenza <= primo).map((s) => ({...s, contratto: c.id})));
  const tabellare = ultimo(scaglionamenti.filter((s) => s.tipo === 'tabellare'));
  const incremento = tabellare && ultimo(scaglionamenti.filter((s) => s.tipo === 'incremento' && s.decorrenza >= tabellare.decorrenza));

  let voce01: DaTabella | undefined;
  if (tabellare) {
    const parti = [tabellare, ...(incremento ? [incremento] : [])].map((s) => ({s, importo: s.importi[s.chiave === 'area' ? area : posizione]}));
    // Un valore che manca in tabella non si confronta: non c'è nulla con cui avvisare.
    if (parti.every((p) => p.importo)) {
      voce01 = {
        importo: parti.reduce((somma, p) => somma + p.importo!.mensile, 0),
        contratto: tabellare.contratto,
        fonte: parti.map((p) => fonteDi(p.importo, p.s.fonte)).join('; '),
      };
    }
  }

  const voce02: DaTabella | undefined =
    tabellare?.chiave === 'area'
      ? {importo: trasposizione.differenzialeStorico.mensile, contratto: tabellare.contratto, fonte: fonteDi(trasposizione.differenzialeStorico, 'differenziale storico della trasposizione')}
      : undefined;

  const comparto = ultimo(definitivi(tabelle).flatMap((c) => c.indennitaComparto.filter((x) => x.decorrenza <= primo).map((x) => ({...x, contratto: c.id}))));
  const voce10: DaTabella | undefined = comparto && {importo: comparto.importi[area].mensile, contratto: comparto.contratto, fonte: fonteDi(comparto.importi[area], comparto.fonte)};

  return {area, voce01, voce02, voce10};
}

/** Avvisi di coerenza delle voci di un mese con le tabelle: tabellare, differenziale storico, comparto, art. 14. */
export function avvisiCoerenza(voci: VociMese, mese: MeseISO, posizione: string, tabelle: Tabelle): Avviso[] {
  const {area, voce01, voce02, voce10} = valoriDaTabella(tabelle, posizione, mese);
  const avvisi: Avviso[] = [];
  // Una voce non inserita (o a 0) non si legge: niente da confrontare.
  const inserita = (codice: string) => (voci[codice] ? voci[codice] : undefined);

  const confronto = (codice: 'tabellare-diverso' | 'differenziale-storico-diverso' | 'comparto-diverso', voce: string, tabella: DaTabella | undefined) => {
    const inserito = inserita(voce);
    if (inserito === undefined || !tabella || inserito === tabella.importo) return;
    avvisi.push({tipo: 'avviso', codice, mese, inserito, daTabella: tabella.importo, contrattoApplicato: tabella.contratto, fonte: tabella.fonte});
  };
  confronto('tabellare-diverso', '01', voce01);
  confronto('differenziale-storico-diverso', '02', voce02);
  confronto('comparto-diverso', '10', voce10);

  const art14 = area && tabelle.differenzialiArt14[area];
  const inserito03 = inserita('03');
  if (art14 && art14.mensile > 0 && inserito03 !== undefined) {
    const ammesso = (n: number) => Math.abs(inserito03 - n * art14.mensile) <= n || inserito03 === arrotonda((n * art14.annuo) / 13);
    const multipli = Array.from({length: art14.massimo}, (_, i) => i + 1);
    if (!multipli.some(ammesso)) {
      const oltre = inserito03 > art14.massimo * art14.mensile + art14.massimo;
      avvisi.push({
        tipo: 'avviso',
        codice: 'differenziale-art14-incoerente',
        mese,
        inserito: inserito03,
        motivo: oltre ? 'oltre-massimo' : 'non-multiplo',
        area,
        misura: art14.mensile,
        massimo: art14.massimo,
        fonte: art14.fonte,
      });
    }
  }
  return avvisi;
}
