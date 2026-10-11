# Pensione 2.0

Strumenti Immedia per l'ultimo miglio INPS PASSWEB (CCNL Funzioni Locali):
pensione, TFS pensionati, TFS in servizio, lettere, anticipo DMA, calcolo
unificato e TFR. Pubblicato su https://pensione-2-0.vercel.app ed esposto nel
Portale Strumenti Interni.

## Avvio in locale

```bash
npm install
npm run dev
```

Non servono variabili d'ambiente.

## Struttura

Tutto il codice sta in `src/` (punto d'ingresso `src/main.tsx`): i moduli in
`src/components/`, gli export Excel/PDF in `src/export*.ts`, le tabelle CCNL in
`src/data/`.

Il portale apre un modulo direttamente con `?modulo=<id>` (`pensione`,
`tfs_pensione`, `tfs_servizio`, `lettere`, `anticipo_dma`, `unificato`, `tfr`)
e riceve il modulo attivo via `postMessage({tipo:'immedia:modulo', modulo})`.
