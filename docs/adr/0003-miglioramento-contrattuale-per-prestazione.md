# Il miglioramento contrattuale è una regola per prestazione, guidata dalla tabella dei contratti

Un contratto firmato dopo la cessazione cambia l'ultimo miglio in modo diverso per prestazione
(CCNL Funzioni Locali 2022-24, art. 57 c. 2): per la **pensione** valgono tutti gli scaglionamenti
del contratto se il dipendente è cessato nella sua vigenza; per **TFS e TFR** solo quelli maturati
alla data di cessazione. Il motore lo ricava dalla tabella dei contratti (vigenza, scaglionamenti
con decorrenza, IVC riassorbite) e non da soglie di anno: per la pensione produce un ultimo miglio
di miglioramento contrattuale a parte, con la sua decorrenza; per TFS e TFR applica mese per mese
solo gli scaglionamenti con decorrenza fino alla cessazione e segnala se l'UM va modificato o rifatto.

Col miglioramento attivo la pensione è quella di allora (pratica pregressa, ticket 01 delle prove
pratiche): l'UM pensione prende le voci come inserite, IVC compresa, e coincide con lo Scenario A (C21-7);
nessun avviso `ivc-incompatibile` sulla pensione. Non si ricalcola con le tabelle firmate entro la
cessazione perché non ricostruiscono l'IVC di allora: quella del 2019-21, pagata fino alla firma del
16/11/2022, non è nelle tabelle. Senza miglioramento D8 resta valida; TFS e TFR ordinari restano con D8.

## Considered Options

- Soglie cablate per anno di cessazione (oggi: pensione dal 2022, TFS dal 2024): scartate, valgono
  solo per il CCNL 2022-24 e vanno riscritte a ogni rinnovo.

## Consequences

- Ogni nuovo contratto (anche l'Ipotesi 2025-27) si aggiunge come dati, non come codice.
- Pratiche chiuse possono tornare da lavorare quando esce un contratto: la scrivania dovrà mostrarle.
