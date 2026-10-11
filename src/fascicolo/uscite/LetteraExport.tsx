// Sezione "lettera ed export" (ticket 14): solo il contenitore; ogni uscita vive nel suo slot.
import {Riquadro} from '../campi';
import {SlotGuida} from './SlotGuida';
import {SlotLettera} from './SlotLettera';
import {SlotScheda} from './SlotScheda';
import type {PropsUscita, Uscita} from './tipo';

const SLOT: {id: string; titolo: string; Componente: Uscita}[] = [
  {id: 'scheda', titolo: 'Scheda della pratica', Componente: SlotScheda},
  {id: 'lettera', titolo: 'Lettera', Componente: SlotLettera},
  {id: 'guida', titolo: 'Guida PASSWEB', Componente: SlotGuida},
];

export function LetteraExport(props: PropsUscita) {
  return (
    <Riquadro id="uscite" titolo="Lettera ed export">
      <div className="grid gap-3 md:grid-cols-3">
        {SLOT.map(({id, titolo, Componente}) => (
          <div key={id} className="rounded-lg border border-slate-200 p-3" data-slot={id}>
            <h3 className="mb-1 text-sm font-semibold text-slate-700">{titolo}</h3>
            <Componente {...props} />
          </div>
        ))}
      </div>
    </Riquadro>
  );
}
