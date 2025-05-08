document.addEventListener('DOMContentLoaded', () => {
    // Elementit
    const playerNameInput = document.getElementById('playerName');
    const playerNumberInput = document.getElementById('playerNumber');
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playerListDiv = document.getElementById('playerList');
    const gamePlayerListDiv = document.getElementById('gamePlayerList');
    const gameHistoryLog = document.getElementById('gameHistoryLog');

    const startGameBtn = document.getElementById('startGameBtn');
    const nextQuarterBtn = document.getElementById('nextQuarterBtn');
    const endGameBtn = document.getElementById('endGameBtn');
    const copyHistoryBtn = document.getElementById('copyHistoryBtn');
    const clearGameHistoryBtn = document.getElementById('clearGameHistoryBtn');
    const togglePauseBtn = document.getElementById('togglePauseBtn'); 

    const gameNameInput = document.getElementById('gameName');
    const maxPlayersOnCourtSetting = document.getElementById('maxPlayersOnCourtSetting'); // UUSI
    const currentGameNameDisplay = document.getElementById('currentGameNameDisplay');

    const setupView = document.getElementById('setupView');
    const gameView = document.getElementById('gameView');
    const historyView = document.getElementById('historyView');

    const navigateToGameBtn = document.getElementById('navigateToGameBtn');
    const navigateToSetupBtn = document.getElementById('navigateToSetupBtn');
    const navigateToHistoryBtn = document.getElementById('navigateToHistoryBtn');
    const backToGameFromHistoryBtn = document.getElementById('backToGameFromHistoryBtn');

    let appData = {
        gameName: "",
        players: [],
        gameHistory: [], 
        gameStarted: false,
        gameEnded: false,
        isGamePaused: false, 
        lastPauseStartTime: null, 
        currentQuarter: 0, 
        maxPlayersOnCourt: 5, // UUSI, oletus 5
        startTime: null,
        endTime: null,
        quarterTimes: []
    };

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.gameName = gameNameInput.value;
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value); // UUSI
        localStorage.setItem('basketTrackerData_v1.1', JSON.stringify(appData)); // Muutettu avainta
    }

    function loadData() {
        const storedData = localStorage.getItem('basketTrackerData_v1.1'); // Muutettu avainta
        if (storedData) {
            appData = JSON.parse(storedData);
            if (appData.startTime) appData.startTime = new Date(appData.startTime);
            if (appData.endTime) appData.endTime = new Date(appData.endTime);
            if (appData.lastPauseStartTime) appData.lastPauseStartTime = new Date(appData.lastPauseStartTime);
            appData.quarterTimes = appData.quarterTimes.map(t => t ? new Date(t) : null);
            appData.gameHistory.forEach(event => {
                if (event.timestamp) event.timestamp = new Date(event.timestamp);
            });
            appData.isGamePaused = appData.isGamePaused || false;
            appData.lastPauseStartTime = appData.lastPauseStartTime || null;
            appData.maxPlayersOnCourt = appData.maxPlayersOnCourt || 5; // UUSI: oletus jos puuttuu
            appData.players.forEach(p => {
                p.fouledOut = p.fouledOut || false;
            });
        }
        gameNameInput.value = appData.gameName || "";
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString(); // UUSI
        renderAll();
    }

    function renderAll() {
        renderPlayers();
        renderGamePlayerList();
        renderHistory();
        updateGameControls();
        updateQuarterDisplay();
        updateCurrentGameNameDisplay();
        updatePauseButtonState();
    }

    // --- APUFUNKTIOT ---
    function generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    function getCurrentQuarterForLog() {
        if (!appData.gameStarted || appData.currentQuarter === 0) return "Pelinvalmistelu";
        return `Q${appData.currentQuarter}`;
    }


    // --- PELAAJIEN HALLINTA ---
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        const number = playerNumberInput.value.trim();
        if (name && number) {
            if (appData.players.find(p => p.number === number)) {
                alert('Pelaaja tällä numerolla on jo olemassa!');
                return;
            }
            appData.players.push({
                id: `p_${Date.now()}`, name, number, onCourt: false,
                points: 0, fouls: 0, assists: 0, rebounds: 0, fouledOut: false
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData();
            renderPlayers(); renderGamePlayerList();
        } else {
            alert('Syötä pelaajan nimi ja numero.');
        }
    });

    function renderPlayers() { // Pelaajien listaus setup-näkymässä
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            playerListDiv.innerHTML = '<p>Ei pelaajia. Lisää pelaajia yllä.</p>';
            return;
        }
        appData.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card'; // Käytetään samaa korttityyliä, mutta ilman toimintoja
            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name} (#${player.number})</h3>
                    <button class="remove-player-btn" data-id="${player.id}">Poista</button>
                </div>
            `;
            playerListDiv.appendChild(card);
        });

        document.querySelectorAll('.remove-player-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                appData.players = appData.players.filter(p => p.id !== playerId);
                saveData();
                renderPlayers(); renderGamePlayerList();
            });
        });
    }

    function renderGamePlayerList() {
        gamePlayerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            gamePlayerListDiv.innerHTML = '<p>Lisää pelaajia ensin Asetukset-näkymässä.</p>';
            return;
        }

        // UUSI: Järjestetään pelaajat: kentällä olevat ensin, sitten numeron mukaan
        const sortedPlayers = [...appData.players].sort((a, b) => {
            if (a.onCourt !== b.onCourt) {
                return b.onCourt - a.onCourt; 
            }
            return parseInt(a.number) - parseInt(b.number);
        });

        sortedPlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.onCourt ? 'on-court' : 'on-bench'} ${player.fouledOut ? 'fouled-out' : ''}`;
            
            let fouledOutIndicator = player.fouledOut ? '<span class="player-fouled-out-indicator">5 VIRHETTÄ</span>' : '';
            let toggleBtnDisabled = player.fouledOut ? 'disabled' : '';
            
            // UUSI: Toimintonappien näyttölogiikka
            let actionButtonsHTML = '';
            const commonActionButtonsDisabled = player.fouledOut; // Yleinen disablointi fouledOut-tilassa

            if (player.onCourt && !player.fouledOut) {
                actionButtonsHTML = `
                    <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="1p">+1P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="2p">+2P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="3p">+3P</button>
                    </div>
                    <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="foul">Virhe</button>
                        <button class="action-btn" data-id="${player.id}" data-action="assist">Syöttö</button>
                        <button class="action-btn" data-id="${player.id}" data-action="rebound">Levypallo</button>
                    </div>
                `;
            } else if (!player.onCourt && !player.fouledOut) { 
                // Penkillä olevalle vain virhe-nappi (esim. tekninen virhe valmentajalle/pelaajalle penkillä)
                actionButtonsHTML = `
                     <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="foul">Virhe</button>
                    </div>
                `;
            } else if (player.fouledOut) { // Jos fouled out, voidaan sallia virheen antaminen, jos niitä on alle X (esim. jos säännöt sallivat teknisen virheen lisäyksen)
                 actionButtonsHTML = `
                     <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="foul" ${player.fouls >= 7 ? 'disabled' : ''}>Virhe</button> 
                    </div>
                `; // Esim. jos max virheitä vaikka 7 teknisten kanssa. Tämä logiikka voi olla monimutkainen.
            }


            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name} (#${player.number})</h3>
                    ${fouledOutIndicator}
                </div>
                <span class="player-stats">P: ${player.points} | V: ${player.fouls} | S: ${player.assists} | L: ${player.rebounds}</span>
                <div class="player-actions">
                    <button class="toggle-status-btn" data-id="${player.id}" ${toggleBtnDisabled}>
                        ${player.onCourt ? 'Penkille' : 'Kentälle'}
                    </button>
                    ${actionButtonsHTML}
                </div>
            `;
            gamePlayerListDiv.appendChild(card);
        });

        document.querySelectorAll('.toggle-status-btn').forEach(button => {
            button.addEventListener('click', handleToggleStatus);
        });
        document.querySelectorAll('.action-btn').forEach(button => {
            button.addEventListener('click', handlePlayerAction);
        });
    }

    function handleToggleStatus(event) {
        if (event.target.disabled) return;
        if (!appData.gameStarted || appData.gameEnded || appData.isGamePaused) {
            let message = "Toiminto ei sallittu: ";
            if (!appData.gameStarted && appData.currentQuarter === 0) message += "Peli ei ole alkanut.";
            else if (appData.gameEnded) message += "Peli on päättynyt.";
            else if (appData.isGamePaused) message += "Peli on tauolla.";
            alert(message);
            return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        
        if (player && !player.fouledOut) {
            // UUSI: Tarkistus kentällä olevien maksimimäärästä
            if (!player.onCourt) { // Ollaan laittamassa pelaajaa kentälle
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa! Ota ensin joku pois kentältä.`);
                    return;
                }
            }

            const oldStatus = player.onCourt;
            player.onCourt = !player.onCourt;
            logEvent({
                type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number,
                value: { oldStatus: oldStatus, newStatus: player.onCourt },
                description: `#${player.number} ${player.name} | ${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData();
            renderGamePlayerList(); // renderAll() sijaan, koska vain tämä lista ja mahdollisesti historia muuttuu
            renderHistory();
        }
    }

    function handlePlayerAction(event) {
        if (event.target.disabled) return;
         if (!appData.gameStarted || appData.gameEnded || appData.isGamePaused) {
            let message = "Toiminto ei sallittu: ";
            if (!appData.gameStarted && appData.currentQuarter === 0) message += "Peli ei ole alkanut.";
            else if (appData.gameEnded) message += "Peli on päättynyt.";
            else if (appData.isGamePaused) message += "Peli on tauolla.";
            alert(message);
            return;
        }
        const playerId = event.target.dataset.id;
        const action = event.target.dataset.action;
        const player = appData.players.find(p => p.id === playerId);

        if (player) {
            // Tarkistus siirretty renderGamePlayerList-logiikkaan (nappien piilotus/disablointi)
            // mutta tuplavarmistus ei haittaa, erityisesti virheelle.
            if (player.fouledOut && player.fouls >= 5 && action === 'foul') {
                 alert(`Pelaaja #${player.number} ${player.name} on jo poistettu pelistä 5 virheen takia.`);
                 return;
            }
            if (!player.onCourt && action !== 'foul' ) { 
                alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä. Vain virheen voi antaa penkillä olevalle.`);
                return;
            }

            let eventType = '', eventValue = null, eventDescriptionDetails = "";

            switch (action) {
                case '1p': eventType = 'SCORE'; eventValue = 1; player.points += 1; eventDescriptionDetails = "1p tehty"; break;
                case '2p': eventType = 'SCORE'; eventValue = 2; player.points += 2; eventDescriptionDetails = "2p tehty"; break;
                case '3p': eventType = 'SCORE'; eventValue = 3; player.points += 3; eventDescriptionDetails = "3p tehty"; break;
                case 'foul':
                    eventType = 'FOUL'; player.fouls += 1;
                    eventDescriptionDetails = `Virhe (${player.fouls}. henkilökohtainen)`;
                    if (player.fouls >= 5 && !player.fouledOut) {
                        player.fouledOut = true;
                        const wasOnCourt = player.onCourt;
                        player.onCourt = false; 
                        eventDescriptionDetails += " - Poistettu pelistä (5 virhettä)!";
                        if(wasOnCourt){ // Logitetaan penkille siirto vain jos oli kentällä
                             logEvent({
                                type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number,
                                value: { oldStatus: true, newStatus: false, reason: 'fouled_out' },
                                description: `#${player.number} ${player.name} | Penkille (5 virhettä)`
                            });
                        }
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            
            logEvent({
                type: eventType, playerId: player.id, playerName: player.name, playerNumber: player.number,
                value: eventValue, descriptionDetails: eventDescriptionDetails // Lähetetään vain yksityiskohdat, kuvaus rakennetaan logEventissä
            });
            saveData();
            renderGamePlayerList();
            renderHistory();
        }
    }

    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) { // Muutettu parametrin nimeä
        appData.gameHistory = [];
        appData.gameStarted = false; appData.gameEnded = false; appData.isGamePaused = false;
        appData.lastPauseStartTime = null; appData.currentQuarter = 0; 
        appData.startTime = null; appData.endTime = null; appData.quarterTimes = [];

        appData.players.forEach(player => {
            player.onCourt = false; player.points = 0; player.fouls = 0;
            player.assists = 0; player.rebounds = 0; player.fouledOut = false;
        });
        if (!keepPlayersAndSettings) {
            appData.players = []; appData.gameName = ""; gameNameInput.value = "";
            appData.maxPlayersOnCourt = 5; maxPlayersOnCourtSetting.value = "5"; // Resetoidaan myös tämä
        }
    }
    
    startGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0) {
            alert("Lisää pelaajia ennen pelin aloittamista."); return;
        }
        if (appData.gameStarted && !appData.gameEnded) {
            alert("Peli on jo käynnissä."); return;
        }
        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) { 
            resetGameStatsAndState(true); 
        }
        appData.gameStarted = true; appData.gameEnded = false; appData.isGamePaused = false;
        appData.startTime = new Date(); appData.currentQuarter = 1;
        appData.quarterTimes = [appData.startTime];
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi" }); // Käytetään descriptionMasteria ohittamaan automaattinen rakennus
        saveData(); renderAll();
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded || appData.isGamePaused) return;
        if (appData.currentQuarter < 4) {
            appData.currentQuarter++;
            appData.quarterTimes.push(new Date());
            logEvent({ type: 'GAME_EVENT', descriptionMaster: `Jakso ${appData.currentQuarter} alkoi` });
            saveData(); renderAll();
        } else {
            alert("Peli on jo viimeisellä jaksolla. Lopeta peli.");
        }
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        if (appData.isGamePaused) { toggleGamePause(); }
        appData.gameEnded = true; appData.endTime = new Date();
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli päättyi" });
        saveData(); renderAll();
    });

    togglePauseBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        toggleGamePause();
    });

    function toggleGamePause() {
        appData.isGamePaused = !appData.isGamePaused;
        if (appData.isGamePaused) {
            appData.lastPauseStartTime = new Date();
            logEvent({ type: 'PAUSE', descriptionMaster: "Pelikatko alkoi" });
        } else {
            const pauseEndTime = new Date();
            const pauseDuration = appData.lastPauseStartTime ? Math.round((pauseEndTime - appData.lastPauseStartTime) / 1000) : 0;
            logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu (katko ${pauseDuration}s)` });
            appData.lastPauseStartTime = null;
        }
        saveData(); renderAll();
    }
    
    function updateGameControls() {
        const disableAll = !appData.gameStarted || appData.gameEnded;
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        nextQuarterBtn.disabled = disableAll || appData.currentQuarter === 4 || appData.isGamePaused;
        endGameBtn.disabled = disableAll;
        togglePauseBtn.disabled = disableAll;
    }
    
    function updatePauseButtonState() {
        togglePauseBtn.textContent = appData.isGamePaused ? "Jatka Peliä" : "Aloita Katko";
        if (appData.isGamePaused) {
             togglePauseBtn.style.backgroundColor = "var(--accent-color-action)"; 
        } else {
            togglePauseBtn.style.backgroundColor = ""; 
        }
    }

    function updateQuarterDisplay() {
        const quarterText = appData.currentQuarter > 0 ? `Q${appData.currentQuarter}` : "Q1";
        nextQuarterBtn.textContent = `Jakso (${quarterText})`; // Lyhennetty teksti
        if (appData.currentQuarter === 4) {
            nextQuarterBtn.textContent = `Jakso (Q4)`;
        }
         if (!appData.gameStarted || appData.currentQuarter === 0) {
            nextQuarterBtn.textContent = "Jakso (Q1)";
        }
    }

    function updateCurrentGameNameDisplay() {
        const nameToShow = appData.gameName && appData.gameName.trim() !== "" ? appData.gameName.trim() : "Pelin Seuranta";
        currentGameNameDisplay.textContent = nameToShow;
    }
    gameNameInput.addEventListener('input', saveData); // Tallenna heti kun nimi muuttuu
    maxPlayersOnCourtSetting.addEventListener('change', saveData); // UUSI: Tallenna kun pelaajamäärä muuttuu

    // --- HISTORIA ---
    function logEvent(eventData) { 
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let finalDescription = eventData.descriptionMaster || ""; // Käytä descriptionMasteria, jos annettu

        if (!finalDescription) { // Rakenna kuvaus, jos descriptionMasteria ei ole
            let playerPrefix = "";
            if (eventData.playerId) {
                const player = appData.players.find(p => p.id === eventData.playerId);
                if (player) {
                    playerPrefix = `#${player.number} ${player.name} | `;
                }
            }
            finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${playerPrefix}${eventData.descriptionDetails || eventData.type}`;
        } else { // Jos descriptionMaster on annettu, varmista että siinä on aikaleima ja jakso
            if (!finalDescription.includes(timeString) && (appData.gameStarted || eventData.type === 'GAME_EVENT')) {
                 finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${finalDescription}`;
            } else if (!finalDescription.includes(timeString) && eventData.type !== 'GAME_EVENT'){
                 finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${finalDescription}`;
            }
        }
        
        const fullEventData = {
            id: generateEventId(),
            timestamp: timestamp,
            quarter: getCurrentQuarterForLog(), // Tallennetaan oikea jakso numero tai teksti
            description: finalDescription, // Lopullinen kuvaus
            ...eventData 
        };
        delete fullEventData.descriptionDetails; // Ei tarvita enää erikseen
        delete fullEventData.descriptionMaster; // Ei tarvita enää erikseen

        appData.gameHistory.push(fullEventData);
        renderHistory(); 
        saveData(); 
    }

    function renderHistory() {
        gameHistoryLog.innerHTML = '';
        if (appData.gameName && appData.gameName.trim() !== "") {
            const gameNameHeader = document.createElement('div'); 
            gameNameHeader.className = 'history-log-entry'; 
            gameNameHeader.innerHTML = `<p style="font-weight: bold; border-bottom: 1px solid var(--primary-color); width: 100%; text-align: center;">Peli: ${appData.gameName.trim()}</p>`;
            gameHistoryLog.appendChild(gameNameHeader);
        }

        if (appData.gameHistory.length === 0 && !(appData.gameName && appData.gameName.trim() !== "")) {
            gameHistoryLog.innerHTML = '<p>Ei tapahtumia vielä.</p>';
            return;
        }

        [...appData.gameHistory].reverse().forEach(event => { 
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-log-entry';
            const p = document.createElement('p');
            p.textContent = event.description;
            entryDiv.appendChild(p);

            const nonRemovableTypes = ['GAME_EVENT', 'PAUSE', 'RESUME'];
            if (!nonRemovableTypes.includes(event.type) && event.type) { // Tarkistetaan myös että event.type on olemassa
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn';
                removeBtn.textContent = '-';
                removeBtn.dataset.eventId = event.id;
                removeBtn.addEventListener('click', () => removeHistoryEvent(event.id));
                entryDiv.appendChild(removeBtn);
            }
            gameHistoryLog.appendChild(entryDiv);
        });
    }
    
    function removeHistoryEvent(eventId) {
        if (!confirm("Haluatko varmasti poistaa tämän tapahtuman? Tätä ei voi kumota.")) return;

        const eventIndex = appData.gameHistory.findIndex(event => event.id === eventId);
        if (eventIndex === -1) { console.error("Poistettavaa tapahtumaa ei löytynyt:", eventId); return; }

        const eventToRemove = appData.gameHistory[eventIndex];
        const player = eventToRemove.playerId ? appData.players.find(p => p.id === eventToRemove.playerId) : null;

        if (player) {
            switch (eventToRemove.type) {
                case 'SCORE':
                    if (typeof eventToRemove.value === 'number') { player.points = Math.max(0, player.points - eventToRemove.value); }
                    break;
                case 'FOUL':
                    player.fouls = Math.max(0, player.fouls - 1);
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        logEvent({ type: 'GAME_EVENT', playerId: player.id, playerName: player.name, playerNumber: player.number,
                                   descriptionMaster: `#${player.number} ${player.name} | Ei enää 'fouled out' (virheen poisto)` });
                    }
                    break;
                case 'ASSIST': player.assists = Math.max(0, player.assists - 1); break;
                case 'REBOUND': player.rebounds = Math.max(0, player.rebounds - 1); break;
                case 'SUBSTITUTION': /* Kuten aiemmin päätetty, ei automaattista onCourt-muutosta */ break;
            }
        }
        appData.gameHistory.splice(eventIndex, 1);
        saveData(); renderAll(); 
    }

    copyHistoryBtn.addEventListener('click', () => {
        let historyText = "";
        if (appData.gameName && appData.gameName.trim() !== "") {
            historyText += `Peli: ${appData.gameName.trim()}\nMaksimipelaajia kentällä: ${appData.maxPlayersOnCourt}\n--------------------\n`;
        }
        appData.gameHistory.forEach(event => { historyText += event.description + '\n'; }); // Alkuperäinen järjestys

        if (navigator.clipboard) {
            navigator.clipboard.writeText(historyText.trim())
                .then(() => alert('Historia kopioitu leikepöydälle!'))
                .catch(err => alert('Kopiointi epäonnistui: ' + err));
        } else { /* Fallback */ }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot? Pelaajia, pelin nimeä ja asetuksia ei poisteta.")) {
            resetGameStatsAndState(true); 
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData(); renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot nollattu.");
        }
    });

    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
        [setupView, gameView, historyView].forEach(view => {
            view.classList.toggle('hidden', view.id !== viewId);
        });
        if (viewId === 'gameView') { renderGamePlayerList(); updateCurrentGameNameDisplay(); }
        if (viewId === 'historyView') { renderHistory(); }
    }

    navigateToGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0) {
            alert("Lisää vähintään yksi pelaaja."); return;
        }
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    backToGameFromHistoryBtn.addEventListener('click', () => showView('gameView'));

    // --- ALUSTUS ---
    loadData();
    showView('setupView');
});
