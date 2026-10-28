# SMG · Sudo Ma Godo — note per riprendere il lavoro

Aggiornate al 28 ottobre 2026 · versione app **1.23** · cache service worker `smg-org-v60`

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
- **Decido io**:
  - sport: bici del profilo, gruppo su MyWhoosh, **corsa** (anche se in pausa, con avviso per il piede) e **camminata** (sport `walk`);
  - intensità della camminata: passeggiata, svelta, escursione;
  - durata da 30';
  - sul Fenix non arriva nessun allenamento strutturato.
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
- **Dettaglio attività** da Intervals (`/activity/{id}`, `/streams.json`): numeri, grafici e zone. Le attività arrivate da Strava non si leggono (403).

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

1. **Seguire il blocco forza e sweet spot** (26/10–15/11, poi scarico 16–22/11). Controllare che:
   - il semaforo nuovo dia più verdi;
   - arrivino SFR e sweet spot all'intensità giusta, con RPE 6–7 sullo sweet spot;
   - nei weekend di pioggia i rulli arrivino a 90' con sedute medie.
2. **Lunedì 16/11 (inizio scarico): seconda analisi del backup** del blocco forza (26/10–15/11). Promemoria impostato in chat. Così c'è tutta la settimana di scarico per tarare e pubblicare prima del blocco soglia. Da guardare:
   - registro delle scelte, più ricco;
   - effetto del semaforo e dei temi;
   - carico e CTL (36 il 28/10). D'inverno freddo, buio e maltempo limitano il volume: obiettivo realistico **tenerla stabile** (36–40), non per forza risalire. Guardare soprattutto i giorni lunghi del weekend;
   - sedute scartate;
   - eventuali varianti di struttura delle sedute.

   Poi tarare i pesi dei temi prima del blocco soglia (dal 23/11). Fino ad allora **non cambiare il motore**, per non confondere l'analisi.
3. **Prossimo test FTP**: con le regole attuali verso metà-fine dicembre (≥6 settimane, prima settimana dopo uno scarico). Se si sente molto più in forma prima, "Anticipa".
4. **Quando riprende la corsa** (ora ferma per la fascite): riattivarla nel Profilo con la fase 1, impostare i tempi della progressione di rientro e controllare i limiti di FC delle corse facili (si basano sulla soglia della corsa, 164).
5. **Idee in attesa** (solo se servono): varianti di struttura nelle sedute principali; file .zwo per MyWhoosh se un giorno servisse la fascia di cadenza (oggi non serve).
