# Pensione 2.0

Strumenti per l'ultimo miglio dei dipendenti degli enti locali (CCNL Funzioni Locali) verso INPS
Nuova PassWeb: pensione, TFS e TFR.

## Language

**Ultimo miglio**:
La retribuzione del periodo finale di servizio di un dipendente cessato, da comunicare a INPS perché
completi la posizione assicurativa e liquidi pensione, TFS o TFR.
_Avoid_: ultimo mese, chiusura posizione

**Modulo**:
Uno strumento del sito raggiungibile dal Portale Strumenti Interni con un proprio id `?modulo=<id>`.
_Avoid_: servizio, tool, card

**Ente**:
L'amministrazione cliente (comune, unione, provincia) da cui dipende il dipendente di una pratica;
ogni pratica appartiene a un ente.
_Avoid_: progetto (nome del vecchio sito per l'insieme dei dipendenti di un ente), comune, cliente

**Archivio**:
Tutti gli enti e le pratiche salvati da un operatore nel proprio browser; si salva in un file di
export e si ripristina reimportandolo.
_Avoid_: database, progetti

**Gestionale**:
Il software paghe dell'ente che produce i cedolini e i riepiloghi letti dal sito (oggi Halley).
_Avoid_: software paghe, procedura

**Lettore**:
La parte che ricava i dati di un dipendente dai PDF di un gestionale, solo nel browser.
_Avoid_: parser, importatore

**Proposta**:
I dati di una pratica che il lettore ricava dai PDF di un gestionale (anagrafica, voci mese per
mese, % part-time); l'operatore li vede e li conferma prima che entrino nella pratica.
_Avoid_: compilazione, import

**Voce di testata**:
La riga del cedolino Halley con l'importo contrattuale mensile di una voce, sempre intero e a
tempo pieno, anche nel mese di cessazione e per i part-time.
_Avoid_: competenza, voce del corpo

**Fotografia del vecchio**:
L'insieme di casi di fantasia con gli importi che il codice attuale produce, conservati per
confrontarli col nuovo motore; descrive cosa fa il vecchio, non cosa è giusto.
_Avoid_: risultato atteso, oracolo

**Reperto**:
La copia fedele del codice di calcolo di un vecchio modulo, usata solo per produrre la fotografia
del vecchio; sparisce col modulo, mentre gli importi fotografati restano.
_Avoid_: mock, vecchio motore

**Caso normativo**:
Un caso di fantasia col risultato atteso calcolato a mano dalle norme, passo per passo e con la
fonte di ogni passo, senza usare il motore.
_Avoid_: caso di test (generico), fotografia

**Differenza attesa**:
Una riga in cui il nuovo motore deve dare un importo diverso dal vecchio, legata alla decisione e
alla fonte che giustificano lo scarto.
_Avoid_: regressione, errore noto

**Pratica di pensione**:
Il lavoro completo su un dipendente che va in pensione: ultimo miglio di pensione e TFS e, se la
domanda si fa prima della cessazione, le DMA previste fino alla data di cessazione.
_Avoid_: pratica (da sola), lavorazione

**DMA prevista**:
La denuncia mensile di un mese non ancora retribuito, compresa quella del mese parziale di
cessazione, inserita in anticipo in PASSWEB perché la domanda di pensione si possa fare prima che
il dipendente cessi.
_Avoid_: DMA futura, anticipo DMA (è il nome del vecchio modulo, non della cosa)

**Retribuzione teorica TFR**:
Nella DMA di un dipendente in regime TFR, la retribuzione che spetterebbe per l'intero mese
lavorato: tutte le voci utili al TFR proporzionate al part-time, senza assenze, 80% né tredicesima.
Si dichiara anche nei mesi senza TFR.
_Avoid_: tabellare TFR, stipendio tabellare (è solo una delle voci)

**Ulteriori elementi TFR**:
Le voci utili al TFR ma non al TFS (oggi la retribuzione di posizione), dichiarate a parte al 100%
con un proprio contributo.
_Avoid_: voci solo TFR, extra TFR

**Mese utile (TFR)**:
Il mese di assunzione o di cessazione che conta per il TFR perché coperto da almeno quindici giorni
continuativi; se non è intero, l'ultimo miglio TFR ne chiede il rateo di 13ª, altrimenti (solo in
cessazione) i ratei di 13ª dei mesi precedenti pagati per cassa.
_Avoid_: mese pieno (è il mese intero), mese valido

**Pratica di cessazione**:
Il lavoro su un dipendente che cessa senza andare in pensione (mobilità, fine del tempo
determinato): contiene solo il TFR.
_Avoid_: pratica TFR

