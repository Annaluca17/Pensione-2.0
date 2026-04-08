// ─── Types ───────────────────────────────────────────────────────────────────

import { round2 } from './utils/math';

export interface Anagrafica {
  cognomeNome: string;
  codiceFiscale: string;
  qualifica: string;
  dataPensione: string;
  ente: string;
  motivoCessazione: string;
}

export interface VoceRetributiva {
  id: string;
  label: string;
  valido13: boolean;
  importoMensile: number;
}

export interface MeseStipendioInput {
  stipendio: number;
  tredicesima: number;
}

export type Step = 'anagrafica' | 'stipendi' | 'voci' | 'risultato';

// ─── Voci retributive definition ─────────────────────────────────────────────

export const VOCI_RETRIBUTIVE: Omit<VoceRetributiva, 'importoMensile'>[] = [
  { id: 'stip_tab', label: 'Stipendio tabellare per 12 mensilità', valido13: true },
  { id: 'tredicesima', label: '13ª Mensilità', valido13: true },
  { id: 'diff_storico', label: 'Differenziale storico (ex PEO) per 13 mensilità', valido13: true },
  { id: 'diff_stip', label: 'Differenziale stipendiale per 13 mensilità (CCNL 2019–2021)', valido13: true },
  { id: 'ass_iis', label: 'Assegno personale non riassorbibile IIS Cat. B e D per 13 mensilità – art. 29 c. 4 CCNL 2004', valido13: true },
  { id: 'ass_pers', label: 'Assegno ad personam riassorbibile progressione verticale per 13 mensilità', valido13: true },
  { id: 'ria', label: 'Salario Individuale di Anzianità (ex R.I.A.) per 13 mensilità', valido13: true },
  { id: 'ind_spec', label: 'Indennità specifica (ex art. 4 c. 3 CCNL 16/07/1996) per 12 mensilità', valido13: false },
  { id: 'ivc', label: 'Indennità di Vacanza Contrattuale (compreso Anticipo IVC) per 13 mensilità', valido13: true },
  { id: 'ind_vig', label: 'Indennità di vigilanza per 12 mensilità', valido13: false },
  { id: 'ind_prof_asili', label: 'Indennità Professionale asili nido e scolastico €55,40 mensili per 12 mensilità – art. 37 c. 1 lett. c CCNL 1995 (voce 72)', valido13: false },
  { id: 'ind_agg_asili', label: 'Indennità Aggiuntiva asili nido e scolastico €28,41 mensili per 12 mensilità – art. 6 CCNL 2001 (voce 78)', valido13: false },
];

export const MESI_LABELS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

// ─── Calculation Engine ───────────────────────────────────────────────────────

export interface RisultatoCalcolo {
  vociAnnualizzate: { id: string; label: string; importoMensile: number; importoAnnuo: number; valido13: boolean }[];
  stipendiMensili: MeseStipendioInput[];
  totaleStipendi12mesi: number;
  totaleTredicesime12mesi: number;
  ria: number;
  tredicesima: number;
  stipTabellare: number;
  indAsili: number;
  ind6456: number;
  indVigilanza: number;
  totaleUltimoMiglio: number;
}

export function calcolaRisultato(
  voci: VoceRetributiva[],
  stipendiMensili: MeseStipendioInput[]
): RisultatoCalcolo {
  const byId = (id: string) => voci.find(v => v.id === id)?.importoMensile ?? 0;

  const totaleStipendi12mesi = round2(
    stipendiMensili.reduce((s, v) => s + v.stipendio, 0)
  );
  const totaleTredicesime12mesi = round2(
    stipendiMensili.reduce((s, v) => s + v.tredicesima, 0)
  );

  const E: Record<string, number> = {};
  voci.forEach(v => {
    if (v.id === 'stip_tab') E[v.id] = totaleStipendi12mesi;
    else if (v.id === 'tredicesima') E[v.id] = totaleTredicesime12mesi;
    else E[v.id] = round2(byId(v.id) * 12);
  });

  const ria = round2(E['ria']);
  const tredicesima = round2(
    E['tredicesima'] + byId('diff_storico') + byId('diff_stip')
    + byId('ass_iis') + byId('ass_pers') + byId('ria') + byId('ivc')
  );
  const stipTabellare = round2(
    E['stip_tab'] + E['diff_storico'] + E['diff_stip']
    + E['ass_iis'] + E['ass_pers'] + E['ivc']
  );
  const indAsili = round2(E['ind_prof_asili'] + E['ind_agg_asili']);
  const ind6456 = round2(E['ind_spec']);
  const indVigilanza = round2(E['ind_vig']);
  const totaleUltimoMiglio = round2(
    ria + tredicesima + stipTabellare + indAsili + ind6456 + indVigilanza
  );

  const vociAnnualizzate = voci.map(v => ({
    id: v.id,
    label: v.label,
    importoMensile: round2(v.importoMensile),
    importoAnnuo: round2(E[v.id]),
    valido13: v.valido13,
  }));

  return {
    vociAnnualizzate,
    stipendiMensili,
    totaleStipendi12mesi,
    totaleTredicesime12mesi,
    ria,
    tredicesima,
    stipTabellare,
    indAsili,
    ind6456,
    indVigilanza,
    totaleUltimoMiglio,
  };
}
