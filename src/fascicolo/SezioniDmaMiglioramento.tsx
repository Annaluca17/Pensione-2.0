// Sezioni DMA previste e miglioramento contrattuale della pratica di pensione (ticket 31, storie 44-48, 53-56):
// un periodo per mese con i campi del regime; Scenario A e B affiancati per decorrenza. Si chiudono come le altre.
import {spiega} from '../motore';
import type {Avviso, Blocco, DatiPraticaPensione, Risultato, UmPensione} from '../motore';
import type {Chiusura} from './chiusura';
import {Avvisi, BarraChiusura, MotiviBlocco, Riquadro, RigaImporto} from './campi';
import {scriviEuro} from './modifiche';
import {riepilogoMiglioramento} from './riepilogoMiglioramento';

const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const giorno = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const euro = (c: number) => `${scriviEuro(c)} €`;

interface PropsSezione {
  risultato: Risultato;
  chiusura?: Chiusura;
  onChiudi: () => void;
  onRiapri: () => void;
}

const statoDi = (chiusura: Chiusura | undefined, esito: 'calcolata' | 'bloccata') =>
  chiusura ? (chiusura.daRilavorare ? 'da rilavorare' : 'chiusa') : esito;

/** Le DMA previste: un periodo per mese, il 7º mese bloccato con la spiegazione (D12). */
export function SezioneDmaPreviste({risultato, dati, chiusura, onChiudi, onRiapri}: PropsSezione & {dati: DatiPraticaPensione}) {
  const congelato = chiusura?.congelato.sezione === 'dmaPreviste' ? chiusura.congelato.risultato : undefined;
  const dma = congelato ?? risultato.sezioni.dmaPreviste ?? {esito: 'bloccata' as const, motivi: [] as Blocco[]};
  const oltreLimite = risultato.blocchi.filter((b) => b.codice === 'dma-oltre-limite');
  const mesi = dma.esito === 'calcolata' ? dma.periodi.map((p) => p.mese) : [];
  const avvisi = risultato.avvisi.filter((a: Avviso) => a.codice === 'dma-non-prevista' || (a.codice === 'ivc-incompatibile' && mesi.includes(a.mese)));
  return (
    <Riquadro id="dmaPreviste" titolo="DMA previste" stato={statoDi(chiusura, dma.esito)}>
      <BarraChiusura chiusura={chiusura} calcolata={dma.esito === 'calcolata'} onChiudi={onChiudi} onRiapri={onRiapri} />
      {dma.esito === 'bloccata' ? (
        <MotiviBlocco motivi={dma.motivi} />
      ) : (
        <ol className="space-y-4">
          {dma.periodi.map((p) => (
            <li key={p.mese} className="rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 bg-slate-50 p-3 text-sm">
                <span className="font-medium text-slate-800">
                  {mese(p.mese)} · dal {giorno(p.dal)} al {giorno(p.al)}
                </span>
                <span className="text-xs text-slate-600">
                  {p.giorni}/26 giorni · {p.percentuale}% · regime {p.regime}
                  {p.codiceServizio !== undefined && ` · codice servizio ${p.codiceServizio}`}
                  {p.giorniTredicesima > 0 && ` · con 13ª (${p.giorniTredicesima}/365)`}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {p.campi.map((c) => (
                  <RigaImporto key={c.id} chiave={`dmaPreviste/${p.mese}/${c.id}`} etichetta={c.etichetta} composizione={c.composizione} />
                ))}
              </ul>
              {!dati.iscrittoCredito && <p className="p-3 text-xs text-slate-500">Imponibile Credito non emesso: il dipendente non è iscritto al Fondo Credito.</p>}
            </li>
          ))}
        </ol>
      )}
      {oltreLimite.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Mesi oltre il limite">
          {oltreLimite.map((b, i) => (
            <li key={i} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              {spiega(b)}
            </li>
          ))}
        </ul>
      )}
      <Avvisi avvisi={avvisi} />
    </Riquadro>
  );
}

const CODICI_MIGLIORAMENTO: Avviso['codice'][] = ['contratto-in-ipotesi', 'pensione-erogata-diversa', 'nessun-miglioramento-reale', 'tfs-da-modificare'];

