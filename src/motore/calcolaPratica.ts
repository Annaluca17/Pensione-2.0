import {calcolaTfr} from './tfr';
import {data, giornoDellaSettimana, giorniDelMese, leggiData, meseDi, spostaMese} from './date';
import type {
  Avviso,
  Blocco,
  ChiaveDataRiferimento,
  ChiaveForzatura,
  DataISO,
  DatiPratica,
  ForzaturaApplicata,
  MeseISO,
  MeseParziale,
  MeseRetribuzione,
  NomeSezione,
  Retribuzione,
  Risultato,
  Sezione,
  Tabelle,
  Tfr,
  ValoreForzabile,
} from './tipi';



/** Unico ingresso del calcolo (spec "Motore"): funzione pura, nessuna eccezione per il dominio. */
export function calcolaPratica(dati: DatiPratica, tabelle: Tabelle): Risultato {
  const trovati: {blocco: Blocco; sezioni: NomeSezione[]}[] = [];
  /** Registra un blocco e le sezioni che ferma; un blocco senza sezioni ferma solo quelle future. */
  const blocca = (blocco: Blocco, ...sezioni: NomeSezione[]) => trovati.push({blocco, sezioni});
  const bloccata = (sezione: NomeSezione) => trovati.some((t) => t.sezioni.includes(sezione));
  const motivi = (sezione: NomeSezione) => trovati.filter((t) => t.sezioni.includes(sezione)).map((t) => t.blocco);

  const forzature: ForzaturaApplicata[] = [];
  const forza = <T extends number | DataISO>(chiave: ChiaveForzatura, proposto: T): ValoreForzabile<T> => {
    const forzato = dati.forzature[chiave] as T | undefined;
    if (forzato === undefined) return {proposto, usato: proposto};
    forzature.push({chiave, proposto, forzato});
    return {proposto, usato: forzato, forzato};
  };

  // Anagrafica: le date reggono tutto il resto.
  const tutte: NomeSezione[] = ['retribuzione', 'meseParziale', 'tfr'];
  const valida = (campo: 'assunzione' | 'cessazione', valore: DataISO | undefined, ...sezioni: NomeSezione[]) => {
    if (valore === undefined || leggiData(valore)) return valore;
    blocca({tipo: 'blocco', codice: 'data-non-valida', campo, valore}, ...sezioni);
    return undefined;
  };
  const assunzione = valida('assunzione', dati.anagrafica.assunzione, ...tutte);
  const cessazione = valida('cessazione', dati.anagrafica.cessazione, ...tutte);
  if (dati.anagrafica.cessazione === undefined) blocca({tipo: 'blocco', codice: 'cessazione-mancante'}, ...tutte);
  // Decorrenza giuridica obbligatoria nell'ultimo miglio TFR (C185 §2.1).
  if (dati.anagrafica.assunzione === undefined) blocca({tipo: 'blocco', codice: 'assunzione-mancante'}, 'tfr');
  if (assunzione && cessazione && assunzione > cessazione) {
    blocca(incoerenti('assunzione', assunzione, 'non-dopo', 'cessazione', cessazione), ...tutte);
  }
  if (cessazione && cessazione < tabelle.coperturaDal) {
    blocca({tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'cessazione', data: cessazione, coperturaDal: tabelle.coperturaDal}, 'tfr');
  }

  const posizione = dati.anagrafica.posizione;
  if (!/^[A-D]\d+$/.test(posizione)) {
    blocca({tipo: 'blocco', codice: 'posizione-non-valida', posizione, motivo: 'fuori-aree-a-d'}, 'tfr');
  } else if (!tabelle.posizioni.includes(posizione)) {
    blocca({tipo: 'blocco', codice: 'posizione-non-valida', posizione, motivo: 'inesistente'}, 'tfr');
  }

  // Date di riferimento: proposte = cessazione (D19, situazione ordinaria), forzabili.
  let dateRiferimento: Risultato['dateRiferimento'];
  if (cessazione) {
    const riferimento = (chiave: ChiaveDataRiferimento, ...sezioni: NomeSezione[]) => {
      const valore = forza(chiave, cessazione);
      if (valore.forzato === undefined) return valore;
      const forzata = valore.forzato;
      if (!leggiData(forzata)) blocca({tipo: 'blocco', codice: 'data-non-valida', campo: chiave, valore: forzata}, ...sezioni);
      else if (forzata > cessazione) blocca(incoerenti(chiave, forzata, 'non-dopo', 'cessazione', cessazione), ...sezioni);
      else if (assunzione && forzata < assunzione) {
        blocca(incoerenti(chiave, forzata, 'non-prima-di', 'assunzione', assunzione), ...sezioni);
      } else if (forzata < tabelle.coperturaDal) {
        blocca({tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: chiave, data: forzata, coperturaDal: tabelle.coperturaDal}, ...sezioni);
      }
      return valore;
    };
    dateRiferimento = {
      pensione: riferimento('dataRiferimentoPensione'),
      fineServizio: riferimento('dataRiferimentoFineServizio', 'retribuzione', 'tfr'),
    };
  }

  // Retribuzione: i 12 mesi espansi; la % di part-time si controlla sui mesi usati.
  const avvisi: Avviso[] = [];
  let mesi: MeseRetribuzione[] = [];
  if (dateRiferimento && !bloccata('retribuzione')) {
    const espansi = espandiMesi(dati, meseDi(dateRiferimento.fineServizio.usato), assunzione);
    mesi = espansi.mesi;
    if (espansi.fuoriPeriodo.length > 0) {
      const [dal, al] = [mesi[0].mese, mesi[mesi.length - 1].mese];
      avvisi.push({tipo: 'avviso', codice: 'eccezioni-fuori-periodo', mesi: espansi.fuoriPeriodo, dal, al});
    }
    const daControllare: [MeseISO | 'base', number][] = [
      ['base', dati.partTime.base.percentuale],
      ...mesi.filter((m) => dati.partTime.eccezioni[m.mese]).map((m) => [m.mese, m.partTime.percentuale] as [MeseISO, number]),
    ];
    for (const [mese, percentuale] of daControllare) {
      if (!(percentuale > 0 && percentuale <= 100)) {
        blocca({tipo: 'blocco', codice: 'part-time-fuori-range', mese, percentuale}, 'retribuzione', 'tfr');
      }
    }
  }

  // Mese parziale (D9): giorni proposti, forzabili fra 0 e il tetto (26) interi.
  const TETTO_GIORNI = tabelle.parametri.tettoGiorniMeseParziale.valore;
  const giorniForzati = dati.forzature.giorniMeseParziale;
  if (giorniForzati !== undefined && !(Number.isInteger(giorniForzati) && giorniForzati >= 0 && giorniForzati <= TETTO_GIORNI)) {
    blocca({tipo: 'blocco', codice: 'giorni-forzati-non-validi', giorni: giorniForzati, massimo: TETTO_GIORNI}, 'meseParziale');
  }
  let meseParziale: Sezione<MeseParziale> | undefined;
  if (cessazione && !bloccata('meseParziale')) {
    const parziale = calcolaMeseParziale(cessazione, assunzione, TETTO_GIORNI);
    meseParziale = {...parziale, esito: 'calcolata', giorni: forza('giorniMeseParziale', parziale.giorni)};
  }

  // Ultimo miglio TFR fino alla data di riferimento di TFS/TFR (D19: di default la cessazione).
  let tfr: Sezione<Tfr> = {esito: 'bloccata', motivi: motivi('tfr')};
  if (!bloccata('tfr') && !bloccata('retribuzione') && assunzione && dateRiferimento) {
    const calcolo = calcolaTfr({assunzione, cessazione: dateRiferimento.fineServizio.usato, posizione, mesi, tabelle});
    tfr = {esito: 'calcolata', ...calcolo.tfr};
    avvisi.push(...calcolo.avvisi);
  }

  const retribuzione: Sezione<Retribuzione> = bloccata('retribuzione')
    ? {esito: 'bloccata', motivi: motivi('retribuzione')}
    : {esito: 'calcolata', mesi};
  return {
    versioneTabelle: tabelle.versione,
    blocchi: trovati.map((t) => t.blocco),
    avvisi,
    forzature,
    dateRiferimento,
    sezioni: {
      retribuzione,
      meseParziale: meseParziale ?? {esito: 'bloccata', motivi: motivi('meseParziale')},
      tfr,
    },
  };
}

