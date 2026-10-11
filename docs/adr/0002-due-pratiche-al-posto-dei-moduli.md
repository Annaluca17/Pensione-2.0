# Due pratiche al posto di sette moduli

Il sito si organizza attorno al dipendente e a cosa gli serve, non attorno ai calcoli: una
**pratica di pensione** (ultimo miglio di pensione, TFS oppure TFR secondo il regime di fine
servizio, DMA previste fino alla cessazione) e una **pratica di cessazione** (solo TFR). I moduli
`pensione`, `tfs_pensione`, `tfs_servizio`, `anticipo_dma` e `unificato` facevano pezzi della stessa
pratica sullo stesso dipendente con dati reinseriti e regole divergenti; `lettere` era vuoto.

## Consequences

- Gli id `?modulo=` restano tutti validi e aprono la scrivania col filtro corrispondente (pensione
  o cessazione); il `postMessage` comunica sempre `unificato`, id già noto al portale, finché la
  migrazione non è finita. Le voci del registro del portale si riducono dopo, nell'altro repo.
- Il TFS "in servizio" resta solo come situazione d'ingresso del calcolo TFS, migrato per ultimo e
  abbandonato se nessuno lo chiede.