/** Fissi annui e 13ª di un UM: i due dati che si digitano in PASSWEB. */
function ValoriUm({titolo, nota, annui, tredicesima, chiave, inserire}: {titolo: string; nota?: string; annui: number; tredicesima: number; chiave: string; inserire?: boolean}) {
  return (
    <div className={`rounded-lg border p-3 ${inserire ? 'border-sky-200 bg-sky-50' : 'border-slate-200'}`}>
      <h3 className="text-sm font-semibold text-slate-800">{titolo}</h3>
      {nota && <p className="text-xs text-slate-600">{nota}</p>}
      <dl className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-slate-600">Totale fissi annui</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900" data-riga={`${chiave}/annui`}>{euro(annui)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">13ª mensilità</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900" data-riga={`${chiave}/tredicesima`}>{euro(tredicesima)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Dettaglio di una decorrenza intermedia: Scenario A e B affiancati, riga per riga. */
function Confronto({a, b, decorrenza, differenza}: {a: UmPensione; b: UmPensione; decorrenza: string; differenza: {annui: number; tredicesima: number}}) {
  const ids = [...new Set([...a.righe.map((r) => r.id), ...b.righe.map((r) => r.id)])];
  const riga = (u: UmPensione, id: string) => u.righe.find((r) => r.id === id);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm" aria-label={`Scenario A e B dal ${giorno(decorrenza)}`}>
        <caption className="border-b border-slate-100 bg-slate-50 p-3 text-left font-medium text-slate-800">Decorrenza {giorno(decorrenza)}</caption>
        <thead>
          <tr className="text-xs text-slate-500">
            <th className="p-2 text-left font-normal">Voce</th>
            <th className="p-2 text-right font-normal">Scenario A (voci inserite)</th>
            <th className="p-2 text-right font-normal">Scenario B (migliorato)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ids.map((id) => {
            const [ra, rb] = [riga(a, id), riga(b, id)];
            return (
              <tr key={id}>
                <td className="p-2 text-slate-800">{(ra ?? rb)!.etichetta}</td>
                <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/A/${id}`}>
                  {ra ? euro(ra.composizione.arrotondato) : '—'}
                </td>
                <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/B/${id}`}>
                  {rb ? euro(rb.composizione.arrotondato) : '—'}
                </td>
              </tr>
            );
          })}
          <tr className="bg-sky-50 text-base font-semibold text-slate-900">
            <td className="p-2">
              {a.tredicesima.etichetta} <span className="block text-xs font-normal text-sky-800">da inserire in PASSWEB</span>
            </td>
            <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/A/tredicesima`}>
              {euro(a.tredicesima.composizione.arrotondato)}
            </td>
            <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/B/tredicesima`}>
              {euro(b.tredicesima.composizione.arrotondato)}
            </td>
          </tr>
          <tr className="bg-sky-50 text-base font-semibold text-slate-900">
            <td className="p-2">
              Totale fissi annui <span className="block text-xs font-normal text-sky-800">da inserire in PASSWEB</span>
            </td>
            <td className="p-2 text-right tabular-nums">{euro(a.totaleAnnui)}</td>
            <td className="p-2 text-right tabular-nums">{euro(b.totaleAnnui)}</td>
          </tr>
          <tr className="text-xs text-slate-500">
            <td className="p-2">Totale con la 13ª</td>
            <td className="p-2 text-right tabular-nums">{euro(a.totale)}</td>
            <td className="p-2 text-right tabular-nums">{euro(b.totale)}</td>
          </tr>
          <tr className="bg-slate-50">
            <td className="p-2 text-slate-800">Differenza (B − A)</td>
            <td className="p-2 text-right text-xs text-slate-600" colSpan={2}>
              fissi annui{' '}
              <span className="font-medium tabular-nums text-slate-900" data-riga={`miglioramento/${decorrenza}/differenza-annui`}>
                {euro(differenza.annui)}
              </span>{' '}
              · 13ª{' '}
              <span className="font-medium tabular-nums text-slate-900" data-riga={`miglioramento/${decorrenza}/differenza-tredicesima`}>
                {euro(differenza.tredicesima)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Miglioramento contrattuale: Scenario A e B per decorrenza e, in regime TFS, il TFS migliorato (ADR 0003). */
export function SezioneMiglioramento({risultato, dati, chiusura, onChiudi, onRiapri}: PropsSezione & {dati: DatiPraticaPensione}) {
  const congelato = chiusura?.congelato.sezione === 'miglioramento' ? chiusura.congelato.risultato : undefined;
  const m = congelato ?? risultato.sezioni.miglioramento ?? {esito: 'bloccata' as const, motivi: [] as Blocco[]};
  const definitivo = m.esito === 'calcolata' && m.stato === 'definitivo' ? m : undefined;
  const riepilogo = definitivo && definitivo.migliorati.length > 0 ? riepilogoMiglioramento(definitivo, dati) : undefined;
  return (
    <Riquadro id="miglioramento" titolo="Miglioramento contrattuale" stato={statoDi(chiusura, m.esito)}>
      {/* Un'ipotesi non ha importi (T5): non c'è nulla da chiudere. */}
      {(definitivo || chiusura) && <BarraChiusura chiusura={chiusura} calcolata={definitivo !== undefined} onChiudi={onChiudi} onRiapri={onRiapri} />}
      {m.esito === 'bloccata' && <MotiviBlocco motivi={m.motivi} />}
      {m.esito === 'calcolata' && m.stato === 'ipotesi' && (
        <p className="text-sm text-slate-600">Il contratto scelto è ancora un'ipotesi: nessun importo finché non è firmato.</p>
      )}
      {definitivo && riepilogo && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Contratto {definitivo.contratto}: confronto fra ciò che c'è in PASSWEB e ciò che va inserito.</p>
          <ValoriUm titolo="Vecchia pensione calcolata" nota="Con le voci inserite, come se fosse stata calcolata a quella data." annui={riepilogo.vecchia.totaleAnnui} tredicesima={riepilogo.vecchia.tredicesima.composizione.arrotondato} chiave="miglioramento/vecchia" />
          {riepilogo.passweb ? (
            <div>
              <ValoriUm titolo="Pensione in PASSWEB" annui={riepilogo.passweb.fissi} tredicesima={riepilogo.passweb.tredicesima} chiave="miglioramento/passweb" />
              <p className={`mt-1 text-sm font-medium ${riepilogo.passweb.uguale ? 'text-emerald-700' : 'text-red-700'}`} role={riepilogo.passweb.uguale ? undefined : 'alert'}>
                {riepilogo.passweb.uguale ? 'Uguale alla vecchia pensione calcolata.' : 'Diversa dalla vecchia pensione calcolata: controllare le voci inserite.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Pensione in PASSWEB: non indicata (si inserisce nella sezione Ultimo miglio pensione).</p>
          )}
          <ValoriUm
            titolo={`Nuovo miglioramento contrattuale dal ${giorno(riepilogo.nuovo.decorrenza)}`}
            nota="Da inserire in PASSWEB"
            annui={riepilogo.nuovo.totaleAnnui}
            tredicesima={riepilogo.nuovo.tredicesima.composizione.arrotondato}
            chiave="miglioramento/nuovo"
            inserire
          />
          {riepilogo.fineServizio.regime === 'TFR' && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{riepilogo.fineServizio.dicitura}</p>}
          {riepilogo.fineServizio.regime === 'TFS' && riepilogo.fineServizio.tfs && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                TFS migliorato · mesi da {mese(riepilogo.fineServizio.tfs.dal)} a {mese(riepilogo.fineServizio.tfs.al)}
              </h3>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {riepilogo.fineServizio.tfs.righe.map((r) => (
                  <RigaImporto key={r.id} chiave={`miglioramento/tfs/${r.id}`} etichetta={r.etichetta} nota={r.campoPassweb} composizione={r.composizione} />
                ))}
              </ul>
              <p className="mt-3 text-sm">
                Totale <span className="font-medium tabular-nums">{euro(riepilogo.fineServizio.tfs.totale)}</span>
              </p>
            </div>
          )}
          <details className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">Dettaglio per decorrenza ({definitivo.migliorati.length})</summary>
            <div className="mt-3 space-y-4">
              <p className="text-xs text-slate-600">Scenario A = voci inserite come sono; Scenario B = voci 01, 02, 09 e 10 dalle tabelle.</p>
              {definitivo.migliorati.map((b) => (
                <Confronto key={b.decorrenza} a={definitivo.scenarioA} b={b} decorrenza={b.decorrenza} differenza={b.differenza} />
              ))}
            </div>
          </details>
        </div>
      )}
      <Avvisi avvisi={risultato.avvisi.filter((a) => CODICI_MIGLIORAMENTO.includes(a.codice))} />
    </Riquadro>
  );
}
