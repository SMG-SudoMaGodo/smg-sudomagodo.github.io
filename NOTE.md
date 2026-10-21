# SMG · Sudo Ma Godo — note per riprendere il lavoro

Aggiornate al 21 ottobre 2026 · versione app **1.19** · cache service worker `smg-org-v56`

App online: https://smg-sudomagodo.github.io/ (GitHub Pages, org `SMG-SudoMaGodo`, repo `smg-sudomagodo.github.io`).

---

## 1. Stato attuale dell'app

**Cos'è.** PWA personale che ogni giorno propone una seduta varia (bici da strada, MTB/gravel, rulli con MyWhoosh, corsa, forza e mobilità), adattata al recupero, al meteo e alla luce. L'obiettivo è mantenere o migliorare la forma divertendosi, senza gare.

**File.**
- `engine.js`: logica pura (prontezza, scelta della seduta, blocchi, test FTP, buio, meteo nelle ore di uscita, punto di rugiada, formato Intervals). Esporta `window.SMG`.
- `app.js`: interfaccia (viste Oggi, Diario, Profilo), sincronizzazione con Intervals.icu, meteo, guida (`GUIDE`), schede a comparsa, dettaglio attività, andamento degli indicatori, barra di aggiornamento. Costanti `ENGINE_V` e `APP_V` (in cima al file).
- `index.html`: CSS (blu in stile Garmin: sfondo `#0A111D`, primario `#2DB4F2`) e struttura.
- `sw.js`: funzionamento offline, rete prima. Usa `cache: 'reload'` all'installazione e `no-cache` nel fetch, così gli aggiornamenti non prendono file vecchi dalla cache del browser. **A ogni pubblicazione incrementa `CACHE`** e, se cambia qualcosa di visibile, `APP_V`.
- `app.webmanifest` e icone `*-v2.png`.
- I dati restano solo nel telefono (localStorage `smg-v1`); il repository contiene solo codice.

