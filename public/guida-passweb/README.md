# Screenshot guida PASSWEB (Step 4 — Ultimo Miglio TFR)

Questa cartella contiene gli screenshot mostrati nello **Step 4** del wizard TFR
(`src/components/tfr/passwebGuide.ts`).

## Come aggiungere le immagini

Inserire i file con **esattamente** questi nomi (il wizard li carica per nome):

| File         | Passo della guida                                            |
|--------------|--------------------------------------------------------------|
| `step01.png` | Presa in carico e selezione del dipendente (Esecutore)       |
| `step02.png` | Inserimento dati comuni — prescrizione TFR                   |
| `step03.png` | Dati utili ai fini TFR — periodo di riferimento              |
| `step04.png` | Inserimento delle decorrenze                                 |
| `step05.png` | Dati retributivi                                             |
| `step06.png` | Fine lavorazione (Lista richieste)                           |
| `step07.png` | Validatore — lista dati integrativi                          |
| `step08.png` | Certificazione "Dati utili ai fini TFR" (pulsante C)         |
| `step09.png` | Certificazione "Dati retributivi utili al TFR"               |
| `step10.png` | Verifica certificazioni (Lista richieste)                    |
| `step11.png` | Approvazione finale                                          |

## Note

- Formati supportati dal browser: `.png`, `.jpg`/`.jpeg`, `.webp`. Se si usa un
  formato diverso da `.png`, aggiornare anche il percorso in `passwebGuide.ts`
  (funzione `IMG`).
- Finché un file non è presente, il wizard mostra automaticamente un segnaposto
  ("Screenshot in arrivo — …"): nessun errore, l'immagine compare appena viene
  caricata con il nome corretto.
- Sono serviti come asset statici da Vite: il percorso pubblico è
  `/guida-passweb/stepNN.png`.
