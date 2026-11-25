# SMG · Sudo Ma Godo — note per riprendere il lavoro

Aggiornate al 28 ottobre 2026 · versione app **1.37** · cache service worker `smg-org-v74`

App online: https://smg-sudomagodo.github.io/ (GitHub Pages, org `SMG-SudoMaGodo`, repo `smg-sudomagodo.github.io`).

---

## 1. Stato attuale dell'app

**Cos'è.** PWA personale che ogni giorno propone una seduta varia (MTB/gravel, bici da strada, rulli con MyWhoosh, corsa, forza e mobilità), adattata al recupero, al meteo e alla luce. Obiettivo: mantenere e migliorare la forma divertendosi, senza gare.

**File.**
- `engine.js`: logica pura, esporta `window.SMG`. Contiene: semaforo, scelta della seduta, libreria di 44 sedute, blocchi e temi, test FTP, buio e meteo nelle ore di uscita, alternative, versioni rulli, formato Intervals.
- `app.js`: interfaccia (Oggi, Diario, Profilo), Intervals.icu, meteo e pollini, guida (`GUIDE`), schede a comparsa, dettaglio attività, grafici. Costanti `ENGINE_V` e `APP_V` in cima al file.
- `index.html`: CSS (blu stile Garmin: sfondo `#0A111D`, primario `#2DB4F2`) e struttura.
- `sw.js`: offline, rete prima (`cache: 'reload'` all'installazione, `no-cache` nel fetch). **A ogni pubblicazione incrementare `CACHE`**, e `APP_V` se cambia qualcosa di visibile.
- `app.webmanifest`, icone `*-v2.png`, `fonts/`.
- I dati restano nel telefono (localStorage `smg-v1`). Il backup JSON si esporta da Profilo → Dati.

**Semaforo (check-in del mattino).**
- Entrano: sensazione, HRV (media a 7 giorni rispetto alla norma a 60), FC a riposo, sonno, Forma, dolori, malanno (raffreddore oppure febbre).
- La Training Readiness, facoltativa, pesa il **25%**: costanti `TR_W = 0.25` e `GREEN = 68` in `engine.js`, tarate il 25/10.
- Soglie: verde ≥68, arancione ≥50, rosso sotto.
- Il dettaglio del punteggio si vede voce per voce.
- Riquadri degli indicatori cliccabili, con andamento a 14, 30 o 60 giorni.

**La seduta del giorno.**
- **Stabilità**: dopo il check-in la proposta non cambia da sola. Se arrivano dati nuovi compare "Adegua la seduta / Tieni questa".
- **Comandi**:
  - chip Sport e Tempo;
  - **Alternative**: 3 sedute dello stesso livello, con "Altre 3" che aggiorna la scheda senza chiuderla;
  - **Falla sui rulli**: per le sedute solo all'aperto ci sono 2–3 gemelle indoor (`INDOOR_EQ`); si sceglie quella fatta meno di recente;
  - Invia, Fatta, Oggi salto (con alternativa breve di forza o mobilità);
  - **Decido io: amici, corsa o camminata**.
- **Decido io** (carico stimato dalla v1.25 secondo l'intensità scelta, `freeIF()`: camminata 0,40/0,47/0,55, bici e corsa 0,55–0,85 per livello; prima usava la zona "a sensazione" e una camminata di 2h risultava 144, contro un carico reale di 32):
  - sport: bici del profilo, gruppo su MyWhoosh, **corsa** (anche se in pausa, con avviso per il piede) e **camminata** (sport `walk`);
  - intensità della camminata: passeggiata, svelta, escursione;
  - durata da 30';
  - sul Fenix non arriva nessun allenamento strutturato.
- **Più attività nello stesso giorno** (v1.24): tutte registrate, nel diario e nei totali della settimana. La seduta prevista la chiude solo un'attività compatibile (`matchesPlan()` in `engine.js`): bici con bici, corsa con corsa (cammino e corsa anche con una camminata), camminata con camminata o corsa, e almeno un terzo della durata prevista. Le altre attività restano visibili ("fatto: Camminata 1h" nel diario, "Da Intervals oggi" in Oggi). Una seduta accorciata molto si segna a mano con Fatta.
- **Cosa allena**: ogni seduta ha un `focus` (rec, fondo, tecnica, brio, tempo, ss, forza, soglia, vo2, sprint, test), mostrato con una frase (`FOCUS_INFO`).
- **Libreria**: 44 sedute.
  - Bici: dal rigenerante a VO2max, 15/15, SFR, sweet spot lungo e con strappi, soglia lunga e con partenza forte, settori a soglia MTB, ripetute in salita…
  - Corsa: sedute per fase di rientro, cioè cammino e corsa, corsa facile (fondo, crescendo, corsa nel verde, passo corto e veloce), completa.
- **Rifornimento** nelle sedute lunghe (non per la camminata). **Esercizi extra** di forza e mobilità con la spiegazione di ogni esercizio.
- **Registro delle scelte** (`S.choices`, max 1500 voci, finisce nel backup):
  - `alt_open`, `alt_pick`, `alt_keep`, `sport`, `dur`, `indoor`, `skip`, `friends`;
  - ogni voce ha la seduta proposta in quel momento;
  - serve per capire quali sedute annoiano.

**Periodizzazione.**
- **Blocchi di 4 settimane** (3 di costruzione + 1 di scarico) ancorati a `deloadAnchor`. Si spostano con Anticipa, Posticipa e "Da questa settimana". Al massimo 2 sedute dure a settimana. Nelle 3 settimane di costruzione durata e ripetute crescono.
- **Temi dei blocchi** (`blockTheme()`, secondo il lunedì d'inizio del blocco):

  | Inizio blocco | Tema |
  |---|---|
  | 15/10–15/11 | **forza e sweet spot** |
  | 16/11–15/12 | **soglia** |
  | 16/12–12/1 | varietà delle feste |
  | 13/1–9/2 | soglia e VO2max |
  | 10/2–9/3 | VO2max e brillantezza |
  | resto dell'anno | bella stagione |

  - Ogni tema pesa le sedute per focus (`w`) e per livello (`lv`). Esempio, il tema forza: livello 3 ×3, livello 4 ×0,5, livello 5 ×0,15; SFR ×4, sweet spot ×2,5.
  - Calendario attuale: blocco forza dal 26/10, scarico dal 16/11, blocco soglia dal 23/11.
  - Il tema si vede in Profilo → Blocchi e scarico e tra i motivi della seduta.
- **Inverno (ottobre–marzo)**: qualità sui rulli, volume fuori in MTB.
  - Rulli al massimo 70' nei giorni normali e **90' nei giorni lunghi** (`indoorMaxLong`, `indoorCap()`).
  - Giorno lungo con pioggia o buio: seduta media sui rulli, non fondo.
- **Uscite lunghissime**: in `activityLevel`, un carico Intervals ≥100 vale almeno livello 3, ≥140 livello 4, anche a intensità bassa.

**Test FTP 20'** (`ftp_test`).
- **Quando**:
  - nella prima settimana dopo lo scarico, se sono passate ≥6 settimane dall'ultimo; oltre le 9 settimane anche in altre settimane;
  - solo con semaforo verde, di lunedì, mercoledì o sabato;
  - "Anticipa" lo propone al primo giorno utile.
- **Nel giorno del test**: riquadro con la media obiettivo e il pulsante **Istruzioni passo passo** (procedura completa per rulli o strada, con il ritmo calcolato da "FTP che ti aspetti oggi").
- **Lettura automatica**: SMG legge gli stream da Intervals, trova i 20' migliori (anche con l'autolap) e **chiede conferma** prima di aggiornare l'FTP. Con "Sì" scrive FTP e FC di soglia della bici su Intervals (PUT `/sport-settings/{id}` Ride); con "No" registra il test e tiene l'FTP. Resta possibile l'inserimento a mano.
- **Confronto Tacx/Stages** (Profilo): oltre il 3% di differenza calcola l'FTP da mettere su MyWhoosh.

**Meteo, luce e località.**
- **Open-Meteo**, riscaricato all'apertura se più vecchio di **1 ora**, senza aggiornamento in background. Riquadri oggi e domani con punto di rugiada e pollini.
- **Orario di uscita per giorno**: lunedì e mercoledì 18:00, venerdì 15:00, sabato e domenica 9:00. Pioggia, temperatura e rugiada si guardano in quelle ore.
- **Buio**: niente strada; MTB con le luci solo ogni tanto, con tempo asciutto, poco vento e almeno 5 °C. Avviso "porta le luci" se si rientra dopo il tramonto.
- **Punto di rugiada**: il pallino è il **massimo nelle ore di uscita**, non il valore attuale.
  - Colori: verde ≤16°, giallo 17–18°, rosso 19–21°, viola ≥22°.
  - Toccandolo si vedono i valori ora per ora e quello attuale.
  - Il calcolo è stato verificato.
- **Pollini** (CAMS Europa via Open-Meteo):
  - 6 tipi: graminacee, betulla, ontano, olivo, artemisia, ambrosia;
  - media giornaliera, classi POLLnet (ISPRA/ARPA);
  - pallino verde, giallo, arancione o rosso; grigio fuori stagione;
  - dettaglio toccandolo;
  - non cambia la seduta.
- **Schermata meteo** (toccando il riquadro di oggi o di domani):
  - schede oggi, domani e dopodomani, con l'ora dell'ultimo aggiornamento;
  - riquadri riassuntivi;
  - grafici ora per ora: temperatura e rugiada, probabilità di pioggia, mm di pioggia (totale e picco), vento e raffiche;
  - fascia delle ore di uscita, ore di buio;
  - tocco o trascinamento sul grafico per leggere i valori;
  - striscia oraria.
  - Un solo asse per grafico; colori validati per il fondo scuro: `#C8742A`, `#1F94CC`, `#8FA0B8`.
- **Trasferta** (Profilo → Meteo):
  - località temporanea con date: `S.trip = { name, lat, lon, from, to, gear }`;
  - in quei giorni meteo, luce e proposte usano quella località (`wxLoc(d)`), con un riquadro sopra il meteo;
  - **Cosa hai con te** (rulli, MTB, strada, corsa): `profileFor()` spegne gli sport senza attrezzatura; senza niente compare una giornata libera con forza e mobilità;
  - finisce da sola il giorno dopo la data di fine, oppure con "Sono tornato".
- Con una scheda aperta la pagina sotto non scorre.

**Integrazioni.**
- **Intervals.icu** (chiave API solo sul telefono):
  - **legge**:
    - benessere degli ultimi 60 giorni;
    - attività degli ultimi 42 giorni: doppioni entro 15' eliminati, Walk/Hike diventano `walk`;
    - FTP, FC di soglia **bici** (Ride → `lthr`) e **corsa** (Run → `lthrRun`), passo di soglia, peso;
  - **sincronizzazione**: all'apertura, ogni 2' finché la seduta di oggi non è fatta, poi ogni 10';
  - **invio**: manda la seduta come evento `smg-AAAA-MM-GG`, che arriva a Garmin (Fenix, Edge) e a MyWhoosh. La cadenza parte come valore singolo (es. `55rpm`). Con "Cadenza come fascia" parte la fascia, ma la legge solo il Fenix.
- **Dati della notte la mattina** (v1.26, segnalato da Fabrizio il 5/11: doveva sempre premere Aggiorna). Prima SMG sincronizzava solo all'apertura, al massimo ogni 10', e non ricontrollava ad app aperta: se l'apriva prima che Garmin avesse passato HRV e sonno a Intervals, restavano vuoti. Ora `nightWaiting()`: dalle 4 a mezzogiorno, prima del check-in, finché mancano HRV o sonno di oggi da Intervals, ricontrolla **ogni minuto ad app aperta** (massimo 40 volte al giorno) e mostra "In attesa dei dati della notte". Il check-in tiene la **bozza** (`ciDraft`: faccina, malanno, dolori, campi scritti a mano) quando la schermata si ridisegna. La Training Readiness non arriva da Intervals, si scrive a mano.
- **Dettaglio attività** da Intervals (`/activity/{id}`, `/streams.json`): numeri, grafici e zone. Le attività arrivate da Strava non si leggono (403).
  - **A piedi (corsa e camminata, v1.25)**: passo medio al km invece della velocità; grafico del **passo** (da `velocity_smooth`, soste sotto 0,5 m/s escluse, più in alto = più veloce); cadenza in **passi/min**. Garmin registra la cadenza a piedi per una gamba sola (camminata del 1/11: 61 → 122 passi/min): si raddoppia se è sotto 80 (camminata) o 120 (corsa). Gli zeri delle soste sono tolti dal grafico della cadenza.
  - **v1.37 (25/11)**: causa trovata: `claude-sonnet-5-5` di base ragiona (blocchi `thinking`) e con `max_tokens` 450 finiva lo spazio prima del testo ("vuota: max_tokens / thinking"), pagando comunque i token. Ora le chiamate mandano `thinking: {type: 'disabled'}`; se l'API rifiuta il parametro (400 che parla di thinking) si riprova senza e con `max_tokens` ≥ 2500; se torna vuota per `max_tokens` si riprova una volta con 3000 token in più.
  - **v1.36 (25/11)**: l'esito di "Salva e prova" resta scritto nella card Coach AI del Profilo (con i secondi impiegati), invece di un avviso a scomparsa.
  - **v1.35 (25/11)**: alla prima prova vera Fabrizio ha visto "Il coach non risponde (rete)" con crediti scalati (quindi le richieste arrivavano). Ora: messaggio d'errore con il dettaglio tecnico vero; corpo della risposta letto a parte (errore "risposta interrotta"); errori validi solo per l'apertura in corso (`COACH_SESS`), alla successiva si riprova da solo; corretto un difetto per cui l'errore del check-in non si vedeva (card vuota). Causa ancora da capire con il nuovo messaggio.
  - **v1.34 (25/11)**: coach più robusto dopo la prima prova di Fabrizio (attesa lunga, crediti scalati): limite di 60″ per richiesta (AbortController), risposta senza testo trattata come errore con `stop_reason` e tipi dei blocchi nel messaggio (prima una risposta vuota faceva ripartire la richiesta del check-in all'infinito), al massimo 2 tentativi automatici per commento a sessione (`coachTries`), errore di rete leggibile.
  - **v1.33 (25/11): Coach AI** (deciso con Fabrizio il 25/11; principio: commenta, non decide). Chiamata diretta dal browser a `https://api.anthropic.com/v1/messages` con `anthropic-dangerous-direct-browser-access: true`; chiave in `localStorage['smg-ai-key']`, fuori da `S` e quindi fuori dai backup (Fabrizio l'ha creata il 25/11 con scadenza 1 anno: ricordargli il rinnovo verso novembre 2027). Modelli `claude-sonnet-5-5` (predefinito) o `claude-haiku-5-5`, scelta nel Profilo. Stato in `S.coach` = {model, auto, a: commenti per giorno+id attività (ultimi 40), m: risposte al check-in per giorno (ultimi 20), qa: ultime 10 domande}. Prompt di sistema `COACH_SYS` (ruolo, regole SMG, piano di ripresa della corsa, sicurezza, stile ≤110 parole) + `coachCtx(d)`: profilo, blocco, semaforo, ultimi 14 giorni (check-in con dolore e nota, seduta proposta, attività con carico/livello/RPE/sensazione). Card "Il coach" in Oggi: (1) risposta al check-in se c'è `pain` o la nuova `note` (campo "Nota per il coach" visibile solo con la chiave); (2) commento automatico alle attività di oggi o ieri (chiave = giorno + id, quindi un'attività in più rifà il commento; interruttore "Commento automatico"); (3) domanda libera. Un compito per volta, cache per non ripagare a ogni apertura; errori leggibili (chiave scaduta, credito, limite, modello). Testato con API finta: 2 chiamate all'apertura, 1 per domanda, 0 alla ricarica. Da verificare sul telefono la prima risposta vera.
  - **Ripresa della corsa: piano concordato con Fabrizio il 25/11 (da tenere sempre allineato, a ogni backup)**. Ripresa dopo la fascite il 20/11, fase 2 (corsa facile). Traccia se il piede risponde bene: fino a metà dicembre 2 corse/settimana di 30–40′ facili; seconda metà di dicembre 2–3 corse, una fino a 45–50′, qualche allungo breve; inizio gennaio test di corsa (aggiorna LTHR corsa e soglie su Intervals), poi fase 3 (Completa) nel Profilo, deciso da lui e concordato con chi lo segue. Criteri per salire: primi passi del mattino dopo non peggiori del solito, nessun fastidio che dura, almeno 2 settimane di fila stabili al gradino. Se torna il fastidio: ferma una settimana al gradino o scendi. Seconda corsa in settimana: al posto del fondo (es. domenica), mai al posto di una seduta chiave, mai due giorni di fila. A ogni backup: contare corse e durate della settimana, chiedere del piede e dire a che punto è del piano.
  - **v1.32 (25/11): sedute chiave** (chiesto da Fabrizio: "evidenziare in maniera armonica ma evidente" le sedute da non saltare). `E.isKey(p)`: modello test, livello ≥4, o livello ≥3 nella settimana di scarico; mai per "Decido io". In Oggi: bordo e filo superiore gialli (`.wo.key`), etichetta "Seduta chiave" con stella sopra il nome, riquadro con la spiegazione (accorcia il fondo degli altri giorni, non questa; col semaforo rosso o malato si salta). Nel Diario: filo giallo a sinistra (`.day.key`) e stella accanto al nome. Il Diario (riga e contatore "Dure" via `dayDone`) usa anche il livello di `dayInfo`, così il giorno del test risulta duro come nel motore.
  - **v1.31 (25/11)**: la corsa facile del 25/11 (35′, RPE 2) risultava livello 3 con carico 45, come quella del 20/11: `icu_intensity` delle corse è inaffidabile (probabilmente dalla potenza da polso del Fenix con una soglia di potenza di corsa non impostata, o dalle soglie di corsa vecchie). In `activityLevel()`, per le corse con FC e almeno 20′, l'IF di Intervals non conta: decide la FC media rispetto a `lthrRun` (≥87% → 3, ≥92% → 4), più le zone cardio; il carico per le soglie delle uscite lunghissime è scontato del 20%. Bici e camminata invariate. Effetto importante: col livello 3 l'RPE 2 di una corsa facile avrebbe spinto il feedback verso "facili, alziamo l'asticella". I livelli si ricalcolano alla sincronizzazione (ultimi 42 giorni). Guida: come avviare la seduta di corsa sul Fenix (il 25/11 è partita una corsa libera: seduta selezionata in casa, poi l'orologio è tornato al quadrante). Obiettivo di cadenza per la corsa (170–180 passi/min nei tratti di tecnica) non ancora fatto: va prima verificato come Intervals passa la cadenza di corsa a Garmin (rpm o passi/min).
  - **v1.30 (23/11, dal backup dopo il test)**: (1) `dayInfo()`: il giorno di un test FTP fatto (piano `done` con modello `test`) vale almeno il livello del piano (5), perché l'IF dell'attività intera con riscaldamento e defaticamento dava livello 3 e il test non contava nelle sedute dure della settimana (cambiano solo 26/10 e 23/11); `rpeLvl` resta quello dell'attività. (2) `feedback()`: ignora i giorni fino a `profile.lastTest` compreso, perché le sensazioni con l'FTP vecchia (213, sottostimata) avrebbero fatto scattare "facili, alziamo l'asticella" proprio nella prima settimana con l'FTP nuova (235, +10%). Effetto sulla settimana 24–29/11: test + una seduta media + una dura, invece di test + tre sedute di livello 4 con un gradino in più.
  - **Corsa in collina: fatto nella v1.29 (23/11)** (Fabrizio, 1/11: percorsi in zona quasi sempre collinari).
    - Obiettivi: `targetText()` e `icuTarget()` non usano più il passo per la corsa. Fondo (cammino, Z1, Z2) tetto di FC come prima; Z3, SS, Z4, O4, TEST fascia di FC (% LTHR, in app con `lthrRun` e l'RPE accanto); ripetute brevi `RUN_RPE` (Z5, Z6, Z7) e MIX senza obiettivo su Intervals (riga senza target) e "RPE x" in app. Bici invariata. `thrPace` resta nel Profilo solo come riferimento.
    - Dettaglio attività: riquadro **passo corretto (GAP)** dal campo `gap` dell'attività (Intervals lo dà in s/m; il codice accetta anche m/s scegliendo il valore più vicino al passo medio), solo a piedi e con dislivello > 5 m; grafico del tempo nelle zone di passo per la corsa, da `gap_zone_times` se c'è, altrimenti `pace_zone_times`. Da verificare sulla prima corsa vera: il nome dei campi viene da un client di terzi, non dalla documentazione ufficiale.
    - Le soglie di corsa su Intervals (LTHR 164, passo 4:08/km) sono vecchie: prima delle sedute di qualità serve un test di corsa per aggiornarle.
    - **Potenza di corsa del Fenix** (idea di Fabrizio, 23/11; la corsa del 20/11 ha già i watt). Da valutare dopo il test di corsa: in collina la potenza segue la pendenza e risponde subito, quindi potrebbe sostituire l'RPE nelle ripetute brevi e nelle salite, dove la FC arriva in ritardo. Servirebbe una soglia di potenza della corsa su Intervals (dallo stesso test di 30′ che dà la LTHR, o dalla eFTP che Intervals stima dalle corse). Limiti: è una stima dal polso, non confrontabile con i watt della bici né con Stryd, poco affidabile in discesa e su sentiero tecnico. Ipotesi: obiettivi in potenza solo per salite e ripetute, FC per il resto, con un interruttore nel Profilo.

---

## 2. Decisioni e vincoli

**Atleta e disponibilità**
- **Test FTP del 26 ottobre**:
  - dal backup del 28/10: media dei 20' **237 W** → **FTP 225 W**, FC di soglia **155 bpm**;
  - FTP e FC di soglia della bici aggiornate su SMG, Intervals e Garmin Connect; su MyWhoosh FTP **213 W** (225 × 0,948), impostata il 28/10;
  - prima l'FTP era 245, troppo alta, e falsava intensità e carichi.
- FC di soglia **bici 155**, **corsa 164** (separate dalla v1.23). Passo di soglia 4:08/km. Peso e dati personali arrivano da Intervals.
- **Settimana**:
  - lunedì e mercoledì fino a 1h15, alle 18;
  - **venerdì (dalle 15), sabato e domenica giorni lunghi** fino a 2h30. Il venerdì resta lungo anche d'inverno (confermato il 25/10);
  - martedì e giovedì riposo.
- **Corsa in pausa** per la fascite. Al rientro: fasi cammino e corsa → corsa facile → completa.

**Varietà e periodizzazione**
- Niente noia, ma la varietà è sempre al servizio degli stimoli allenanti: le alternative restano allo stesso livello, ogni seduta dice cosa allena, la progressione è quella dei blocchi e dei temi.
- Sui rulli Fabrizio preferisce la qualità al fondo: nel backup ha rilanciato più volte le sedute di fondo.
- 44 sedute bastano. Prima di aggiungerne altre conviene guardare il registro delle scelte; l'idea successiva sono varianti di struttura dentro le stesse sedute (es. 6×3' oppure 2×(3×3')).
- Salite in tempo con 60' disponibili dura 65': va bene così, non correggere.

**Rulli e potenza**
- Su MyWhoosh il **Tacx Flux 2S** è l'unico misuratore e comanda l'ERG. Gli **Stages** restano solo sul Fenix, che registra la stessa seduta, avviata insieme a MyWhoosh con gli avvisi di obiettivo spenti.
- Sul Fenix il Tacx non va abbinato come rullo né come potenza.
- MyWhoosh non permette agli Stages di comandare l'ERG: non proporlo.
- Stages da azzerare prima di ogni seduta. Media della potenza con gli zeri.
- **Tacx/Stages**: il Tacx legge il **−5,2%** (confronto del 19/10: 164 contro 173 W) → **FTP MyWhoosh = FTP × 0,948**.
- **Cadenza**:
  - il valore singolo arriva su MyWhoosh e sul Fenix; la fascia solo sul Fenix (provato il 24/10);
  - "Cadenza come fascia" va tenuto **spento**;
  - la fascia SFR resta 50–60 rpm;
  - in ERG per abbassare la cadenza basta pedalare più piano: il Tacx aumenta la resistenza da solo.

**Procedura del test sui rulli (decisa il 19/10, verificata il 26/10: non richiederla)**
- Fenix e MyWhoosh **attivi tutti e due per tutta la seduta**, avviati insieme. MyWhoosh comanda il Tacx; **il risultato sono i watt del Fenix** (Stages).
- Su MyWhoosh percorso **piatto** e FTP = stima × 0,948 (serve solo per il riscaldamento in ERG).
- Al blocco Test (`freeride`) MyWhoosh spegne l'ERG da solo (verificato il 26/10).
- Ritmo: media obiettivo = FTP stimata ÷ 0,95; minuti 0–5 al 97–99%, 5–15 al 99–101%, 15–20 dal 101% in su; cadenza 85–95.
- Test sempre con il protocollo di SMG, non con quelli di Garmin o MyWhoosh.

**Dati e doppioni**
- Su Intervals l'importazione delle attività di MyWhoosh è **disattivata**: permesso "Attività – Aggiornare" tolto, Calendario lasciato. Si tiene l'attività del Fenix. Verificato col backup: nessun doppione, la seduta SMG arriva su MyWhoosh, e sforzo percepito e sensazione di Garmin arrivano su Intervals.
- Su Strava si tiene l'attività di MyWhoosh (per il dislivello virtuale) e si elimina quella di Garmin.

**Tecnica**
- **Repository pubblico**: niente dati personali né chiavi.
- Il sito deve restare sulla sua origine (`smg-sudomagodo.github.io`), per il problema dell'installazione "fantasma" di Chrome sul vecchio indirizzo. I vecchi repository `fabriziodavi80/SMG` e `fabriziodavi80/SudoMaGodo` fanno solo il reindirizzamento.
- Interfaccia e testi in italiano. Il tasto Indietro di Android va gestito con la history: le schede si chiudono con un tocco, e il cambio di giorno o di gruppo dentro una scheda la aggiorna senza chiuderla.
- **La guida si aggiorna a ogni cambiamento visibile.**
- **Pubblicazione**:
  - a piccoli passi, verificando il deploy di GitHub Actions;
  - GitHub Pages tiene i file in cache circa 10 minuti.
- **Prove**:
  - Playwright con Chromium già installato;
  - dati di Intervals e Open-Meteo simulati: dall'ambiente di lavoro Open-Meteo non è raggiungibile;
  - per il motore, simulazioni con `node` sul backup.
- **Grafici**: un asse per grafico, colori validati per il fondo scuro, valori leggibili al tocco.

**Analisi del backup del 25 ottobre (30/9–25/10)**
- **Semaforo**: 7 verdi, 15 arancioni, 4 rossi. Senza la Training Readiness sarebbero stati 13 verdi. La TR al 50% contava due volte il carico, già compreso nella Forma.
  - Decisione: TR al 25%, verde da 68. Sugli stessi giorni: 11 verdi, 11 arancioni, 4 rossi.
- **Sedute dure**: in 4 settimane nessuna seduta dura proposta.
- **Sedute medie sui rulli**: eseguite a livello "fondo" con RPE 2–5, per via dell'FTP troppo alta. Da qui il test.
- **Carico**:
  - CTL da ~44 a fine agosto a 36;
  - weekend fermi a 70' sui rulli → deciso il massimo di 90' nei giorni lunghi.
- **MTB senza potenza**: livelli coerenti con l'RPE; le uscite lunghissime erano sottostimate → regola del carico.

---

## 3. Prossimi passi

1. **Esito del blocco forza e sweet spot (26/10–15/11), analisi del 16/11**:
   - CTL da 36,6 a **43,0** (massimo da quando usa SMG); carico settimanale 380 · 341 · 397; tutte le sedute previste fatte, nessuna saltata;
   - semaforo 18 verdi, 3 gialli, 0 rossi (nelle 3 settimane prima: 6, 13, 3). I gialli arrivano nei giorni giusti: **non toccarlo**;
   - drop out degli Stages risolti col Fenix vicino alle pedivelle (quelli del 15/11 cadono nei cambi di rapporto);
   - registro delle scelte: 4 MTB lunghe portate sui rulli (buio, meteo, impegni), 3 domeniche su 4 camminate con "Decido io", nessuna seduta scartata;
   - **RPE molto bassi** (scala 1–10 di Intervals): test FTP 5, soglia classica e over-under 4, SFR 2–3. Fabrizio conferma che usa la scala 1–10 e che nessuna seduta gli è sembrata dura. Conclusione: **FTP probabilmente sottostimata** (il test del 26/10 non era a tutta: 237 W medi a RPE 5; FC media 123 in SFR a 165 W). La regola `feedback().easy` ("alziamo l'asticella") era corretta: **non tararla sull'RPE personale**, nasconderebbe il segnale. La "sensazione" è sempre 3: non informativa;
   - pesi dei temi: mix del blocco buono (SFR ×3, tempo con cadenza ×2, soglia, over-under, piramide, sweet spot con strappi, fondi). Nessuna modifica.
2. **Test FTP del 23/11: fatto.** Migliori 20' dal minuto 34 al 54 (esattamente il test): 245 W con zeri, **247 W** togliendo 11 secondi a zero e 4 non registrati al minuto 36 (Fabrizio ha premuto più volte il tasto lap). Blocchi di 5': 241 · 245 · 242 · 252 W, FC 145 → 161, massima 166: condotto bene. **FTP 235 W** (+10, 3,51 W/kg); FC di soglia bici **lasciata a 155** (la media dei 20' era 154 per il ritardo della FC all'inizio, gli ultimi 15' circa 157). Tacx/Stages sull'intera seduta 157/166 = 0,946 (ottobre 0,948): coerenti. **MyWhoosh 222 W.** Il .fit si analizza con `fitdecode` (i lap non contano: SMG usa `best20()` sulla traccia della potenza).
   - Prima del test, pubblicato il 16/11 nella **v1.27: più attività nello stesso giorno**. `dayInfo()`: livello del giorno = massimo tra le attività e il carico totale con le soglie delle uscite lunghissime (≥100 media, ≥140 dura, solo con più attività); RPE e sensazione dall'attività principale (più dura, poi più lunga) e confronto col suo livello (`rpeLvl`); `run` vero se c'è una corsa, usato da `runsWeek` e dalla regola "niente corsa due giorni di fila". Verificato sul backup del 16/11: nessun giorno e nessuna proposta cambiano.
3. **Da valutare dopo il test** (non prima):
   - **v1.28 (23/11): scarico più deciso** (deciso con Fabrizio il 21/11). Lo scarico 16–22/11 aveva dato 274 di carico contro 397 (–31%) con tre sedute di livello 3: la Forma era ancora a –10 il giorno prima del test. Ora in `propose()`: nella settimana di scarico `maxL` è 3 solo finché nella settimana (da lunedì a ieri) non c'è già un giorno fatto di livello ≥3 (via `dayInfo`, quindi contano anche le uscite libere), poi 2; i modelli `long` hanno peso ×0.02 nei giorni lunghi; durate `× 0.65` (prima 0.75) e per le sedute di livello ≤2 il minimo scende a min(minimo del modello, 45′). Simulazione sul backup del 21/11 rifacendo la settimana 16–22/11: una sola seduta di livello 3 invece di tre, uscite facili di 80–85′, carico stimato circa il 55% di una settimana di costruzione. Primo scarico con le nuove regole: metà dicembre.
   - **Funzioni di AI** (chiesto da Fabrizio il 2/11, da valutare). Confronto con IntervalCoach: lì c'è un coach in chat, un commento dopo ogni seduta e un piano a ritroso da una gara; SMG è tutto a regole, senza AI. Decisione di principio: **la scelta della seduta resta a regole** (prevedibile, si capisce e si corregge); l'AI solo come commentatore. Primo passo proposto: **commento automatico dopo ogni attività** (seduta prevista contro fatta, cosa ne tiene conto SMG). Poi eventualmente riepilogo della settimana e domanda libera. Chiave dell'AI solo sul telefono come quella di Intervals (repository pubblico); costo stimato pochi centesimi al mese;
   - **Garmin Personal API** (segnalato da Fabrizio il 4/11; il 16/11 deciso di **rimandare**: serve un server per il token e l'unico vantaggio è la Training Readiness automatica). Dal 21/10/2026 Garmin dà a ogni utente una chiave personale gratuita per i propri dati: attività (JSON e FIT) e salute (riepiloghi giornalieri, sonno, FC, benessere). È **solo lettura**: non manda sedute all'orologio, quindi Intervals resta necessario. La chiave dura al massimo un anno e va scambiata ogni 24 ore con un token, lato server. Non è un collegamento ufficiale per Claude (i connettori per le chat sono progetti di terzi). Per SMG l'utilità concreta sarebbe **compilare da sola la Training Readiness** nel check-in (oggi si scrive a mano), se il dato è esposto. Da verificare: quali campi ci sono davvero e se si può chiamare dal browser (SMG non ha un server; servirebbe forse un piccolo intermediario). HRV, FC a riposo e sonno arrivano già da Intervals;
   - **SFR in MTB** (in sospeso; dal blocco forza risulta che quasi sempre le sposta sui rulli, quindi priorità bassa: al massimo la nota sulla cadenza). Il 30/10, SFR in MTB 122': 68% del tempo in Z2 cardio, RPE 3. Cause: niente sensore di cadenza in MTB (i 50–60 rpm non compaiono sul Fenix), FC che a cadenza bassa sottostima lo sforzo, ritardo della FC nei blocchi. Zone Intervals corrette (soglia bici 155). Fabrizio è bradicardico, ma le zone partono dalla soglia misurata, quindi non va cambiato niente. In zona pochi posti adatti alle SFR in MTB. Idee da valutare: nota "conta 8–10 giri in 10 secondi" sulle SFR all'aperto; guidarle con RPE e cadenza invece che con la FC; preferire le SFR sui rulli (il Tacx dà la cadenza).
4. **Quando riprende la corsa** (ora ferma per la fascite): riattivarla nel Profilo con la fase 1, impostare i tempi della progressione di rientro e controllare i limiti di FC delle corse facili (si basano sulla soglia della corsa, 164).
5. **Idee in attesa** (solo se servono): varianti di struttura nelle sedute principali; file .zwo per MyWhoosh se un giorno servisse la fascia di cadenza (oggi non serve).
   - **Preparazione a una gara** (lista dei desideri, Fabrizio 11/11: niente in calendario, ma gli piacerebbe fare qualcosa nel 2027, in bici o corsa/trail). Partire dal minimo utile: evento in calendario (data, tipo, durata o distanza e dislivello) e **scarico finale** di 7–10 giorni; poi, se serve, blocchi costruiti a ritroso dalla data, sedute specifiche (granfondo: lunghi e salite a ritmo gara; trail: salite, discese, lunghi a piedi) e consigli per il giorno della gara. Corsa e trail solo dopo la fascite (GAP e obiettivi in collina fatti nella v1.29). Da riprendere quando c'è un evento in vista.
