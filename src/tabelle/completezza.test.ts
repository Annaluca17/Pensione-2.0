// Test sui soli dati (ticket 22): copertura senza buchi dal 01/01/2019, importi derivabili dalla
// fonte primaria (IVC e incremento 2023 = percentuale × tabellare), catalogo senza PUC né segretari,
// e aggiunta/rimozione di un contratto senza toccare il motore (storia 85).
import {describe, expect, it} from 'vitest';
import {arrotonda, calcolaPratica} from '../motore';
import type {Area, ContrattoDefinitivo, Importo, Scaglionamento} from '../motore';
import {impronta} from './impronta';
import {tabelle} from './index';
import {versioni} from './versioni';

const aree: readonly Area[] = ['funzionari-eq', 'istruttori', 'operatori-esperti', 'operatori'];

function definitivo(id: string): ContrattoDefinitivo {
  const c = tabelle.contratti.find((x) => x.id === id);
  if (c?.stato !== 'definitivo') throw new Error(`${id}: atteso un contratto definitivo`);
  return c;
}
const tabellare = (id: string, decorrenza: string): Scaglionamento => {
  const s = definitivo(id).scaglionamenti.find((x) => x.decorrenza === decorrenza && x.tipo === 'tabellare');
  if (!s) throw new Error(`${id}: tabellare ${decorrenza} assente`);
  return s;
};
const annuo = (i: Importo) => i.annuo!;

const giornoDopo = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

describe('copertura dal 01/01/2019 senza buchi di vigenza', () => {
  const ordinati = [...tabelle.contratti].sort((a, b) => a.vigenza.dal.localeCompare(b.vigenza.dal));

  it('il primo contratto parte dalla copertura delle tabelle', () => {
    expect(tabelle.coperturaDal).toBe('2019-01-01');
    expect(ordinati[0].vigenza.dal).toBe(tabelle.coperturaDal);
  });

  it('ogni contratto comincia il giorno dopo la fine del precedente: né buchi né sovrapposizioni', () => {
    for (let i = 1; i < ordinati.length; i++) {
      expect(ordinati[i].vigenza.dal, `${ordinati[i - 1].id} → ${ordinati[i].id}`).toBe(giornoDopo(ordinati[i - 1].vigenza.al));
    }
  });

  it('il tabellare di ogni giorno dal 2019 viene da un contratto definitivo fino alla fine del 2024', () => {
    const definitivi = ordinati.filter((c) => c.stato === 'definitivo');
    expect(definitivi.at(-1)!.id).toBe('ccnl-2022-24');
    expect(definitivi.at(-1)!.vigenza.al).toBe('2024-12-31');
    // dopo il 2024 il tabellare in vigore resta l'ultimo scaglionamento del 2022-24 (T6): l'Ipotesi non lo cambia
    const ultima = definitivo('ccnl-2022-24').scaglionamenti.at(-1)!;
    expect(ultima.decorrenza).toBe('2026-01-01');
  });

  it('ogni scaglionamento cade entro la copertura delle tabelle', () => {
    for (const c of tabelle.contratti.filter((x) => x.stato === 'definitivo')) {
      for (const s of (c as ContrattoDefinitivo).scaglionamenti) expect(s.decorrenza >= tabelle.coperturaDal).toBe(true);
    }
  });
});