**Funzioni principali.**
- **Check-in del mattino**: sensazione, HRV, FC a riposo, sonno, Training Readiness facoltativa (media 50/50), malanno (raffreddore oppure febbre). Semaforo verde ≥70, arancione ≥50, rosso sotto; dettaglio del punteggio voce per voce.
- **Riquadri degli indicatori cliccabili** (HRV, FC a riposo, sonno, Forma, Training Readiness): andamento a 14, 30 o 60 giorni, fascia della norma per la HRV, valore del giorno toccando o scorrendo il grafico, media, minimo e massimo.
- **Seduta stabile**: dopo il check-in la proposta non cambia più da sola. Se arrivano dati nuovi compare "Adegua la seduta / Tieni questa". Toccando il grafico della seduta si apre il dettaglio dei blocchi.
- **Comandi della seduta**: chip Sport e Tempo a disposizione, **Alternative**, Falla sui rulli, Invia, Fatta, "Decido io: esco con gli amici", Oggi salto (con alternativa di mobilità o forza).
- **Alternative** (dalla v1.9, sostituisce Rilancia): scheda con 3 sedute dello **stesso livello** (stesso stimolo e stesse regole di recupero), ciascuna con grafico, durata, carico, cosa allena e descrizione; "Scelgo questa" la fissa (`opts.forceTid` + `forceSport`, `opts.picked`, motivo "Scelta da te tra le alternative"); "Altre 3" ne mostra altre; il chip Sport "Automatico" torna alla proposta di SMG. Motore: `E.alternatives(state, date, plan, opts, seed)`: sport con peso ≥12% del migliore secondo meteo, luce e stagione (in inverno le dure restano sui rulli), durata vicina a quella di oggi, preferenza per sedute non fatte da un po' e per stimoli (focus) e sport diversi tra loro; se a quel livello ce ne sono meno di 3, completa con il livello sotto.
- **Registro delle scelte** (dalla v1.18): `S.choices` (max 1500 voci, finisce nel backup). Ogni voce: `d`, `t` (ora locale), `act`, la seduta proposta in quel momento (`tid`, `sport`, `level`, `dur`, `light`, `picked`) e i dettagli. `act`: `alt_open` (con `round` e `shown`), `alt_pick` (`to`, `toSport`), `alt_keep`, `sport` (`to` o `auto`), `dur`, `indoor` (`to`), `skip`, `friends` (`to`, `feel`). Serve all'analisi del backup: quali sedute vengono scartate, quali scelte. Dati utili solo dal 21 ottobre: rifare l'analisi dopo un mese per avere numeri solidi.
- **Cosa allena**: ogni seduta ha un `focus` (rec, fondo, tecnica, brio, tempo, ss, forza, soglia, vo2, sprint, test) con etichetta e frase in `FOCUS_INFO`, mostrata sotto la descrizione. Servirà anche per dare un tema ai blocchi.
- **Libreria sedute** (v1.9: 44, prima 28). Nuove: bici: Fondo in crescendo, Tecnica di pedalata (rulli), Forza resistente (SFR), Sweet spot con strappi, Piramide di cadenza, Sweet spot lungo, Progressivo a terzi, Soglia con partenza forte, Soglia lunga, Settori a soglia (MTB), VO2max lunghi, 15/15, Ripetute in salita (MTB/strada). Corsa: Corsa nel verde e Passo corto e veloce (fase corsa facile), Andature e allunghi, Progressivo a terzi, Ripetute lunghe in sweet spot, Salite brevi, VO2max lunghi (fase completa). - **Falla sui rulli** (dalla v1.10): per le sedute solo all'aperto `INDOOR_EQ` ha 2-3 gemelle indoor dello stesso livello; si sceglie quella non fatta da più tempo (a parità, rotazione secondo la data). Es. Fartlek collinare → Sweet spot con strappi / Tempo a blocchi / Piramide di cadenza; Salite in tempo → SFR / Tempo a blocchi / Piramide di cadenza; Lungo con finale in tempo (minimo 80', oltre il massimo sui rulli) → Progressivo / Sweet spot lungo / Tempo a blocchi.
- **Attività reali** (da Intervals):
  - In Oggi c'è sempre il riquadro "Fatto oggi" ("Oggi era riposo, ma ti sei allenato" nei giorni di riposo).
  - Nel Diario si vede l'attività vera, con la proposta di SMG accanto.
  - Si apre ogni giorno con un'attività, compresi i giorni di riposo e oggi.
  - Toccando un'attività si apre il **dettaglio completo**, letto da Intervals al momento (`/activity/{id}` e `/streams.json`): tempo, distanza, dislivello, velocità, potenza media e normalizzata, IF, carico, FC, cadenza, calorie, VI, efficienza, deriva cardiaca, sforzo percepito; grafici di potenza, FC, altitudine e cadenza; tempo nelle zone; collegamento a Intervals.
  - Se la seduta era segnata "Oggi salto" e poi arriva un'attività, passa a "Fatta".
