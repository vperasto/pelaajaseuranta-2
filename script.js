document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTIT ---
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

    const homeTeamNameInput = document.getElementById('homeTeamNameInput'); 
    const awayTeamNameInput = document.getElementById('awayTeamNameInput'); 
    const maxPlayersOnCourtSetting = document.getElementById('maxPlayersOnCourtSetting'); 
    const currentGameNameDisplay = document.getElementById('currentGameNameDisplay');
    const homeScoreDisplay = document.getElementById('homeScoreDisplay'); 
    const opponentScoreDisplay = document.getElementById('opponentScoreDisplay'); 
    const homeFoulsDisplay = document.getElementById('homeFoulsDisplay'); 

    const instructionsModal = document.getElementById('instructionsModal');
    const openInstructionsLink = document.getElementById('openInstructionsLink');
    const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');

    const setupView = document.getElementById('setupView');
    const gameView = document.getElementById('gameView');
    const historyView = document.getElementById('historyView');
    const reportView = document.getElementById('reportView'); 
    const reportGameNameDisplay = document.getElementById('reportGameNameDisplay'); 
    const reportTableContainer = document.getElementById('reportTableContainer');
    const reportGameStatus = document.getElementById('reportGameStatus');
    const reportTotalGameTime = document.getElementById('reportTotalGameTime');
    const reportHomeScore = document.getElementById('reportHomeScore');
    const reportOpponentScore = document.getElementById('reportOpponentScore');
    const reportHomeFouls = document.getElementById('reportHomeFouls');

    const navigateToGameBtn = document.getElementById('navigateToGameBtn');
    const navigateToSetupBtn = document.getElementById('navigateToSetupBtn');
    const navigateToHistoryBtn = document.getElementById('navigateToHistoryBtn');
    const navigateToReportBtn = document.getElementById('navigateToReportBtn'); 
    const backToGameFromHistoryBtnReport = document.getElementById('backToGameFromHistoryBtnReport');
    const backToGameFromReportBtn = document.getElementById('backToGameFromReportBtn'); 

    // --- SOVELLUKSEN TILA (appData) ---
    let appData = {
        homeTeamName: "Kobrat", 
        awayTeamName: "",       
        players: [], 
        gameHistory: [], 
        gameStarted: false, gameEnded: false, isGamePaused: false, 
        lastPauseStartTime: null, 
        currentQuarter: 0, 
        maxPlayersOnCourt: 5, 
        opponentScore: 0,       
        startTime: null, endTime: null, 
        quarterStartTimes: [], 
        quarterEndTimes: [],   
        totalManualPauseDurationSeconds: 0, 
    };

    const LOCAL_STORAGE_KEY = 'basketTrackerData_v1.2';

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue"; 
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue"; 
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value); 
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData)); 
        // console.log("Data saved:", appData);
    }

    function loadData() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY); 
        if (storedData) {
            const loaded = JSON.parse(storedData);
            const defaultAppData = { // Määritellään oletusarvot tässä selkeämmin
                homeTeamName: "Kobrat", awayTeamName: "", players: [], gameHistory: [], 
                gameStarted: false, gameEnded: false, isGamePaused: false, 
                lastPauseStartTime: null, currentQuarter: 0, maxPlayersOnCourt: 5, 
                opponentScore: 0, startTime: null, endTime: null, 
                quarterStartTimes: [], quarterEndTimes: [], totalManualPauseDurationSeconds: 0,
            };
            appData = { ...defaultAppData, ...loaded }; 

            appData.startTime = loaded.startTime ? new Date(loaded.startTime) : null;
            appData.endTime = loaded.endTime ? new Date(loaded.endTime) : null;
            appData.lastPauseStartTime = loaded.lastPauseStartTime ? new Date(loaded.lastPauseStartTime) : null;
            appData.quarterStartTimes = (loaded.quarterStartTimes || []).map(t => t ? new Date(t) : null).filter(t => t);
            appData.quarterEndTimes = (loaded.quarterEndTimes || []).map(t => t ? new Date(t) : null).filter(t => t);
            appData.gameHistory = (loaded.gameHistory || []).map(event => ({
                ...event,
                timestamp: event.timestamp ? new Date(event.timestamp) : null
            }));
            appData.players = (loaded.players || []).map(p => ({
                fouledOut: false, points: 0, fouls: 0, assists: 0, rebounds: 0, onCourt: false, 
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null, 
                ...p, 
                lastTimeEnteredCourt: p.lastTimeEnteredCourt ? new Date(p.lastTimeEnteredCourt) : null,
                timeOnCourtSeconds: p.timeOnCourtSeconds || 0 // Varmistetaan, että tämä on numero
            }));
        }
        homeTeamNameInput.value = appData.homeTeamName; // Ei oletusta tässä, jotta tyhjä säilyy tyhjänä jos niin tallennettu
        awayTeamNameInput.value = appData.awayTeamName;
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString(); 
        renderAll();
    }

    function renderAll() {
        renderPlayers(); 
        renderGamePlayerList(); 
        renderHistory();
        updateGameControlsAndDisplays(); 
        if (reportView && !reportView.classList.contains('hidden')) { 
            renderReportView();
        }
    }
    
    function updateGameControlsAndDisplays() { 
        updateCurrentGameNameDisplay();
        updateScoreDisplay();
        updateFoulDisplay();
        updateQuarterButtonState(); 
        updatePauseButtonState();
        updateMainGameControlButtonsState();
    }

    // --- APUFUNKTIOT ---
    function generateEventId() { return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
    function formatTimeMMSS(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    function getCurrentQuarterForLog() {
        if (!appData.gameStarted || appData.currentQuarter === 0) return "Ennen peliä";
        
        const qIndex = appData.currentQuarter - 1;
        const quarterHasStarted = appData.quarterStartTimes[qIndex] instanceof Date;
        const quarterHasEnded = appData.quarterEndTimes[qIndex] instanceof Date;

        if (appData.isGamePaused) return `Q${appData.currentQuarter} (Katko)`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter < 4 && !appData.gameEnded) return `Tauko (ennen Q${appData.currentQuarter + 1})`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter === 4 && !appData.gameEnded) return `Pelin jälkeen (Q4)`;
        if (appData.gameEnded) return "Pelin jälkeen";
        
        return `Q${appData.currentQuarter}`;
    }

    // --- PELIAJAN LASKENTAAN LIITTYVÄT TOIMINNOT ---
    function recordPlayerTimeOnCourt(player, sessionEndTime = new Date()) {
        if (player.onCourt && player.lastTimeEnteredCourt) {
            const sessionDurationSeconds = (sessionEndTime - player.lastTimeEnteredCourt) / 1000;
            if (sessionDurationSeconds > 0) { // Lisätään aikaa vain jos se on positiivinen
                player.timeOnCourtSeconds = (player.timeOnCourtSeconds || 0) + sessionDurationSeconds;
            }
        }
        // lastTimeEnteredCourt asetetaan/nollataan vasta kun pelaajan tila *oikeasti* muuttuu tai katko/jakso hallinnoi sitä
    }

    function pauseAllPlayerTimers(pauseTime = new Date()) { 
        appData.players.forEach(p => {
            if (p.onCourt && p.lastTimeEnteredCourt) {
                const sessionDurationSeconds = (pauseTime - p.lastTimeEnteredCourt) / 1000;
                 if (sessionDurationSeconds > 0) {
                    p.timeOnCourtSeconds = (p.timeOnCourtSeconds || 0) + sessionDurationSeconds;
                }
                p.lastTimeEnteredCourt = null; // Merkitään, että "kello" on pysäytetty tälle sessiolle
            }
        });
    }

    function resumeAllPlayerTimers(resumeTime = new Date()) { 
        appData.players.forEach(p => {
            if (p.onCourt) { 
                p.lastTimeEnteredCourt = resumeTime;
            }
        });
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
                points: 0, fouls: 0, assists: 0, rebounds: 0, fouledOut: false,
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null 
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData(); renderPlayers(); renderGamePlayerList();
        } else { alert('Syötä pelaajan nimi ja numero.'); }
    });

    function renderPlayers() { 
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) { playerListDiv.innerHTML = '<p>Ei pelaajia.</p>'; return; }
        const sortedSetupPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));
        sortedSetupPlayers.forEach(player => {
            const card = document.createElement('div'); card.className = 'player-card'; 
            card.innerHTML = `<div class="player-info"><h3>${player.name} (#${player.number})</h3><button class="remove-player-btn" data-id="${player.id}">Poista</button></div>`;
            playerListDiv.appendChild(card);
        });
        document.querySelectorAll('.remove-player-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                if (confirm(`Haluatko varmasti poistaa pelaajan pysyvästi? Tämä poistaa myös pelaajan mahdolliset historiatiedot raportista.`)) {
                    // Tulevaisuudessa: poista pelaajan tapahtumat historiasta tai anonymisoi ne
                    appData.players = appData.players.filter(p => p.id !== playerId);
                    saveData(); renderPlayers(); renderGamePlayerList(); updateGameControlsAndDisplays();
                }
            });
        });
    }

    function renderGamePlayerList() {
        gamePlayerListDiv.innerHTML = '';
        if (appData.players.length === 0) { gamePlayerListDiv.innerHTML = '<p>Lisää pelaajia Asetukset-näkymässä.</p>'; return; }
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
                    </div>`;
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
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        if (player && !player.fouledOut) {
            const now = new Date();
            if (!player.onCourt) { // Mennään kentälle
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa!`); return;
                }
                player.lastTimeEnteredCourt = now;
            } else { // Tulee penkille
                recordPlayerTimeOnCourt(player, now); // Tallentaa edellisen session ajan
                player.lastTimeEnteredCourt = null; // Nollataan, koska ei enää aktiivisesti kentällä
            }
            
            player.onCourt = !player.onCourt;
            logEvent({ type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`});
            saveData(); renderAll();
        }
    }

    function handlePlayerAction(event) {
        if (event.target.disabled) return;
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const action = event.target.dataset.action;
        const player = appData.players.find(p => p.id === playerId);
        if (player) {
            const allowedDuringPause = ['1p', '2p', '3p', 'foul'];
            if (appData.isGamePaused && !allowedDuringPause.includes(action)) {
                alert("Toiminto ei sallittu pelikatkon aikana (paitsi pisteet ja virheet)."); return;
            }
            if (!player.onCourt && action !== 'foul') { 
                 alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä.`); return;
            }
            if (player.fouledOut && player.fouls >= 5 && action === 'foul') {
                 alert(`Pelaaja #${player.number} ${player.name} on jo poistettu pelistä.`); return;
            }

            let eventType = '', eventValue = null, eventDescriptionDetails = "";
            switch (action) {
                case '1p': eventType = 'SCORE'; eventValue = 1; player.points += 1; eventDescriptionDetails = "1p tehty"; break;
                case '2p': eventType = 'SCORE'; eventValue = 2; player.points += 2; eventDescriptionDetails = "2p tehty"; break;
                case '3p': eventType = 'SCORE'; eventValue = 3; player.points += 3; eventDescriptionDetails = "3p tehty"; break;
                case 'foul':
                    eventType = 'FOUL'; player.fouls += 1;
                    eventDescriptionDetails = `Virhe (${player.fouls}.)`;
                    if (player.fouls >= 5 && !player.fouledOut) {
                        player.fouledOut = true; 
                        eventDescriptionDetails += " - Pelistä pois!";
                        if(player.onCourt){ // Jos oli kentällä, siirretään penkille
                            recordPlayerTimeOnCourt(player); // Päivitä aika ennen penkille siirtoa
                            player.onCourt = false; 
                            player.lastTimeEnteredCourt = null;
                            logEvent({ type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionDetails: `Penkille (5 virhettä)` });
                        }
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            logEvent({ type: eventType, playerId: player.id, playerName: player.name, playerNumber: player.number, value: eventValue, descriptionDetails: eventDescriptionDetails });
            saveData(); renderAll();
        }
    }

    // --- VASTUSTAJAN PISTEIDEN KÄSITTELY ---
    document.querySelectorAll('.opponent-score-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!appData.gameStarted || appData.gameEnded) {
                 alert("Peli ei ole käynnissä tai on jo päättynyt."); return;
            }
            const points = parseInt(e.target.dataset.points);
            appData.opponentScore += points;
            logEvent({ type: 'OPPONENT_SCORE', value: points, descriptionMaster: `Vastustaja +${points}p` });
            saveData(); updateScoreDisplay(); renderHistory();
        });
    });
    // OSA 1 OLI EDELLISESSÄ VIESTISSÄ... TÄMÄ ON SEN JATKO.

    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) { 
        appData.gameHistory = [];
        appData.gameStarted = false; appData.gameEnded = false; appData.isGamePaused = false;
        appData.lastPauseStartTime = null; appData.currentQuarter = 0; 
        appData.opponentScore = 0; 
        appData.startTime = null; appData.endTime = null; 
        appData.quarterStartTimes = []; appData.quarterEndTimes = []; 
        appData.totalManualPauseDurationSeconds = 0;

        appData.players.forEach(p => {
            p.onCourt = false; p.points = 0; p.fouls = 0;
            p.assists = 0; p.rebounds = 0; p.fouledOut = false;
            p.timeOnCourtSeconds = 0; p.lastTimeEnteredCourt = null; 
        });
        if (!keepPlayersAndSettings) {
            appData.players = []; 
            appData.homeTeamName = "Kobrat"; homeTeamNameInput.value = "Kobrat";
            appData.awayTeamName = ""; awayTeamNameInput.value = "";
            appData.maxPlayersOnCourt = 5; maxPlayersOnCourtSetting.value = "5"; 
        }
    }
    
    startGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0 && (appData.homeTeamName || "Kobrat").toLowerCase().includes("kobra")) { 
            alert("Lisää pelaajia kotijoukkueelle."); return;
        }
        if (!appData.homeTeamName || !appData.awayTeamName) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        if (appData.gameStarted && !appData.gameEnded) { alert("Peli on jo käynnissä."); return; }
        
        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) { 
            resetGameStatsAndState(true); 
        }
        appData.gameStarted = true; appData.gameEnded = false; appData.isGamePaused = false;
        appData.startTime = new Date(); 
        appData.currentQuarter = 0; 
        
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi" });
        
        saveData(); 
        renderAll(); 
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (nextQuarterBtn.disabled) return; 
        if (!appData.gameStarted || appData.gameEnded) return;
        if (appData.isGamePaused) { 
            alert("Peli on katkaistu manuaalisesti. Jatka peliä ensin."); return;
        }

        const qIndex = appData.currentQuarter -1; // Nykyisen jakson indeksi (0-3)
        const currentQuarterIsActiveAndNotEnded = 
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes[qIndex] instanceof Date && 
            !(appData.quarterEndTimes[qIndex] instanceof Date);

        const now = new Date();

        if (appData.currentQuarter === 0) { // Aloitetaan Q1
            appData.currentQuarter = 1;
            appData.quarterStartTimes[0] = now; 
            resumeAllPlayerTimers(now); 
            logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q1 alkoi` });
        } else if (currentQuarterIsActiveAndNotEnded) { // Jakso on käynnissä -> Päätetään se
            pauseAllPlayerTimers(now); 
            appData.quarterEndTimes[appData.currentQuarter - 1] = now;
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
        } else { // Edellinen jakso on päättynyt, aloitetaan seuraava (jos ei Q4)
            if (appData.currentQuarter < 4) {
                // Laske jaksojen välinen taukoaika (ei lisätä totalManualPauseDurationSeconds)
                // Tätä tietoa voidaan käyttää myöhemmin, jos halutaan erotella katkotyyppejä tarkemmin
                appData.currentQuarter++;
                appData.quarterStartTimes[appData.currentQuarter - 1] = now; 
                resumeAllPlayerTimers(now); 
                logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            }
        }
        saveData(); 
        renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        const now = new Date();
        
        if (appData.isGamePaused) { 
            const pauseEndTime = now;
            if(appData.lastPauseStartTime) {
                appData.totalManualPauseDurationSeconds += (pauseEndTime - appData.lastPauseStartTime) / 1000;
            }
            appData.isGamePaused = false;
            appData.lastPauseStartTime = null; 
            // Ei logata "peli jatkuu", koska peli loppuu
        }

        if (appData.currentQuarter > 0 && appData.quarterEndTimes.length < appData.currentQuarter) {
            pauseAllPlayerTimers(now);
            appData.quarterEndTimes[appData.currentQuarter - 1] = now;
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
        }
        
        appData.gameEnded = true; appData.endTime = now;
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli päättyi" });
        saveData(); 
        renderAll();
    });

    togglePauseBtn.addEventListener('click', () => { 
        if (togglePauseBtn.disabled) return;
        if (!appData.gameStarted || appData.gameEnded) return;
        
        const currentQuarterIsActiveAndNotEnded = 
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes.length === appData.currentQuarter &&
            appData.quarterEndTimes.length < appData.currentQuarter;

        if (!currentQuarterIsActiveAndNotEnded) {
            alert("Manuaalinen katko on tarkoitettu vain jakson sisäisille pysäytyksille.");
            return;
        }
        const now = new Date();
        appData.isGamePaused = !appData.isGamePaused;
        if (appData.isGamePaused) {
            appData.lastPauseStartTime = now;
            pauseAllPlayerTimers(now); 
            logEvent({ type: 'PAUSE', descriptionMaster: "Pelikatko alkoi (manuaalinen)" });
        } else {
            if(appData.lastPauseStartTime) {
                const pauseDuration = (now - appData.lastPauseStartTime) / 1000;
                appData.totalManualPauseDurationSeconds += pauseDuration;
                logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu (katko ${Math.round(pauseDuration)}s)` });
            } else {
                 logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu` });
            }
            appData.lastPauseStartTime = null;
            resumeAllPlayerTimers(now); 
        }
        saveData(); 
        renderAll();
    });
    
    function updateMainGameControlButtonsState() {
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        endGameBtn.disabled = !appData.gameStarted || appData.gameEnded; 
    }
    
    function updatePauseButtonState() {
        togglePauseBtn.textContent = appData.isGamePaused ? "Jatka Peliä" : "Aloita Katko";
        const qIndex = appData.currentQuarter - 1;
        const currentQuarterIsActiveAndNotEnded = 
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes[qIndex] instanceof Date &&
            !(appData.quarterEndTimes[qIndex] instanceof Date);

        togglePauseBtn.disabled = !appData.gameStarted || appData.gameEnded || !currentQuarterIsActiveAndNotEnded;

        if (appData.isGamePaused && currentQuarterIsActiveAndNotEnded) { 
             togglePauseBtn.style.backgroundColor = "var(--accent-color-action)"; 
        } else {
            togglePauseBtn.style.backgroundColor = ""; 
        }
    }

    function updateQuarterButtonState() { 
        if (!appData.gameStarted) {
            nextQuarterBtn.textContent = `Aloita Q1`;
            nextQuarterBtn.disabled = true; 
        } else if (appData.gameEnded) {
            nextQuarterBtn.textContent = `Peli Päättynyt`;
            nextQuarterBtn.disabled = true;
        } else {
            const qIndex = appData.currentQuarter - 1;
            const currentQuarterHasStarted = appData.currentQuarter > 0 && appData.quarterStartTimes[qIndex] instanceof Date;
            const currentQuarterHasEnded = appData.currentQuarter > 0 && appData.quarterEndTimes[qIndex] instanceof Date;

            if (appData.currentQuarter === 0) { 
                nextQuarterBtn.textContent = `Aloita Q1`;
                nextQuarterBtn.disabled = appData.isGamePaused; // Ei voi aloittaa Q1, jos peli on jo (ennenaikaisesti) paussilla
            } else if (currentQuarterHasStarted && !currentQuarterHasEnded) { 
                 nextQuarterBtn.textContent = `Päätä Q${appData.currentQuarter}`;
                 nextQuarterBtn.disabled = appData.isGamePaused; 
            } else if (currentQuarterHasEnded) { 
                if (appData.currentQuarter < 4) {
                    nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`;
                    nextQuarterBtn.disabled = appData.isGamePaused; 
                } else { 
                    nextQuarterBtn.textContent = `Peli Ohi`; 
                    nextQuarterBtn.disabled = true; 
                }
            } else { // Odotetaan edellisen jakson päättymistä tai Q1 alkua
                 nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter === 0 ? 1 : appData.currentQuarter + 1}`;
                 nextQuarterBtn.disabled = appData.isGamePaused;
            }
        }
    }

    function updateCurrentGameNameDisplay() {
        const home = appData.homeTeamName || "Koti";
        const away = appData.awayTeamName || "Vieras";
        currentGameNameDisplay.textContent = `${home} vs ${away}`;
        if (reportGameNameDisplay) reportGameNameDisplay.textContent = `${home} vs ${away}`;
    }
    function updateScoreDisplay() { 
        const homeScore = appData.players.reduce((sum, player) => sum + player.points, 0);
        homeScoreDisplay.textContent = homeScore;
        opponentScoreDisplay.textContent = appData.opponentScore;
        if (reportHomeScore) reportHomeScore.textContent = homeScore;
        if (reportOpponentScore) reportOpponentScore.textContent = appData.opponentScore;
    }
    function updateFoulDisplay() { 
        const homeFouls = appData.players.reduce((sum, player) => sum + player.fouls, 0);
        homeFoulsDisplay.textContent = homeFouls;
        if (reportHomeFouls) reportHomeFouls.textContent = homeFouls;
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
                const player = appData.players.find(p => p.id === eventData.playerId);
                if (player) { // Käytetään eventDatan tietoja, jos ne on annettu (esim. poistetun pelaajan tapauksessa)
                    playerPrefix = `#${eventData.playerNumber || player.number} ${eventData.playerName || player.name} | `;
                } else if (eventData.playerNumber && eventData.playerName) { // Fallback jos pelaajaa ei enää löydy listalta
                     playerPrefix = `#${eventData.playerNumber} ${eventData.playerName} | `;
                }
            }
            finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${playerPrefix}${eventData.descriptionDetails || eventData.type || 'Tuntematon tapahtuma'}`;
        } else { 
            if (!finalDescription.includes(timeString) && 
                (appData.gameStarted || ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END'].includes(eventData.type))) {
                 finalDescription = `${timeString} ${getCurrentQuarterForLog()} – ${finalDescription}`;
            }
        }
        const fullEventData = {
            id: generateEventId(), timestamp: timestamp, quarterInfo: getCurrentQuarterForLog(), // Tallennetaan jakson tila
            description: finalDescription, ...eventData 
        };
        delete fullEventData.descriptionDetails; delete fullEventData.descriptionMaster; 
        appData.gameHistory.push(fullEventData);
    }

    function renderHistory() { /* ... kuten edellisessä täydessä versiossa (v1.1 - Ohjeet Popupilla) ... */ }
    function removeHistoryEvent(eventId) { /* ... kuten edellisessä täydessä versiossa, varmista että renderAll kutsutaan lopuksi ... */ }
    copyHistoryBtn.addEventListener('click', () => { /* ... kuten edellisessä täydessä versiossa ... */ });
    clearGameHistoryBtn.addEventListener('click', () => { /* ... kuten edellisessä täydessä versiossa ... */ });
    
    // --- OHJEIDEN POPUP ---
    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) { /* ... kuten edellisessä täydessä versiossa ... */ }

    // --- RAPORTTINÄKYMÄN LOGIIKKA ---
    function renderReportView() {
        if (!reportView || reportView.classList.contains('hidden')) return; // Älä tee mitään, jos raporttinäkymä ei ole aktiivinen

        if (!appData.gameStarted && !appData.gameEnded) {
            reportTableContainer.innerHTML = "<p>Peli ei ole vielä alkanut tai dataa ei ole saatavilla.</p>";
            reportGameStatus.textContent = "Ei aloitettu";
            reportTotalGameTime.textContent = "00:00";
            return;
        }

        // 1. Laske pelin kokonaiskesto aktiivisena
        let gameDurationSeconds = 0;
        if (appData.startTime) {
            const referenteEndTime = appData.endTime || new Date(); // Käytä nykyhetkeä, jos peli ei ole päättynyt
            const grossDuration = (referenteEndTime - appData.startTime) / 1000;
            
            let totalBreakTimes = appData.totalManualPauseDurationSeconds; // Aloitetaan manuaalisista katkoista

            // Lasketaan jaksojen välisten taukojen kesto
            for (let i = 0; i < appData.currentQuarter; i++) { 
                 if (appData.quarterEndTimes[i] && appData.quarterStartTimes[i+1]) { // Tauko kahden kokonaisen jakson välillä
                    totalBreakTimes += (appData.quarterStartTimes[i+1] - appData.quarterEndTimes[i]) / 1000;
                 } else if (appData.quarterEndTimes[i] && i === appData.currentQuarter -1 && !appData.gameEnded && !(appData.quarterStartTimes[i+1])) {
                    // Viimeisin jakso on päättynyt, mutta seuraava ei ole alkanut (eikä peli loppunut)
                    // -> aika tästä hetkestä jakson loppuun on taukoa
                    totalBreakTimes += (new Date() - appData.quarterEndTimes[i]) / 1000;
                 }
            }
            gameDurationSeconds = Math.max(0, grossDuration - totalBreakTimes);
        }
        
        reportGameStatus.textContent = appData.gameEnded ? "Päättynyt" : (appData.gameStarted ? (appData.isGamePaused ? "Katkolla" : `Käynnissä - ${getCurrentQuarterForLog()}`) : "Ei aloitettu");
        reportTotalGameTime.textContent = formatTimeMMSS(gameDurationSeconds);
        // Pisteet ja virheet päivitetään jo updateScoreDisplay/updateFoulDisplay kautta

        // 2. Rakenna pelaajataulukko
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th><th class="player-name-report">Nimi</th>
                        <th>P</th><th>V</th><th>S</th><th>L</th>
                        <th>Peliaika</th><th>Peluutus %</th>
                    </tr>
                </thead>
                <tbody>`;
        
        const sortedReportPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));
        sortedReportPlayers.forEach(player => {
            let currentSessionTimeSeconds = 0;
            // Onko pelaaja juuri nyt kentällä, ja onko peli/jakso aktiivisesti käynnissä (ei manuaalisella katkolla, eikä jakson lopussa odottamassa seuraavaa)
            const qIndex = appData.currentQuarter - 1;
            const isQuarterCurrentlyActive = appData.currentQuarter > 0 && 
                                           appData.quarterStartTimes[qIndex] instanceof Date && 
                                           !(appData.quarterEndTimes[qIndex] instanceof Date);

            if (player.onCourt && player.lastTimeEnteredCourt && !appData.isGamePaused && isQuarterCurrentlyActive) {
                currentSessionTimeSeconds = (new Date() - player.lastTimeEnteredCourt) / 1000;
            }
            const totalPlayerTime = (player.timeOnCourtSeconds || 0) + currentSessionTimeSeconds;
            const playingTimeFormatted = formatTimeMMSS(totalPlayerTime);
            const playingPercentage = gameDurationSeconds > 0.1 ? ((totalPlayerTime / gameDurationSeconds) * 100).toFixed(1) : "0.0"; // Vältä nollalla jakoa

            tableHTML += `
                <tr>
                    <td class="numeric-stat">${player.number}</td>
                    <td class="player-name-report">${player.name}</td>
                    <td class="numeric-stat">${player.points}</td>
                    <td class="numeric-stat">${player.fouls}${player.fouledOut ? ' (5)' : ''}</td>
                    <td class="numeric-stat">${player.assists}</td>
                    <td class="numeric-stat">${player.rebounds}</td>
                    <td class="numeric-stat">${playingTimeFormatted}</td>
                    <td class="numeric-stat">${playingPercentage}%</td>
                </tr>`;
        });
        tableHTML += `</tbody></table>`;
        if (reportTableContainer) reportTableContainer.innerHTML = tableHTML;
    }


    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
        [setupView, gameView, historyView, reportView].forEach(view => { 
            if (view) view.classList.toggle('hidden', view.id !== viewId);
        });
        if (viewId === 'gameView') { renderGamePlayerList(); updateGameControlsAndDisplays(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView' && reportView) { 
            updateCurrentGameNameDisplay(); // Varmistaa että raportin otsikko on oikein
            renderReportView(); 
        }
    }

    navigateToGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0 && (appData.homeTeamName || "Kobrat").toLowerCase().includes("kobra")) {
            alert("Lisää vähintään yksi pelaaja kotijoukkueelle."); return;
        }
        if (!homeTeamNameInput.value.trim() || !awayTeamNameInput.value.trim()) { // Tarkistetaan input-kentistä, koska appData voi olla oletus
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        saveData(); // Varmistetaan, että viimeisimmät nimet tallentuvat ennen siirtymistä
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView')); 
    backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    backToGameFromReportBtn.addEventListener('click', () => showView('gameView')); 

    // --- ALUSTUS ---
    loadData(); 
    showView('setupView');
});