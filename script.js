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
    const reportTableContainer = document.getElementById('reportTableContainer'); // Muutettu ID vastaamaan HTML:ää
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
        players: [], // Pelaajaobjektit sisältävät nyt: id, name, number, onCourt, points, fouls, assists, rebounds, fouledOut, timeOnCourtSeconds, lastTimeEnteredCourt
        gameHistory: [], 
        gameStarted: false, gameEnded: false, isGamePaused: false, 
        lastPauseStartTime: null, // Manuaalisen katkon alkuaika
        currentQuarter: 0, 
        maxPlayersOnCourt: 5, 
        opponentScore: 0,       
        startTime: null, endTime: null, 
        quarterStartTimes: [], // Taulukko Date-objekteille, milloin kukin jakso (1-4) alkoi
        quarterEndTimes: [],   // Taulukko Date-objekteille, milloin kukin jakso (1-4) päättyi
        totalManualPauseDurationSeconds: 0, // Yhteenlaskettu manuaalisten katkojen kesto
    };

    const LOCAL_STORAGE_KEY = 'basketTrackerData_v1.2';

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue"; 
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue"; 
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value); 
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData)); 
    }

    function loadData() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY); 
        if (storedData) {
            const loaded = JSON.parse(storedData);
            // Yhdistä ladattu data oletusrakenteeseen puuttuvien kenttien varalta
            // ja varmista Date-objektien tyypit
            appData = { 
                ...appData, // Oletusarvot ensin
                ...loaded,  // Ladatut arvot ylikirjoittavat
                startTime: loaded.startTime ? new Date(loaded.startTime) : null,
                endTime: loaded.endTime ? new Date(loaded.endTime) : null,
                lastPauseStartTime: loaded.lastPauseStartTime ? new Date(loaded.lastPauseStartTime) : null,
                quarterStartTimes: (loaded.quarterStartTimes || []).map(t => t ? new Date(t) : null).filter(t => t),
                quarterEndTimes: (loaded.quarterEndTimes || []).map(t => t ? new Date(t) : null).filter(t => t),
                gameHistory: (loaded.gameHistory || []).map(event => ({
                    ...event,
                    timestamp: event.timestamp ? new Date(event.timestamp) : null
                })),
                players: (loaded.players || []).map(p => ({
                    fouledOut: false, points: 0, fouls: 0, assists: 0, rebounds: 0, onCourt: false, 
                    timeOnCourtSeconds: 0, lastTimeEnteredCourt: null, // Peliajan oletukset
                    ...p, // Ladatut arvot ylikirjoittavat pelaajan oletukset
                    lastTimeEnteredCourt: p.lastTimeEnteredCourt ? new Date(p.lastTimeEnteredCourt) : null
                }))
            };
        }
        homeTeamNameInput.value = appData.homeTeamName || "Kobrat";
        awayTeamNameInput.value = appData.awayTeamName || "";
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString(); 
        renderAll();
    }

    function renderAll() {
        renderPlayers(); // Setup-näkymän pelaajalista
        renderGamePlayerList(); // Pelinäkymän pelaajakortit
        renderHistory();
        updateGameControlsAndDisplays(); 
        if (!reportView.classList.contains('hidden')) { // Päivitä raportti vain, jos se on näkyvissä
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
        const quarterHasStarted = appData.quarterStartTimes[qIndex];
        const quarterHasEnded = appData.quarterEndTimes[qIndex];

        if (appData.isGamePaused) return `Q${appData.currentQuarter} (Katko)`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter < 4 && !appData.gameEnded) return `Tauko (ennen Q${appData.currentQuarter + 1})`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter === 4 && !appData.gameEnded) return `Pelin jälkeen (Q4)`;
        if (appData.gameEnded) return "Pelin jälkeen";
        return `Q${appData.currentQuarter}`;
    }

    // --- PELIAJAN LASKENTAAN LIITTYVÄT TOIMINNOT ---
    function recordPlayerTimeOnCourt(player) {
        if (player.onCourt && player.lastTimeEnteredCourt) {
            const now = new Date();
            const sessionDurationSeconds = (now - player.lastTimeEnteredCourt) / 1000;
            player.timeOnCourtSeconds += sessionDurationSeconds;
            // console.log(`Pelaaja ${player.number} aikaa lisätty: ${sessionDurationSeconds.toFixed(1)}s, yhteensä: ${player.timeOnCourtSeconds.toFixed(1)}s`);
        }
        player.lastTimeEnteredCourt = player.onCourt ? new Date() : null; // Aseta uusi alkuaika jos meni kentälle, muuten nollaa
    }

    function pauseAllPlayerTimers() { // Kun manuaalinen katko alkaa TAI jakso päättyy
        appData.players.forEach(p => {
            if (p.onCourt && p.lastTimeEnteredCourt) {
                const now = new Date();
                const sessionDurationSeconds = (now - p.lastTimeEnteredCourt) / 1000;
                p.timeOnCourtSeconds += sessionDurationSeconds;
                p.lastTimeEnteredCourt = null; // Merkitään, että "kello" on pysäytetty tälle sessiolle
                // console.log(`Pelaajan ${p.number} kello pysäytetty, aikaa lisätty: ${sessionDurationSeconds.toFixed(1)}s`);
            }
        });
    }

    function resumeAllPlayerTimers() { // Kun manuaalinen katko päättyy TAI uusi jakso alkaa
        appData.players.forEach(p => {
            if (p.onCourt) { // Vain kentällä oleville
                p.lastTimeEnteredCourt = new Date();
                // console.log(`Pelaajan ${p.number} kello jatkuu`);
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
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null // Peliajan alustus
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData(); renderPlayers(); renderGamePlayerList();
        } else { alert('Syötä pelaajan nimi ja numero.'); }
    });

    function renderPlayers() { 
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) { playerListDiv.innerHTML = '<p>Ei pelaajia.</p>'; return; }
        const sortedSetupPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));
        sortedSetupPlayers.forEach(player => { /* ... kuten ennen ... */ });
        document.querySelectorAll('.remove-player-btn').forEach(button => { /* ... kuten ennen ... */ });
    }

    function renderGamePlayerList() { /* ... kuten edellisessä täydessä versiossa ... */ }

    function handleToggleStatus(event) {
        if (event.target.disabled) return;
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Toiminto ei sallittu: Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        if (player && !player.fouledOut) {
            if (!player.onCourt) { 
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa!`); return;
                }
            }
            
            // Peliajan käsittely ENNEN onCourt-tilan muutosta
            recordPlayerTimeOnCourt(player); // Tallentaa edellisen session ajan, jos oli kentällä

            const oldStatus = player.onCourt;
            player.onCourt = !player.onCourt;

            // Aseta uusi lastTimeEnteredCourt, JOS pelaaja meni kentälle
            if (player.onCourt) {
                player.lastTimeEnteredCourt = new Date();
            }

            logEvent({ type: 'SUBSTITUTION', playerId: player.id, descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`});
            saveData(); renderGamePlayerList(); renderHistory();
        }
    }

    function handlePlayerAction(event) { /* ... kuten edellisessä täydessä versiossa, varmista että kutsuu updateScoreDisplay ja updateFoulDisplay ... */ }
    
    // --- VASTUSTAJAN PISTEIDEN KÄSITTELY --- (kuten edellisessä täydessä versiossa)
    document.querySelectorAll('.opponent-score-btn').forEach(button => { /* ... */ });

    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) { 
        appData.gameHistory = [];
        appData.gameStarted = false; appData.gameEnded = false; appData.isGamePaused = false;
        appData.lastPauseStartTime = null; appData.currentQuarter = 0; 
        appData.opponentScore = 0; 
        appData.startTime = null; appData.endTime = null; 
        appData.quarterStartTimes = []; appData.quarterEndTimes = []; // Nollaa jaksoajat
        appData.totalManualPauseDurationSeconds = 0;

        appData.players.forEach(p => {
            p.onCourt = false; p.points = 0; p.fouls = 0;
            p.assists = 0; p.rebounds = 0; p.fouledOut = false;
            p.timeOnCourtSeconds = 0; p.lastTimeEnteredCourt = null; // Nollaa peliajat
        });
        if (!keepPlayersAndSettings) {
            appData.players = []; 
            appData.homeTeamName = "Kobrat"; homeTeamNameInput.value = "Kobrat";
            appData.awayTeamName = ""; awayTeamNameInput.value = "";
            appData.maxPlayersOnCourt = 5; maxPlayersOnCourtSetting.value = "5"; 
        }
    }
    
    startGameBtn.addEventListener('click', () => {
        // ... (tarkistukset kuten ennen) ...
        if (appData.gameStarted && !appData.gameEnded) { alert("Peli on jo käynnissä."); return; }
        
        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) { 
            resetGameStatsAndState(true); 
        }
        appData.gameStarted = true; appData.gameEnded = false; appData.isGamePaused = false;
        appData.startTime = new Date(); 
        appData.currentQuarter = 0; // Valmistellaan Q1:n aloitus
        
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi" });
        
        saveData(); 
        renderAll(); 
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (nextQuarterBtn.disabled) return; 
        if (!appData.gameStarted || appData.gameEnded) return;
        if (appData.isGamePaused) { // Manuaalinen katko päällä
            alert("Peli on katkaistu manuaalisesti. Jatka peliä ensin."); return;
        }

        const isCurrentQuarterActiveAndNotEnded = 
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes.length === appData.currentQuarter && // Nykyinen jakso on alkanut
            appData.quarterEndTimes.length < appData.currentQuarter;    // Mutta ei ole vielä päättynyt

        if (appData.currentQuarter === 0) { // Aloitetaan Q1
            appData.currentQuarter = 1;
            appData.quarterStartTimes[0] = new Date(); 
            resumeAllPlayerTimers(); // Aloita kentällä olevien kellot
            logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q1 alkoi` });
        } else if (isCurrentQuarterActiveAndNotEnded) { // Jakso on käynnissä -> Päätetään se
            pauseAllPlayerTimers(); // Pysäytä kellot jakson loppuun
            appData.quarterEndTimes[appData.currentQuarter - 1] = new Date();
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
        } else { // Edellinen jakso on päättynyt, aloitetaan seuraava (jos ei Q4)
            if (appData.currentQuarter < 4) {
                appData.currentQuarter++;
                appData.quarterStartTimes[appData.currentQuarter - 1] = new Date(); 
                resumeAllPlayerTimers(); // Aloita kentällä olevien kellot uudelleen
                logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            } else {
                // Q4 on jo päättynyt, ei voi aloittaa uutta
            }
        }
        saveData(); 
        renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        
        if (appData.isGamePaused) { // Jos oli manuaalinen katko päällä
            const pauseEndTime = new Date();
            if(appData.lastPauseStartTime) {
                appData.totalManualPauseDurationSeconds += (pauseEndTime - appData.lastPauseStartTime) / 1000;
            }
            appData.isGamePaused = false;
            appData.lastPauseStartTime = null; 
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Manuaalinen katko päätetty pelin lopetuksen yhteydessä" });
        }

        // Varmistetaan, että viimeisin aktiivinen jakso merkitään päättyneeksi ja kellot pysäytetään
        if (appData.currentQuarter > 0 && appData.quarterEndTimes.length < appData.currentQuarter) {
            pauseAllPlayerTimers();
            appData.quarterEndTimes[appData.currentQuarter - 1] = new Date();
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
        }
        
        appData.gameEnded = true; appData.endTime = new Date();
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
            alert("Manuaalinen katko on tarkoitettu vain jakson sisäisille pysäytyksille. Aloita jakso ensin.");
            return;
        }

        appData.isGamePaused = !appData.isGamePaused;
        if (appData.isGamePaused) {
            appData.lastPauseStartTime = new Date();
            pauseAllPlayerTimers(); // Pysäytä pelaajien kellot
            logEvent({ type: 'PAUSE', descriptionMaster: "Pelikatko alkoi (manuaalinen)" });
        } else {
            const pauseEndTime = new Date();
            if(appData.lastPauseStartTime) {
                const pauseDuration = (pauseEndTime - appData.lastPauseStartTime) / 1000;
                appData.totalManualPauseDurationSeconds += pauseDuration;
                logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu (manuaalinen katko ${Math.round(pauseDuration)}s)` });
            } else {
                 logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu` });
            }
            appData.lastPauseStartTime = null;
            resumeAllPlayerTimers(); // Jatka pelaajien kelloja
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
        const currentQuarterIsActiveAndNotEnded = 
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes.length === appData.currentQuarter &&
            appData.quarterEndTimes.length < appData.currentQuarter;
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
            const currentQuarterHasStarted = appData.quarterStartTimes.length === appData.currentQuarter && appData.currentQuarter > 0;
            const currentQuarterHasEnded = appData.quarterEndTimes.length === appData.currentQuarter && appData.currentQuarter > 0;

            if (appData.currentQuarter === 0) { 
                nextQuarterBtn.textContent = `Aloita Q1`;
                nextQuarterBtn.disabled = appData.isGamePaused;
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
                 nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`; // Tai Q1 jos currentQ=0
                 nextQuarterBtn.disabled = appData.isGamePaused;
            }
        }
    }

    function updateCurrentGameNameDisplay() { /* ... kuten ennen ... */ }
    function updateScoreDisplay() { /* ... kuten ennen ... */ }
    function updateFoulDisplay() { /* ... kuten ennen ... */ }

    homeTeamNameInput.addEventListener('input', saveData); 
    awayTeamNameInput.addEventListener('input', saveData); 
    maxPlayersOnCourtSetting.addEventListener('change', saveData); 

    // --- HISTORIA ---
    function logEvent(eventData) { /* ... kuten edellisessä täydessä versiossa, varmista että pelaajatietojen haku toimii ... */ }
    function renderHistory() { /* ... kuten edellisessä täydessä versiossa ... */ }
    function removeHistoryEvent(eventId) { /* ... kuten edellisessä täydessä versiossa ... */ }
    copyHistoryBtn.addEventListener('click', () => { /* ... kuten edellisessä täydessä versiossa ... */ });
    clearGameHistoryBtn.addEventListener('click', () => { /* ... kuten edellisessä täydessä versiossa, varmista että resetGameStatsAndState nollaa myös peliajat ... */ });
    
    // --- OHJEIDEN POPUP ---
    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) { /* ... kuten ennen ... */ }

    // --- RAPORTTINÄKYMÄN LOGIIKKA ---
    function renderReportView() {
        if (!appData.gameStarted && !appData.gameEnded) {
            reportContent.innerHTML = "<p>Peli ei ole vielä alkanut tai dataa ei ole saatavilla.</p>";
            reportGameStatus.textContent = "Ei aloitettu";
            reportTotalGameTime.textContent = "00:00";
            reportHomeScore.textContent = "0";
            reportOpponentScore.textContent = "0";
            reportHomeFouls.textContent = "0";
            return;
        }

        // 1. Laske pelin kokonaiskesto aktiivisena
        let gameActiveDurationSeconds = 0;
        if (appData.startTime) {
            const endTimeForCalc = appData.endTime || new Date(); // Käytä nykyhetkeä, jos peli ei ole päättynyt
            const grossGameDurationSeconds = (endTimeForCalc - appData.startTime) / 1000;
            
            // Laske jaksojen välisten taukojen kesto
            let totalQuarterBreakDurationSeconds = 0;
            for (let i = 0; i < appData.currentQuarter -1; i++) { // Käy läpi päättyneet jaksot (ei viimeistä, jos se on vielä auki)
                 if (appData.quarterEndTimes[i] && appData.quarterStartTimes[i+1]) {
                    totalQuarterBreakDurationSeconds += (appData.quarterStartTimes[i+1] - appData.quarterEndTimes[i]) / 1000;
                 }
            }
            // Jos viimeinen jakso on päättynyt, mutta peli ei ole vielä loppu (ennen endGameBtn), lasketaan aika siitä hetkestä nykyhetkeen tauoksi
            if (appData.currentQuarter > 0 && appData.quarterEndTimes.length === appData.currentQuarter && !appData.gameEnded) {
                totalQuarterBreakDurationSeconds += (new Date() - appData.quarterEndTimes[appData.currentQuarter - 1]) / 1000;
            }


            gameActiveDurationSeconds = grossGameDurationSeconds - appData.totalManualPauseDurationSeconds - totalQuarterBreakDurationSeconds;
            gameActiveDurationSeconds = Math.max(0, gameActiveDurationSeconds); // Varmista ettei mene negatiiviseksi
        }
        
        reportGameStatus.textContent = appData.gameEnded ? "Päättynyt" : (appData.gameStarted ? (appData.isGamePaused ? "Katkolla" : "Käynnissä") : "Ei aloitettu");
        reportTotalGameTime.textContent = formatTimeMMSS(gameActiveDurationSeconds);
        reportHomeScore.textContent = appData.players.reduce((sum, p) => sum + p.points, 0);
        reportOpponentScore.textContent = appData.opponentScore;
        reportHomeFouls.textContent = appData.players.reduce((sum, p) => sum + p.fouls, 0);


        // 2. Rakenna pelaajataulukko
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th class="player-name-report">Nimi</th>
                        <th>P</th>
                        <th>V</th>
                        <th>S</th>
                        <th>L</th>
                        <th>Peliaika</th>
                        <th>Peluutus %</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const sortedReportPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));

        sortedReportPlayers.forEach(player => {
            let currentSessionTimeSeconds = 0;
            if (player.onCourt && player.lastTimeEnteredCourt && !appData.isGamePaused && 
                appData.currentQuarter > 0 && appData.quarterEndTimes.length < appData.currentQuarter) { // Vain jos jakso on aktiivisesti käynnissä
                currentSessionTimeSeconds = (new Date() - player.lastTimeEnteredCourt) / 1000;
            }
            const totalPlayerTime = player.timeOnCourtSeconds + currentSessionTimeSeconds;
            const playingTimeFormatted = formatTimeMMSS(totalPlayerTime);
            const playingPercentage = gameActiveDurationSeconds > 0 ? ((totalPlayerTime / gameActiveDurationSeconds) * 100).toFixed(1) : "0.0";

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
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        reportTableContainer.innerHTML = tableHTML;
    }


    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
        [setupView, gameView, historyView, reportView].forEach(view => { 
            view.classList.toggle('hidden', view.id !== viewId);
        });
        if (viewId === 'gameView') { renderGamePlayerList(); updateGameControlsAndDisplays(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView') { 
            reportGameNameDisplay.textContent = `${appData.homeTeamName || "Koti"} vs ${appData.awayTeamName || "Vieras"}`;
            renderReportView(); 
        }
    }

    navigateToGameBtn.addEventListener('click', () => { /* ... kuten ennen ... */ });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView')); 
    backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    backToGameFromReportBtn.addEventListener('click', () => showView('gameView')); 

    // --- ALUSTUS ---
    loadData(); 
    showView('setupView');
});