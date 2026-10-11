# Alla chiusura il risultato si congela; il ricalcolo si confronta, non sostituisce

Il calcolo di una pratica dipende dai dati del dipendente e dalle tabelle (contratti, catalogo voci,
righe PASSWEB, parametri), che cambiano nel tempo: esce un contratto, si corregge un valore. Una
sezione già trasmessa a PASSWEB non deve cambiare importi in silenzio. Quando l'operatore chiude
una sezione se ne conserva il risultato con l'id della versione delle tabelle; il sito ricalcola
sempre, confronta il ricalcolo col risultato congelato riga per riga e, se differiscono, mostra la
pratica come da rilavorare con la causa (nuovo scaglionamento, valore di tabella corretto).

## Considered Options

- Ricalcolo sempre, senza memoria: semplice, ma una correzione di tabella riscrive pratiche già
  trasmesse senza che nessuno se ne accorga.
- Tabelle bloccate alla versione della chiusura: il risultato non cambia, ma non si scopre mai che
  serve un miglioramento contrattuale (ADR 0003).

## Consequences

- Ogni risultato porta l'id della versione delle tabelle, anche negli export.
- La persistenza salva, per ogni sezione chiusa, il risultato congelato accanto ai dati.
