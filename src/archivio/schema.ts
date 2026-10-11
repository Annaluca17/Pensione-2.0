// Schema Zod dell'archivio v1 (spec "Persistenza", ticket 10): è il tipo dell'involucro e la sua
// validazione di forma. La coerenza di dominio (date, % part-time…) resta nel motore.
// `DatiPratica` e `Congelato` sono tipi del motore: schema.test.ts verifica che coincidano.
import {z} from 'zod';

const data = z.string(); // forma aaaa-mm-gg: la valida il motore (blocco data-non-valida)
const mese = z.string();
const centesimi = z.number();
const istante = z.iso.datetime();

// --- DatiPratica --------------------------------------------------------------------------------

const vociMese = z.partialRecord(z.string(), centesimi);
const partTime = z.object({percentuale: z.number(), tipo: z.enum(['O', 'V', 'M']).optional()});
const perMese = <T extends z.ZodType>(valore: T) => z.object({base: valore, eccezioni: z.partialRecord(mese, valore)});

export const schemaDatiPratica = z.object({
  anagrafica: z.object({
    nome: z.string(),
    codiceFiscale: z.string(),
    posizione: z.string(),
    assunzione: data.optional(),
    cessazione: data.optional(),
  }),
  voci: perMese(vociMese),
  partTime: perMese(partTime),
  forzature: z.object({
    giorniMeseParziale: z.number().optional(),
    dataRiferimentoPensione: data.optional(),
    dataRiferimentoFineServizio: data.optional(),
  }),
  iscrittoCredito: z.boolean(),
  pensioneErogata: z.object({fissi: centesimi, tredicesima: centesimi}).optional(),
});

// --- Sezioni calcolate (risultato congelato) ----------------------------------------------------

const composizione = z.object({
  addendi: z.array(
    z.object({voce: z.string(), mese, importo: centesimi, percentuale: z.number().optional(), giorni: z.number().optional()}),
  ),
  operazioni: z.array(
    z.object({tipo: z.enum(['moltiplica', 'dividi']), per: z.number(), motivo: z.string(), fonte: z.string().optional()}),
  ),
  pieno: z.number(),
  arrotondato: centesimi,
  fonte: z.string(),
});

const estremoTfr = z.object({
  mese,
  esito: z.enum(['intero', 'utile', 'non-utile']),
  giorni: z.object({lavorativiLunSab: z.number(), calendario: z.number()}).optional(),
  pagamentoTredicesima: z.enum(['dicembre', 'cessazione']).optional(),
  misura: z.literal('parziale').optional(),
});

export const schemaTfr = z.object({
  esito: z.literal('calcolata'),
  decorrenzaGiuridica: data,
  decorrenzaEconomica: data,
  dataCessazione: data,
  soglia: z.object({giorni: z.number(), conteggio: z.enum(['lavorativi-lun-sab', 'calendario']), fonte: z.string()}),
  meseIniziale: estremoTfr,
  meseFinale: estremoTfr,
  righe: z.array(
    z.object({
      estremo: z.enum(['iniziale', 'finale']),
      id: z.enum(['retribuzione-valutabile', 'rateo-tredicesima-teorica', 'tredicesima-emolumenti-cassa']),
      etichetta: z.string(),
      composizione,
    }),
  ),
});

export const schemaMeseParziale = z.object({
  esito: z.literal('calcolata'),
  mese,
  dal: data,
  al: data,
  giorni: z.object({proposto: z.number(), usato: z.number(), forzato: z.number().optional()}),
});

export const schemaRetribuzione = z.object({
  esito: z.literal('calcolata'),
  mesi: z.array(z.object({mese, voci: vociMese, partTime})),
});

const congelato = <S extends string, R extends z.ZodType>(sezione: S, risultato: R) =>
  z.object({sezione: z.literal(sezione), versioneTabelle: z.string(), dati: schemaDatiPratica, risultato});

export const schemaCongelato = z.discriminatedUnion('sezione', [
  congelato('retribuzione', schemaRetribuzione),
  congelato('meseParziale', schemaMeseParziale),
  congelato('tfr', schemaTfr),
]);

// --- Involucro ---------------------------------------------------------------------------------

export const schemaEnte = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  /** Dati fissi della lettera, chiesti la prima volta (storia 71). */
  lettera: z
    .object({nomeComune: z.string().optional(), sedeInps: z.string().optional(), luogo: z.string().optional()})
    .optional(),
});

/** Lo stato della pratica non si salva: si ricava da congelati e ricalcolo (decisione del ticket 10). */
export const schemaPratica = z.object({
  id: z.string().min(1),
  enteId: z.string().min(1),
  tipo: z.enum(['pensione', 'cessazione']),
  dati: schemaDatiPratica,
  /** Al massimo un risultato congelato per sezione. */
  congelati: z.array(schemaCongelato).refine((c) => new Set(c.map((x) => x.sezione)).size === c.length, {
    message: 'più di un risultato congelato per la stessa sezione',
  }),
  creata: istante,
  modificata: istante,
});

export const VERSIONE_SCHEMA = 1;

/** Forma dell'involucro; le pratiche si validano una per una (una malformata si scarta da sola). */
export const schemaInvolucro = z.object({
  versioneSchema: z.literal(VERSIONE_SCHEMA),
  enti: z.array(schemaEnte),
  pratiche: z.array(z.unknown()),
  ultimoExport: istante.nullable(),
});

/** L'archivio completo, come si scrive. */
export const schemaArchivio = schemaInvolucro.extend({pratiche: z.array(schemaPratica)});

export type Ente = z.infer<typeof schemaEnte>;
export type Pratica = z.infer<typeof schemaPratica>;
export type Archivio = z.infer<typeof schemaArchivio>;
