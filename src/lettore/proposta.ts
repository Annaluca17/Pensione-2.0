// Dai cedolini di un dipendente alla Proposta: base = ultimo mese, eccezioni = ogni mese diverso.
import type {Centesimi, MeseISO, PartTime, TipoPartTime, VociMese} from '../motore';
import {classifica} from './regole';
import type {CedolinoMensile, Gestionale, OpzioniLettura, Proposta} from './tipi';

const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const due = (n: number) => String(n).padStart(2, '0');
const meseIso = (c: CedolinoMensile): MeseISO => `${c.anno}-${due(c.mese + 1)}`;
export const nomeMese = (c: CedolinoMensile) => `${NOMI_MESI[c.mese]} ${c.anno}`;

/** "30-09-2026" → "2026-09-30"; altro → undefined. */
function dataISO(s: string): string | undefined {
  const m = s.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

/** "EX-C5", "B3-PEO" → "C5", "B3" se è una posizione A1-D8; altrimenti com'è (il giudizio è del motore). */
function posizione(s: string): string {
  const p = s.trim().toUpperCase().replace(/^EX-/, '').replace(/-PEO$/, '');
  return /^[ABCD][1-8]$/.test(p) ? p : s.trim();
}

/** Part-time del cedolino: "50" o "50,00-O" (con il tipo O/V/M); vuoto = tempo pieno. */
function partTime(c: CedolinoMensile): PartTime {
  const m = c.partTime.trim().match(/^(\d+)(?:,\d+)?(?:-([OVM]))?$/);
  if (!m) return {percentuale: 100};
  return m[2] ? {percentuale: Number(m[1]), tipo: m[2] as TipoPartTime} : {percentuale: Number(m[1])};
}
const ugualePt = (a: PartTime, b: PartTime) => a.percentuale === b.percentuale && a.tipo === b.tipo;

const fineMese = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return d === new Date(y, m, 0).getDate();
};

/** "1546,61" in centesimi → "1.546,61", solo aritmetica intera. */
function formatta(c: Centesimi): string {
  const a = Math.abs(c);
  return `${c < 0 ? '-' : ''}${String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+$)/g, '.')},${due(a % 100)}`;
}

interface MeseLetto {
  voci: VociMese;
  perequativo?: Centesimi;
  /** Etichette che nessuna regola riconosce. */
  ignote: string[];
  /** Voci con due righe di importo diverso (non sommabili): codice, importo tenuto, importo scartato. */
  doppie: Array<{voce: string; tenuto: Centesimi; scartato: Centesimi}>;
}

function leggiMese(c: CedolinoMensile, g: Gestionale): MeseLetto {
  const voci: Record<string, Centesimi> = {};
  const ignote: string[] = [];
  const doppie: MeseLetto['doppie'] = [];
  let perequativo: Centesimi | undefined;
  for (const v of c.voci) {
    const dest = classifica(g, v.etichetta);
    if (dest == null) { ignote.push(v.etichetta); continue; }
    if (dest === 'perequativo') perequativo = (perequativo ?? 0) + v.importo;
    if (dest === 'ignora' || dest === 'perequativo') continue;
    if (g.daSommare.includes(dest)) voci[dest] = (voci[dest] ?? 0) + v.importo;
    else if (voci[dest] == null) voci[dest] = v.importo;
    else if (voci[dest] !== v.importo) doppie.push({voce: dest, tenuto: voci[dest], scartato: v.importo});
  }
  return {voci, perequativo, ignote, doppie};
}

/** I 12 mesi fino a quello di `fine` (aaaa-mm-gg), dal più vecchio. */
function dodiciMesi(fine: string): MeseISO[] {
  const fineProg = Number(fine.slice(0, 4)) * 12 + Number(fine.slice(5, 7)) - 1;
  return Array.from({length: 12}, (_, k) => {
    const prog = fineProg - 11 + k;
    return `${Math.floor(prog / 12)}-${due((prog % 12) + 1)}`;
  });
}

