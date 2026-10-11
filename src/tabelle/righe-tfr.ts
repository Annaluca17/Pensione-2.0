// Mappa voce → riga PASSWEB del TFR (D1, D16). Il TFR non ha una riga per voce: la maschera
// "Dati retributivi utili al TFR" chiede la retribuzione valutabile del mese pieno e, per il rateo di
// 13ª, i campi di rateo e di cassa (src/guida-passweb/costruttore.ts, logicTFR.ts). Le voci qui
// elencate sono quelle con il flag corrispondente nel catalogo: lo verifica righe.test.ts.
import type {RigaPassweb} from '../motore';

const fonte =
  'Maschera Nuova PassWeb "Dati retributivi utili al TFR" (Circ. INPS 185/2021 §2.1-2.2.1); regole in ticket 06 e 12 del rifacimento';

export const righeTfr = [
  {
    id: 'retribuzione-valutabile',
    etichetta: 'Retribuzione valutabile del mese pieno',
    voci: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '11', '12', '13'],
    fonte,
  },
  {
    id: 'rateo-tredicesima-teorica',
    etichetta: 'Rateo di 13ª teorica, modalità di pagamento "Parziale"',
    voci: ['01', '02', '03', '04', '05', '06', '07', '09'],
    fonte,
  },
  {
    id: 'tredicesima-emolumenti-cassa',
    etichetta: 'Tredicesima ed emolumenti valutabili arretrati per cassa',
    voci: ['01', '02', '03', '04', '05', '06', '07', '09'],
    fonte,
  },
] as const satisfies readonly RigaPassweb[];
