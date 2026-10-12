// Sezione TFR del fascicolo (ticket 14, storie 33-36, 42-43): righe PASSWEB con le etichette della
// maschera, composizione di ogni riga, avvisi con fonte e, se bloccata, i motivi. Solo lettura.
import type {Avviso, Risultato} from '../motore';
import type {Chiusura} from './chiusura';
import {Avvisi, BarraChiusura, MotiviBlocco, Riquadro, RigaImporto} from './campi';

const CODICI_TFR: Avviso['codice'][] = ['soglia-quindici-giorni-altra-regola', 'ivc-incompatibile', 'mese-iniziale-fuori-finestra'];
const data = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const mese = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const esito = {intero: 'intero', utile: 'utile (almeno 15 giorni)', 'non-utile': 'non utile (meno di 15 giorni)'} as const;

export function SezioneTfr({
  risultato,
  chiusura,
  onChiudi,
  onRiapri,
}: {
  risultato: Risultato;
  chiusura?: Chiusura;
  onChiudi: () => void;
  onRiapri: () => void;
}) {
  // Sezione chiusa: si mostra ciò che è stato trasmesso (il congelato), con le differenze dal ricalcolo.
  // Chiusa e poi non più pertinente (cambio di regime): resta il congelato, da rilavorare.
  const congelato = chiusura?.congelato.sezione === 'tfr' ? chiusura.congelato.risultato : undefined;
  const tfr = congelato ?? risultato.sezioni.tfr ?? {esito: 'bloccata' as const, motivi: []};
  const avvisi = risultato.avvisi.filter((a) => CODICI_TFR.includes(a.codice));
  const stato = chiusura ? (chiusura.daRilavorare ? 'da rilavorare' : 'chiusa') : tfr.esito;
  return (
    <Riquadro id="tfr" titolo="Ultimo miglio TFR" stato={stato}>
      <BarraChiusura chiusura={chiusura} calcolata={tfr.esito === 'calcolata'} onChiudi={onChiudi} onRiapri={onRiapri} />
      {tfr.esito === 'bloccata' ? (
        <MotiviBlocco motivi={tfr.motivi} />
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Decorrenza giuridica</dt>
              <dd className="font-medium">{data(tfr.decorrenzaGiuridica)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Decorrenza economica</dt>
              <dd className="font-medium">{data(tfr.decorrenzaEconomica)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Data di cessazione</dt>
              <dd className="font-medium">{data(tfr.dataCessazione)}</dd>
            </div>
            {(['meseIniziale', 'meseFinale'] as const).map((chiave) => {
              const e = tfr[chiave];
              return (
                <div key={chiave}>
                  <dt className="text-xs text-slate-500">{chiave === 'meseIniziale' ? 'Mese di assunzione' : 'Mese di cessazione'}</dt>
                  <dd>
                    {mese(e.mese)}: {esito[e.esito]}
                    {e.giorni && (
                      <span className="text-slate-500">
                        {' '}
                        · {e.giorni.lavorativiLunSab} lavorativi, {e.giorni.calendario} di calendario
                      </span>
                    )}
                    {e.pagamentoTredicesima && (
                      <span className="text-slate-500"> · 13ª pagata {e.pagamentoTredicesima === 'dicembre' ? 'a dicembre' : 'nel mese di cessazione'}, misura "Parziale"</span>
                    )}
                  </dd>
                </div>
              );
            })}
            <div>
              <dt className="text-xs text-slate-500">Soglia dei 15 giorni</dt>
              <dd>{tfr.soglia.conteggio === 'lavorativi-lun-sab' ? 'giorni lavorativi lun-sab' : 'giorni di calendario'}</dd>
            </div>
          </dl>

          <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700">Dati retributivi utili al TFR</h3>
          {tfr.righe.length === 0 ? (
            <p className="text-sm text-slate-600">Nessun dato retributivo da inserire: i mesi di assunzione e di cessazione non lo richiedono (C185 §2.1).</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {tfr.righe.map((r) => (
                <RigaImporto
                  key={`${r.estremo}-${r.id}`}
                  chiave={`${r.estremo}/${r.id}`}
                  etichetta={r.etichetta}
                  nota={r.estremo === 'iniziale' ? 'mese di assunzione' : 'mese di cessazione'}
                  composizione={r.composizione}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <Avvisi avvisi={avvisi} />
    </Riquadro>
  );
}
