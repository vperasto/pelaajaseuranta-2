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
    const homeFoulsDisplay = document.getElementById('homeFoulsDisplay'); // Näyttää jakson virheet

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
    const reportHomeFouls = document.getElementById('reportHomeFouls'); // Näyttää kokonaisvirheet raportissa

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
        currentQuarterFouls: 0, // LISÄTTY: Seuraa nykyisen jakson virheitä
        totalManualPauseDurationSeconds: 0,
    };

    const LOCAL_STORAGE_KEY = 'basketTrackerData_v1.2'; // Vakio avaimelle

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue";
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue";
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
        // console.log("Data saved");
    }

    function loadData() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            const loaded = JSON.parse(storedData);
            const defaultAppData = {
                homeTeamName: "Kobrat", awayTeamName: "", players: [], gameHistory: [],
                gameStarted: false, gameEnded: false, isGamePaused: false,
                lastPauseStartTime: null, currentQuarter: 0, maxPlayersOnCourt: 5,
                opponentScore: 0, startTime: null, endTime: null,
                quarterStartTimes: [], quarterEndTimes: [],
                currentQuarterFouls: 0, // Lisää oletusarvo tänne
                totalManualPauseDurationSeconds: 0,
            };
            appData = { ...defaultAppData, ...loaded };

            appData.startTime = loaded.startTime ? new Date(loaded.startTime) : null;
            appData.endTime = loaded.endTime ? new Date(loaded.endTime) : null;
            appData.lastPauseStartTime = loaded.lastPauseStartTime ? new Date(loaded.lastPauseStartTime) : null;
            appData.quarterStartTimes = (loaded.quarterStartTimes || []).map(t => t ? new Date(t) : null).filter(t => t instanceof Date);
            appData.quarterEndTimes = (loaded.quarterEndTimes || []).map(t => t ? new Date(t) : null).filter(t => t instanceof Date);
            appData.gameHistory = (loaded.gameHistory || []).map(event => ({
                ...event,
                timestamp: event.timestamp ? new Date(event.timestamp) : null
            }));
            appData.players = (loaded.players || []).map(p => ({
                fouledOut: false, points: 0, fouls: 0, assists: 0, rebounds: 0, onCourt: false,
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null,
                ...p,
                lastTimeEnteredCourt: p.lastTimeEnteredCourt ? new Date(p.lastTimeEnteredCourt) : null,
                timeOnCourtSeconds: p.timeOnCourtSeconds || 0
            }));
            // Varmistetaan, että ladattu jakson virhemäärä on numero
            appData.currentQuarterFouls = parseInt(loaded.currentQuarterFouls || 0, 10);
            appData.totalManualPauseDurationSeconds = parseFloat(loaded.totalManualPauseDurationSeconds || 0);

        }
        // Asetetaan arvot input-kenttiin
        homeTeamNameInput.value = appData.homeTeamName;
        awayTeamNameInput.value = appData.awayTeamName;
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString();
        renderAll(); // Päivitetään koko UI ladatulla datalla
    }

    // --- RENDERÖINTI ---
    function renderAll() {
        renderPlayers();
        renderGamePlayerList();
        renderHistory();
        updateDisplays(); // Päivittää kaikki pelinäkymän ja raportin yhteenvedon tiedot
        if (reportView && !reportView.classList.contains('hidden')) {
            renderReportView(); // Varmistaa raportin taulukon ja ajan
        }
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
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter < 4 && !appData.gameEnded && !(appData.quarterStartTimes[qIndex+1] instanceof Date)) return `Tauko (ennen Q${appData.currentQuarter + 1})`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter === 4 && !appData.gameEnded) return `Pelin jälkeen (Q4)`;
        if (appData.gameEnded) return "Pelin jälkeen";
        if (quarterHasStarted && !quarterHasEnded) return `Q${appData.currentQuarter}`;
        return `Q${appData.currentQuarter}`;
    }


    // --- PELIAJAN LASKENTAAN LIITTYVÄT TOIMINNOT ---
    function recordPlayerTimeOnCourt(player, sessionEndTime = new Date()) {
        if (player.onCourt && player.lastTimeEnteredCourt instanceof Date) {
            const sessionDurationSeconds = (sessionEndTime - player.lastTimeEnteredCourt) / 1000;
            if (sessionDurationSeconds > 0) {
                player.timeOnCourtSeconds = (player.timeOnCourtSeconds || 0) + sessionDurationSeconds;
            }
        }
    }

    function pauseAllPlayerTimers(pauseTime = new Date()) {
        appData.players.forEach(p => {
            if (p.onCourt && p.lastTimeEnteredCourt instanceof Date) {
                const sessionDurationSeconds = (pauseTime - p.lastTimeEnteredCourt) / 1000;
                 if (sessionDurationSeconds > 0) {
                    p.timeOnCourtSeconds = (p.timeOnCourtSeconds || 0) + sessionDurationSeconds;
                }
                p.lastTimeEnteredCourt = null;
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
                id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, number, onCourt: false,
                points: 0, fouls: 0, assists: 0, rebounds: 0, fouledOut: false,
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData(); renderPlayers(); renderGamePlayerList();
        } else { alert('Syötä pelaajan nimi ja numero.'); }
    });

    function renderPlayers() { // Setup-näkymä
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
                const playerToRemove = appData.players.find(p => p.id === playerId);
                if (confirm(`Haluatko varmasti poistaa pelaajan ${playerToRemove?.name || ''} (#${playerToRemove?.number || ''}) pysyvästi? Tätä ei voi kumota.`)) {
                    appData.players = appData.players.filter(p => p.id !== playerId);
                    saveData(); renderPlayers(); renderGamePlayerList(); updateDisplays(); // Päivitä näytöt heti
                }
            });
        });
    }

    function renderGamePlayerList() { // Pelinäkymä
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

            const pointsAndFoulButtonsVisible = player.onCourt && !player.fouledOut;
            const assistReboundButtonsVisible = player.onCourt && !player.fouledOut && !appData.isGamePaused;

            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name}</h3>
                    <span class="player-number">#${player.number}</span>
                     ${fouledOutIndicator}
                </div>
                <span class="player-stats">P: ${player.points} | V: ${player.fouls} | S: ${player.assists} | L: ${player.rebounds}</span>
                <div class="player-actions">
                    <button class="toggle-status-btn" data-id="${player.id}" ${toggleBtnDisabled}>${player.onCourt ? 'Penkille' : 'Kentälle'}</button>
                    <div class="action-btn-group ${pointsAndFoulButtonsVisible ? '' : 'hidden-actions'}">
                        <button class="action-btn" data-id="${player.id}" data-action="1p">+1P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="2p">+2P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="3p">+3P</button>
                    </div>
                    <div class="action-btn-group ${pointsAndFoulButtonsVisible ? '' : 'hidden-actions'}">
                        <button class="action-btn" data-id="${player.id}" data-action="foul">Virhe</button>
                        <button class="action-btn" data-id="${player.id}" data-action="assist" ${assistReboundButtonsVisible ? '' : 'disabled style="opacity:0.5;"'}>Syöttö</button>
                        <button class="action-btn" data-id="${player.id}" data-action="rebound" ${assistReboundButtonsVisible ? '' : 'disabled style="opacity:0.5;"'}>Levypallo</button>
                    </div>
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
            if (!player.onCourt) {
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa!`); return;
                }
            } else {
                recordPlayerTimeOnCourt(player, now);
                player.lastTimeEnteredCourt = null;
            }

            player.onCourt = !player.onCourt;

            // Aseta kellon aloitusaika jos meni kentälle ja peli/jakso käynnissä eikä pausella
            const qIndex = appData.currentQuarter - 1;
            const isQuarterCurrentlyActive = appData.currentQuarter > 0 &&
                                           appData.quarterStartTimes[qIndex] instanceof Date &&
                                           !(appData.quarterEndTimes[qIndex] instanceof Date);
            if (player.onCourt && !appData.isGamePaused && isQuarterCurrentlyActive) {
                 player.lastTimeEnteredCourt = now;
            } else {
                 player.lastTimeEnteredCourt = null;
            }

            logEvent({
                type: 'SUBSTITUTION',
                playerId: player.id,
                playerName: player.name,
                playerNumber: player.number,
                descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData(); renderAll();
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
            if (!player.onCourt && action !== 'foul') { // Virheen voi antaa penkillä olevalle (tekninen)
                 alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä (paitsi virhe).`);
                 if(action !== 'foul') return; // Estä muut toiminnot jos ei kentällä
            }
             if (player.fouledOut && action !== 'foul') { // Estetään muut paitsi virhe, jos fouled out
                  alert(`Pelaaja #${player.number} ${player.name} on jo poistettu pelistä 5 virheen takia.`);
                  return;
             }


            let eventType = '', eventValue = null, eventDescriptionDetails = "";
            switch (action) {
                case '1p': eventType = 'SCORE'; eventValue = 1; player.points += 1; eventDescriptionDetails = "1p tehty"; break;
                case '2p': eventType = 'SCORE'; eventValue = 2; player.points += 2; eventDescriptionDetails = "2p tehty"; break;
                case '3p': eventType = 'SCORE'; eventValue = 3; player.points += 3; eventDescriptionDetails = "3p tehty"; break;
                case 'foul':
                    eventType = 'FOUL';
                    player.fouls += 1; // Pelaajan kokonaisvirhe kasvaa
                    // Kasvata jakson virhettä vain jos jakso on käynnissä
                    const qIndex = appData.currentQuarter - 1;
                    const isQuarterCurrentlyActive = appData.currentQuarter > 0 &&
                                                   appData.quarterStartTimes[qIndex] instanceof Date &&
                                                   !(appData.quarterEndTimes[qIndex] instanceof Date);
                    if (isQuarterCurrentlyActive) {
                         appData.currentQuarterFouls += 1; // Kasvatetaan tämän jakson virhettä
                    } else {
                         console.warn("Virhe lisätty jakson ulkopuolella, ei lasketa jaksovirheisiin.");
                         // Voit halutessasi lisätä logiikan myös edellisen jakson virheisiin tms.
                    }
                    eventDescriptionDetails = `Virhe (${player.fouls}.)`;
                    if (player.fouls >= 5 && !player.fouledOut) {
                        player.fouledOut = true;
                        eventDescriptionDetails += " - Pelistä pois!";
                        if(player.onCourt){
                            recordPlayerTimeOnCourt(player);
                            player.onCourt = false;
                            player.lastTimeEnteredCourt = null;
                            logEvent({ type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionDetails: `Penkille (5 virhettä)` });
                        }
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
                descriptionDetails: eventDescriptionDetails
            });
            saveData();
            renderAll(); // Päivittää kaiken, mukaan lukien virhenäytöt
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
            saveData(); updateDisplays(); renderHistory(); // Päivitä näytöt
        });
    });

    // --- PELIN KULKU ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) {
        appData.gameHistory = [];
        appData.gameStarted = false; appData.gameEnded = false; appData.isGamePaused = false;
        appData.lastPauseStartTime = null; appData.currentQuarter = 0;
        appData.opponentScore = 0;
        appData.startTime = null; appData.endTime = null;
        appData.quarterStartTimes = []; appData.quarterEndTimes = [];
        appData.currentQuarterFouls = 0; // Nollataan jaksovirheet
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
         // Tyhjennä historia-div myös visuaalisesti
        if (gameHistoryLog) gameHistoryLog.innerHTML = '<p>Ei tapahtumia vielä.</p>';
        // Päivitä kaikki näytöt nollauksen jälkeen
        updateDisplays();
    }

    startGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0 && (homeTeamNameInput.value.trim() || "Kobrat").toLowerCase().includes("kobra")) {
             alert("Lisää pelaajia kotijoukkueelle tai muuta joukkueen nimi."); return;
        }
        if (!homeTeamNameInput.value.trim() || !awayTeamNameInput.value.trim()) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        if (appData.gameStarted && !appData.gameEnded) { alert("Peli on jo käynnissä."); return; }

        if (appData.gameEnded || (!appData.gameStarted && appData.startTime === null)) {
             // Nollaa vain pelin tilastot, säilytä pelaajat ja asetukset
            resetGameStatsAndState(true);
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Uusi peli aloitettu (tilastot nollattu)" });
        }
        appData.gameStarted = true; appData.gameEnded = false; appData.isGamePaused = false;
        appData.startTime = new Date();
        appData.currentQuarter = 0;
        appData.currentQuarterFouls = 0; // Varmistetaan nollaus alussa

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

        const qIndex = appData.currentQuarter - 1;
        const currentQuarterIsActiveAndNotEnded =
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes[qIndex] instanceof Date &&
            !(appData.quarterEndTimes[qIndex] instanceof Date);
        const now = new Date();

        if (appData.currentQuarter === 0) { // Aloitetaan Q1
            appData.currentQuarter = 1;
            appData.quarterStartTimes[0] = now;
            appData.currentQuarterFouls = 0; // Nollataan virheet Q1 alussa
            resumeAllPlayerTimers(now);
            logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q1 alkoi` });
        } else if (currentQuarterIsActiveAndNotEnded) { // Jakso on käynnissä -> Päätetään se
            pauseAllPlayerTimers(now);
            appData.quarterEndTimes[appData.currentQuarter - 1] = now;
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
            if (appData.currentQuarter === 4) {
                 endGameBtn.focus();
            }
        } else { // Edellinen jakso on päättynyt, aloitetaan seuraava
            if (appData.currentQuarter < 4) {
                appData.currentQuarter++;
                appData.quarterStartTimes[appData.currentQuarter - 1] = now;
                appData.currentQuarterFouls = 0; // NOLLATAAN VIRHEET UUDEN JAKSON ALUSSA
                resumeAllPlayerTimers(now);
                logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            }
        }
        saveData();
        renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        if (!confirm("Haluatko varmasti lopettaa pelin?")) return; // Varmistus

        const now = new Date();

        if (appData.isGamePaused) {
            const pauseEndTime = now;
            if(appData.lastPauseStartTime instanceof Date) {
                appData.totalManualPauseDurationSeconds += (pauseEndTime - appData.lastPauseStartTime) / 1000;
            }
            appData.isGamePaused = false;
            appData.lastPauseStartTime = null;
        }

        const qIndex = appData.currentQuarter - 1;
        if (appData.currentQuarter > 0 && appData.quarterStartTimes[qIndex] instanceof Date && !(appData.quarterEndTimes[qIndex] instanceof Date)) {
            pauseAllPlayerTimers(now);
            appData.quarterEndTimes[qIndex] = now;
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi (pelin lopetus)` });
        }

        appData.gameEnded = true; appData.endTime = now;
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli päättyi" });
        saveData();
        renderAll();
    });

    togglePauseBtn.addEventListener('click', () => {
        if (togglePauseBtn.disabled) return;
        if (!appData.gameStarted || appData.gameEnded) return;

        const qIndex = appData.currentQuarter - 1;
        const currentQuarterIsActiveAndNotEnded =
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes[qIndex] instanceof Date &&
            !(appData.quarterEndTimes[qIndex] instanceof Date);

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
            if(appData.lastPauseStartTime instanceof Date) {
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

    // --- NÄYTTÖJEN PÄIVITYS ---
    function updateDisplays() {
        updateCurrentGameNameDisplay();
        updateScoreDisplay();
        updateQuarterFoulDisplay(); // Päivittää vain jakson virheet näytöllä
        updateTotalFoulDisplayForReport(); // Päivittää raportin yhteenvedon kokonaisvirheet
        updateQuarterButtonState();
        updatePauseButtonState();
        updateMainGameControlButtonsState();
    }

    function updateMainGameControlButtonsState() {
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        endGameBtn.disabled = !appData.gameStarted || appData.gameEnded;
         if (appData.gameEnded) {
            startGameBtn.textContent = "Uusi Peli";
        } else if (appData.gameStarted) {
             startGameBtn.textContent = "Peli Käynnissä";
        } else {
            startGameBtn.textContent = "Aloita Peli";
        }
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
            togglePauseBtn.style.backgroundColor = ""; // Palauta oletusväri
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
                nextQuarterBtn.disabled = appData.isGamePaused; // Ei voi aloittaa jos pausella? Ehkä turha esto.
            } else if (currentQuarterHasStarted && !currentQuarterHasEnded) {
                 nextQuarterBtn.textContent = `Päätä Q${appData.currentQuarter}`;
                 nextQuarterBtn.disabled = appData.isGamePaused; // Ei voi päättää, jos manuaalisesti pausella
            } else if (currentQuarterHasEnded) {
                if (appData.currentQuarter < 4) {
                    nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`;
                    nextQuarterBtn.disabled = appData.isGamePaused; // Ei voi aloittaa jos pausella? Ehkä turha esto.
                } else {
                    nextQuarterBtn.textContent = `Peli Ohi`;
                    nextQuarterBtn.disabled = true;
                }
            } else {
                 nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`; // Varmuuden vuoksi
                 nextQuarterBtn.disabled = appData.isGamePaused;
            }
        }
    }

    function updateCurrentGameNameDisplay() {
        const home = appData.homeTeamName || "Koti";
        const away = appData.awayTeamName || "Vieras";
        if(currentGameNameDisplay) currentGameNameDisplay.textContent = `${home} vs ${away}`;
        if (reportGameNameDisplay) reportGameNameDisplay.textContent = `${home} vs ${away}`;
    }

    function updateScoreDisplay() {
        const homeScore = appData.players.reduce((sum, player) => sum + player.points, 0);
        if(homeScoreDisplay) homeScoreDisplay.textContent = homeScore;
        if(opponentScoreDisplay) opponentScoreDisplay.textContent = appData.opponentScore;
        // Päivitetään myös raportin yhteenveto
        if (reportHomeScore) reportHomeScore.textContent = homeScore;
        if (reportOpponentScore) reportOpponentScore.textContent = appData.opponentScore;
    }

    // Päivittää "Virheet tässä jaksossa" näytön pelinäkymässä
    function updateQuarterFoulDisplay() {
        if (homeFoulsDisplay) {
            homeFoulsDisplay.textContent = appData.currentQuarterFouls;
        }
    }

    // Päivittää raportin yhteenvedon kokonaisvirheet
    function updateTotalFoulDisplayForReport() {
        if (reportHomeFouls) {
            const totalHomeFouls = appData.players.reduce((sum, player) => sum + player.fouls, 0);
            reportHomeFouls.textContent = totalHomeFouls;
        }
    }

    // Input-kuuntelijat
    homeTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); });
    awayTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); });
    maxPlayersOnCourtSetting.addEventListener('change', saveData);

    // --- HISTORIA ---
    function logEvent(eventData) {
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let finalDescription = eventData.descriptionMaster || "";
        const eventQuarterForLog = getCurrentQuarterForLog();

        if (!finalDescription) {
            let playerPrefix = "";
            if (eventData.playerId) {
                const player = appData.players.find(p => p.id === eventData.playerId);
                if (player) {
                    playerPrefix = `#${eventData.playerNumber || player.number} ${eventData.playerName || player.name} | `;
                } else if (eventData.playerNumber && eventData.playerName) {
                     playerPrefix = `#${eventData.playerNumber} ${eventData.playerName} | `;
                }
            }
            finalDescription = `${timeString} ${eventQuarterForLog} – ${playerPrefix}${eventData.descriptionDetails || eventData.type || 'Tuntematon tapahtuma'}`;
        } else {
            if (!finalDescription.includes(timeString) &&
                (appData.gameStarted || ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END', 'OPPONENT_SCORE'].includes(eventData.type))) {
                 finalDescription = `${timeString} ${eventQuarterForLog} – ${finalDescription}`;
            }
        }

        const fullEventData = {
            id: generateEventId(),
            timestamp: timestamp,
            quarterInfo: eventQuarterForLog,
            description: finalDescription,
            type: eventData.type,
            value: eventData.value,
            playerId: eventData.playerId,
            playerName: eventData.playerName,
            playerNumber: eventData.playerNumber
        };

        appData.gameHistory.push(fullEventData);
        // Ei kutsuta renderHistory() tai saveData() tässä
    }

    function renderHistory() {
        if (!gameHistoryLog) return; // Varmistus
        gameHistoryLog.innerHTML = '';
        const gameTitle = (appData.homeTeamName || "Koti") + " vs " + (appData.awayTeamName || "Vieras");

        if ((appData.homeTeamName && appData.awayTeamName) || appData.gameHistory.length > 0) {
            const gameNameHeader = document.createElement('div');
            gameNameHeader.className = 'history-log-entry game-title-header';
            gameNameHeader.innerHTML = `<p>Peli: ${gameTitle}</p>`;
            gameHistoryLog.appendChild(gameNameHeader);
        }

        if (appData.gameHistory.length === 0) {
            gameHistoryLog.innerHTML += '<p>Ei tapahtumia vielä.</p>'; return;
        }

        [...appData.gameHistory].reverse().forEach(event => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-log-entry';
            const p = document.createElement('p');
            p.textContent = event.description;
            entryDiv.appendChild(p);
            const removableTypes = ['SCORE', 'FOUL', 'ASSIST', 'REBOUND', 'OPPONENT_SCORE'];
            if (removableTypes.includes(event.type)) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn';
                removeBtn.textContent = 'Peru';
                removeBtn.title = "Poista tämä tapahtuma ja kumoa sen vaikutukset tilastoihin (ei peliaikaan/jaksovirheisiin)";
                removeBtn.dataset.eventId = event.id;
                removeBtn.addEventListener('click', () => removeHistoryEvent(event.id));
                entryDiv.appendChild(removeBtn);
            }
            gameHistoryLog.appendChild(entryDiv);
        });
    }

    function removeHistoryEvent(eventId) {
        const eventIndex = appData.gameHistory.findIndex(event => event.id === eventId);
        if (eventIndex === -1) { console.error("Poistettavaa tapahtumaa ei löytynyt:", eventId); return; }

        const eventToRemove = appData.gameHistory[eventIndex];

        if (!confirm(`Haluatko varmasti poistaa tapahtuman: "${eventToRemove.description}"? Tätä ei voi kumota ja se ei korjaa peliaikoja tai jaksovirhelaskuria taannehtivasti.`)) return;

        const player = eventToRemove.playerId ? appData.players.find(p => p.id === eventToRemove.playerId) : null;

        // Kumoa vaikutukset pelaajan kokonaistilastoihin tai vastustajan pisteisiin
        if (player) {
            switch (eventToRemove.type) {
                case 'SCORE': if (typeof eventToRemove.value === 'number') { player.points = Math.max(0, player.points - eventToRemove.value); } break;
                case 'FOUL':
                    player.fouls = Math.max(0, player.fouls - 1); // Vähennä kokonaisvirhe
                    // HUOM: Ei vähennetä appData.currentQuarterFouls, koska emme tiedä, miltä jaksolta virhe oli.
                    //       Tämä on rajoitus. Voisimme tallentaa jakson numeron eventtiin, mutta se monimutkaistaisi.
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        logEvent({ type: 'GAME_EVENT', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionMaster: `#${eventToRemove.playerNumber || player.number} ${eventToRemove.playerName || player.name} | Ei enää 'fouled out' (virheen poisto)` });
                    } break;
                case 'ASSIST': player.assists = Math.max(0, player.assists - 1); break;
                case 'REBOUND': player.rebounds = Math.max(0, player.rebounds - 1); break;
            }
        } else if (eventToRemove.type === 'OPPONENT_SCORE') {
            if (typeof eventToRemove.value === 'number') {
                appData.opponentScore = Math.max(0, appData.opponentScore - eventToRemove.value);
            }
        }

        // Poista tapahtuma historiasta
        appData.gameHistory.splice(eventIndex, 1);

        console.warn("Tapahtuma poistettu, mutta pelaajien peliaikoja ja jaksovirhelaskuria EI ole korjattu taannehtivasti.");

        saveData(); renderAll(); // Päivitä kaikki näkymät
    }

    copyHistoryBtn.addEventListener('click', () => {
        let historyText = `${appData.homeTeamName || "Koti"} vs ${appData.awayTeamName || "Vieras"}\n`;
        historyText += `Pelaajia kentällä (max): ${appData.maxPlayersOnCourt}\n`;
        const homeScore = appData.players.reduce((sum, p) => sum + p.points, 0);
        const totalHomeFouls = appData.players.reduce((sum, p) => sum + p.fouls, 0); // Lasketaan kokonaisvirheet
        historyText += `Lopputulos: ${homeScore} - ${appData.opponentScore}\n`;
        historyText += `Kotijoukkueen kokonaisvirheet: ${totalHomeFouls}\n--------------------\n`;
        appData.gameHistory.forEach(event => { historyText += event.description + '\n'; });
        if (navigator.clipboard) {
            navigator.clipboard.writeText(historyText)
                .then(() => alert('Historia kopioitu leikepöydälle!'))
                .catch(err => { console.error('Virhe kopioinnissa: ', err); alert('Kopiointi epäonnistui.'); });
        } else {
            const textArea = document.createElement("textarea"); textArea.value = historyText;
            document.body.appendChild(textArea); textArea.focus(); textArea.select();
            try { document.execCommand('copy'); alert('Historia kopioitu leikepöydälle!'); }
            catch (err) { console.error('Fallback kopiointivirhe: ', err); alert('Kopiointi epäonnistui.'); }
            document.body.removeChild(textArea);
        }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot sekä peliajat? Pelaajia, joukkueiden nimiä ja asetuksia ei poisteta.")) {
            const playersBackup = [...appData.players]; // Otetaan pelaajat talteen
            const homeName = appData.homeTeamName;
            const awayName = appData.awayTeamName;
            const maxP = appData.maxPlayersOnCourt;

            resetGameStatsAndState(true); // Nollaa kaiken paitsi pelaajat/asetukset

            // Palautetaan pelaajat ja asetukset varmuuden vuoksi (resetGameStatsAndState(true) pitäisi hoitaa tämä, mutta tuplavarmistus)
            appData.players = playersBackup.map(p => ({ ...p, points: 0, fouls: 0, assists: 0, rebounds: 0, onCourt: false, fouledOut: false, timeOnCourtSeconds: 0, lastTimeEnteredCourt: null }));
            appData.homeTeamName = homeName;
            appData.awayTeamName = awayName;
            appData.maxPlayersOnCourt = maxP;
            homeTeamNameInput.value = homeName;
            awayTeamNameInput.value = awayName;
            maxPlayersOnCourtSetting.value = maxP.toString();

            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData(); renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot/peliajat nollattu.");
        }
    });

    // --- OHJEIDEN POPUP ---
    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) {
        openInstructionsLink.addEventListener('click', (e) => { e.preventDefault(); instructionsModal.classList.remove('hidden'); });
        closeInstructionsBtn.addEventListener('click', () => { instructionsModal.classList.add('hidden'); });
        instructionsModal.addEventListener('click', (e) => { if (e.target === instructionsModal) { instructionsModal.classList.add('hidden'); } });
    } else { console.warn("Ohjeiden popup-elementtejä ei löytynyt."); }

    // --- RAPORTTINÄKYMÄN LOGIIKKA ---
    function renderReportView() {
        if (!reportView || !reportTableContainer || !reportGameStatus || !reportTotalGameTime || !reportHomeScore || !reportOpponentScore || !reportHomeFouls) {
             console.error("Raporttinäkymän elementtejä puuttuu!");
             if(reportView) reportView.innerHTML = "<p>Virhe raporttinäkymän elementeissä.</p>";
             return;
        }
        if (reportView.classList.contains('hidden')) return;

        // Päivitetään yhteenveto ensin
        reportGameStatus.textContent = appData.gameEnded ? "Päättynyt" : (appData.gameStarted ? (appData.isGamePaused ? "Katkolla" : `Käynnissä - ${getCurrentQuarterForLog()}`) : "Ei aloitettu");

        // Päivitetään pisteet ja KOKONAISvirheet yhteenvetoon
        const homeScoreForReport = appData.players.reduce((sum, player) => sum + player.points, 0);
        const totalHomeFoulsForReport = appData.players.reduce((sum, player) => sum + player.fouls, 0);
        reportHomeScore.textContent = homeScoreForReport;
        reportOpponentScore.textContent = appData.opponentScore;
        reportHomeFouls.textContent = totalHomeFoulsForReport; // Varmistaa kokonaisvirheet täällä

        if (!appData.gameStarted && !appData.gameEnded) {
            reportTableContainer.innerHTML = "<p>Peli ei ole vielä alkanut tai dataa ei ole saatavilla.</p>";
            reportTotalGameTime.textContent = "00:00";
            return;
        }

        // Laske pelin kokonaiskesto aktiivisena
        let gameActiveDurationSeconds = 0;
        if (appData.startTime) {
            const referenceEndTime = appData.endTime || new Date();
            const grossDurationSeconds = (referenceEndTime - appData.startTime) / 1000;
            let totalQuarterBreakSeconds = 0;
            for (let i = 0; i < appData.quarterEndTimes.length; i++) {
                if (appData.quarterStartTimes[i + 1] instanceof Date && appData.quarterEndTimes[i] instanceof Date) {
                    totalQuarterBreakSeconds += (appData.quarterStartTimes[i + 1] - appData.quarterEndTimes[i]) / 1000;
                }
            }
             const lastEndedQuarterIndex = appData.quarterEndTimes.length - 1;
             if (!appData.gameEnded && lastEndedQuarterIndex >= 0 && appData.quarterEndTimes[lastEndedQuarterIndex] instanceof Date && !(appData.quarterStartTimes[lastEndedQuarterIndex + 1] instanceof Date)) {
                  const timeSinceLastQuarterEnd = (new Date() - appData.quarterEndTimes[lastEndedQuarterIndex]) / 1000;
                  // Lasketaan tauoksi vain jos peli on alkanut ja jaksoja pelattu
                  if (appData.quarterStartTimes.length > 0) {
                      totalQuarterBreakSeconds += Math.max(0, timeSinceLastQuarterEnd);
                  }
             }


            gameActiveDurationSeconds = grossDurationSeconds - (appData.totalManualPauseDurationSeconds || 0) - totalQuarterBreakSeconds;
            gameActiveDurationSeconds = Math.max(0, gameActiveDurationSeconds);
        }

        reportTotalGameTime.textContent = formatTimeMMSS(gameActiveDurationSeconds);

        // Rakenna pelaajataulukko
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
            const qIndex = appData.currentQuarter - 1;
            const isQuarterCurrentlyActive = appData.currentQuarter > 0 &&
                                           appData.quarterStartTimes[qIndex] instanceof Date &&
                                           !(appData.quarterEndTimes[qIndex] instanceof Date);

            if (player.onCourt && player.lastTimeEnteredCourt instanceof Date && !appData.isGamePaused && isQuarterCurrentlyActive) {
                currentSessionTimeSeconds = (new Date() - player.lastTimeEnteredCourt) / 1000;
            }
            const totalPlayerTime = (player.timeOnCourtSeconds || 0) + currentSessionTimeSeconds;
            const playingTimeFormatted = formatTimeMMSS(totalPlayerTime);
            const playingPercentage = gameActiveDurationSeconds > 0.1 ? ((totalPlayerTime / gameActiveDurationSeconds) * 100).toFixed(1) : "0.0";

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
        reportTableContainer.innerHTML = tableHTML;
    }


    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
         if (!setupView || !gameView || !historyView || !reportView) {
             console.error("Yksi tai useampi näkymäelementti puuttuu!");
             document.body.innerHTML = "Virhe: Sovelluksen käyttöliittymäelementtejä ei löytynyt.";
             return;
         }

        [setupView, gameView, historyView, reportView].forEach(view => {
            view.classList.toggle('hidden', view.id !== viewId);
        });

        if (viewId === 'gameView') { renderGamePlayerList(); updateDisplays(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView') {
            updateCurrentGameNameDisplay();
            renderReportView(); // Generoi raportin sisällön ja päivittää yhteenvedon
        }
    }

    navigateToGameBtn.addEventListener('click', () => {
        if ((homeTeamNameInput.value.trim() || "Kobrat").toLowerCase().includes("kobra") && appData.players.length === 0) {
            alert("Lisää vähintään yksi pelaaja kotijoukkueelle tai muuta joukkueen nimi."); return;
        }
        if (!homeTeamNameInput.value.trim() || !awayTeamNameInput.value.trim()) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        saveData();
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView'));
    if(backToGameFromHistoryBtnReport) backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    if(backToGameFromReportBtn) backToGameFromReportBtn.addEventListener('click', () => showView('gameView'));


    // --- ALUSTUS ---
    loadData();
    showView('setupView');
});