- **Blocchi di 4 settimane** (3 di costruzione + 1 di scarico) ancorati a `deloadAnchor`, con Anticipa, Posticipa e "Da questa settimana". Al massimo 2 sedute dure a settimana.
- **Inverno (ottobre–marzo)**: qualità sui rulli (massimo 70'), volume fuori, MTB preferita.
- **Orario di uscita per giorno** (Profilo → La tua settimana): lunedì e mercoledì 18:00, venerdì 15:00, sabato e domenica 9:00. Pioggia, temperatura e punto di rugiada si guardano nelle ore di uscita. Col buio niente strada; MTB con le luci solo ogni tanto, con tempo asciutto, poco vento e almeno 5 °C. Avviso "porta le luci" se si rientra dopo il tramonto.
- **Punto di rugiada** nella scheda meteo, con pallino colorato: verde fino a 16°, giallo 17–18°, rosso 19–21°, viola da 22°. Da 19° la proposta aggiunge un consiglio (corsa e sedute medie o dure all'aperto).
- **Punto di rugiada, come si legge** (verificato il 21 ottobre): il pallino mostra il **massimo nelle ore di uscita** del giorno (dall'orario della settimana per min(durata massima, 120') ), non il valore attuale: per questo può differire dalle altre app, insieme al modello meteo (Open-Meteo "best match"; 1–2° tra modelli sono normali). Toccando il pallino si vedono i valori ora per ora e quello di adesso. Il calcolo è corretto: nessun errore trovato.
- **Schermata meteo** (dalla v1.12): toccando il riquadro di oggi o di domani si apre il dettaglio con schede oggi/domani/dopodomani, riquadri (max/min, pioggia % e mm, vento e raffiche, alba e tramonto, rugiada in uscita, pollini), tre grafici ora per ora: temperatura + rugiada (tratteggiata), probabilità di pioggia a barre, **pioggia prevista in mm/h in un grafico a parte** (dalla v1.14: i numeri sopra le barre si accavallavano; ora c'è il totale nel titolo e solo il picco scritto; se non piove, una riga di testo), vento medio + raffiche (tratteggiate); fascia azzurra = ore di uscita, zone scure = buio; tocco o trascinamento orizzontale = linea verticale e valori dell'ora nel riquadro in alto. Striscia ora per ora con icona, temperatura e pioggia. Dati orari in più da Open-Meteo: `precipitation`, `wind_speed_10m`, `wind_gusts_10m`, `weather_code` (`hm`, `hw`, `hg`, `hc`). Colori validati per il fondo scuro: aria `#C8742A`, rugiada e pioggia `#1F94CC`, vento `#8FA0B8`. Un solo asse per grafico.
- **Trasferta** (dalla v1.16, Profilo → Meteo): località temporanea `S.trip = { name, lat, lon, from, to }` (date comprese). Per ogni giorno meteo, pollini, alba/tramonto e proposta usano `wxLoc(d)`: trasferta nei giorni indicati, altrimenti casa (`S.loc`). Se oggi e domani hanno località diverse si scaricano entrambe (`S.wx.sig` = località per giorno; se cambia, si riscarica). Sopra il meteo: "In trasferta a … fino a …" o "Trasferta a … da …". Il giorno dopo la fine si cancella da sola (avviso); "Sono tornato" la chiude prima. **Cosa hai con te** (dalla v1.17): `S.trip.gear = { indoor, mtb, road, run }`; il motore usa `profileFor(state, date)`, che nei giorni di trasferta spegne gli sport senza attrezzatura (vale per proposta, alternative, chip Sport e "Falla sui rulli"). Default per una trasferta nuova: rulli spenti, il resto acceso. Senza rulli, con pioggia o buio, la proposta resta fuori con l'avviso "valuta tu se uscire, o fai forza e mobilità". Senza niente: card "Giornata libera" con forza e mobilità a corpo libero. "Esco con gli amici" offre sempre tutti gli sport del profilo.
- **Aggiornamento meteo** (dalla v1.13): riscaricato all'apertura dell'app se più vecchio di **1 ora** (prima 2); nessun aggiornamento in background. Nella schermata meteo c'è "Aggiornato oggi alle hh:mm". Alla fonte: modello di dettaglio per l'Italia ogni ~3 ore, altri 6–12 ore; pollini una volta al giorno.
- **Schede a comparsa**: con una scheda aperta la pagina sotto non scorre più (`html:has(.sheet.on){overflow:hidden}` e `overscroll-behavior:contain` sul pannello).
- **Pollini** (dalla v1.11): pallino col colore del polline messo peggio. Dati: Open-Meteo Air Quality (CAMS Europa, 11 km, 4 giorni, solo in stagione), 6 tipi: graminacee, betulla, ontano, olivo, artemisia, ambrosia; media giornaliera in granuli/m³ (`wx.days[d].pol`, con `avg` e `max`). Classi POLLnet (ISPRA/ARPA): betulla e ontano 0,5/16/50; graminacee 0,5/10/30; olivo 0,5/5/25; artemisia e ambrosia 0,1/5/25 (assente/bassa/media/alta). Colori: verde, giallo, arancione, rosso; grigio = fuori stagione. Toccando il pallino: dettaglio per tipo con media, picco e soglie. Non coperti: cipresso, nocciolo, carpino, ortica, castagno (bollettino ARPA). Non cambia la scelta della seduta.
- **Test FTP 20'** (`ftp_test`):
  - Proposto nella prima settimana dopo lo scarico se sono passate almeno 6 settimane; oltre 9 settimane anche in altre settimane, mai durante lo scarico.
  - Solo con semaforo verde, di lunedì, mercoledì o sabato. "Anticipa" lo chiede al primo giorno utile.
  - I 20' sono inviati come `freeride` (ERG spento).
  - **Istruzioni passo passo** (dalla v1.8): nel giorno del test, sotto la seduta, c'è il riquadro "Oggi c'è il test FTP" con la media obiettivo e il pulsante che apre la procedura completa (rulli o strada). Contiene: prima, preparazione, partenza, riscaldamento in ERG, i 20' senza ERG, ritmo per minuti 0–5, 5–15 e 15–20, dopo. Il campo "FTP che ti aspetti oggi" (`profile.testGuess`, cancellato dopo il test) ricalcola il ritmo, l'FTP da mettere su MyWhoosh per il riscaldamento e i watt del rapporto.
  - **Lettura automatica** (dalla v1.8): dopo ogni sincronizzazione, se c'è un test fatto negli ultimi 3 giorni senza risultato, SMG legge da Intervals gli stream (`watts`, `heartrate`, `time`) dell'attività con la potenza, trova i 20' con la media più alta (zeri compresi) e la FC media nello stesso tratto, e apre la scheda "Risultato del test" già compilata. Chiede sempre conferma: **"Sì, aggiorna a N W"** (FTP = 95%, FC di soglia, PUT `/sport-settings/{id}` su Intervals) oppure **"No, tieni FTP …"** (registra il test con `kept: true`, aggiorna `lastTest`, l'FTP resta). I valori si possono correggere. Se l'attività non si legge (403 da Strava, niente potenza) resta l'inserimento a mano dal Lap del Fenix.
- **Confronto Tacx/Stages** (Profilo → Tacx e Stages): oltre il 3% di differenza calcola l'FTP da impostare su MyWhoosh (FTP × watt Tacx ÷ watt Stages).
- **Esercizi extra** (forza e mobilità): ogni esercizio ha una riga che spiega come si fa.
- **Altro**: giorni speciali (impegno o giorno extra), rifornimento nei lunghi, riepilogo del lunedì, anteprima di domani, grafico della forma, promemoria backup, guida sempre aggiornata, barra "Nuova versione pronta – Aggiorna".

**Integrazioni.**
- **Intervals.icu** (chiave API inserita solo sul telefono):
  - Legge benessere (60 giorni), attività (42 giorni, `newest` = domani così quelle di oggi arrivano sempre; doppioni a meno di 15' eliminati; viene salvato l'`id`), FTP, FC e passo di soglia, peso.
  - Si risincronizza all'apertura: ogni 2 minuti finché la seduta di oggi non risulta fatta, poi ogni 10.
  - Invia la seduta come evento `smg-AAAA-MM-GG`, che Intervals inoltra a Garmin Connect (Fenix, Edge) e a MyWhoosh.
- **Open-Meteo**: meteo giornaliero e orario (pioggia, temperatura, punto di rugiada), alba e tramonto; se mancano, alba e tramonto si calcolano dalla località. Il meteo si riscarica se mancano campi nuovi.

---

## 2. Decisioni e vincoli

**Atleta e disponibilità**
- FTP 245 W su Intervals: misurata tempo fa col Fenix. Al 19 ottobre Fabrizio stima di essere circa 20 W sotto (~225 W): il test va rifatto a breve. FC di soglia 164, passo di soglia 4:08/km. Peso e altri dati personali arrivano da Intervals.
- Lunedì e mercoledì fino a 1h15; venerdì, sabato e domenica giorni lunghi fino a 2h30; martedì e giovedì riposo.
- Corsa in pausa per la fascite (al 19 ottobre non permette ancora il rientro). Quando riprende, rientro graduale con le fasi già previste (cammino e corsa → corsa facile → completa).

**Rulli e potenza**
- **Cadenza su MyWhoosh** (21 ottobre): non ancora verificata su questo setup. A fine 2025 sul forum di Intervals c'erano segnalazioni contrastanti (rpm non arrivati ad agosto 2025, funzionanti a dicembre 2025, con valori singoli). Dalla v1.10 SMG invia la cadenza come valore singolo arrotondato a 5 (es. `55rpm`), non più come fascia (`50-60rpm`). **Verificato il 21 ottobre (SFR)**: il valore singolo arriva sia su MyWhoosh sia sul Fenix (55 rpm). Fabrizio fatica a scendere sotto i 60 col rapporto più duro (in ERG basta pedalare più piano). Dalla v1.19 interruttore Profilo → **Cadenza come fascia** (`profile.cadRange`, spento di base): manda `50-60rpm` invece di `55rpm`; prova da fare alla prossima seduta con cadenza per vedere cosa mostrano MyWhoosh e il Fenix. Deciso di NON cambiare la fascia SFR (50–60).
- Su MyWhoosh il Tacx Flux 2S è l'unico misuratore e comanda l'ERG. Gli Stages (pedivella sulla bici da strada) restano solo sul Fenix, che registra la stessa seduta.
- Sul Fenix il Tacx non va abbinato come rullo né come potenza; come solo sensore di velocità via ANT+ va bene.
- Sul Fenix si può avviare anche la seduta SMG, partendo insieme a MyWhoosh e con gli avvisi di obiettivo spenti.
- MyWhoosh non permette agli Stages di comandare l'ERG come sorgente primaria: non proporlo.
- Azzerare gli Stages prima di ogni seduta. Media della potenza sul Fenix con gli zeri inclusi.
- Il 7 ottobre MyWhoosh (Tacx) ha letto il **9,8% in meno** del Fenix (Stages). Con confronti ripetuti la differenza varia un po' ogni volta; al 19 ottobre si è assestata intorno al **−5,2%**.

**Dati e doppioni**
- Su Intervals: importazione delle attività di MyWhoosh **disattivata** (permessi MyWhoosh: "Attività – Aggiornare" tolto, Calendario lasciato). Si tiene l'attività del Fenix.
- Su Strava si tiene l'attività di MyWhoosh (per il dislivello virtuale) e si elimina quella di Garmin.
- Le attività arrivate a Intervals da Strava non si possono leggere via API (403): il dettaglio lo spiega.
- Test FTP sempre con il protocollo di SMG, non quelli di Garmin o MyWhoosh.

**Tecnica**
- Niente dati personali né chiavi nel repository, che è pubblico.
- Il sito dev'essere un'origine propria (`smg-sudomagodo.github.io`): sul vecchio indirizzo c'era il problema dell'installazione "fantasma" di Chrome. I vecchi repository `fabriziodavi80/SMG` e `fabriziodavi80/SudoMaGodo` fanno solo il reindirizzamento.
- Interfaccia e testi in italiano; il tasto Indietro di Android va gestito con la history (schede e modifica del check-in).
- **La guida si aggiorna a ogni cambiamento visibile.**
- Pubblicare a piccoli passi e verificare il deploy di GitHub Actions. GitHub Pages tiene i file in cache per circa 10 minuti, quindi gli aggiornamenti arrivano con qualche minuto di ritardo. Il 5 ottobre un guasto di GitHub ha bloccato una pubblicazione e l'ho dovuta rilanciare.
- Prova delle modifiche con Playwright (Chromium già installato) e dati di Intervals e Open-Meteo simulati.

**Durate**
- Salite in tempo con 60' disponibili dura 65': va bene così (deciso il 21 ottobre), non correggere.

**Varietà (decisa il 21 ottobre)**
- Fabrizio non vuole annoiarsi, ma la varietà dev'essere sempre al servizio del miglioramento e degli stimoli allenanti: le alternative restano allo stesso livello, ogni seduta dice cosa allena, la progressione resta quella dei blocchi.
- Varietà anche nella corsa, per quando riprende dopo la fascite.
- Prossimo passo, dopo l'analisi del backup: un **tema per ogni blocco** di 4 settimane (es. ottobre–dicembre forza/sweet spot/tempo, gennaio–febbraio soglia, marzo–aprile VO2max) che pesa la scelta delle sedute per `focus`, con progressione vera dentro il tema (es. 3×10' → 3×12' → 2×20').

