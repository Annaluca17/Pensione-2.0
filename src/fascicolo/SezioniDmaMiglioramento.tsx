// Sezioni DMA previste e miglioramento contrattuale della pratica di pensione (ticket 31, storie 44-48, 53-56):
// un periodo per mese con i campi del regime; Scenario A e B affiancati per decorrenza. Si chiudono come le altre.
import {spiega} from '../motore';
import type {Avviso, Blocco, DatiPraticaPensione, Risultato, UmPensione} from '../motore';
import type {Chiusura} from './chiusura';
import {Avvisi, BarraChiusura, MotiviBlocco, Riquadro, RigaImporto} from './campi';
import {scriviEuro} from './modifiche';

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

/** Scenario A e Scenario B affiancati a una decorrenza: riga per riga, con la differenza. */
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
          <tr>
            <td className="p-2 text-slate-800">{a.tredicesima.etichetta}</td>
            <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/A/tredicesima`}>
              {euro(a.tredicesima.composizione.arrotondato)}
            </td>
            <td className="p-2 text-right tabular-nums" data-riga={`miglioramento/${decorrenza}/B/tredicesima`}>
              {euro(b.tredicesima.composizione.arrotondato)}
            </td>
          </tr>
          <tr className="font-medium">
            <td className="p-2">Totale fissi annui</td>
            <td className="p-2 text-right tabular-nums">{euro(a.totaleAnnui)}</td>
            <td className="p-2 text-right tabular-nums">{euro(b.totaleAnnui)}</td>
          </tr>
          <tr className="font-medium">
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
export function SezioneMiglioramento({risultato, chiusura, onChiudi, onRiapri}: PropsSezione) {
  const congelato = chiusura?.congelato.sezione === 'miglioramento' ? chiusura.congelato.risultato : undefined;
  const m = congelato ?? risultato.sezioni.miglioramento ?? {esito: 'bloccata' as const, motivi: [] as Blocco[]};
  const definitivo = m.esito === 'calcolata' && m.stato === 'definitivo' ? m : undefined;
  return (
    <Riquadro id="miglioramento" titolo="Miglioramento contrattuale" stato={statoDi(chiusura, m.esito)}>
      {/* Un'ipotesi non ha importi (T5): non c'è nulla da chiudere. */}
      {(definitivo || chiusura) && <BarraChiusura chiusura={chiusura} calcolata={definitivo !== undefined} onChiudi={onChiudi} onRiapri={onRiapri} />}
      {m.esito === 'bloccata' && <MotiviBlocco motivi={m.motivi} />}
      {m.esito === 'calcolata' && m.stato === 'ipotesi' && (
        <p className="text-sm text-slate-600">Il contratto scelto è ancora un'ipotesi: nessun importo finché non è firmato.</p>
      )}
      {definitivo && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Contratto {definitivo.contratto}: Scenario A = voci inserite come sono; Scenario B = voci 01, 02, 09 e 10 dalle tabelle.
          </p>
          {definitivo.migliorati.map((b) => (
            <Confronto key={b.decorrenza} a={definitivo.scenarioA} b={b} decorrenza={b.decorrenza} differenza={b.differenza} />
          ))}
          {definitivo.tfs && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                TFS migliorato · mesi da {mese(definitivo.tfs.dal)} a {mese(definitivo.tfs.al)}
              </h3>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {definitivo.tfs.righe.map((r) => (
                  <RigaImporto key={r.id} chiave={`miglioramento/tfs/${r.id}`} etichetta={r.etichetta} nota={r.campoPassweb} composizione={r.composizione} />
                ))}
              </ul>
              <p className="mt-3 text-sm">
                Totale <span className="font-medium tabular-nums">{euro(definitivo.tfs.totale)}</span>
              </p>
            </div>
          )}
        </div>
      )}
      <Avvisi avvisi={risultato.avvisi.filter((a) => CODICI_MIGLIORAMENTO.includes(a.codice))} />
    </Riquadro>
  );
}
