// Confronto fra il risultato congelato di una sezione chiusa e il ricalcolo (ADR 0004, storia 60).
// Due ricalcoli separano le cause: con i dati congelati e le tabelle di oggi cambia solo ciò che
// dipende dalle tabelle; con i dati di oggi cambia anche ciò che dipende dai dati.
import {calcolaPratica} from './calcolaPratica';
import type {
  CausaDifferenza,
  Confronto,
  Congelato,
  DatiPratica,
  Differenza,
  NomeSezione,
  Risultato,
  Tabelle,
} from './tipi';

type Valore = Differenza['congelato'];
interface Campo {
  etichetta: string;
  tipo: Differenza['tipo'];
  valore: Valore;
}

const ESTREMO = {iniziale: 'mese di assunzione', finale: 'mese di cessazione'} as const;

/** I campi confrontabili di una sezione calcolata, nell'ordine della maschera. */
function campi(sezione: NonNullable<Risultato['sezioni'][NomeSezione]>): Map<string, Campo> {
  const out = new Map<string, Campo>();
  if (sezione.esito !== 'calcolata') return out;
  if ('totaleAnnui' in sezione) {
    // UM pensione: una riga per voce e la 13ª (i totali ne derivano).
    for (const r of sezione.righe) out.set(r.id, {etichetta: r.etichetta, tipo: 'importo', valore: r.composizione.arrotondato});
    const t = sezione.tredicesima;
    out.set(t.id, {etichetta: t.etichetta, tipo: 'importo', valore: t.composizione.arrotondato});
  } else if ('totale' in sezione) {
    // UM TFS: le 9 righe della maschera.
    for (const r of sezione.righe) out.set(r.id, {etichetta: r.etichetta, tipo: 'importo', valore: r.composizione.arrotondato});
  } else if ('righe' in sezione) {
    out.set('decorrenzaGiuridica', {etichetta: 'Decorrenza giuridica', tipo: 'data', valore: sezione.decorrenzaGiuridica});
    out.set('decorrenzaEconomica', {etichetta: 'Decorrenza economica', tipo: 'data', valore: sezione.decorrenzaEconomica});
    out.set('dataCessazione', {etichetta: 'Data di cessazione', tipo: 'data', valore: sezione.dataCessazione});
    for (const r of sezione.righe) {
      out.set(`${r.estremo}/${r.id}`, {
        etichetta: `${r.etichetta} (${ESTREMO[r.estremo]})`,
        tipo: 'importo',
        valore: r.composizione.arrotondato,
      });
    }
  } else if ('giorni' in sezione) {
    out.set('giorni', {etichetta: 'Giorni del mese parziale', tipo: 'numero', valore: sezione.giorni.usato});
  }
  return out;
}

const ORDINE = [
  'decorrenzaGiuridica',
  'decorrenzaEconomica',
  'dataCessazione',
  'iniziale/retribuzione-valutabile',
  'iniziale/rateo-tredicesima-teorica',
  'finale/retribuzione-valutabile',
  'finale/rateo-tredicesima-teorica',
  'finale/tredicesima-emolumenti-cassa',
  'giorni',
];
const posto = (campo: string) => (ORDINE.includes(campo) ? ORDINE.indexOf(campo) : ORDINE.length);

/** Le righe del registro dopo la versione congelata, fino a quella attuale. */
function versioniNuove(tabelle: Tabelle, congelata: string) {
  const da = tabelle.registro.findIndex((v) => v.id === congelata);
  const a = tabelle.registro.findIndex((v) => v.id === tabelle.versione);
  return tabelle.registro.slice(da + 1, a === -1 ? undefined : a + 1).map(({id, motivo}) => ({id, motivo}));
}

/** Righe cambiate fra il congelato e il ricalcolo con i dati e le tabelle di oggi, con la causa. */
export function confronta(congelato: Congelato, attuale: {dati: DatiPratica; tabelle: Tabelle}): Confronto {
  const {sezione} = congelato;
  // Una sezione che il ricalcolo non ha più (es. cambio di regime) vale come bloccata senza motivi.
  const sezioneDi = (dati: DatiPratica) => calcolaPratica(dati, attuale.tabelle).sezioni[sezione] ?? {esito: 'bloccata' as const, motivi: []};
  const conTabelleNuove = sezioneDi(congelato.dati);
  const ricalcolo = sezioneDi(attuale.dati);
  const causaTabelle: CausaDifferenza = {tipo: 'tabelle', versioni: versioniNuove(attuale.tabelle, congelato.versioneTabelle)};

  const cause = (prima: Valore, mezzo: Valore, dopo: Valore): CausaDifferenza[] => [
    ...(prima !== mezzo ? [causaTabelle] : []),
    ...(mezzo !== dopo ? [{tipo: 'dati' as const}] : []),
  ];

  const differenze: Differenza[] = [];
  const esiti = [congelato.risultato.esito, conTabelleNuove.esito, ricalcolo.esito] as const;
  if (esiti[0] !== esiti[2]) {
    differenze.push({campo: 'esito', etichetta: 'Esito della sezione', tipo: 'esito', congelato: esiti[0], attuale: esiti[2], cause: cause(...esiti)});
  } else if (esiti[0] === 'calcolata') {
    const [a, b, c] = [campi(congelato.risultato), campi(conTabelleNuove), campi(ricalcolo)];
    const nomi = [...new Set([...a.keys(), ...b.keys(), ...c.keys()])].sort((x, y) => posto(x) - posto(y));
    for (const nome of nomi) {
      const [va, vb, vc] = [a.get(nome)?.valore ?? null, b.get(nome)?.valore ?? null, c.get(nome)?.valore ?? null];
      if (va === vc) continue;
      const campo = (a.get(nome) ?? c.get(nome) ?? b.get(nome))!;
      differenze.push({campo: nome, etichetta: campo.etichetta, tipo: campo.tipo, congelato: va, attuale: vc, cause: cause(va, vb, vc)});
    }
  }
  return {sezione, versioni: {congelata: congelato.versioneTabelle, attuale: attuale.tabelle.versione}, differenze};
}