**Procedura del test sui rulli (decisa il 19 ottobre: non richiederla)**
- Fenix e MyWhoosh **attivi tutti e due per tutta la seduta**, avviati nello stesso momento con la seduta SMG del giorno. MyWhoosh comanda il Tacx (ERG nel riscaldamento, allunghi e defaticamento); il Fenix registra gli Stages, e **il risultato sono i watt del Fenix**, non quelli di MyWhoosh.
- Su MyWhoosh: percorso **piatto** (senza ERG la resistenza segue la pendenza virtuale) e FTP nel profilo = stima × rapporto Tacx/Stages, solo per avere i watt giusti nel riscaldamento.
- Al blocco Test (inviato come `freeride`) MyWhoosh toglie l'ERG; se non lo fa, si spegne a mano. Sforzo regolato coi rapporti guardando potenza 3" e potenza media del Lap sul Fenix. Il Lap del Fenix parte da solo col passo.
- Fenix: avvisi di obiettivo spenti, Stages azzerati, Tacx non abbinato come rullo né come potenza.
- Ritmo: media obiettivo = FTP stimata ÷ 0,95. Minuti 0–5 al 97–99%, 5–15 al 99–101%, 15–20 dal 101% in su, ultimi 2' a tutta. Cadenza 85–95, mai smettere di pedalare.
- Giorno migliore: mercoledì (martedì riposo), con lunedì facile. Semaforo verde obbligatorio.
- Dopo: salvare su Fenix e MyWhoosh; SMG legge il test da Intervals e chiede se aggiornare l'FTP. Poi FTP a mano su MyWhoosh (corretta Tacx/Stages) e su Garmin Connect.

