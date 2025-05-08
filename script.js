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
    const togglePauseBtn = document.getElementById('togglePauseBtn'); // UUSI

    const gameNameInput = document.getElementById('gameName');
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
        gameHistory: [], // Tallentaa nyt objekteja
        gameStarted: false,
        gameEnded: false,
        isGamePaused: false, // UUSI
        lastPauseStartTime: null, // UUSI
        currentQuarter: 0, // 0: ennen peliä, 1-4: peli käynnissä
        startTime: null,
        endTime: null,
        quarterTimes: []
    };

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.gameName = gameNameInput.value;
        localStorage.setItem('basketTrackerData', JSON.stringify(appData));
    }

    function loadData() {
        const storedData = localStorage.getItem('basketTrackerData');
        if (storedData) {
            appData = JSON.parse(storedData);
            // Varmistetaan, että Date-objektit ovat Date-objekteja deserialisoinnin jälkeen
            if (appData.startTime) appData.startTime = new Date(appData.startTime);
            if (appData.endTime) appData.endTime = new Date(appData.endTime);
            if (appData.lastPauseStartTime) appData.lastPauseStartTime = new Date(appData.lastPauseStartTime);
            appData.quarterTimes = appData.quarterTimes.map(t => t ? new Date(t) : null);
            appData.gameHistory.forEach(event => {
                if (event.timestamp) event.timestamp = new Date(event.timestamp);
            });
             // Varmistetaan, että oletusarvot ovat olemassa, jos niitä ei löydy tallennetusta datasta
            appData.isGamePaused = appData.isGamePaused || false;
            appData.lastPauseStartTime = appData.lastPauseStartTime || null;
            appData.players.forEach(p => {
                p.fouledOut = p.fouledOut || false;
            });
        }
        gameNameInput.value = appData.gameName || "";
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
                id: `p_${Date.now()}`,
                name,
                number,
                onCourt: false,
                points: 0,
                fouls: 0,
                assists: 0,
                rebounds: 0,
                fouledOut: false // UUSI
            });
            playerNameInput.value = '';
            playerNumberInput.value = '';
            saveData();
            renderPlayers();
            renderGamePlayerList();
        } else {
            alert('Syötä pelaajan nimi ja numero.');
        }
    });

    function renderPlayers() {
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            playerListDiv.innerHTML = '<p>Ei pelaajia. Lisää pelaajia yllä.</p>';
            return;
        }
        appData.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
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
                renderPlayers();
                renderGamePlayerList();
            });
        });
    }

    function renderGamePlayerList() {
        gamePlayerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            gamePlayerListDiv.innerHTML = '<p>Lisää pelaajia ensin Pelaajasyöttö-näkymässä.</p>';
            return;
        }
        appData.players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.onCourt ? 'on-court' : 'on-bench'} ${player.fouledOut ? 'fouled-out' : ''}`;
            
            let fouledOutIndicator = player.fouledOut ? '<span class="player-fouled-out-indicator">POIS PELISTÄ (5 VIRHETTÄ)</span>' : '';
            let disabledAttribute = player.fouledOut ? 'disabled' : '';

            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name} (#${player.number})</h3>
                    ${fouledOutIndicator}
                </div>
                <span class="player-stats">P: ${player.points} | V: ${player.fouls} | S: ${player.assists} | L: ${player.rebounds}</span>
                <div class="player-actions">
                    <button class="toggle-status-btn" data-id="${player.id}" ${disabledAttribute}>
                        ${player.onCourt ? 'Penkille' : 'Kentälle'}
                    </button>
                    <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="1p" ${disabledAttribute}>+1P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="2p" ${disabledAttribute}>+2P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="3p" ${disabledAttribute}>+3P</button>
                    </div>
                    <div class="action-btn-group">
                        <button class="action-btn" data-id="${player.id}" data-action="foul" ${player.fouledOut && player.fouls >=5 ? 'disabled' : ''}>Virhe</button> 
                        <button class="action-btn" data-id="${player.id}" data-action="assist" ${disabledAttribute}>Syöttö</button>
                        <button class="action-btn" data-id="${player.id}" data-action="rebound" ${disabledAttribute}>Levypallo</button>
                    </div>
                </div>
            `;
            // Virhe-nappi on erityistapaus: sen voi antaa vaikka olisi fouledOut, jos virheitä on alle 5 (esim. tekninen virhe)
            // Mutta jos virheitä on jo 5 ja on fouledOut, sekin disabloidaan.
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
            if (!appData.gameStarted) message += "Peli ei ole alkanut.";
            else if (appData.gameEnded) message += "Peli on päättynyt.";
            else if (appData.isGamePaused) message += "Peli on tauolla.";
            alert(message);
            return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        if (player && !player.fouledOut) {
            const oldStatus = player.onCourt;
            player.onCourt = !player.onCourt;
            logEvent({
                type: 'SUBSTITUTION',
                playerId: player.id,
                playerName: player.name,
                playerNumber: player.number,
                value: { oldStatus: oldStatus, newStatus: player.onCourt },
                description: `#${player.number} ${player.name} | ${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData();
            renderGamePlayerList();
        }
    }

    function handlePlayerAction(event) {
        if (event.target.disabled) return;
        if (!appData.gameStarted || appData.gameEnded || appData.isGamePaused) {
            let message = "Toiminto ei sallittu: ";
            if (!appData.gameStarted) message += "Peli ei ole alkanut.";
            else if (appData.gameEnded) message += "Peli on päättynyt.";
            else if (appData.isGamePaused) message += "Peli on tauolla.";
            alert(message);
            return;
        }
        const playerId = event.target.dataset.id;
        const action = event.target.dataset.action;
        const player = appData.players.find(p => p.id === playerId);

        if (player) {
            if (player.fouledOut && action !== 'foul') { // Sallitaan virheen antaminen vaikka olisi fouledOut (esim. tekninen)
                 alert(`Pelaaja #${player.number} ${player.name} on poistettu pelistä virheiden takia.`);
                 return;
            }
            if (!player.onCourt && !['foul'].includes(action) ) { // Vain virheen voi antaa penkillä olevalle
                alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä.`);
                return;
            }

            let eventType = '';
            let eventValue = null;
            let eventDescriptionDetails = "";

            switch (action) {
                case '1p': eventType = 'SCORE'; eventValue = 1; player.points += 1; eventDescriptionDetails = "1p tehty"; break;
                case '2p': eventType = 'SCORE'; eventValue = 2; player.points += 2; eventDescriptionDetails = "2p tehty"; break;
                case '3p': eventType = 'SCORE'; eventValue = 3; player.points += 3; eventDescriptionDetails = "3p tehty"; break;
                case 'foul':
                    eventType = 'FOUL';
                    player.fouls += 1;
                    eventDescriptionDetails = `Virhe (${player.fouls}. henkilökohtainen)`;
                    if (player.fouls >= 5 && !player.fouledOut) {
                        player.fouledOut = true;
                        player.onCourt = false; // Automaattisesti penkille
                        eventDescriptionDetails += " - Poistettu pelistä!";
                         // Lisätään erillinen logi penkille siirrosta, jos se tapahtuu automaattisesti
                        logEvent({
                            type: 'SUBSTITUTION',
                            playerId: player.id, playerName: player.name, playerNumber: player.number,
                            value: { oldStatus: true, newStatus: false, reason: 'fouled_out' },
                            description: `#${player.number} ${player.name} | Penkille (5 virhettä)`
                        });
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            
            logEvent({
                type: eventType,
                playerId: player.id,
                playerName: player.name,
                playerNumber: player.number,
                value: eventValue,
                description: `#${player.number} ${player.name} | ${eventDescriptionDetails}`
            });
            saveData();
            renderGamePlayerList();
        }
    }

    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndName = false) {
        appData.gameHistory = [];
        appData.gameStarted = false;
        appData.gameEnded = false;
        appData.isGamePaused = false;
        appData.lastPauseStartTime = null;
        appData.currentQuarter = 0; // Takaisin pelinvalmisteluun
        appData.startTime = null;
        appData.endTime = null;
        appData.quarterTimes = [];

        appData.players.forEach(player => {
            player.onCourt = false;
            player.points = 0;
            player.fouls = 0;
            player.assists = 0;
            player.rebounds = 0;
            player.fouledOut = false;
        });
        if (!keepPlayersAndName) {
            appData.players = [];
            appData.gameName = "";
            gameNameInput.value = "";
        }
    }
    
    startGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0) {
            alert("Lisää pelaajia ennen pelin aloittamista.");
            return;
        }
        if (appData.gameStarted && !appData.gameEnded) {
            alert("Peli on jo käynnissä.");
            return;
        }
        
        // Jos aloitetaan kokonaan uusi peli edellisen päätyttyä, tai jos ei ole aloitettu mutta historiaa on (clearGameHistoryn jäljiltä)
        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) { 
            resetGameStatsAndState(true); // Säilytetään pelaajat ja nimi
        }

        appData.gameStarted = true;
        appData.gameEnded = false;
        appData.isGamePaused = false;
        appData.startTime = new Date();
        appData.currentQuarter = 1;
        appData.quarterTimes = [appData.startTime];
        logEvent({ type: 'GAME_EVENT', description: "Peli alkoi" });
        saveData();
        renderAll();
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded || appData.isGamePaused) return;
        if (appData.currentQuarter < 4) {
            appData.currentQuarter++;
            appData.quarterTimes.push(new Date());
            logEvent({ type: 'GAME_EVENT', description: `Jakso ${appData.currentQuarter} alkoi` });
            saveData();
            renderAll();
        } else {
            alert("Peli on jo viimeisellä jaksolla. Lopeta peli.");
        }
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        if (appData.isGamePaused) { // Jos peli on paussilla, jatketaan sitä ensin
            toggleGamePause();
        }
        appData.gameEnded = true;
        appData.endTime = new Date();
        logEvent({ type: 'GAME_EVENT', description: "Peli päättyi" });
        saveData();
        renderAll();
    });

    togglePauseBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        toggleGamePause();
    });

    function toggleGamePause() {
        appData.isGamePaused = !appData.isGamePaused;
        if (appData.isGamePaused) {
            appData.lastPauseStartTime = new Date();
            logEvent({ type: 'PAUSE', description: "Pelikatko alkoi" });
        } else {
            const pauseEndTime = new Date();
            const pauseDuration = appData.lastPauseStartTime ? Math.round((pauseEndTime - appData.lastPauseStartTime) / 1000) : 0;
            logEvent({ type: 'RESUME', description: `Peli jatkuu (katko kesti ${pauseDuration}s)` });
            appData.lastPauseStartTime = null;
        }
        saveData();
        renderAll();
    }
    
    function updateGameControls() {
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        nextQuarterBtn.disabled = !appData.gameStarted || appData.gameEnded || appData.currentQuarter === 4 || appData.isGamePaused;
        endGameBtn.disabled = !appData.gameStarted || appData.gameEnded;
        togglePauseBtn.disabled = !appData.gameStarted || appData.gameEnded;
    }
    
    function updatePauseButtonState() {
        togglePauseBtn.textContent = appData.isGamePaused ? "Jatka Peliä" : "Aloita Pelikatko";
        if (appData.isGamePaused) {
             togglePauseBtn.style.backgroundColor = "var(--accent-color-action)"; // Korostus kun paussilla
        } else {
            togglePauseBtn.style.backgroundColor = ""; // Palauta oletusväri
        }
    }

    function updateQuarterDisplay() {
        const quarterText = appData.currentQuarter > 0 ? `Q${appData.currentQuarter}` : "Q1";
        nextQuarterBtn.textContent = `Seuraava Jakso (${quarterText})`;
        if (appData.currentQuarter === 4) {
            nextQuarterBtn.textContent = `Viimeinen Jakso (Q4)`;
        }
         if (!appData.gameStarted || appData.currentQuarter === 0) {
            nextQuarterBtn.textContent = "Seuraava Jakso (Q1)";
        }
    }

    function updateCurrentGameNameDisplay() {
        const nameToShow = appData.gameName && appData.gameName.trim() !== "" ? appData.gameName.trim() : "Pelin Seuranta";
        currentGameNameDisplay.textContent = nameToShow;
    }
    gameNameInput.addEventListener('input', () => {
        appData.gameName = gameNameInput.value;
        updateCurrentGameNameDisplay();
        saveData();
    });

    // --- HISTORIA ---
    function logEvent(eventData) { // eventData on nyt objekti
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const fullEventData = {
            id: generateEventId(),
            timestamp: timestamp,
            quarter: getCurrentQuarterForLog(),
            ...eventData // Yhdistää annetut tiedot (type, playerId, value, description jne.)
        };

        // Varmistetaan, että description on olemassa
        if (!fullEventData.description) {
            let desc = "";
            if (fullEventData.playerId) {
                const player = appData.players.find(p => p.id === fullEventData.playerId);
                if (player) {
                    desc += `#${player.number} ${player.name} | `;
                }
            }
            // Yritetään päätellä kuvaus tyypin perusteella, jos sitä ei ole annettu
            switch (fullEventData.type) {
                case 'SCORE': desc += `${fullEventData.value}p tehty`; break;
                case 'FOUL': desc += `Virhe`; break;
                // Lisää muita tarvittaessa
                default: desc += `Tapahtuma: ${fullEventData.type}`;
            }
            fullEventData.description = desc;
        }
        
        // Korjataan descriptioniin aikaleima ja jakso, jos ne eivät ole jo siinä
        if (!fullEventData.description.startsWith(timeString)) {
             fullEventData.description = `${timeString} ${fullEventData.quarter} – ${fullEventData.description}`;
        }


        appData.gameHistory.push(fullEventData);
        renderHistory(); // Vain historia tarvitsee päivittää tässä, muutokset pelaajiin tehty jo aiemmin
        saveData(); // Tallennetaan jokaisen login jälkeen
    }

    function renderHistory() {
        gameHistoryLog.innerHTML = '';
        if (appData.gameName && appData.gameName.trim() !== "") {
            const gameNameHeader = document.createElement('div'); // Käytetään diviä flexboxia varten
            gameNameHeader.className = 'history-log-entry'; // Sama luokka kuin muilla, mutta ilman poistonappia
            gameNameHeader.innerHTML = `<p style="font-weight: bold; border-bottom: 1px solid var(--primary-color); width: 100%;">Peli: ${appData.gameName.trim()}</p>`;
            gameHistoryLog.appendChild(gameNameHeader);
        }

        if (appData.gameHistory.length === 0 && !(appData.gameName && appData.gameName.trim() !== "")) {
            gameHistoryLog.innerHTML = '<p>Ei tapahtumia vielä.</p>';
            return;
        }

        [...appData.gameHistory].reverse().forEach(event => { // Näytetään uusin ensin
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-log-entry';
            
            const p = document.createElement('p');
            p.textContent = event.description;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-history-event-btn';
            removeBtn.textContent = '-';
            removeBtn.dataset.eventId = event.id;
            removeBtn.addEventListener('click', () => removeHistoryEvent(event.id));
            
            // Älä näytä poistonappia tietyille pelin tilatapahtumille
            const nonRemovableTypes = ['GAME_EVENT', 'PAUSE', 'RESUME'];
            if (nonRemovableTypes.includes(event.type)) {
                entryDiv.appendChild(p); // Vain teksti
            } else {
                entryDiv.appendChild(p);
                entryDiv.appendChild(removeBtn);
            }
            gameHistoryLog.appendChild(entryDiv);
        });
        // gameHistoryLog.scrollTop = gameHistoryLog.scrollHeight; // Scrollaa pohjalle, jos uusin viimeisenä. Nyt uusin ylhäällä, joten ei tarvita.
    }
    
    function removeHistoryEvent(eventId) {
        if (!confirm("Haluatko varmasti poistaa tämän tapahtuman? Tätä ei voi kumota.")) {
            return;
        }

        const eventIndex = appData.gameHistory.findIndex(event => event.id === eventId);
        if (eventIndex === -1) {
            console.error("Poistettavaa tapahtumaa ei löytynyt:", eventId);
            return;
        }

        const eventToRemove = appData.gameHistory[eventIndex];
        const player = eventToRemove.playerId ? appData.players.find(p => p.id === eventToRemove.playerId) : null;

        if (player) {
            switch (eventToRemove.type) {
                case 'SCORE':
                    if (typeof eventToRemove.value === 'number') {
                        player.points -= eventToRemove.value;
                        if (player.points < 0) player.points = 0;
                    }
                    break;
                case 'FOUL':
                    player.fouls -= 1;
                    if (player.fouls < 0) player.fouls = 0;
                    // Jos pelaaja oli fouledOut tämän virheen takia JA virheet laskevat alle 5
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        // Pelaajaa ei automaattisesti palauteta kentälle, valmentaja voi tehdä sen erikseen
                        // Mutta logataan tämä muutos
                         logEvent({
                            type: 'GAME_EVENT', // Tai jokin sopivampi tyyppi
                            playerId: player.id, playerName: player.name, playerNumber: player.number,
                            description: `#${player.number} ${player.name} | Ei enää 'fouled out' tilassa (virheen poisto)`
                        });
                    }
                    break;
                case 'ASSIST':
                    player.assists -= 1;
                    if (player.assists < 0) player.assists = 0;
                    break;
                case 'REBOUND':
                    player.rebounds -= 1;
                    if (player.rebounds < 0) player.rebounds = 0;
                    break;
                case 'SUBSTITUTION':
                    // Kuten aiemmin päätetty: substituution poisto historiasta ei automaattisesti
                    // muuta pelaajan onCourt-tilaa monimutkaisuuden välttämiseksi.
                    // Käyttäjän tulee manuaalisesti korjata onCourt-tila tarvittaessa.
                    // Voitaisiin logata, että substituutio poistettiin.
                    console.log(`Substituutio-tapahtuma ${eventToRemove.id} poistettu. Pelaajan onCourt-tilaa ei muutettu automaattisesti.`);
                    break;
            }
        }
        
        appData.gameHistory.splice(eventIndex, 1);
        saveData();
        renderAll(); // Päivitetään kaikki näkymät
    }


    copyHistoryBtn.addEventListener('click', () => {
        let historyText = "";
        if (appData.gameName && appData.gameName.trim() !== "") {
            historyText += `Peli: ${appData.gameName.trim()}\n--------------------\n`;
        }
        // Kopioidaan aikajärjestyksessä (vanhin ensin)
        [...appData.gameHistory].forEach(event => { // Ei käännetä tässä, koska alkuperäinen on jo oikein päin
            historyText += event.description + '\n';
        });

        if (navigator.clipboard) {
            navigator.clipboard.writeText(historyText.trim())
                .then(() => alert('Historia kopioitu leikepöydälle!'))
                .catch(err => alert('Kopiointi epäonnistui: ' + err));
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = historyText.trim();
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Historia kopioitu leikepöydälle!');
            } catch (err) {
                alert('Kopiointi epäonnistui: ' + err);
            }
            document.body.removeChild(textArea);
        }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot? Pelaajia ja pelin nimeä ei poisteta.")) {
            resetGameStatsAndState(true); // Säilytetään pelaajat ja nimi
            logEvent({ type: 'GAME_EVENT', description: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData();
            renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot nollattu.");
        }
    });

    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
        [setupView, gameView, historyView].forEach(view => {
            if (view.id === viewId) {
                view.classList.remove('hidden');
            } else {
                view.classList.add('hidden');
            }
        });
        if (viewId === 'gameView') {
            renderGamePlayerList(); // Varmistetaan tuore pelaajalista
            updateCurrentGameNameDisplay();
        }
        if (viewId === 'historyView') {
            renderHistory(); // Varmistetaan tuore historia
        }
    }

    navigateToGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0) {
            alert("Lisää vähintään yksi pelaaja ennen pelin seurantaan siirtymistä.");
            return;
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
