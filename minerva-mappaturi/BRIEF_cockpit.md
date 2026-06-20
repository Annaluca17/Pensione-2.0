# Minerva Cockpit — Brief di progetto

## Obiettivo
App single-file HTML che transcodifica l'anagrafica del personale di un Ente Locale nella tassonomia **Minerva 2.3.2**, producendo per ogni dipendente la doppia mappatura **Profilo professionale (CTP+CC)** + **Profilo di ruolo (CTS)**. Deploy: file singolo, nessun backend, eseguibile anche da `file://`.

## Stato attuale
File: `minerva_cockpit.html` (single-file, ~76 KB, dizionario+tassonomia embedded ~25 KB JSON).
Funzionante, testato (smoke-test Node su funzioni reali estratte dal file).

## Architettura
- **Frontend**: HTML/CSS/JS vanilla, libreria `SheetJS` (xlsx) via CDN per leggere file Excel lato client.
- **Dati integrati nel file** (no upload richiesto per dizionario/tassonomia):
  - Whitelist `(banda, archetipo, ambito) → profilo di ruolo`: 132 triple, 32 archetipi, 4 bande — ricostruita da `Minerva.xlsx` (sheet `profili di ruolo` + `profili professionali` + `ambiti di ruolo`).
  - Dizionario mansione→archetipo: 61 voci (confidenza ALTA/MEDIA/BASSA/ESCLUSO), band-agnostic.
  - Dizionario area di intervento→famiglia/ambito: 38 voci.
- **Unico upload richiesto**: anagrafica dipendenti (xlsx). Auto-detect colonne + auto-run.
- **Upload opzionali**: Conto Annuale (abilita ambito da area di intervento per bande direttive), dizionario di override.

## Pipeline di risoluzione (per dipendente)
1. **Banda**: da `posizione economica` (A/B/C/D → Operatore/Operatore Esperto/Istruttori/Funzionari E.Q.), fallback su `area` testuale.
2. **Archetipo**: da mansione normalizzata → dizionario (band-agnostic).
3. **Ambito**: bande "direttive" (Funzionari, Istruttori, 8 famiglie ciascuna) lo derivano dall'area di intervento dominante (Conto Annuale) o, se univoco in whitelist, automaticamente; bande "esecutive" (Operatore Esperto, Operatore) lo derivano dalla mansione/whitelist.
4. **Profilo di ruolo**: lookup whitelist `(banda, archetipo, ambito)`.
5. **Esito**: OK / VERIFICA / DA_VERIFICARE_MANUALE / FALLBACK_QUESTIONARIO / DA_INTEGRARE_DIZIONARIO / COPPIA_INESISTENTE / BANDA_NON_RICONOSCIUTA / FUORI_PERIMETRO.

## Regole dati
- Matricole vuote → riga saltata (non contano).
- `data cessazione` valorizzata → dipendente cessato, escluso dal conteggio attivi (tile + metrica dedicata in export).
- Mansioni non a dizionario → editor inline crea voce di dizionario di sessione (esportabile come delta).
- Ambiti non risolti → editor inline con dropdown vincolato alla whitelist.

## File sorgente (per ricostruire l'embedded payload se serve rigenerare)
- `Minerva.xlsx` — estrazione DB tassonomia: `aree contrattuali`, `profili professionali`, `ambiti di ruolo`, `profili di ruolo`, `catalogo competenze`.
- `Minerva_dizionari_transcodifica.xlsx` — sheet `Dizionario_Mansione` (mansione_grezza/archetipo_codice/confidenza), `Dizionario_AreaIntervento` (codice_descrizione_area/ambito_codice).
- `Minerva_riepilogo.md` — spec/logica di dominio originale.

## Export
- `Minerva_estrazione_mappata.xlsx`: mappatura completa + diagnostica (conteggi per esito, cessati esclusi, matricole vuote saltate, join CA).
- `Minerva_delta_correzioni.xlsx`: override di sessione (mansioni aggiunte, ambiti corretti) — reimportabile come aggiornamento dizionario.

## Limite noto
Senza Conto Annuale, le bande direttive con archetipo multi-ambito restano `FALLBACK_QUESTIONARIO` — richiede scelta manuale o caricamento CA (coerente col principio no-guess).

## Possibile sviluppo successivo
Mostrare a livello di riga le competenze CTS (da `profili di ruolo`) e CTP+CC (da `profili professionali`) per la doppia mappatura completa — omesso finora per mantenere il payload lean.
