// Contenuto della scheda PDF (ticket 16, storie 72-75): dal Risultato, senza ricalcolare. Un blocco per
// sezione presente (pronto per la pensione, ticket 33), righe PASSWEB già arrotondate, niente
// composizione; riquadro forzature e avvisi solo se presenti; id della versione delle tabelle nel piede.
import type {Ente, Pratica} from '../../archivio';
import {spiega} from '../../motore';
import type {Avviso, Blocco, ChiaveForzatura, Risultato} from '../../motore';
import {scriviEuro} from '../modifiche';
import {riepilogoMiglioramento} from '../riepilogoMiglioramento';

export interface BloccoScheda {
  titolo: string;
  /** Campo e valore come nella maschera; assente se la sezione è bloccata. */
  righe?: [string, string][];
  /** Indici delle righe da inserire in PASSWEB (in primo piano) e di quelle di sola lettura (tono minore). */
  inEvidenza?: number[];
  inTonoMinore?: number[];
  /** Motivi del blocco, in italiano; con le righe: i mesi non preparati sotto quelli calcolati. */
  motivi?: string[];
}

export interface Scheda {
  titolo: string;
  intestazione: [string, string][];
  blocchi: BloccoScheda[];
  forzature: {campo: string; proposto: string; usato: string; forzato: string}[];
  avvisi: string[];
  versioneTabelle: string;
}

export type EsitoScheda = {stato: 'pronta'; scheda: Scheda} | {stato: 'non-generabile'; motivi: string[]};

/** Avvisi che cambiano ciò che si digita in PASSWEB (decisione dei ticket 16 e 33). */
const AVVISI_DA_STAMPARE: Avviso['codice'][] = [
  'ivc-incompatibile',
  'soglia-quindici-giorni-altra-regola',
  'mese-iniziale-fuori-finestra',
  'nessun-miglioramento-reale',
  'tfs-da-modificare',
  'dma-non-prevista',
];

const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const nomeForzatura: Record<ChiaveForzatura, string> = {
  giorniMeseParziale: 'Giorni del mese parziale',
  dataRiferimentoPensione: 'Data di riferimento della pensione',
  dataRiferimentoFineServizio: 'Data di riferimento di TFS/TFR',
};
const valoreForzatura = (v: number | string) => (typeof v === 'number' ? String(v) : data(v));
const ESTREMO = {iniziale: 'mese di assunzione', finale: 'mese di cessazione'} as const;

function bloccoTfr(risultato: Risultato): BloccoScheda {
  const tfr = risultato.sezioni.tfr;
  const titolo = 'Ultimo miglio TFR';
  if (tfr.esito === 'bloccata') return {titolo, motivi: tfr.motivi.map((m: Blocco) => spiega(m))};
  const righe: [string, string][] = [
    ['Decorrenza giuridica', data(tfr.decorrenzaGiuridica)],
    ['Decorrenza economica', data(tfr.decorrenzaEconomica)],
    ['Data di cessazione', data(tfr.dataCessazione)],
  ];
  for (const estremo of ['iniziale', 'finale'] as const) {
    const e = estremo === 'iniziale' ? tfr.meseIniziale : tfr.meseFinale;
    if (e.pagamentoTredicesima) {
      righe.push([
        `Rateo di 13ª pagato (${ESTREMO[estremo]})`,
        `${e.pagamentoTredicesima === 'dicembre' ? 'a dicembre' : 'nel mese di cessazione'}, misura "Parziale"`,
      ]);
    }
    for (const r of tfr.righe.filter((x) => x.estremo === estremo)) {
      righe.push([`${r.etichetta} (${ESTREMO[estremo]})`, `${scriviEuro(r.composizione.arrotondato)} €`]);
    }
  }
  if (tfr.righe.length === 0) righe.push(['Dati retributivi', 'nessuno: mesi di assunzione e di cessazione senza dati da inserire']);
  return {titolo, righe};
}

