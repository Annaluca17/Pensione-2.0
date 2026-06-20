# Minerva MappaTuri

Strumento **single-file HTML** per la transcodifica tassonomica del personale di un
Ente Locale nella tassonomia **Minerva 2.3.2**, con doppia mappatura per dipendente:
**Profilo professionale (PP)** + **Profilo di ruolo (PP-AR / CTS)**.

Nasce dall'integrazione di due tool preesistenti:

- **Cockpit** — analisi massiva di un'estrazione anagrafica (`.xlsx`): per ogni
  dipendente deduce Banda → Archetipo → Ambito → Profilo di ruolo, con stati di
  esito (OK / VERIFICA / FALLBACK_QUESTIONARIO / …) e correzione inline.
- **Wizard guidato** — questionario a cascata **Banda → Famiglia → Ambito →
  Archetipo** che produce il PP-AR, pensato anche per operatori non esperti
  (descrizioni in linguaggio piano + ricerca per parole d'uso comune).

I due tool ora vivono **in un unico file** (`index.html`): nessun backend,
funziona anche aperto da `file://`. Dizionario e tassonomia Minerva sono
incorporati; si carica solo l'anagrafica.

## Novità di questa versione

1. **Wizard integrato nel Cockpit.** Su ogni riga in dubbio (pulsante
   *🧭 Questionario guidato* nell'editor di riga, oppure *🧭 Wizard guidato*
   nella toolbar) si apre una **finestra modale** con la cascata a 4 passi.
   - Si pre-compila con **banda** e **archetipo** già dedotti dalla mansione e
     mostra **Cognome e Nome** del dipendente in testata.
   - Tutte le opzioni derivano dall'unica fonte tassonomica già usata
     dall'analisi massiva (nessun dataset duplicato): la cascata copre
     **esattamente** la whitelist dei 132 profili di ruolo, senza vicoli ciechi.
   - Confermando, il **PP-AR** scelto viene riscritto nella riga del dipendente
     (esito `OK`, confidenza `ALTA`) e confluisce negli export.
2. **Colonna “Cognome e Nome”** nel Cockpit, con **auto-rilevamento** del
   formato sorgente:
   - colonna unica (`Cognome e Nome`, `Nominativo`, `Dipendente`, `Nome e
     cognome`), oppure
   - colonne **separate** `Cognome` + `Nome` (in qualsiasi ordine).
   Il nominativo è ricercabile e incluso negli export.

## Uso

1. Apri `index.html` in un browser (anche offline / `file://`).
2. Trascina l'**anagrafica** `.xlsx`. Colonne riconosciute: Codice fiscale ·
   [Matricola] · posizione economica (A/B/C/D) · mansione · Cognome e Nome ·
   [area] · [data cessazione]. (Opzionale: Conto Annuale, dizionario di override.)
3. Rivedi gli esiti, correggi le righe in dubbio col questionario guidato.
4. Esporta `Minerva_estrazione_mappata.xlsx` e l'eventuale delta correzioni.

## Export

- **Minerva_estrazione_mappata.xlsx** — mappatura completa (incl. `nominativo`) +
  diagnostica.
- **Minerva_delta_correzioni.xlsx** — override di sessione, con foglio
  `Profili_Questionario` per i profili scelti via wizard.

## Struttura

- `index.html` — l'applicazione (Cockpit + Wizard), unico file da distribuire.
- `Minerva.xlsx` — estrazione DB tassonomia (fonte per rigenerare il payload incorporato).
- `BRIEF_cockpit.md` — brief originale del Cockpit.

## Tassonomia

Comparto **Funzioni Locali** · 4 bande · 8 famiglie professionali · 38+ ambiti di
ruolo · 32 archetipi (profili professionali) · 132 profili di ruolo (PP-AR) ·
catalogo competenze CTP/CC/CTS. Principio **no-guess**: dove il dato non è
sufficiente, la riga resta in stato di verifica e si usa il questionario guidato.
