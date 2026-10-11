import type {Avviso, Blocco, CampoData, Composizione, DataISO, MeseISO} from './tipi';

const nomeCampo: Record<CampoData, string> = {
  assunzione: 'la data di assunzione',
  cessazione: 'la data di cessazione',
  dataRiferimentoPensione: 'la data di riferimento della pensione',
  dataRiferimentoFineServizio: 'la data di riferimento di TFS/TFR',
};

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
export function spiega(cosa: Blocco | Avviso | Composizione): string {
  if (!('codice' in cosa)) return spiegaComposizione(cosa);
  switch (cosa.codice) {
    case 'cessazione-mancante':
      return 'Manca la data di cessazione.';
    case 'data-non-valida':
      return `${maiuscola(nomeCampo[cosa.campo])} «${cosa.valore}» non è una data valida.`;
    case 'date-incoerenti': {
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
    case 'eccezioni-fuori-periodo':
      return (
        `Eccezioni ignorate perché fuori dai mesi considerati (da ${mese(cosa.dal)} a ${mese(cosa.al)}): ` +
        `${cosa.mesi.map(mese).join(', ')}.`
      );
  }
}

function spiegaComposizione(c: Composizione): string {
  const righe = c.addendi.map((a) => `voce ${a.voce}, ${mese(a.mese)}: ${euro(a.importo)}`);
  if (c.addendi.length > 1) righe.push(`somma: ${euro(c.addendi.reduce((s, a) => s + a.importo, 0))}`);
  for (const op of c.operazioni) {
    righe.push(`${op.tipo === 'moltiplica' ? '×' : '÷'} ${op.per}: ${op.motivo}${op.fonte ? ` (${op.fonte})` : ''}`);
  }
  righe.push(`valore pieno ${euroPieno(c.pieno)}, arrotondato ${euro(c.arrotondato)}`, `Fonte: ${c.fonte}`);
  return righe.join('\n');
}
