// Modifiche ai dati della pratica dal fascicolo (ticket 14). Dati di fantasia.
import {describe, expect, it} from 'vitest';
import type {DatiPratica, DatiPraticaPensione} from '../motore';
import {
  allineaRegime,
  impostaDmaPreviste,
  impostaMiglioramento,
  impostaPensioneErogata,
  meseDmaProposto,
  impostaSituazione,
  scegliRegime,
  impostaAnagrafica,
  impostaEccezionePartTime,
  impostaEccezioneVoce,
  impostaForzatura,
  impostaPartTimeBase,
  impostaVoceBase,
  leggiEuro,
  scriviEuro,
} from './modifiche';

const dati: DatiPratica = {
  anagrafica: {nome: 'Mario Rossi', codiceFiscale: 'RSSMRA80A01H501U', posizione: 'C3', assunzione: '2012-09-01', cessazione: '2026-10-20'},
  voci: {base: {'01': 192823}, eccezioni: {}},
  partTime: {base: {percentuale: 100}, eccezioni: {}},
  forzature: {},
  iscrittoCredito: false,
};

describe('modifiche dei dati', () => {
  it('anagrafica: una data vuota toglie il campo', () => {
    expect(impostaAnagrafica(dati, 'cessazione', '').anagrafica).not.toHaveProperty('cessazione');
    expect(impostaAnagrafica(dati, 'posizione', 'D3').anagrafica.posizione).toBe('D3');
  });

  it('voci: base ed eccezioni per mese, che si tolgono senza lasciare mesi vuoti', () => {
    let d = impostaVoceBase(dati, '02', 9019);
    expect(d.voci.base).toEqual({'01': 192823, '02': 9019});
    d = impostaEccezioneVoce(d, '2025-12', '01', 191555);
    expect(d.voci.eccezioni).toEqual({'2025-12': {'01': 191555}});
    d = impostaEccezioneVoce(d, '2025-12', '01', undefined);
    expect(d.voci.eccezioni).toEqual({});
    expect(impostaVoceBase(d, '02', undefined).voci.base).toEqual({'01': 192823});
    expect(dati.voci.base).toEqual({'01': 192823}); // pure
  });

  it('part-time: base ed eccezioni', () => {
    let d = impostaPartTimeBase(dati, {percentuale: 50, tipo: 'O'});
    d = impostaEccezionePartTime(d, '2026-04', {percentuale: 80, tipo: 'M'});
    expect(d.partTime).toEqual({base: {percentuale: 50, tipo: 'O'}, eccezioni: {'2026-04': {percentuale: 80, tipo: 'M'}}});
    expect(impostaEccezionePartTime(d, '2026-04', undefined).partTime.eccezioni).toEqual({});
  });

  it('forzature: solo giorni e date di riferimento, che si tolgono', () => {
    const d = impostaForzatura(dati, 'giorniMeseParziale', 15);
    expect(d.forzature).toEqual({giorniMeseParziale: 15});
    expect(impostaForzatura(d, 'giorniMeseParziale', undefined).forzature).toEqual({});
  });
});

describe('importi in euro', () => {
  it('legge le forme italiane e quella col punto', () => {
    expect(leggiEuro('1.928,23')).toBe(192823);
    expect(leggiEuro('1928,2')).toBe(192820);
    expect(leggiEuro('1928.23')).toBe(192823);
    expect(leggiEuro(' 19 €')).toBe(1900);
    expect(leggiEuro('')).toBeUndefined();
    expect(leggiEuro('1,234')).toBeNull();
    expect(leggiEuro('abc')).toBeNull();
  });

  it('scrive all\'italiana', () => {
    expect(scriviEuro(192823)).toBe('1.928,23');
    expect(scriviEuro(5)).toBe('0,05');
    expect(scriviEuro(-12345678)).toBe('-123.456,78');
  });
});

