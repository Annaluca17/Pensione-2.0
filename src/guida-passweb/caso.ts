// Dalla sezione TFR del motore all'ingresso della guida (ticket 18): stessa casistica dei due mesi,
// importi delle righe PASSWEB in euro. Nessun calcolo: legge il Risultato.
import type {EstremoTfr, IdRigaTfr, Tfr} from '../motore';
import type {CasoGuida, CasoMese} from './costruttore';

const CASO: Record<EstremoTfr['esito'], CasoMese> = {intero: 'PIENO', utile: 'PARZIALE_GE15', 'non-utile': 'PARZIALE_LT15'};

export function casoDaTfr(tfr: Tfr): CasoGuida {
  const euro = (estremo: 'iniziale' | 'finale', id: IdRigaTfr) => {
    const riga = tfr.righe.find((r) => r.estremo === estremo && r.id === id);
    return riga ? riga.composizione.arrotondato / 100 : undefined;
  };
  return {
    decorrenzaGiuridica: tfr.decorrenzaGiuridica,
    decorrenzaEconomica: tfr.decorrenzaEconomica,
    dataCessazione: tfr.dataCessazione,
    casoIniziale: CASO[tfr.meseIniziale.esito],
    casoFinale: CASO[tfr.meseFinale.esito],
    rateoPrimoAnno: euro('iniziale', 'rateo-tredicesima-teorica'),
    rateoCessazione: euro('finale', 'rateo-tredicesima-teorica'),
    tredicesimaEmolumentiCassa: euro('finale', 'tredicesima-emolumenti-cassa'),
  };
}
