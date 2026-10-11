// Slot della scheda PDF (ticket 16): un componente per uscita, così i ticket non toccano lo stesso file.
import type {Uscita} from './tipo';

export const SlotScheda: Uscita = () => <p className="text-sm text-slate-500">Scheda PDF della pratica: in arrivo.</p>;