/** I motivi di una sezione bloccata; una sezione assente (dati non ancora completi) non ne ha. */
const motiviDi = (sezione: {esito: 'calcolata'} | {esito: 'bloccata'; motivi: Blocco[]} | undefined) =>
  sezione?.esito === 'bloccata' ? sezione.motivi.map((m) => spiega(m)) : [];
const euro = (c: number) => `${scriviEuro(c)} €`;
const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

/** Dopo le `n` righe di voci: 13ª e totale fissi annui si digitano in PASSWEB, il totale con la 13ª no. */
const rilievo = (n: number) => ({inEvidenza: [n, n + 1], inTonoMinore: [n + 2]});

function bloccoUmPensione(risultato: Risultato): BloccoScheda {
  const um = risultato.sezioni.umPensione;
  const titolo = 'Ultimo miglio pensione';
  if (!um || um.esito === 'bloccata') return {titolo, motivi: motiviDi(um)};
  return {
    titolo,
    righe: [
      ...um.righe.map((r): [string, string] => [r.etichetta, euro(r.composizione.arrotondato)]),
      [um.tredicesima.etichetta, euro(um.tredicesima.composizione.arrotondato)],
      ['Totale fissi annui', euro(um.totaleAnnui)],
      ['Totale con la 13ª', euro(um.totale)],
    ],
    ...rilievo(um.righe.length),
  };
}

function bloccoTfs(risultato: Risultato): BloccoScheda {
  const tfs = risultato.sezioni.tfs;
  const titolo = 'Ultimo miglio TFS';
  if (!tfs || tfs.esito === 'bloccata') return {titolo, motivi: motiviDi(tfs)};
  return {
    titolo,
    righe: [
      ...tfs.righe.map((r): [string, string] => [r.etichetta, euro(r.composizione.arrotondato)]),
      [`Totale (mesi da ${mese(tfs.dal)} a ${mese(tfs.al)})`, euro(tfs.totale)],
    ],
  };
}

const giorno = data;

function blocchiDma(risultato: Risultato): BloccoScheda[] {
  const dma = risultato.sezioni.dmaPreviste;
  const titolo = 'DMA previste';
  if (!dma || dma.esito === 'bloccata') return [{titolo, motivi: motiviDi(dma)}];
  const blocchi: BloccoScheda[] = dma.periodi.map((p) => ({
    titolo:
      `${titolo} ${mese(p.mese)} · dal ${giorno(p.dal)} al ${giorno(p.al)} · ${p.giorni}/26 giorni · ${p.percentuale}% · ${p.regime}` +
      `${p.codiceServizio !== undefined ? ` · codice servizio ${p.codiceServizio}` : ''}` +
      `${p.giorniTredicesima > 0 ? ` · con 13ª (${p.giorniTredicesima}/365)` : ''}`,
    righe: p.campi.map((c): [string, string] => [c.etichetta, euro(c.composizione.arrotondato)]),
  }));
  const oltre = risultato.blocchi.filter((b) => b.codice === 'dma-oltre-limite');
  if (oltre.length > 0) blocchi.push({titolo: `${titolo}: mesi non preparati`, righe: [], motivi: oltre.map((b) => spiega(b))});
  return blocchi;
}