---

## 3. Prossimi passi

1. **Verifiche alle prossime sedute indoor**
   - Controllare che la seduta SMG arrivi su MyWhoosh nonostante il permesso "Attività" tolto, e che su Intervals arrivi solo l'attività del Fenix.
   - Controllare se sforzo percepito e sensazione inseriti su Garmin compaiono nell'attività su Intervals (ora si vedono nel dettaglio attività di SMG). Se non compaiono, inserirli su Intervals.
   - Cadenza: il valore singolo arriva su MyWhoosh e Fenix (21 ottobre). Prossima seduta con cadenza: accendere "Cadenza come fascia" e vedere se MyWhoosh e Fenix mostrano la fascia; se no, spegnerla.
   - Dopo la calibrazione di Stages e Tacx, rifare il confronto (Profilo → Tacx e Stages → Rifai) e impostare su MyWhoosh l'FTP indicata.
2. **FTP**: rifare il test a breve (stima ~225 W). Profilo → Test FTP → Anticipa se non arriva da solo. Primo test con la lettura automatica: verificare che i 20' trovati coincidano col Lap del Fenix e che MyWhoosh spenga davvero l'ERG al blocco Test.
3. **26 ottobre: analisi del backup.** Esportare il backup da SMG e caricarlo in chat per tarare semaforo, livelli MTB senza potenza, progressione e frequenza del test. Poi impostare i **temi dei blocchi** (vedi Varietà) e rivedere pesi e progressione delle sedute nuove.
4. **Quando riprende la corsa** (ora ferma per la fascite): impostare la progressione di rientro.
