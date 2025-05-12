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

    const homeTeamNameInput = document.getElementById('homeTeamNameInput'); // UUSI
    const awayTeamNameInput = document.getElementById('awayTeamNameInput'); // UUSI
    const maxPlayersOnCourtSetting = document.getElementById('maxPlayersOnCourtSetting'); 
    const currentGameNameDisplay = document.getElementById('currentGameNameDisplay');
    const homeScoreDisplay = document.getElementById('homeScoreDisplay'); // UUSI
    const opponentScoreDisplay = document.getElementById('opponentScoreDisplay'); // UUSI
    const homeFoulsDisplay = document.getElementById('homeFoulsDisplay'); // UUSI

    const instructionsModal = document.getElementById('instructionsModal');
    const openInstructionsLink = document.getElementById('openInstructionsLink');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');

    const setupView = document.getElementById('setupView');
    const gameView = document.getElementById('gameView');
    const historyView = document.getElementById('historyView');
    const reportView = document.getElementById('reportView'); // UUSI
    const reportGameNameDisplay = document.getElementById('reportGameNameDisplay'); // UUSI
    const reportContent = document.getElementById('reportContent'); // UUSI


    const navigateToGameBtn = document.getElementById('navigateToGameBtn');
    const navigateToSetupBtn = document.getElementById('navigateToSetupBtn');
    const navigateToHistoryBtn = document.getElementById('navigateToHistoryBtn');
    const navigateToReportBtn = document.getElementById('navigateToReportBtn'); // UUSI
    const backToGameFromHistoryBtnReport = document.getElementById('backToGameFromHistoryBtnReport');
    const backToGameFromReportBtn = document.getElementById('backToGameFromReportBtn'); // UUSI


    let appData = {
        homeTeamName: "Kobrat", // UUSI
        awayTeamName: "",       // UUSI
        players: [],
        gameHistory: [], 
        gameStarted: false, gameEnded: false, isGamePaused: false, 
        lastPauseStartTime: null, currentQuarter: 0, 
        maxPlayersOnCourt: 5, 
        opponentScore: 0,       // UUSI
        startTime: null, endTime: null, quarterTimes: []
        // Peliaikaan liittyvät kentät lisätään myöhemmin pelaajaobjekteihin ja appDataan
    };

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue"; // Varmistetaan oletusnimi
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue"; // Varmistetaan oletusnimi
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value); 
        localStorage.setItem('basketTrackerData_v1.2', JSON.stringify(appData)); 
    }

    function loadData() {
        const storedData = localStorage.getItem('basketTrackerData_v1.2'); 
        if (storedData) {
            const loaded = JSON.parse(storedData);
            // Yhdistetään ladattu data oletusrakenteeseen puuttuvien kenttien varalta
            appData = { ...appData, ...loaded }; 

            if (appData.startTime) appData.startTime = new Date(appData.startTime);
            if (appData.endTime) appData.endTime = new Date(appData.endTime);
            if (appData.lastPauseStartTime) appData.lastPauseStartTime = new Date(appData.lastPauseStartTime);
            appData.quarterTimes = appData.quarterTimes.map(t => t ? new Date(t) : null);
            if (appData.gameHistory && Array.isArray(appData.gameHistory)) {
                appData.gameHistory.forEach(event => {
                    if (event.timestamp) event.timestamp = new Date(event.timestamp);
                });
            } else {
                appData.gameHistory = []; // Varmistetaan, että on taulukko
            }
            appData.players.forEach(p => { // Varmistetaan pelaajien oletuskentät
                p.fouledOut = p.fouledOut || false;
                p.points = p.points || 0;
                p.fouls = p.fouls || 0;
                p.assists = p.assists || 0;
                p.rebounds = p.rebounds || 0;
                p.onCourt = p.onCourt || false;
            });
        }
        homeTeamNameInput.value = appData.homeTeamName || "Kobrat";
        awayTeamNameInput.value = appData.awayTeamName || "";
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString(); 
        renderAll();
    }

    function renderAll() {
        renderPlayers();
        renderGamePlayerList();
        renderHistory();
        updateGameControls();
        updateHeaderDisplays(); // Yhdistetty päivitysfunktio headerille
        updatePauseButtonState();
        // renderReportView(); // Kutsutaan tarvittaessa kun raporttinäkymä on aktiivinen
    }
    
    function updateHeaderDisplays() { // UUSI funktio
        updateCurrentGameNameDisplay();
        updateScoreDisplay();
        updateFoulDisplay();
        updateQuarterDisplay(); // Siirretty tänne, koska nextQuarterBtn teksti riippuu pelin tilasta
    }


    // --- APUFUNKTIOT ---
    function generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Pidennetty hieman satunnaisuutta
    }

    function getCurrentQuarterForLog() {
        if (!appData.gameStarted || appData.currentQuarter === 0) return "Ennen peliä";
        if (appData.gameEnded && appData.currentQuarter === 4) return "Pelin jälkeen"; // Tarkennus
        if (appData.isGamePaused && appData.quarterTimes.length === appData.currentQuarter && appData.currentQuarter > 0) return `Jakso Q${appData.currentQuarter} (Tauko)`; // Jaksojen välinen tauko
        return `Q${appData.currentQuarter}`;
    }


    // --- PELAAJIEN HALLINTA ---
    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        const number = playerNumberInput.value.trim();
        if (name && number) {
            if (appData.players.find(p => p.number === number)) {
                alert('Pelaaja tällä numerolla on jo olemassa!'); return;
            }
            appData.players.push({
                id: `p_${Date.now()}`, name, number, onCourt: false,
                points: 0, fouls: 0, assists: 0, rebounds: 0, fouledOut: false
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData();
            renderPlayers(); renderGamePlayerList();
        } else { alert('Syötä pelaajan nimi ja numero.'); }
    });

    function renderPlayers() { 
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            playerListDiv.innerHTML = '<p>Ei pelaajia. Lisää pelaajia yllä.</p>'; return;
        }
        // Järjestetään pelaajat numeron mukaan setup-näkymässä
        const sortedSetupPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));

        sortedSetupPlayers.forEach(player => {
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
                renderPlayers(); renderGamePlayerList(); updateHeaderDisplays(); // Päivitä myös laskurit, jos pelaaja poistetaan
            });
        });
    }

    function renderGamePlayerList() {
        gamePlayerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            gamePlayerListDiv.innerHTML = '<p>Lisää pelaajia ensin Asetukset-näkymässä.</p>'; return;
        }
        const sortedPlayers = [...appData.players].sort((a, b) => {
            if (a.onCourt !== b.onCourt) { return b.onCourt - a.onCourt; }
            return parseInt(a.number) - parseInt(b.number);
        });
        sortedPlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.onCourt ? 'on-court' : 'on-bench'} ${player.fouledOut ? 'fouled-out' : ''}`;
            let fouledOutIndicator = player.fouledOut ? '<span class="player-fouled-out-indicator">5 VIRHETTÄ</span>' : '';
            let toggleBtnDisabled = player.fouledOut ? 'disabled' : '';
            let actionButtonsHTML = '';
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
            } 
            card.innerHTML = `
                <div class="player-info"><h3>${player.name} (#${player.number})</h3>${fouledOutIndicator}</div>
                <span class="player-stats">P: ${player.points} | V: ${player.fouls} | S: ${player.assists} | L: ${player.rebounds}</span>
                <div class="player-actions">
                    <button class="toggle-status-btn" data-id="${player.id}" ${toggleBtnDisabled}>${player.onCourt ? 'Penkille' : 'Kentälle'}</button>
                    ${actionButtonsHTML}
                </div>`;
            gamePlayerListDiv.appendChild(card);
        });
        document.querySelectorAll('.toggle-status-btn').forEach(b => b.addEventListener('click', handleToggleStatus));
        document.querySelectorAll('.action-btn').forEach(b => b.addEventListener('click', handlePlayerAction));
    }

    function handleToggleStatus(event) {
        if (event.target.disabled) return;
        // Peli voi olla paussilla (esim. jakson vaihto), mutta vaihtoja voi tehdä
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Toiminto ei sallittu: Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        if (player && !player.fouledOut) {
            if (!player.onCourt) { 
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa! Ota ensin joku pois kentältä.`); return;
                }
            }
            const oldStatus = player.onCourt;
            player.onCourt = !player.onCourt;
            logEvent({
                type: 'SUBSTITUTION', playerId: player.id,
                descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData(); renderGamePlayerList(); renderHistory();
        }
    }

    function handlePlayerAction(event) {
        if (event.target.disabled) return;
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Toiminto ei sallittu: Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const action = event.target.dataset.action;
        const player = appData.players.find(p => p.id === playerId);
        if (player) {
            const allowedDuringPause = ['1p', '2p', '3p', 'foul'];
            if (appData.isGamePaused && !allowedDuringPause.includes(action)) {
                alert("Toiminto ei sallittu pelikatkon aikana (paitsi pisteet ja virheet)."); return;
            }
            // Toimintonapit piilotetaan, jos ei kentällä, mutta virhe on poikkeus
            if (!player.onCourt && action !== 'foul') {
                 alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä.`); return;
            }
            if (player.fouledOut && player.fouls >= 5 && action === 'foul') {
                 alert(`Pelaaja #${player.number} ${player.name} on jo poistettu pelistä 5 virheen takia.`); return;
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
                        player.fouledOut = true; const wasOnCourt = player.onCourt; player.onCourt = false; 
                        eventDescriptionDetails += " - Poistettu pelistä (5 virhettä)!";
                        if(wasOnCourt){ 
                             logEvent({ type: 'SUBSTITUTION', playerId: player.id, descriptionDetails: `Penkille (5 virhettä)` });
                        }
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            logEvent({ type: eventType, playerId: player.id, value: eventValue, descriptionDetails: eventDescriptionDetails });
            saveData(); renderGamePlayerList(); updateHeaderDisplays(); renderHistory();
        }
    }

    // --- VASTUSTAJAN PISTEIDEN KÄSITTELY ---
    document.querySelectorAll('.opponent-score-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!appData.gameStarted || appData.gameEnded) {
                 alert("Peli ei ole käynnissä tai on jo päättynyt."); return;
            }
            // Sallitaan vastustajan pisteiden kirjaus myös katkolla
            const points = parseInt(e.target.dataset.points);
            appData.opponentScore += points;
            logEvent({
                type: 'OPPONENT_SCORE',
                value: points,
                descriptionMaster: `Vastustaja +${points}p` // Käytetään masteria, koska ei liity pelaajaan
            });
            saveData();
            updateScoreDisplay();
            renderHistory();
        });
    });


    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) { 
        appData.gameHistory = [];
        appData.gameStarted = false; appData.gameEnded = false; appData.isGamePaused = false;
        appData.lastPauseStartTime = null; appData.currentQuarter = 0; 
        appData.opponentScore = 0; // Nollaa myös vastustajan pisteet
        appData.startTime = null; appData.endTime = null; appData.quarterTimes = [];
        appData.players.forEach(p => {
            p.onCourt = false; p.points = 0; p.fouls = 0;
            p.assists = 0; p.rebounds = 0; p.fouledOut = false;
        });
        if (!keepPlayersAndSettings) {
            appData.players = []; 
            appData.homeTeamName = "Kobrat"; homeTeamNameInput.value = "Kobrat";
            appData.awayTeamName = ""; awayTeamNameInput.value = "";
            appData.maxPlayersOnCourt = 5; maxPlayersOnCourtSetting.value = "5"; 
        }
    }
    
    startGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0) { alert("Lisää pelaajia."); return; }
        if (appData.gameStarted && !appData.gameEnded) { alert("Peli on jo käynnissä."); return; }
        
        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) { 
            resetGameStatsAndState(true); 
        }
        appData.gameStarted = true; appData.gameEnded = false; appData.isGamePaused = false;
        appData.startTime = new Date(); 
        // Seuraava jakso -nappi hoitaa Q1:n aloituslogin
        nextQuarterBtn.disabled = false; // Aktivoi "Aloita Q1" -nappi
        nextQuarterBtn.click(); // Klikataan automaattisesti "Aloita Q1"
        // Yllä oleva korvaa suoran Q1:n aloituksen tässä.
        // appData.currentQuarter = 1;
        // appData.quarterTimes = [appData.startTime];
        // logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi" });
        // logEvent({ type: 'QUARTER_START', descriptionMaster: "Jakso Q1 alkoi" });

        saveData(); renderAll();
        startGameBtn.disabled = true; // Disabloidaan heti
        endGameBtn.disabled = false;
        togglePauseBtn.disabled = false;
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;

        if (appData.currentQuarter === 0) { // Peliä ei ole vielä aloitettu kunnolla, aloitetaan Q1
            appData.currentQuarter = 1;
            appData.isGamePaused = false; // Varmistetaan, että peli ei ole paussilla
            appData.quarterTimes[0] = new Date(); // Q1 aloitusaika
            if(appData.gameHistory.length === 0 || appData.gameHistory[appData.gameHistory.length-1]?.type !== 'GAME_EVENT'){
                 logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi" });
            }
            logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
        } else if (appData.isGamePaused) { // Jakso on päättynyt (katkolla), aloitetaan seuraava
            if (appData.currentQuarter < 4) {
                appData.currentQuarter++;
                appData.isGamePaused = false; // Peli jatkuu
                appData.quarterTimes[appData.currentQuarter - 1] = new Date(); // Seuraavan jakson aloitusaika
                logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            } else {
                alert("Peli on jo viimeisellä jaksolla. Lopeta peli."); return;
            }
        } else { // Jakso on käynnissä, päätetään se
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
            appData.isGamePaused = true; // Siirrytään katkolle jakson jälkeen
            appData.lastPauseStartTime = new Date(); // Aloitetaan "virallinen" katko tässä
        }
        saveData(); renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        
        // Jos viimeinen jakso oli käynnissä, päätetään se ensin
        if (!appData.isGamePaused && appData.currentQuarter > 0 && appData.currentQuarter <= 4) {
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
        }
        // Varmistetaan, että peli ei ole enää paussilla, kun se lopetetaan
        appData.isGamePaused = false; 
        appData.gameEnded = true; appData.endTime = new Date();
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli päättyi" });
        saveData(); renderAll();
    });

    togglePauseBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        // Estetään manuaalinen katko, jos ollaan jaksojen välisellä automaattisella katkolla
        if (appData.isGamePaused && appData.quarterTimes.length === appData.currentQuarter && appData.currentQuarter > 0 && appData.currentQuarter < 4) {
            alert("Peli on jaksojen välisellä tauolla. Aloita seuraava jakso.");
            return;
        }
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
        const disableAllNonStart = !appData.gameStarted || appData.gameEnded;
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        // nextQuarterBtn:n tila hoidetaan updateQuarterDisplay-funktiossa
        endGameBtn.disabled = disableAllNonStart;
        togglePauseBtn.disabled = disableAllNonStart;

        // Jos peli on päättynyt, disabloidaan myös nextQuarterBtn
        if (appData.gameEnded) {
            nextQuarterBtn.disabled = true;
        }
    }
    
    function updatePauseButtonState() {
        togglePauseBtn.textContent = appData.isGamePaused ? "Jatka Peliä" : "Aloita Katko";
        // Estetään napin käyttö, jos ollaan automaattisella jaksonvaihtokatkolla
        const isOnAutomaticQuarterBreak = appData.isGamePaused && 
                                        appData.quarterTimes.length === appData.currentQuarter && 
                                        appData.currentQuarter > 0 && appData.currentQuarter < 4;
        togglePauseBtn.disabled = !appData.gameStarted || appData.gameEnded || isOnAutomaticQuarterBreak;

        if (appData.isGamePaused && !isOnAutomaticQuarterBreak) { // Korostetaan vain manuaalista katkoa
             togglePauseBtn.style.backgroundColor = "var(--accent-color-action)"; 
        } else {
            togglePauseBtn.style.backgroundColor = ""; 
        }
    }

    function updateQuarterDisplay() { // Uusi logiikka jaksonvaihtonapille
        if (!appData.gameStarted || appData.currentQuarter === 0) {
            nextQuarterBtn.textContent = `Aloita Q1`;
            nextQuarterBtn.disabled = !appData.gameStarted; // Aktiivinen vain jos peli aloitettu (startGameBtn klikattu)
        } else if (appData.gameEnded) {
            nextQuarterBtn.textContent = `Peli Päättynyt`;
            nextQuarterBtn.disabled = true;
        } else if (appData.isGamePaused) { // Jakso on päättynyt, odotetaan seuraavan alkua
            if (appData.currentQuarter < 4) {
                nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`;
                nextQuarterBtn.disabled = false;
            } else { // Q4 on päättynyt
                nextQuarterBtn.textContent = `Päätä Peli`; // Tai voisi olla disabloitu ja vain End Game toimii
                nextQuarterBtn.disabled = true; // Tai ohjaa endGameBtn:n toimintoon
            }
        } else { // Jakso on käynnissä
            nextQuarterBtn.textContent = `Päätä Q${appData.currentQuarter}`;
            nextQuarterBtn.disabled = false;
        }
    }

    function updateCurrentGameNameDisplay() {
        const home = appData.homeTeamName || "Koti";
        const away = appData.awayTeamName || "Vieras";
        currentGameNameDisplay.textContent = `${home} - ${away}`;
    }

    function updateScoreDisplay() { // UUSI
        const homeScore = appData.players.reduce((sum, player) => sum + player.points, 0);
        homeScoreDisplay.textContent = homeScore;
        opponentScoreDisplay.textContent = appData.opponentScore;
    }

    function updateFoulDisplay() { // UUSI
        const homeFouls = appData.players.reduce((sum, player) => sum + player.fouls, 0);
        homeFoulsDisplay.textContent = homeFouls;
    }

    homeTeamNameInput.addEventListener('input', saveData); 
    awayTeamNameInput.addEventListener('input', saveData); 
    maxPlayersOnCourtSetting.addEventListener('change', saveData); 

    // --- HISTORIA ---
    function logEvent(eventData) { 
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let finalDescription = eventData.descriptionMaster || ""; 
        if (!finalDescription) { 
            let playerPrefix = "";
            if (eventData.playerId) {
                const player = appData.players.find(p => p.id === eventData.playerId) || 
                               appData.gameHistory.find(ev => ev.playerId === eventData.playerId && ev.playerName); // Yritä löytää nimi aiemmasta historiasta, jos pelaaja poistettu
                if (player) {
                    playerPrefix = `#${eventData.playerNumber || player.playerNumber || player.number} ${eventData.playerName || player.playerName || player.name} | `;
                } else if (eventData.playerNumber && eventData.playerName) {
                    playerPrefix = `#${eventData.playerNumber} ${eventData.playerName} | `;
                }
            }
            finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${playerPrefix}${eventData.descriptionDetails || eventData.type || 'Tuntematon tapahtuma'}`;
        } else { 
            if (!finalDescription.includes(timeString) && (appData.gameStarted || ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END'].includes(eventData.type))) {
                 finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${finalDescription}`;
            }
        }
        const fullEventData = {
            id: generateEventId(), timestamp: timestamp, quarter: getCurrentQuarterForLog(), 
            description: finalDescription, ...eventData 
        };
        delete fullEventData.descriptionDetails; delete fullEventData.descriptionMaster; 
        appData.gameHistory.push(fullEventData);
        // renderHistory(); // Ei kutsuta tässä, vaan pääfunktiossa, joka kutsuu logEventiä
        // saveData(); // Ei kutsuta tässä
    }

    function renderHistory() {
        gameHistoryLog.innerHTML = '';
        const gameTitle = (appData.homeTeamName || "Koti") + " - " + (appData.awayTeamName || "Vieras");
        if (gameTitle !== "Koti - Vieras") {
            const gameNameHeader = document.createElement('div'); 
            gameNameHeader.className = 'history-log-entry'; 
            gameNameHeader.innerHTML = `<p style="font-weight: bold; border-bottom: 1px solid var(--primary-color); width: 100%; text-align: center;">Peli: ${gameTitle}</p>`;
            gameHistoryLog.appendChild(gameNameHeader);
        }

        if (appData.gameHistory.length === 0 && !(appData.homeTeamName && appData.awayTeamName)) {
            gameHistoryLog.innerHTML = '<p>Ei tapahtumia vielä.</p>'; return;
        }
        [...appData.gameHistory].reverse().forEach(event => { 
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-log-entry';
            const p = document.createElement('p');
            p.textContent = event.description;
            entryDiv.appendChild(p);
            const nonRemovableTypes = ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END', 'OPPONENT_SCORE'];
            if (!nonRemovableTypes.includes(event.type) && event.type) { 
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn'; removeBtn.textContent = '-';
                removeBtn.dataset.eventId = event.id;
                removeBtn.addEventListener('click', () => removeHistoryEvent(event.id));
                entryDiv.appendChild(removeBtn);
            } else if (event.type === 'OPPONENT_SCORE') { // Erillinen poisto vastustajan pisteille
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn opponent-event'; // Oma luokka, jos tarvitaan eri tyyliä
                removeBtn.textContent = '-V'; // Erottuva teksti
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

        if (player) { // OMAN PELAAJAN TAPAHTUMAT
            switch (eventToRemove.type) {
                case 'SCORE': if (typeof eventToRemove.value === 'number') { player.points = Math.max(0, player.points - eventToRemove.value); } break;
                case 'FOUL':
                    player.fouls = Math.max(0, player.fouls - 1);
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        logEvent({ type: 'GAME_EVENT', playerId: player.id, descriptionMaster: `#${player.number || eventToRemove.playerNumber} ${player.name || eventToRemove.playerName} | Ei enää 'fouled out' (virheen poisto)` });
                    } break;
                case 'ASSIST': player.assists = Math.max(0, player.assists - 1); break;
                case 'REBOUND': player.rebounds = Math.max(0, player.rebounds - 1); break;
            }
        } else if (eventToRemove.type === 'OPPONENT_SCORE') { // VASTUSTAJAN PISTEET
            if (typeof eventToRemove.value === 'number') {
                appData.opponentScore = Math.max(0, appData.opponentScore - eventToRemove.value);
            }
        }
        appData.gameHistory.splice(eventIndex, 1);
        saveData(); renderAll(); 
    }

    copyHistoryBtn.addEventListener('click', () => {
        let historyText = `${appData.homeTeamName || "Koti"} - ${appData.awayTeamName || "Vieras"}\n`;
        historyText += `Pelaajia kentällä: ${appData.maxPlayersOnCourt} vs ${appData.maxPlayersOnCourt}\n`;
        const homeScore = appData.players.reduce((sum, p) => sum + p.points, 0);
        historyText += `Lopputulos: ${homeScore} - ${appData.opponentScore}\n--------------------\n`;
        appData.gameHistory.forEach(event => { historyText += event.description + '\n'; }); 
        if (navigator.clipboard) { /* ... */ } else { /* Fallback */ }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot? Pelaajia, joukkueiden nimiä ja asetuksia ei poisteta.")) {
            resetGameStatsAndState(true); 
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData(); renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot nollattu.");
        }
    });

    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) { 
        openInstructionsLink.addEventListener('click', (e) => { e.preventDefault(); instructionsModal.classList.remove('hidden'); });
        closeInstructionsBtn.addEventListener('click', () => { instructionsModal.classList.add('hidden'); });
        instructionsModal.addEventListener('click', (e) => { if (e.target === instructionsModal) { instructionsModal.classList.add('hidden'); } });
    } else { console.warn("Ohjeiden popup-elementtejä ei löytynyt."); }

    function showView(viewId) {
        [setupView, gameView, historyView, reportView].forEach(view => { // Lisätty reportView
            view.classList.toggle('hidden', view.id !== viewId);
        });
        if (viewId === 'gameView') { renderGamePlayerList(); updateHeaderDisplays(); updatePauseButtonState(); updateGameControls(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView') { /* renderReportView(); */ reportGameNameDisplay.textContent = `${appData.homeTeamName} - ${appData.awayTeamName}`; } // Kutsutaan renderReportView myöhemmin
    }

    navigateToGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0 && appData.homeTeamName.toLowerCase() === "kobrat") { // Vain jos oletusnimi, muuten voidaan mennä ilman pelaajia jos seurataan vain vastustajaa tms.
            alert("Lisää vähintään yksi pelaaja kotijoukkueelle."); return;
        }
        if (!appData.homeTeamName || !appData.awayTeamName) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView')); // UUSI
    backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    backToGameFromReportBtn.addEventListener('click', () => showView('gameView')); // UUSI

    loadData();
    showView('setupView');
});