/** Solo i tre valori che servono a PASSWEB, più TFS migliorato o dicitura TFR; le decorrenze intermedie non si stampano (ticket 04). */
function blocchiMiglioramento(pratica: Extract<Pratica, {tipo: 'pensione'}>, risultato: Risultato): BloccoScheda[] {
  const m = risultato.sezioni.miglioramento;
  const titolo = 'Miglioramento contrattuale';
  if (!m || m.esito === 'bloccata') return [{titolo, motivi: motiviDi(m)}];
  if (m.stato === 'ipotesi') return [{titolo, righe: [[`Contratto ${m.contratto}`, 'ipotesi: nessun importo finché non è firmato']]}];
  const r = riepilogoMiglioramento(m, pratica.dati);
  const righe: [string, string][] = [];
  const inEvidenza: number[] = [];
  const inTonoMinore: number[] = [];
  righe.push(['Vecchia pensione calcolata: fissi annui', euro(r.vecchia.totaleAnnui)], ['Vecchia pensione calcolata: 13ª', euro(r.vecchia.tredicesima.composizione.arrotondato)]);
  inEvidenza.push(0, 1);
  if (r.passweb) {
    righe.push(['Pensione in PASSWEB: fissi annui', euro(r.passweb.fissi)], ['Pensione in PASSWEB: 13ª', euro(r.passweb.tredicesima)]);
    righe.push(['Confronto con la vecchia pensione calcolata', r.passweb.uguale ? 'uguale' : 'DIVERSA: controllare le voci inserite']);
    inTonoMinore.push(2, 3);
  } else {
    righe.push(['Pensione in PASSWEB', 'non indicata']);
  }
  righe.push([`Nuovo miglioramento dal ${giorno(r.nuovo.decorrenza)}: fissi annui`, euro(r.nuovo.totaleAnnui)], [`Nuovo miglioramento dal ${giorno(r.nuovo.decorrenza)}: 13ª`, euro(r.nuovo.tredicesima.composizione.arrotondato)]);
  inEvidenza.push(righe.length - 2, righe.length - 1);
  if (r.fineServizio.regime === 'TFR') righe.push(['TFR', r.fineServizio.dicitura]);
  else if (r.fineServizio.tfs) {
    const tfs = r.fineServizio.tfs;
    righe.push(...tfs.righe.map((x): [string, string] => [`TFS migliorato: ${x.etichetta}`, euro(x.composizione.arrotondato)]));
    righe.push([`TFS migliorato: totale (mesi da ${mese(tfs.dal)} a ${mese(tfs.al)})`, euro(tfs.totale)]);
  }
  return [{titolo, righe, inEvidenza, ...(inTonoMinore.length > 0 && {inTonoMinore})}];
}

function blocchiPensione(pratica: Extract<Pratica, {tipo: 'pensione'}>, risultato: Risultato): BloccoScheda[] {
  return [
    bloccoUmPensione(risultato),
    ...(pratica.dati.regime === 'TFS' ? [bloccoTfs(risultato)] : [bloccoTfr(risultato)]),
    ...(pratica.dati.dmaPreviste ? blocchiDma(risultato) : []),
    ...(pratica.dati.miglioramento ? blocchiMiglioramento(pratica, risultato) : []),
  ];
}

/** La scheda di una pratica, o perché non si genera. */
export function costruisciScheda(pratica: Pratica, ente: Ente, risultato: Risultato): EsitoScheda {
  const blocchi = pratica.tipo === 'cessazione' ? [bloccoTfr(risultato)] : blocchiPensione(pratica, risultato);
  if (blocchi.length === 0 || blocchi.every((b) => b.motivi)) {
    const motivi = blocchi.flatMap((b) => b.motivi ?? []);
    return {stato: 'non-generabile', motivi: motivi.length > 0 ? motivi : ['Nessuna sezione calcolata da stampare.']};
  }
  const a = pratica.dati.anagrafica;
  return {
    stato: 'pronta',
    scheda: {
      titolo: pratica.tipo === 'cessazione' ? 'Scheda della pratica di cessazione' : 'Scheda della pratica di pensione',
      intestazione: [
        ['Dipendente', a.nome],
        ['Codice fiscale', a.codiceFiscale],
        ['Ente', ente.nome],
        ['Posizione economica', a.posizione || '—'],
        ...(pratica.tipo === 'pensione' ? [['Regime di fine servizio', pratica.dati.regime] as [string, string]] : []),
      ],
      blocchi,
      forzature: risultato.forzature.map((f) => ({
        campo: nomeForzatura[f.chiave],
        proposto: valoreForzatura(f.proposto),
        usato: valoreForzatura(f.forzato),
        forzato: valoreForzatura(f.forzato),
      })),
      avvisi: risultato.avvisi.filter((x) => AVVISI_DA_STAMPARE.includes(x.codice)).map((x) => spiega(x)),
      versioneTabelle: risultato.versioneTabelle,
    },
  };
}
