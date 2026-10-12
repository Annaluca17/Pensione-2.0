import {valoreAddendo} from './composizione';
import type {Avviso, Blocco, CampoData, Composizione, DataISO, Differenza, MeseISO} from './tipi';

const nomeCampo: Record<CampoData, string> = {
  assunzione: 'la data di assunzione',
  cessazione: 'la data di cessazione',
  situazione: 'la data di inizio della situazione',
  dmaPreviste: 'il mese della prima DMA prevista',
  dataRiferimentoPensione: 'la data di riferimento della pensione',
  dataRiferimentoFineServizio: 'la data di riferimento di TFS/TFR',
};

const nomeSituazione = {
  'sospensione-cautelare': 'la sospensione cautelare',
  'congedo-104': 'il congedo L. 104',
  'optante-tfr': "l'opzione per il TFR",
} as const;

const maiuscola = (s: string) => s[0].toUpperCase() + s.slice(1);
const giorno = (d: DataISO) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const mese = (m: MeseISO) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

/** Euro all'italiana da un valore in euro già con i decimali voluti (es. "1234.57"). */
function euroDa(testo: string): string {
  const [intero, decimali] = testo.replace('-', '').split('.');
  const conPunti = intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${testo.startsWith('-') ? '-' : ''}${conPunti},${decimali} €`;
}
const euro = (centesimi: number) => euroDa((centesimi / 100).toFixed(2));
const euroPieno = (centesimi: number) => euroDa((centesimi / 100).toFixed(4));

/** Il testo italiano di un blocco, di un avviso o di una composizione (spec "Motore"). */
export function spiega(cosa: Blocco | Avviso | Composizione | Differenza): string {
  if ('cause' in cosa) return spiegaDifferenza(cosa);
  if (!('codice' in cosa)) return spiegaComposizione(cosa);
  switch (cosa.codice) {
    case 'cessazione-mancante':
      return 'Manca la data di cessazione.';
    case 'assunzione-mancante':
      return 'Manca la data di assunzione.';
    case 'data-non-valida':
      return `${maiuscola(nomeCampo[cosa.campo])} «${cosa.valore}» non è una data valida.`;
    case 'date-incoerenti': {
      if (cosa.campo === 'dmaPreviste') {
        const verso = cosa.regola === 'non-dopo' ? 'successivo' : 'precedente';
        return (
          `${maiuscola(nomeCampo[cosa.campo])} (${mese(cosa.data.slice(0, 7))}) non può essere ${verso} al ` +
          `mese di ${cosa.rispetto} (${mese(cosa.dataRispetto.slice(0, 7))}).`
        );
      }
      const verso = cosa.regola === 'non-dopo' ? 'successiva' : 'precedente';
      return (
        `${maiuscola(nomeCampo[cosa.campo])} (${giorno(cosa.data)}) non può essere ${verso} alla ` +
        `${nomeCampo[cosa.rispetto].slice(3)} (${giorno(cosa.dataRispetto)}).`
      );
    }
    case 'part-time-fuori-range': {
      const quando = cosa.mese === 'base' ? 'di base' : `di ${mese(cosa.mese)}`;
      return `La % di part-time ${quando} (${cosa.percentuale}) deve essere maggiore di 0 e al massimo 100.`;
    }
    case 'posizione-non-valida':
      return cosa.motivo === 'inesistente'
        ? `La posizione ${cosa.posizione} non esiste nelle tabelle.`
        : `La posizione ${cosa.posizione} non è una posizione delle aree A-D.`;
    case 'tabelle-non-disponibili':
      return (
        `Tabelle non disponibili per la data: ${nomeCampo[cosa.campo]} (${giorno(cosa.data)}) ` +
        `è precedente al ${giorno(cosa.coperturaDal)}.`
      );
    case 'giorni-forzati-non-validi':
      return `I giorni forzati del mese parziale (${cosa.giorni}) devono essere un numero intero fra 0 e ${cosa.massimo} (D9).`;
    case 'situazione-non-gestita':
      if ('motivo' in cosa) {
        return (
          `${maiuscola(nomeSituazione[cosa.situazione])} inizia il ${giorno(cosa.dal)}, non il 1° del mese: ` +
          'le DMA previste non si dividono a metà mese, vanno preparate a parte (C21-2).'
        );
      }
      return "Optante TFR in regime TFR: la sezione TFR dell'optante non è gestita dal sito, va calcolata a parte.";
    case 'dma-oltre-limite':
      return (
        `DMA prevista di ${mese(cosa.mese)} non preparata: PASSWEB ne accetta al massimo ${cosa.limite} (D12). ` +
        'Si inserirà quando le DMA vere avranno fatto scorrere i mesi.'
      );
    case 'dma-non-prevista':
      return 'Con la trattenuta 100% per malattia la DMA prevista non serve: nessun periodo preparato (D19, C21-2).';
    case 'eccezioni-fuori-periodo':
      return (
        `Eccezioni ignorate perché fuori dai mesi considerati (da ${mese(cosa.dal)} a ${mese(cosa.al)}): ` +
        `${cosa.mesi.map(mese).join(', ')}.`
      );
    case 'soglia-quindici-giorni-altra-regola':
      return (
        `Mese di ${cosa.estremo === 'iniziale' ? 'assunzione' : 'cessazione'} ${mese(cosa.mese)}: ` +
        `${cosa.lavorativiLunSab} giorni lavorativi lun-sab e ${cosa.calendario} di calendario. ` +
        `Con la regola usata il mese è ${cosa.esitoUsato.replace('-', ' ')}; con l'altra sarebbe ${cosa.esitoAltraRegola.replace('-', ' ')} (D10).`
      );
    case 'ivc-incompatibile':
      return (
        `IVC di ${mese(cosa.mese)} inserita ${euro(cosa.inserita)}, ma col contratto ` +
        `${cosa.contrattoApplicato} vale ${euro(cosa.daTabella)}: si usa il valore della tabella (D8).`
      );
    case 'contratto-in-ipotesi':
      return (
        `La data di riferimento (pensione o fine TFS) cade nella vigenza dell'ipotesi ${cosa.contratto} (dal ${giorno(cosa.vigenzaDal)}), che non ` +
        `produce importi: alla firma la pratica tornerà da rilavorare (T5).`
      );
    case 'tfs-annualizzato':
      return `È inserito un solo mese: il TFS moltiplica ${mese(cosa.mese)} per ${cosa.mesi}, senza verificare i ${cosa.mesi} mesi (D2).`;
    case 'mese-iniziale-fuori-finestra':
      return (
        `Il mese di assunzione ${mese(cosa.mese)} è utile ma non intero, e le voci inserite vanno da ` +
        `${mese(cosa.finestraDal)} a ${mese(cosa.finestraAl)}: retribuzione del mese pieno e rateo di 13ª ` +
        `iniziale da calcolare a parte.`
      );
  }
}

