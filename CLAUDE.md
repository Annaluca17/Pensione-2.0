# Pensione 2.0

Contesto generale di Immedia e del portale: `../../../CLAUDE.md` (Progetti Immedia).

## Agent skills

### Issue tracker

Issue e specifiche come file markdown locali in `.scratch/` (escluso da Git: il repo è pubblico). See `docs/agents/issue-tracker.md`.

### Triage labels

I cinque ruoli predefiniti (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix), come riga `Status:` nei file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` e `docs/adr/` nella radice, creati quando servono. See `docs/agents/domain.md`.

## Prima di ogni commit

`npm run check` (lint, tipi, test) verde.

## Lavorare un ticket

- Confronta il tuo modello con la riga `Modello consigliato:` del ticket. Se il
  tuo è più economico, fermati e dillo a Luca prima di toccare il codice.
- I valori attesi presi dal ticket o dati da Luca restano quelli: se il calcolo
  non li riproduce, è una domanda per Luca, non un test da adattare.

## Modello consigliato per ogni task

Per risparmiare token, ogni task della divisione del progetto indica il modello
più economico in grado di farlo bene:

- quando si divide il lavoro in ticket, ogni file in `.scratch/<feature>/issues/`
  porta una riga `Modello consigliato:` con il motivo in poche parole;
- al termine di ogni task, chiudere con il modello consigliato per il task
  successivo (e se conviene cambiarlo rispetto a quello in uso).

Criterio, dal più economico:

| Modello | Quando |
|---|---|
| **Haiku 5.5** | Lavoro meccanico con istruzioni precise: testi e etichette, rinomine, nuove etichette nella mappa `src/cedolino/voci.ts`, test su un comportamento già definito |
| **Sonnet 5.5** | Implementazione con specifica chiara: un nuovo lettore PDF su un formato già analizzato, componenti React, correzioni circoscritte |
| **Opus 5.5** | Decisioni di dominio o di progetto: regole PASSWEB/CCNL, analisi di un formato PDF nuovo, bug difficili, refactor su più moduli, il rifacimento di Pensione |
| **Fable 5.1** | Solo se Opus non basta su un problema davvero aperto |

Nel dubbio fra due modelli, consigliare il più economico e dire cosa farebbe
cambiare idea.