describe('regime della pratica di pensione (ticket 30)', () => {
  const pensione = (assunzione?: string, scelta?: Partial<DatiPraticaPensione>): DatiPraticaPensione => ({
    ...dati,
    anagrafica: {...dati.anagrafica, assunzione},
    regime: 'TFS',
    situazione: {tipo: 'ordinaria'},
    ...scelta,
  });

  it("segue l'assunzione: fino al 31/12/2000 TFS, dal 01/01/2001 TFR (DPCM 20/12/1999), senza assunzione TFS", () => {
    expect(allineaRegime(pensione('2000-12-31')).regime).toBe('TFS');
    expect(allineaRegime(pensione('2001-01-01')).regime).toBe('TFR');
    expect(allineaRegime(pensione('2001-01-01', {regime: 'TFR'})).regime).toBe('TFR');
    expect(allineaRegime(pensione(undefined, {regime: 'TFR'})).regime).toBe('TFS');
  });

  it("scelto dall'operatore non segue più l'assunzione", () => {
    expect(allineaRegime(pensione('2015-04-01', {regimeScelto: true})).regime).toBe('TFS');
  });

  it("scegliere il regime lo fissa; tornare al proposto lo riallinea all'assunzione", () => {
    const scelto = scegliRegime(pensione('2015-04-01', {regime: 'TFR'}), 'TFS');
    expect([scelto.regime, scelto.regimeScelto]).toEqual(['TFS', true]);
    const proposto = scegliRegime(scelto, undefined);
    expect(proposto.regime).toBe('TFR');
    expect(proposto).not.toHaveProperty('regimeScelto');
  });

  it("situazione: il tipo nuovo tiene il primo giorno già inserito; senza, resta vuoto (blocco finché manca); ordinaria non ha giorno", () => {
    const congedo = impostaSituazione(pensione('1998-01-01'), 'congedo-104');
    expect(congedo.situazione).toEqual({tipo: 'congedo-104', dal: ''});
    const conDal = impostaSituazione(congedo, 'congedo-104', '2026-03-01');
    expect(impostaSituazione(conDal, 'optante-tfr').situazione).toEqual({tipo: 'optante-tfr', dal: '2026-03-01'});
    expect(impostaSituazione(conDal, 'ordinaria').situazione).toEqual({tipo: 'ordinaria'});
  });

  it('pensione erogata: entra solo con tutti e due i totali; con uno solo la pratica non la ha', () => {
    const entrambi = impostaPensioneErogata(pensione(), {fissi: 3000000, tredicesima: 250000});
    expect(entrambi.pensioneErogata).toEqual({fissi: 3000000, tredicesima: 250000});
    expect(impostaPensioneErogata(entrambi, {fissi: 3000000})).not.toHaveProperty('pensioneErogata');
    expect(impostaPensioneErogata(entrambi, {fissi: 3000000}).regime).toBe('TFS');
  });
});

describe('DMA previste e miglioramento (ticket 31)', () => {
  const pensione = (cessazione?: string): DatiPraticaPensione => ({
    ...dati,
    anagrafica: {...dati.anagrafica, cessazione},
    regime: 'TFS',
    situazione: {tipo: 'ordinaria'},
  });

  it('DMA previste: il mese si imposta e si toglie, il resto della pratica non cambia', () => {
    const con = impostaDmaPreviste(pensione(), '2026-04');
    expect(con.dmaPreviste).toEqual({dal: '2026-04'});
    expect(con.regime).toBe('TFS');
    expect(impostaDmaPreviste(con, undefined)).not.toHaveProperty('dmaPreviste');
  });

  it('il mese proposto è cinque mesi prima della cessazione: sei DMA, il limite (D12)', () => {
    expect(meseDmaProposto(pensione('2027-03-31'))).toBe('2026-10');
    expect(meseDmaProposto(pensione('2027-01-15'))).toBe('2026-08');
    expect(meseDmaProposto(pensione(undefined))).toBeUndefined();
  });

  it('miglioramento: il contratto si imposta e si toglie, il resto della pratica non cambia', () => {
    const con = impostaMiglioramento(pensione(), 'ccnl-2022-24');
    expect(con.miglioramento).toEqual({contratto: 'ccnl-2022-24'});
    expect(con.regime).toBe('TFS');
    expect(impostaMiglioramento(con, undefined)).not.toHaveProperty('miglioramento');
  });
});