function spiegaDifferenza(d: Differenza): string {
  const valore = (v: Differenza['congelato']) => {
    if (v === null) return 'nessun valore';
    if (d.tipo === 'importo') return euro(v as number);
    if (d.tipo === 'data') return giorno(v as DataISO);
    return String(v);
  };
  const cause = d.cause.map((c) =>
    c.tipo === 'dati'
      ? 'dati della pratica modificati dopo la chiusura'
      : `tabelle aggiornate, ${c.versioni.length === 1 ? 'versione' : 'versioni'} ${c.versioni.map((v) => `${v.id} «${v.motivo}»`).join(', ')}`,
  );
  return `${d.etichetta}: da ${valore(d.congelato)} a ${valore(d.attuale)}. Causa: ${cause.join('; ')}.`;
}

function spiegaComposizione(c: Composizione): string {
  const righe = c.addendi.map(
    (a) =>
      `voce ${a.voce}, ${mese(a.mese)}: ${euro(a.importo)}` +
      `${a.percentuale !== undefined ? ` × ${String(a.percentuale).replace('.', ',')}%` : ''}` +
      `${a.giorni !== undefined ? ` × ${a.giorni}${a.divisore !== undefined ? `/${a.divisore}` : ''} gg` : ''}`,
  );
  const somma = c.addendi.reduce((s, a) => s + valoreAddendo(a), 0);
  if (c.addendi.length > 1) righe.push(`somma: ${Number.isInteger(somma) ? euro(somma) : euroPieno(somma)}`);
  for (const op of c.operazioni) {
    righe.push(`${op.tipo === 'moltiplica' ? '×' : '÷'} ${op.per}: ${op.motivo}${op.fonte ? ` (${op.fonte})` : ''}`);
  }
  righe.push(`valore pieno ${euroPieno(c.pieno)}, arrotondato ${euro(c.arrotondato)}`, `Fonte: ${c.fonte}`);
  return righe.join('\n');
}
