# SMG · Sudo Ma Godo — note per riprendere il lavoro

Aggiornate all'8 ottobre 2026 · versione app **1.5.2** · cache service worker `smg-org-v33`

App online: https://smg-sudomagodo.github.io/ (GitHub Pages, org `SMG-SudoMaGodo`, repo `smg-sudomagodo.github.io`).

---

## 1. Stato attuale dell'app

**Cos'è.** PWA personale che ogni giorno propone una seduta varia (bici da strada, MTB/gravel, rulli con MyWhoosh, corsa, forza e mobilità), adattata al recupero, al meteo e alla luce. L'obiettivo è mantenere o migliorare la forma divertendosi, senza gare.

**File.**
- `engine.js`: logica pura (prontezza, scelta della seduta, blocchi, test FTP, buio e meteo, formato Intervals). Esporta `window.SMG`.
- `app.js`: interfaccia (viste Oggi, Diario, Profilo), sincronizzazione con Intervals.icu, meteo, guida (`GUIDE`), schede a comparsa, barra di aggiornamento. Costanti `ENGINE_V` e `APP_V`.
- `index.html`: CSS (blu in stile Garmin: sfondo `#0A111D`, primario `#2DB4F2`) e struttura.
- `sw.js`: funzionamento offline, rete prima. **A ogni pubblicazione incrementa `CACHE`** e, se cambia qualcosa di visibile, `APP_V`.
- `app.webmanifest` e icone `*-v2.png`.
- I dati restano solo nel telefono (localStorage `smg-v1`); il repository contiene solo codice.