**Regime di fine servizio**:
Se al dipendente spetta il TFS (ex INADEL) oppure il TFR; decide quale dei due calcoli entra nella
pratica di pensione.
_Avoid_: tipo liquidazione

**Scrivania**:
L'elenco di lavoro di tutte le pratiche di tutti gli enti, ordinate per data di cessazione.
_Avoid_: dashboard, home

**Fascicolo**:
La vista di una singola pratica, con tutte le sue sezioni e lo stato di ciascuna.
_Avoid_: scheda dipendente, dettaglio

**Voce**:
Un elemento fisso della retribuzione mensile (tabellare, RIA, indennità di comparto…), con le
prestazioni a cui è utile (pensione, TFS, TFR, 13ª) e il numero di mensilità per cui si paga.
_Avoid_: emolumento, componente

**Riga PASSWEB**:
Il campo della maschera di ultimo miglio in cui si espongono una o più voci sommate; quali voci
finiscono in quale riga dipende dalla prestazione. Che una voce sia utile non dice in che riga va.
_Avoid_: voce PASSWEB, campo

**Miglioramento contrattuale**:
L'aggiornamento dell'ultimo miglio di un dipendente già cessato quando un contratto firmato dopo la
cessazione ne aumenta la retribuzione; per la pensione vale tutto il contratto, per TFS e TFR solo
gli aumenti con decorrenza fino alla cessazione. La pensione del miglioramento si calcola con le
tabelle firmate entro la cessazione: è la pensione di allora, IVC compresa.
_Avoid_: MC (solo nel codice), rinnovo

**Pensione erogata**:
I totali dell'ultimo miglio di pensione già accettati da INPS in PASSWEB (12 mesi di fissi e quota
di 13ª); nel miglioramento contrattuale si ricopiano invariati, anche se sbagliati, e sono il
termine con cui si misura se il miglioramento c'è davvero.
_Avoid_: vecchia domanda, pensione vecchia

**Scaglionamento**:
Un aumento del contratto con la sua data di decorrenza (es. tabellare dal 01/01/2024).
_Avoid_: tranche, step

**Differenziale storico**:
L'importo fisso che dal 01/04/2023 conserva le progressioni economiche maturate nella vecchia
posizione: vecchia posizione meno posizione d'ingresso della categoria (A1, B1, C1, D1), anche
quando il tabellare d'area è più alto di quello d'ingresso. Si somma ai nuovi differenziali.
_Avoid_: PEO, ex PEO (le posizioni sono cessate), differenziale di area

**Data di riferimento**:
Il giorno a cui si chiude l'ultimo miglio di una prestazione; di solito la cessazione, ma può
essere diverso per pensione e TFS/TFR (sospensione, congedo L. 104, opzione per il TFR).
_Avoid_: data cessazione (quando non coincidono)

**Data di fine TFS**:
La data di riferimento del TFS: la cessazione, oppure l'ultimo giorno in TFS per chi resta in
servizio e passa al TFR (optante), o l'ultimo giorno utile INADEL prima di un congedo L. 104.
_Avoid_: data cessazione (quando il dipendente è ancora in servizio)

**Situazione**:
Il caso particolare in cui si trova il dipendente alla fine del servizio (ordinaria, sospensione
cautelare, trattenuta per malattia, congedo L. 104, optante TFR), che decide le date di riferimento
e quali DMA previste si possono fare.
_Avoid_: caso, scenario

**Avviso**:
Una segnalazione sul calcolo di una pratica, con la sua fonte, che non ne ferma il risultato (es.
IVC incompatibile col tabellare, esito dei 15 giorni diverso con l'altra regola, UM TFS da
modificare).
_Avoid_: warning, errore (quando il calcolo prosegue)

**Blocco**:
Il motivo per cui una sezione della pratica non si può calcolare (es. cessazione mancante, settimo
mese di DMA prevista); le altre sezioni si calcolano lo stesso.
_Avoid_: errore, eccezione

**Forzatura**:
Un valore che il sito propone (giorni del mese parziale, date di riferimento) e che l'operatore
corregge a mano; resta visibile come tale. Gli importi delle righe PASSWEB non si forzano: si
correggono le voci.
_Avoid_: override, modifica manuale

**Composizione**:
Il dettaglio di come si arriva al valore di una riga PASSWEB o di un campo DMA: voci e mesi
sommati, operazioni applicate e fonte di ciascuna.
_Avoid_: formula, log del calcolo

**Risultato congelato**:
Gli importi di una sezione della pratica al momento in cui l'operatore la chiude, con la versione
delle tabelle usata; si confronta col ricalcolo per sapere se la pratica è da rilavorare.
_Avoid_: snapshot, storico
