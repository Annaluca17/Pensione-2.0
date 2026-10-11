# Due pratiche al posto di sette moduli

Il sito si organizza attorno al dipendente e a cosa gli serve, non attorno ai calcoli: una
**pratica di pensione** (ultimo miglio di pensione, TFS oppure TFR secondo il regime di fine
servizio, DMA previste fino alla cessazione) e una **pratica di cessazione** (solo TFR). I moduli
`pensione`, `tfs_pensione`, `tfs_servizio`, `anticipo_dma` e `unificato` facevano pezzi della stessa
pratica sullo stesso dipendente con dati reinseriti e regole divergenti; `lettere` era vuoto.

## Consequences

- Gli id `?modulo=` restano tutti validi. Durante la costruzione aprono ancora i vecchi moduli (il
  nuovo sta accanto, con una card sua); nella pulizia finale aprono la scrivania col filtro
  corrispondente (pensione o cessazione), il `postMessage` passa agli id nuovi e le voci del registro
  del portale si riducono nello stesso momento, nell'altro repo.
- Il TFS "in servizio" è abbandonato: nessun modulo, al più una situazione d'ingresso del calcolo
  TFS se non costa nulla (deciso nella strategia di migrazione, 11/10/2026).