/** `letti` è ordinato per mese, non vuoto. */
export function costruisciProposta(cf: string, letti: CedolinoMensile[], g: Gestionale, opz: OpzioniLettura, avvisiLettura: string[] = []): Proposta {
  const ultimo = letti[letti.length - 1];
  // Un mese con sole voci ignorate (es. la tredicesima di dicembre) non è un mese di retribuzione letto.
  const tutti = letti.filter(c => Object.keys(leggiMese(c, g).voci).length > 0);
  const avvisi: string[] = [...avvisiLettura];

  // Finestra: 12 mesi fino alla fine TFS (di default la cessazione letta); fuori finestra si ignora.
  const fine = opz.fineTfs ?? dataISO(ultimo.cessazione);
  const finestra = fine ? dodiciMesi(fine) : null;
  const ord = finestra ? tutti.filter(c => finestra.includes(meseIso(c))) : tutti;
  const nomeIso = (m: MeseISO) => `${NOMI_MESI[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
  if (finestra && !ord.length) {
    // Es. il solo cedolino di maggio dopo una cessazione al 30 aprile: senza avviso la Proposta sarebbe vuota e muta.
    const fuori = [...new Set(letti.map(nomeMese))];
    avvisi.push(`Nessun cedolino nei 12 mesi fino alla fine TFS (${nomeIso(finestra[0])} - ${nomeIso(finestra[11])}): `
      + `${fuori.length === 1 ? 'letto solo' : 'letti solo'} ${fuori.join(', ')}. Carica i cedolini di quei mesi.`);
  }
  if (finestra) {
    const mancanti = finestra.filter(m => !ord.some(c => meseIso(c) === m));
    if (mancanti.length && ord.length) {
      avvisi.push(`Mancano i cedolini di ${mancanti.length} ${mancanti.length === 1 ? 'mese' : 'mesi'} `
        + `(valgono come la base): ${mancanti.map(nomeIso).join(', ')}.`);
    }
  }

  const anagrafica: Proposta['dati']['anagrafica'] = {nome: ultimo.nome, codiceFiscale: cf, posizione: posizione(ultimo.posizione)};
  const assunzione = dataISO(ultimo.assunzione);
  const cessazione = dataISO(ultimo.cessazione);
  if (assunzione) anagrafica.assunzione = assunzione;
  if (cessazione) anagrafica.cessazione = cessazione;

  const baseMese = ord[ord.length - 1];
  const base = baseMese ? leggiMese(baseMese, g).voci : {};
  const eccezioni: Record<MeseISO, VociMese> = {};
  const ptEccezioni: Record<MeseISO, PartTime> = {};
  const ptBase = baseMese ? partTime(baseMese) : {percentuale: 100};
  for (const c of ord.slice(0, -1)) {
    const voci = leggiMese(c, g).voci;
    const diverse: Record<string, Centesimi> = {};
    for (const codice of new Set([...Object.keys(base), ...Object.keys(voci)])) {
      if ((voci[codice] ?? 0) !== (base[codice] ?? 0)) diverse[codice] = voci[codice] ?? 0;
    }
    if (Object.keys(diverse).length) eccezioni[meseIso(c)] = diverse;
    if (!ugualePt(partTime(c), ptBase)) ptEccezioni[meseIso(c)] = partTime(c);
  }

  for (const c of ord) {
    const {voci, perequativo} = leggiMese(c, g);
    if (perequativo == null) continue;
    avvisi.push(`${nomeMese(c)}: elemento perequativo ${formatta(perequativo)} non sommato al tabellare `
      + `(tabellare + perequativo = ${formatta((voci['01'] ?? 0) + perequativo)}).`);
  }

  if (cessazione && !fineMese(cessazione) && ord.length > 1) {
    const ultimoLetto = ord[ord.length - 1];
    const prima = ord[ord.length - 2];
    if (meseIso(ultimoLetto) === cessazione.slice(0, 7) && ultimoLetto.anno * 12 + ultimoLetto.mese - (prima.anno * 12 + prima.mese) === 1) {
      const a = leggiMese(ultimoLetto, g).voci;
      const b = leggiMese(prima, g).voci;
      const diverse = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().filter(k => (a[k] ?? 0) !== (b[k] ?? 0));
      if (diverse.length) {
        avvisi.push(`Cessazione non a fine mese (${ultimo.cessazione}): le voci di ${nomeMese(ultimoLetto)} `
          + `differiscono da quelle di ${nomeMese(prima)} (voci: ${diverse.join(', ')}).`);
      }
    }
  }

  const nonRiconosciute = new Set<string>();
  for (const c of ord) {
    const {ignote, doppie} = leggiMese(c, g);
    ignote.forEach(e => nonRiconosciute.add(e));
    for (const d of doppie) {
      avvisi.push(`${nomeMese(c)}: due righe per la voce ${d.voce} con importi diversi `
        + `(${formatta(d.tenuto)} e ${formatta(d.scartato)}); tenuto il primo.`);
    }
  }

  const senzaTipo = ord.filter(c => partTime(c).percentuale < 100 && !partTime(c).tipo);
  if (senzaTipo.length) {
    avvisi.push(`Part-time sotto il 100% senza tipo (${senzaTipo.map(c => `${nomeMese(c)} ${partTime(c).percentuale}%`).join(', ')}): `
      + 'il tipo (O/V/M) lo indica l\'operatore.');
  }

  return {
    cf,
    dati: {
      anagrafica,
      voci: {base, eccezioni},
      partTime: {base: ptBase, eccezioni: ptEccezioni},
    },
    avvisi,
    nonRiconosciute: [...nonRiconosciute],
  };
}
