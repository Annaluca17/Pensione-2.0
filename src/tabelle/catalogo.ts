// Catalogo voci unico (D1, D15 di "Regole comuni"): flag di utilità per pensione, 13ª, TFS e TFR e
// numero di mensilità, uguali per ultimo miglio e DMA previste. Fuori: voce PUC e segretari (D18).
// Validità: dal 01/01/2019 salvo la voce 02 (dal 01/04/2023, art. 78 CCNL 2019-21) e la Una Tantum
// 1,5% (solo 2023). Il codice 'UT' della Una Tantum non è numerato nella maschera PASSWEB.
import type {UtilitaVoce, VoceCatalogo} from '../motore';

const dal = '2019-01-01';
const fonte =
  'Ticket 06 (D15) del rifacimento; flag riscontrati sul vecchio codice (AnticipoDMAPartTime) e sulle ricerche in .scratch/rifacimento/research';

const u = (pensione: boolean, tredicesima: boolean, tfs: boolean, tfr: boolean): UtilitaVoce => ({
  pensione,
  tredicesima,
  tfs,
  tfr,
});

export const catalogoVoci = [
  {codice: '01', descrizione: 'Stipendio tabellare (con quota comparto conglobata dal 2026)', mensilita: 12, utile: u(true, true, true, true), dal, fonte},
  {codice: '02', descrizione: 'Differenziale storico (ex PEO)', mensilita: 12, utile: u(true, true, true, true), dal: '2023-04-01', fonte: `${fonte}; validità dal 01/04/2023 (art. 78 c. 3 CCNL 2019-21)`},
  {codice: '03', descrizione: 'Differenziale stipendiale art. 14 CCNL 2019-21', mensilita: 12, utile: u(true, true, true, true), dal, fonte},
  {codice: '04', descrizione: 'Assegno ad personam non riassorbibile IIS', mensilita: 12, utile: u(true, true, true, true), dal, fonte},
  {codice: '05', descrizione: 'Assegno ad personam assorbibile progressione verticale', mensilita: 12, utile: u(true, true, true, true), dal, fonte: `${fonte}; TFR sì (R6 di "Conferme normative residue")`},
  {codice: '06', descrizione: 'RIA (retribuzione individuale di anzianità)', mensilita: 12, utile: u(true, true, true, true), dal, fonte},
  {codice: '07', descrizione: 'Retribuzione di posizione', mensilita: 12, utile: u(true, true, false, true), dal, fonte: `${fonte}; TFS no per prassi (D7, research/posizione-tfs.md)`},
  {codice: '08', descrizione: 'Indennità specifica 5,38 €', mensilita: 12, utile: u(true, false, true, true), dal, fonte},
  {codice: '09', descrizione: 'IVC (valore da tabella)', mensilita: 12, utile: u(true, true, true, true), dal, fonte},
  {codice: '10', descrizione: 'Indennità di comparto (quota residua)', mensilita: 12, utile: u(true, false, false, false), dal, fonte: `${fonte}; non utile al TFR per prassi (D6, research/comparto-tfs-tfr.md)`},
  {codice: '11', descrizione: 'Indennità di vigilanza', mensilita: 12, utile: u(true, false, true, true), dal, fonte},
  {codice: '12', descrizione: 'Indennità professionale asili (72)', mensilita: 12, utile: u(true, false, true, true), dal, fonte},
  {codice: '13', descrizione: 'Indennità aggiuntiva asili (78)', mensilita: 12, utile: u(true, false, true, true), dal, fonte},
  {codice: '14', descrizione: 'Tempo potenziato scolastico (74)', mensilita: 10, utile: u(true, false, false, false), dal, fonte},
  {codice: '15', descrizione: 'Accessorio asili nido (84)', mensilita: 10, utile: u(true, false, false, false), dal, fonte},
  {codice: 'UT', descrizione: 'Una Tantum 1,5% (solo 2023)', mensilita: 12, utile: u(true, true, false, false), dal: '2023-01-01', al: '2023-12-31', fonte: `${fonte}; flag di Anticipo DMA, da confermare (D15)`},
] as const satisfies readonly VoceCatalogo[];
