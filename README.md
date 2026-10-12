# Pensione 2.0

Strumenti Immedia per l'ultimo miglio INPS PASSWEB (CCNL Funzioni Locali):
una scrivania con le pratiche di pensione (ultimo miglio di pensione, TFS o TFR,
DMA previste, miglioramento contrattuale) e di cessazione (TFR). Pubblicato su https://pensione-2-0.vercel.app ed esposto nel
Portale Strumenti Interni.

## Avvio in locale

```bash
npm install
npm run dev
```

Non servono variabili d'ambiente.

## Struttura

Tutto il codice sta in `src/` (punto d'ingresso `src/main.tsx`): il calcolo in
`src/motore/`, le tabelle CCNL versionate in `src/tabelle/`, l'archivio in
`src/archivio/`, la scrivania in `src/scrivania/`, il fascicolo della pratica in
`src/fascicolo/`, il lettore dei PDF Halley in `src/lettore/`. Le fotografie del
vecchio sito stanno in `src/casi-normativi/fotografie/`.

Il portale apre il sito con `?modulo=<id>`: `scrivania`, `pensione` o
`cessazione` aprono la scrivania con quel filtro; gli id dei vecchi moduli
restano validi (`unificato`, `tfs_pensione`, `tfs_servizio`, `anticipo_dma` →
pensione; `tfr` → cessazione; `lettere` → nessun filtro). Il sito comunica l'id
che mostra con `postMessage({tipo:'immedia:modulo', modulo})` e con `?embed=1`
non ripete la propria intestazione.