**Funzioni principali.**
- **Check-in del mattino**: sensazione, HRV, FC a riposo, sonno, Training Readiness facoltativa (media 50/50), malanno (raffreddore oppure febbre). Semaforo verde ≥70, arancione ≥50, rosso sotto; dettaglio del punteggio voce per voce.
- **Seduta stabile**: dopo il check-in la proposta non cambia più da sola. Se arrivano dati nuovi compare "Adegua la seduta / Tieni questa".
- **Comandi della seduta**: chip Sport e Tempo a disposizione, Rilancia, Falla sui rulli, Invia, Fatta, "Decido io: esco con gli amici", Oggi salto (con alternativa di mobilità o forza).
- **Blocchi di 4 settimane** (3 di costruzione + 1 di scarico) ancorati a `deloadAnchor`, con Anticipa, Posticipa e "Da questa settimana". Al massimo 2 sedute dure a settimana.
- **Inverno (ottobre–marzo)**: qualità sui rulli (massimo 70'), volume fuori, MTB preferita.
- **Orario di uscita per giorno** (Profilo → La tua settimana): lunedì e mercoledì 18:00, venerdì 15:00, sabato e domenica 9:00. Il meteo si guarda nelle ore di uscita. Col buio niente strada; MTB con le luci solo ogni tanto, con tempo asciutto, poco vento e almeno 5 °C. Avviso "porta le luci" se si rientra dopo il tramonto.
- **Test FTP 20'** (`ftp_test`): proposto nella prima settimana dopo lo scarico se sono passate almeno 6 settimane, oltre 9 settimane anche in altre settimane, mai durante lo scarico. Solo con semaforo verde, di lunedì, mercoledì o sabato. "Anticipa" lo chiede al primo giorno utile. I 20' sono inviati come `freeride` (ERG spento). Nella schermata del risultato: FTP = 95% della media, FC media = FC di soglia, valori scritti su Intervals (PUT `/sport-settings/{id}`).
- **Confronto Tacx/Stages** (Profilo → Tacx e Stages): oltre il 3% di differenza calcola l'FTP da impostare su MyWhoosh (FTP × watt Tacx ÷ watt Stages).
- **Altro**: giorni speciali (impegno o giorno extra), rifornimento nei lunghi, riepilogo del lunedì, anteprima di domani, grafico della forma, promemoria backup, guida sempre aggiornata, barra "Nuova versione pronta – Aggiorna".

**Integrazioni.**
- **Intervals.icu** (chiave API inserita solo sul telefono): legge benessere (60 giorni), attività (42 giorni, con eliminazione dei doppioni registrati a meno di 15' di distanza), FTP, FC e passo di soglia, peso. Invia la seduta come evento `smg-AAAA-MM-GG`, che Intervals inoltra a Garmin Connect (Fenix, Edge) e a MyWhoosh.
- **Open-Meteo**: meteo giornaliero e orario, alba e tramonto; se mancano, alba e tramonto si calcolano dalla località.

---

## 2. Decisioni e vincoli

**Atleta e disponibilità**
- FTP 225 W (da verificare con gli Stages, vedi i prossimi passi), FC di soglia 164, passo di soglia 4:08/km. Peso e altri dati personali arrivano da Intervals.
- Lunedì e mercoledì fino a 1h15; venerdì, sabato e domenica giorni lunghi fino a 2h30; martedì e giovedì riposo.
- Corsa in pausa: quando riprende, rientro graduale con le fasi già previste (cammino e corsa → corsa facile → completa).

**Rulli e potenza**
- Su MyWhoosh il Tacx Flux 2S è l'unico misuratore e comanda l'ERG. Gli Stages (pedivella sulla bici da strada) restano solo sul Fenix, che registra la stessa seduta.
- Sul Fenix il Tacx non va abbinato come rullo né come potenza; come solo sensore di velocità via ANT+ va bene.
- Sul Fenix si può avviare anche la seduta SMG, partendo insieme a MyWhoosh e con gli avvisi di obiettivo spenti.
- MyWhoosh non permette agli Stages di comandare l'ERG come sorgente primaria: non proporlo.
- Azzerare gli Stages prima di ogni seduta. Media della potenza sul Fenix con gli zeri inclusi.
- Il 7 ottobre MyWhoosh (Tacx) ha letto il **9,8% in meno** del Fenix (Stages).

**Dati e doppioni**
- Su Intervals: importazione delle attività di MyWhoosh **disattivata** (permessi MyWhoosh: "Attività – Aggiornare" tolto, Calendario lasciato). Si tiene l'attività del Fenix.
- Su Strava si tiene l'attività di MyWhoosh (per il dislivello virtuale) e si elimina quella di Garmin.
- Test FTP sempre con il protocollo di SMG, non quelli di Garmin o MyWhoosh.

**Tecnica**
- Niente dati personali né chiavi nel repository, che è pubblico.
- Il sito dev'essere un'origine propria (`smg-sudomagodo.github.io`): sul vecchio indirizzo c'era il problema dell'installazione "fantasma" di Chrome. I vecchi repository `fabriziodavi80/SMG` e `fabriziodavi80/SudoMaGodo` fanno solo il reindirizzamento.
- Interfaccia e testi in italiano; il tasto Indietro di Android va gestito con la history (schede e modifica del check-in).
- **La guida si aggiorna a ogni cambiamento visibile.**
- Pubblicare a piccoli passi e verificare il deploy di GitHub Actions: il 5 ottobre un guasto di GitHub ha bloccato una pubblicazione e l'ho dovuta rilanciare.

---

## 3. Prossimi passi

1. **Verifiche alla prossima seduta indoor**
   - Controllare che la seduta SMG arrivi su MyWhoosh nonostante il permesso "Attività" tolto, e che su Intervals arrivi solo l'attività del Fenix.
   - Controllare se sforzo percepito e sensazione inseriti su Garmin compaiono nell'attività su Intervals. Se non compaiono, inserirli su Intervals.
   - Sul Fenix: media con zeri inclusi; dopo la calibrazione di Stages e Tacx, rifare il confronto (Profilo → Tacx e Stages → Rifai).
2. **Origine dell'FTP 225**
   - Se è stata misurata su MyWhoosh/Tacx: non correggere su MyWhoosh e anticipare il test (Profilo → Test FTP → Anticipa) per avere l'FTP sugli Stages, poi impostare su MyWhoosh il valore corretto indicato da SMG.
   - Se è stata misurata con gli Stages: impostare subito su MyWhoosh l'FTP corretta (circa 203 W).
3. **26 ottobre: analisi del backup.** Esportare il backup da SMG e caricarlo in chat per tarare semaforo, livelli MTB senza potenza, progressione e frequenza del test.
4. **Quando riprende la corsa**: impostare la progressione di rientro.
5. **Idee rimandate** (solo se servono): lettura automatica da Intervals del risultato del test (potenza e FC del giro dei 20').
