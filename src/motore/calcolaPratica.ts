import {avvisiIpotesi} from './contratti';
import {calcolaUmPensione} from './pensione';
import {calcolaTfr} from './tfr';
import {calcolaTfs} from './tfs';
import {data, giornoDellaSettimana, giornoPrima, giorniDelMese, leggiData, meseDi, spostaMese} from './date';
import type {
  Avviso,
  Blocco,
  ChiaveDataRiferimento,
  ChiaveForzatura,
  DataISO,
  DatiPratica,
  DatiPraticaPensione,
  ForzaturaApplicata,
  MeseISO,
  MeseParziale,
  MeseRetribuzione,
  Retribuzione,
  Risultato,
  Sezione,
  Tabelle,
  Tfr,
  Tfs,
  UmPensione,
  ValoreForzabile,
} from './tipi';

type Nome = keyof Risultato['sezioni'];

/**
 * Unico ingresso del calcolo (spec "Motore"): funzione pura, nessuna eccezione per il dominio.
 * Pratica di pensione = dati con regime e situazione; altrimenti pratica di cessazione (ADR 0002).
 */
export function calcolaPratica(dati: DatiPratica | DatiPraticaPensione, tabelle: Tabelle): Risultato {
  const pensione = 'regime' in dati ? dati : undefined;
  const trovati: {blocco: Blocco; sezioni: Nome[]}[] = [];
  /** Registra un blocco e le sezioni che ferma; un blocco senza sezioni ferma solo quelle future. */
  const blocca = (blocco: Blocco, ...sezioni: Nome[]) => trovati.push({blocco, sezioni});
  const bloccata = (sezione: Nome) => trovati.some((t) => t.sezioni.includes(sezione));
  const motivi = (sezione: Nome) => trovati.filter((t) => t.sezioni.includes(sezione)).map((t) => t.blocco);

  const forzature: ForzaturaApplicata[] = [];
  const forza = <T extends number | DataISO>(chiave: ChiaveForzatura, proposto: T): ValoreForzabile<T> => {
    const forzato = dati.forzature[chiave] as T | undefined;
    if (forzato === undefined) return {proposto, usato: proposto};
    forzature.push({chiave, proposto, forzato});
    return {proposto, usato: forzato, forzato};
  };

  // Anagrafica: le date reggono tutto il resto.
  const tutte: Nome[] = ['retribuzione', 'meseParziale', 'umPensione', 'tfs', 'tfr'];
  const valida = (campo: 'assunzione' | 'cessazione', valore: DataISO | undefined, ...sezioni: Nome[]) => {
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
    blocca({tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: 'cessazione', data: cessazione, coperturaDal: tabelle.coperturaDal}, 'umPensione', 'tfs', 'tfr');
  }

  const posizione = dati.anagrafica.posizione;
  if (!/^[A-D]\d+$/.test(posizione)) {
    blocca({tipo: 'blocco', codice: 'posizione-non-valida', posizione, motivo: 'fuori-aree-a-d'}, 'umPensione', 'tfs', 'tfr');
  } else if (!tabelle.posizioni.includes(posizione)) {
    blocca({tipo: 'blocco', codice: 'posizione-non-valida', posizione, motivo: 'inesistente'}, 'umPensione', 'tfs', 'tfr');
  }

  // Optante in regime TFR: la sezione TFR dell'optante non è gestita (storia 58; ticket 23 con l'utente).
  if (pensione?.regime === 'TFR' && pensione.situazione.tipo === 'optante-tfr') {
    blocca({tipo: 'blocco', codice: 'situazione-non-gestita', situazione: 'optante-tfr', regime: 'TFR'}, 'tfr');
  }

  // Situazione (D19, C20-1): `dal` è una data dentro il rapporto, dopo l'assunzione.
  let inizioSituazione: DataISO | undefined;
  if (pensione && pensione.situazione.tipo !== 'ordinaria') {
    const valore = pensione.situazione.dal;
    const sezioni: Nome[] = ['retribuzione', 'umPensione', 'tfs', 'tfr'];
    if (!leggiData(valore)) blocca({tipo: 'blocco', codice: 'data-non-valida', campo: 'situazione', valore}, ...sezioni);
    else if (cessazione && valore > cessazione) blocca(incoerenti('situazione', valore, 'non-dopo', 'cessazione', cessazione), ...sezioni);
    else if (assunzione && valore <= assunzione) blocca(incoerenti('situazione', valore, 'non-prima-di', 'assunzione', assunzione), ...sezioni);
    else inizioSituazione = valore;
  }

  // Date di riferimento (D19, C20-1), forzabili: di default la cessazione. Sospensione cautelare e
  // trattenuta per malattia → entrambe al giorno prima di `dal`; congedo L. 104 e optante → solo la
  // fine del servizio (per l'optante la data di fine TFS, D14).
  let dateRiferimento: Risultato['dateRiferimento'];
  if (cessazione) {
    const tipo = pensione?.situazione.tipo;
    const primaDi = inizioSituazione && giornoPrima(inizioSituazione);
    const proposte = {
      dataRiferimentoPensione: (tipo === 'sospensione-cautelare' || tipo === 'trattenuta-malattia') && primaDi ? primaDi : cessazione,
      dataRiferimentoFineServizio: primaDi ?? cessazione,
    };
    const riferimento = (chiave: ChiaveDataRiferimento, ...sezioni: Nome[]) => {
      const valore = forza(chiave, proposte[chiave]);
      if (valore.forzato === undefined) {
        if (valore.proposto !== cessazione && valore.proposto < tabelle.coperturaDal) {
          blocca({tipo: 'blocco', codice: 'tabelle-non-disponibili', campo: chiave, data: valore.proposto, coperturaDal: tabelle.coperturaDal}, ...sezioni);
        }
        return valore;
      }
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
      pensione: riferimento('dataRiferimentoPensione', 'umPensione'),
      fineServizio: riferimento('dataRiferimentoFineServizio', 'retribuzione', 'tfs', 'tfr'),
    };
  }

  // Retribuzione: i 12 mesi espansi; la % di part-time si controlla sui mesi usati.
  const avvisi: Avviso[] = [];
  let mesi: MeseRetribuzione[] = [];
  if (dateRiferimento && !bloccata('retribuzione')) {
    const fine = meseDi(dateRiferimento.fineServizio.usato);
    const mesePensione = meseDi(dateRiferimento.pensione.usato);
    const espansi = espandiMesi(dati, fine, pensione && mesePensione > fine ? mesePensione : fine, assunzione);
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
  // Nella pratica di pensione il TFR c'è solo in regime TFR (ADR 0002).
  const conTfr = !pensione || pensione.regime === 'TFR';
  let tfr: Sezione<Tfr> = {esito: 'bloccata', motivi: motivi('tfr')};
  if (conTfr && !bloccata('tfr') && !bloccata('retribuzione') && assunzione && dateRiferimento) {
    const calcolo = calcolaTfr({assunzione, cessazione: dateRiferimento.fineServizio.usato, posizione, mesi, tabelle});
    tfr = {esito: 'calcolata', ...calcolo.tfr};
    avvisi.push(...calcolo.avvisi);
  }

  // Ultimo miglio di pensione sul mese della data di riferimento della pensione (storia 39).
  let umPensione: Sezione<UmPensione> | undefined;
  if (pensione) {
    umPensione = {esito: 'bloccata', motivi: motivi('umPensione')};
    if (!bloccata('umPensione') && dateRiferimento) {
      const data = dateRiferimento.pensione.usato;
      const voci = {...dati.voci.base, ...dati.voci.eccezioni[meseDi(data)]};
      const calcolo = calcolaUmPensione({data, voci, posizione, tabelle});
      umPensione = {esito: 'calcolata', ...calcolo.umPensione};
      // Un mese letto anche dal TFR ha già il suo avviso IVC: uno per mese.
      const visti = new Set(avvisi.map((a) => a.codice === 'ivc-incompatibile' && a.mese));
      avvisi.push(...calcolo.avvisi.filter((a) => !(a.codice === 'ivc-incompatibile' && visti.has(a.mese))));
    }
  }

  // Ultimo miglio TFS: i mesi effettivi fino al mese della data di fine TFS (D3, D14), solo in regime TFS.
  const conTfs = pensione?.regime === 'TFS';
  let tfs: Sezione<Tfs> = {esito: 'bloccata', motivi: motivi('tfs')};
  if (conTfs && !bloccata('tfs') && dateRiferimento) {
    const fine = meseDi(dateRiferimento.fineServizio.usato);
    const mesiTfs = mesi.filter((m) => m.mese <= fine);
    if (mesiTfs.length > 0) {
      const calcolo = calcolaTfs({mesi: mesiTfs, annualizza: Object.keys(dati.voci.eccezioni).length === 0, posizione, tabelle});
      tfs = {esito: 'calcolata', ...calcolo.tfs};
      // Un mese già avvisato (dalla pensione o dal TFR) non si avvisa due volte: uno per mese.
      const visti = new Set(avvisi.flatMap((a) => (a.codice === 'ivc-incompatibile' ? [a.mese] : [])));
      avvisi.push(...calcolo.avvisi.filter((a) => !(a.codice === 'ivc-incompatibile' && visti.has(a.mese))));
      // Un'ipotesi nella cui vigenza cade la fine TFS: stesso avviso della pensione, una volta per ipotesi (T5).
      const ipotesi = new Set(avvisi.flatMap((a) => (a.codice === 'contratto-in-ipotesi' ? [a.contratto] : [])));
      avvisi.push(...avvisiIpotesi(tabelle, dateRiferimento.fineServizio.usato).filter((a) => a.codice !== 'contratto-in-ipotesi' || !ipotesi.has(a.contratto)));
    }
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
      ...(umPensione && {umPensione}),
      ...(conTfs && {tfs}),
      ...(conTfr && {tfr}),
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
 * Espande base + eccezioni dai 12 mesi prima di `fine` (dal mese di assunzione, se dopo) fino a
 * `ultimo` (C20-2: il mese della pensione, se dopo la fine del servizio). Le eccezioni fuori dalla
 * finestra si ignorano e si restituiscono per l'avviso.
 */
function espandiMesi(dati: DatiPratica, fine: MeseISO, ultimo: MeseISO, assunzione: DataISO | undefined) {
  const primoPossibile = spostaMese(fine, -11);
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