function incoerenti(
  campo: Extract<Blocco, {codice: 'date-incoerenti'}>['campo'],
  data: DataISO,
  regola: 'non-prima-di' | 'non-dopo',
  rispetto: 'assunzione' | 'cessazione',
  dataRispetto: DataISO,
): Blocco {
  return {tipo: 'blocco', codice: 'date-incoerenti', campo, data, regola, rispetto, dataRispetto};
}

/** D9: giorni lun-sab dal 1° (o dall'assunzione) alla cessazione, tetto 26, mese intero = 26. */
function calcolaMeseParziale(cessazione: DataISO, assunzione: DataISO | undefined, tetto: number) {
  const c = leggiData(cessazione)!;
  const assuntoNelMese = assunzione !== undefined && meseDi(assunzione) === meseDi(cessazione);
  const primo = assuntoNelMese ? leggiData(assunzione)!.giorno : 1;
  const meseIntero = primo === 1 && c.giorno === giorniDelMese(c.anno, c.mese);
  let giorni = 0;
  for (let g = primo; g <= c.giorno; g++) if (giornoDellaSettimana(c.anno, c.mese, g) !== 0) giorni++;
  return {
    mese: meseDi(cessazione),
    dal: data(c.anno, c.mese, primo),
    al: cessazione,
    giorni: meseIntero ? tetto : Math.min(giorni, tetto),
  };
}

/**
 * Espande base + eccezioni sui 12 mesi fino a `ultimo` (dal mese di assunzione, se dopo).
 * Le eccezioni fuori dalla finestra si ignorano e si restituiscono per l'avviso.
 */
function espandiMesi(dati: DatiPratica, ultimo: MeseISO, assunzione: DataISO | undefined) {
  const primoPossibile = spostaMese(ultimo, -11);
  const primo = assunzione && meseDi(assunzione) > primoPossibile ? meseDi(assunzione) : primoPossibile;
  const mesi: MeseRetribuzione[] = [];
  for (let m = primo; m <= ultimo; m = spostaMese(m, 1)) {
    mesi.push({
      mese: m,
      voci: {...dati.voci.base, ...dati.voci.eccezioni[m]},
      partTime: dati.partTime.eccezioni[m] ?? dati.partTime.base,
    });
  }
  const conEccezioni = new Set([...Object.keys(dati.voci.eccezioni), ...Object.keys(dati.partTime.eccezioni)]);
  const fuoriPeriodo = [...conEccezioni].filter((m) => m < primo || m > ultimo).sort();
  return {mesi, fuoriPeriodo};
}