describe('IVC e incrementi coincidono con la percentuale della fonte primaria sul tabellare', () => {
  const ccnl = definitivo('ccnl-2022-24');
  const ivc = (dal: string) => ccnl.ivc.find((p) => p.dal === dal)!;

  it('IVC 0,30% dal 01/04/2022 e 0,50% dal 01/07/2022: percentuale × tabellare di fine 2021 (Tab. E) / 12, per posizione', () => {
    const tab2021 = tabellare('ccnl-2019-21', '2021-01-01');
    for (const posizione of Object.keys(tab2021.importi)) {
      expect(ivc('2022-04-01').importi[posizione].mensile, `0,30% ${posizione}`).toBe(
        arrotonda((annuo(tab2021.importi[posizione]) * 0.003) / 12),
      );
      expect(ivc('2022-07-01').importi[posizione].mensile, `0,50% ${posizione}`).toBe(
        arrotonda((annuo(tab2021.importi[posizione]) * 0.005) / 12),
      );
    }
  });

  it('IVC 0,50% dal 01/01/2023: percentuale × tabellare con EP conglobato (Tab. F) / 12, per posizione', () => {
    const tab2023 = tabellare('ccnl-2019-21', '2023-01-01');
    for (const posizione of Object.keys(tab2023.importi)) {
      expect(ivc('2023-01-01').importi[posizione].mensile, posizione).toBe(
        arrotonda((annuo(tab2023.importi[posizione]) * 0.005) / 12),
      );
    }
  });

  it('incremento 2023 per area dal 01/04/2023: 0,5% della Tab. G / 12 (D5 del ticket 21)', () => {
    const tabG = tabellare('ccnl-2019-21', '2023-04-01');
    const incremento = ccnl.scaglionamenti.find((s) => s.decorrenza === '2023-04-01' && s.tipo === 'incremento')!;
    for (const area of aree) {
      expect(incremento.importi[area].mensile, area).toBe(arrotonda((annuo(tabG.importi[area]) * 0.005) / 12));
    }
  });

  it('IVC 2025 per area: 0,6% da aprile a giugno e 1% dal 01/07/2025 del tabellare 2026 / 12', () => {
    const tab2026 = tabellare('ccnl-2022-24', '2026-01-01');
    const apr = ivc('2025-04-01');
    const lug = ivc('2025-07-01');
    expect([apr.percentuale, lug.percentuale]).toEqual([0.6, 1]);
    expect([apr.al, lug.al]).toEqual(['2025-06-30', undefined]);
    expect([apr.anticipa, lug.anticipa]).toEqual(['ccnl-2025-27', 'ccnl-2025-27']);
    for (const area of aree) {
      expect(apr.importi[area].mensile, `0,6% ${area}`).toBe(arrotonda((annuo(tab2026.importi[area]) * 0.006) / 12));
      expect(lug.importi[area].mensile, `1% ${area}`).toBe(arrotonda((annuo(tab2026.importi[area]) * 0.01) / 12));
    }
  });

  it('IVC dell\'Ipotesi 2025-27: stato ipotesi, nessun importo prodotto', () => {
    const ipotesi = tabelle.contratti.find((c) => c.id === 'ccnl-2025-27')!;
    expect(ipotesi.stato).toBe('ipotesi');
    expect(ipotesi).not.toHaveProperty('ivc');
    expect(ipotesi).not.toHaveProperty('scaglionamenti');
  });
});

describe('catalogo: la voce PUC e i segretari non ci sono (D15, D18)', () => {
  it('nessuna voce parla di PUC o di segretari, e i codici sono i 15 più la Una Tantum', () => {
    for (const v of tabelle.catalogoVoci) {
      expect(`${v.codice} ${v.descrizione}`).not.toMatch(/PUC|elevazione ore|segretar/i);
    }
    expect(tabelle.catalogoVoci).toHaveLength(16);
  });

  it('nessuna riga PASSWEB cita PUC o segretari', () => {
    const testo = JSON.stringify(tabelle.righePassweb) + JSON.stringify(tabelle.righeTfr);
    expect(testo).not.toMatch(/PUC|segretar/i);
  });
});

describe('aggiungere e togliere un contratto non tocca il motore (storia 85)', () => {
  // Un contratto di prova nel 2029-2031: definitivo, con un'IVC propria per area.
  const prova: ContrattoDefinitivo = {
    id: 'ccnl-prova',
    nome: 'Contratto di prova',
    stato: 'definitivo',
    firma: '2029-06-01',
    vigenza: {dal: '2028-01-01', al: '2030-12-31'},
    fonte: 'https://esempio.invalid/prova',
    scaglionamenti: [
      {
        decorrenza: '2028-01-01',
        chiave: 'area',
        tipo: 'tabellare',
        divisoreAnnuo: 12,
        fonte: 'prova',
        importi: Object.fromEntries(aree.map((a) => [a, {mensile: 250000, annuo: 3000000}])),
      },
    ],
    ivc: [],
    indennitaComparto: [],
  };
  const conProva = {...tabelle, contratti: [...tabelle.contratti, prova]};
  const ivcDigitata = {
    anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C5', assunzione: '2001-03-01', cessazione: '2028-10-20'},
    voci: {base: {'01': 250000, '09': 5000}, eccezioni: {}},
    partTime: {base: {percentuale: 100}, eccezioni: {}},
    forzature: {},
    iscrittoCredito: true,
  };
  const contrattoApplicato = (t: typeof tabelle) => {
    const avviso = calcolaPratica(ivcDigitata, t).avvisi.find((a) => a.codice === 'ivc-incompatibile');
    return avviso?.codice === 'ivc-incompatibile' ? avviso.contrattoApplicato : undefined;
  };

  it('con il contratto di prova il motore applica quello nei mesi della sua vigenza; senza, torna al 2022-24', () => {
    expect(contrattoApplicato(conProva)).toBe('ccnl-prova');
    expect(contrattoApplicato(tabelle)).toBe('ccnl-2022-24');
  });

  it('un contratto in più cambia l\'impronta: serve una riga nuova nel registro versioni', () => {
    const {versione: _v, registro: _r, ...contenuto} = tabelle;
    const {versione: _v2, registro: _r2, ...contenutoConProva} = conProva;
    const ultima = versioni[versioni.length - 1];
    expect(impronta(contenuto)).toBe(ultima.impronta);
    expect(impronta(contenutoConProva)).not.toBe(ultima.impronta);
  });
});
