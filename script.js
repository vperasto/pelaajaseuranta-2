document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTIT ---
    // Otetaan kaikki elementit molemmista versioista, varmistetaan ID:t HTML:stä
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
    // HUOM: reportContent-ID:tä ei ollut kummassakaan JS-versiossa, mutta se oli HTML:ssä ja vanhemmassa CSS:ssä.
    // Käytetään reportTableContaineria, joka löytyy HTML:stä ja uudemmasta JS:stä.
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

    // --- SOVELLUKSEN TILA (appData) - Yhdistetty ---
    let appData = {
        homeTeamName: "Kobrat",
        awayTeamName: "",
        players: [], // Pelaajaobjektit sisältävät nyt peliaikatiedot
        gameHistory: [],
        gameStarted: false, gameEnded: false, isGamePaused: false, // isGamePaused = manuaalinen katko
        lastPauseStartTime: null, // Manuaalisen katkon alkuaika
        currentQuarter: 0,
        maxPlayersOnCourt: 5,
        opponentScore: 0,
        startTime: null, endTime: null,
        quarterStartTimes: [], // Taulukko Date-objekteille
        quarterEndTimes: [],   // Taulukko Date-objekteille
        totalManualPauseDurationSeconds: 0, // Yhteenlaskettu manuaalisten katkojen kesto
    };

    const LOCAL_STORAGE_KEY = 'basketTrackerData_v1.2'; // Vakio avaimelle

    // --- DATAN HALLINTA (Parempi `loadData` uudemmasta) ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue";
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue";
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
        // console.log("Data saved"); // Debug
    }

    function loadData() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            const loaded = JSON.parse(storedData);
            const defaultAppData = { // Oletusarvot selkeämmin
                homeTeamName: "Kobrat", awayTeamName: "", players: [], gameHistory: [],
                gameStarted: false, gameEnded: false, isGamePaused: false,
                lastPauseStartTime: null, currentQuarter: 0, maxPlayersOnCourt: 5,
                opponentScore: 0, startTime: null, endTime: null,
                quarterStartTimes: [], quarterEndTimes: [], totalManualPauseDurationSeconds: 0,
            };
            appData = { ...defaultAppData, ...loaded };

            // Muunnetaan tallennetut ajat Date-objekteiksi
            appData.startTime = loaded.startTime ? new Date(loaded.startTime) : null;
            appData.endTime = loaded.endTime ? new Date(loaded.endTime) : null;
            appData.lastPauseStartTime = loaded.lastPauseStartTime ? new Date(loaded.lastPauseStartTime) : null;
            // Varmistetaan, että taulukot ovat taulukoita ja sisältävät Date-objekteja
            appData.quarterStartTimes = (loaded.quarterStartTimes || []).map(t => t ? new Date(t) : null).filter(t => t instanceof Date);
            appData.quarterEndTimes = (loaded.quarterEndTimes || []).map(t => t ? new Date(t) : null).filter(t => t instanceof Date);
            // Varmistetaan historia ja sen timestampit
            appData.gameHistory = (loaded.gameHistory || []).map(event => ({
                ...event,
                timestamp: event.timestamp ? new Date(event.timestamp) : null
            }));
            // Varmistetaan pelaajadata ja lisätään puuttuvat peliaikakentät oletusarvoilla
            appData.players = (loaded.players || []).map(p => ({
                fouledOut: false, points: 0, fouls: 0, assists: 0, rebounds: 0, onCourt: false,
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null, // Peliajan oletukset
                ...p, // Ladatut arvot ylikirjoittavat oletukset
                // Varmistetaan, että lastTimeEnteredCourt on Date tai null
                lastTimeEnteredCourt: p.lastTimeEnteredCourt ? new Date(p.lastTimeEnteredCourt) : null,
                timeOnCourtSeconds: p.timeOnCourtSeconds || 0 // Varmistetaan numeroksi
            }));
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

    // --- APUFUNKTIOT (Uudemmasta versiosta) ---
    function generateEventId() { return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }

    function formatTimeMMSS(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function getCurrentQuarterForLog() {
        // Käytetään uudemman version logiikkaa, joka perustuu quarterTimes-taulukoihin
        if (!appData.gameStarted || appData.currentQuarter === 0) return "Ennen peliä";
        const qIndex = appData.currentQuarter - 1;
        const quarterHasStarted = appData.quarterStartTimes[qIndex] instanceof Date;
        const quarterHasEnded = appData.quarterEndTimes[qIndex] instanceof Date;

        if (appData.isGamePaused) return `Q${appData.currentQuarter} (Katko)`;
        // Tarkempi tauon tunnistus: jakso päättynyt, seuraava ei alkanut, peli ei lopussa
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter < 4 && !appData.gameEnded && !(appData.quarterStartTimes[qIndex+1] instanceof Date)) return `Tauko (ennen Q${appData.currentQuarter + 1})`;
        if (quarterHasStarted && quarterHasEnded && appData.currentQuarter === 4 && !appData.gameEnded) return `Pelin jälkeen (Q4)`;
        if (appData.gameEnded) return "Pelin jälkeen";
        if (quarterHasStarted && !quarterHasEnded) return `Q${appData.currentQuarter}`; // Jakso käynnissä
        return `Q${appData.currentQuarter}`; // Oletus (ei pitäisi tapahtua usein)
    }


    // --- PELIAJAN LASKENTAAN LIITTYVÄT TOIMINNOT (Uudemmasta versiosta, hieman muokattu) ---
    function recordPlayerTimeOnCourt(player, sessionEndTime = new Date()) {
        // Tallentaa ajan vain, jos pelaaja oli kentällä ja kellon käynnistysaika on tiedossa
        if (player.onCourt && player.lastTimeEnteredCourt instanceof Date) {
            const sessionDurationSeconds = (sessionEndTime - player.lastTimeEnteredCourt) / 1000;
            if (sessionDurationSeconds > 0) { // Lisätään aikaa vain jos se on positiivinen
                player.timeOnCourtSeconds = (player.timeOnCourtSeconds || 0) + sessionDurationSeconds;
                // console.log(`Pelaaja ${player.number} aikaa lisätty: ${sessionDurationSeconds.toFixed(1)}s, yhteensä: ${player.timeOnCourtSeconds.toFixed(1)}s`);
            }
        }
        // lastTimeEnteredCourt asetetaan/nollataan siellä, missä pelaajan tila tai pelin tila muuttuu
    }

    function pauseAllPlayerTimers(pauseTime = new Date()) {
        // console.log("pauseAllPlayerTimers called");
        appData.players.forEach(p => {
            if (p.onCourt && p.lastTimeEnteredCourt instanceof Date) {
                // Tallenna tähänastinen aika
                const sessionDurationSeconds = (pauseTime - p.lastTimeEnteredCourt) / 1000;
                 if (sessionDurationSeconds > 0) {
                    p.timeOnCourtSeconds = (p.timeOnCourtSeconds || 0) + sessionDurationSeconds;
                    // console.log(`Pelaajan ${p.number} kello pysäytetty, aikaa lisätty: ${sessionDurationSeconds.toFixed(1)}s`);
                }
                // Merkitään, että kello ei ole enää aktiivisesti käynnissä tälle sessiolle
                p.lastTimeEnteredCourt = null;
            }
        });
    }

    function resumeAllPlayerTimers(resumeTime = new Date()) {
        // console.log("resumeAllPlayerTimers called");
        appData.players.forEach(p => {
            // Aseta uusi aloitusaika vain kentällä oleville pelaajille
            if (p.onCourt) {
                p.lastTimeEnteredCourt = resumeTime;
                // console.log(`Pelaajan ${p.number} kello jatkuu`);
            }
        });
    }

    // --- PELAAJIEN HALLINTA (Vanhemmasta versiosta, peliajan alustus lisätty) ---
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
                timeOnCourtSeconds: 0, lastTimeEnteredCourt: null // Peliajan alustus
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
                    // TODO: Pitäisikö poistaa myös pelaajan tapahtumat historiasta? Voi olla monimutkaista.
                    saveData(); renderPlayers(); renderGamePlayerList(); updateGameControlsAndDisplays();
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

            // Toimintonapit näkyvillä eri ehdoilla
            const pointsAndFoulButtonsVisible = player.onCourt && !player.fouledOut;
            const assistReboundButtonsVisible = player.onCourt && !player.fouledOut && !appData.isGamePaused; // Ei näy katkolla

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

    // handleToggleStatus - Yhdistetty versio peliajan käsittelyllä
    function handleToggleStatus(event) {
        if (event.target.disabled) return;
        if ((!appData.gameStarted && appData.currentQuarter === 0) || appData.gameEnded) {
            alert("Peli ei ole käynnissä tai on päättynyt."); return;
        }
        const playerId = event.target.dataset.id;
        const player = appData.players.find(p => p.id === playerId);
        if (player && !player.fouledOut) {
            const now = new Date();
            if (!player.onCourt) { // Tulee kentälle
                const playersCurrentlyOnCourt = appData.players.filter(p => p.onCourt).length;
                if (playersCurrentlyOnCourt >= appData.maxPlayersOnCourt) {
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa!`); return;
                }
                // Aloita ajanotto vasta kun pelaaja *on* merkitty kentälle
            } else { // Menee penkille
                // Tallenna edellinen aika ennen kuin merkitään penkille
                recordPlayerTimeOnCourt(player, now);
                player.lastTimeEnteredCourt = null; // Nollaa kellon aloitusaika
            }

            // Muuta tila
            player.onCourt = !player.onCourt;

            // Jos meni kentälle, aseta kellon aloitusaika NYT
            if (player.onCourt && !appData.isGamePaused && appData.currentQuarter > 0 && appData.quarterEndTimes.length < appData.currentQuarter) {
                 player.lastTimeEnteredCourt = now;
            } else {
                 player.lastTimeEnteredCourt = null; // Varmistus, että kello ei lähde käyntiin katkon/tauon aikana
            }

            logEvent({
                type: 'SUBSTITUTION',
                playerId: player.id,
                playerName: player.name, // Lisätään nimi ja numero logiin
                playerNumber: player.number,
                descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData(); renderAll(); // renderGamePlayerList + renderHistory
        }
    }

    // handlePlayerAction - Vanhemmasta versiosta, lisätty pelaajatiedot logiin
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
            if (!player.onCourt && action !== 'foul') {
                 alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä.`); return;
            }
            if (player.fouledOut && action === 'foul') { // Vain virhe tarkistetaan fouledOut-tilassa
                 alert(`Pelaaja #${player.number} ${player.name} on jo poistettu pelistä 5 virheen takia.`); return;
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
                            // Logataan erillinen vaihto penkille
                            logEvent({ type: 'SUBSTITUTION', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionDetails: `Penkille (5 virhettä)` });
                        }
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            // Logaa varsinainen tapahtuma (virhe, piste, syöttö, levypallo)
            logEvent({
                type: eventType,
                playerId: player.id,
                playerName: player.name, // Lisätään nimi ja numero logiin
                playerNumber: player.number,
                value: eventValue,
                descriptionDetails: eventDescriptionDetails
            });
            saveData(); renderAll(); // renderGamePlayerList + updateDisplays + renderHistory
        }
    }

    // --- VASTUSTAJAN PISTEIDEN KÄSITTELY (Vanhemmasta)---
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

    // --- PELIN KULKU (Uudemman version logiikka peliajan käsittelyllä) ---
    function resetGameStatsAndState(keepPlayersAndSettings = false) {
        // ... (Kuten uudemmassa versiossa, varmista että nollaa peliaikaan liittyvät kentät) ...
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
        // ... (Tarkistukset kuten uudemmassa) ...
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
        appData.currentQuarter = 0; // Q1 aloitetaan nextQuarterBtn:llä

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

        const qIndex = appData.currentQuarter - 1; // Nykyisen (jos > 0) jakson indeksi
        const currentQuarterIsActiveAndNotEnded =
            appData.currentQuarter > 0 &&
            appData.quarterStartTimes[qIndex] instanceof Date &&
            !(appData.quarterEndTimes[qIndex] instanceof Date);
        const now = new Date();

        if (appData.currentQuarter === 0) { // Aloitetaan Q1
            appData.currentQuarter = 1;
            appData.quarterStartTimes[0] = now;
            resumeAllPlayerTimers(now); // Aloita kentällä olevien kellot
            logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q1 alkoi` });
        } else if (currentQuarterIsActiveAndNotEnded) { // Jakso on käynnissä -> Päätetään se
            pauseAllPlayerTimers(now); // Pysäytä kellot jakson loppuun
            appData.quarterEndTimes[appData.currentQuarter - 1] = now;
            logEvent({ type: 'QUARTER_END', descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
            if (appData.currentQuarter === 4) {
                 endGameBtn.focus(); // Ohjaa fokus Lopeta Peli -nappiin Q4:n jälkeen
            }
        } else { // Edellinen jakso on päättynyt, aloitetaan seuraava (jos ei Q4)
            if (appData.currentQuarter < 4) {
                appData.currentQuarter++;
                appData.quarterStartTimes[appData.currentQuarter - 1] = now;
                resumeAllPlayerTimers(now); // Aloita kentällä olevien kellot uudelleen
                logEvent({ type: 'QUARTER_START', descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            }
        }
        saveData();
        renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;
        const now = new Date();

        if (appData.isGamePaused) { // Jos oli manuaalinen katko päällä
            const pauseEndTime = now;
            if(appData.lastPauseStartTime instanceof Date) { // Varmistus
                appData.totalManualPauseDurationSeconds += (pauseEndTime - appData.lastPauseStartTime) / 1000;
            }
            appData.isGamePaused = false;
            appData.lastPauseStartTime = null;
            // Ei logata "peli jatkuu", koska peli loppuu
        }

        // Varmistetaan, että viimeisin aktiivinen jakso merkitään päättyneeksi ja kellot pysäytetään
        const qIndex = appData.currentQuarter - 1;
        if (appData.currentQuarter > 0 && appData.quarterStartTimes[qIndex] instanceof Date && !(appData.quarterEndTimes[qIndex] instanceof Date)) {
            pauseAllPlayerTimers(now);
            appData.quarterEndTimes[qIndex] = now;
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
            pauseAllPlayerTimers(now); // Pysäytä pelaajien kellot
            logEvent({ type: 'PAUSE', descriptionMaster: "Pelikatko alkoi (manuaalinen)" });
        } else {
            if(appData.lastPauseStartTime instanceof Date) {
                const pauseDuration = (now - appData.lastPauseStartTime) / 1000;
                appData.totalManualPauseDurationSeconds += pauseDuration;
                logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu (katko ${Math.round(pauseDuration)}s)` });
            } else {
                 logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu` }); // Jos jostain syystä lastPauseStartTime puuttui
            }
            appData.lastPauseStartTime = null;
            resumeAllPlayerTimers(now); // Jatka pelaajien kelloja
        }
        saveData();
        renderAll();
    });

    // --- NÄYTTÖJEN PÄIVITYS (Uudemmasta) ---
    function updateMainGameControlButtonsState() {
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        endGameBtn.disabled = !appData.gameStarted || appData.gameEnded;
        // Päivitetään myös startGameBtn teksti
         if (appData.gameEnded) {
            startGameBtn.textContent = "Uusi Peli"; // Mahdollistaa uuden pelin aloittamisen
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
            togglePauseBtn.style.backgroundColor = "";
        }
    }

    function updateQuarterButtonState() {
        if (!appData.gameStarted) {
            nextQuarterBtn.textContent = `Aloita Q1`;
            nextQuarterBtn.disabled = true; // Aktivoituu vasta kun startGameBtn painettu
        } else if (appData.gameEnded) {
            nextQuarterBtn.textContent = `Peli Päättynyt`;
            nextQuarterBtn.disabled = true;
        } else {
            const qIndex = appData.currentQuarter - 1;
            const currentQuarterHasStarted = appData.currentQuarter > 0 && appData.quarterStartTimes[qIndex] instanceof Date;
            const currentQuarterHasEnded = appData.currentQuarter > 0 && appData.quarterEndTimes[qIndex] instanceof Date;

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
            } else { // Ei pitäisi tapahtua, mutta varmuuden vuoksi
                 nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`;
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
        // Päivitetään myös raportin yhteenveto, jos elementit löytyvät
        if (reportHomeScore) reportHomeScore.textContent = homeScore;
        if (reportOpponentScore) reportOpponentScore.textContent = appData.opponentScore;
    }
    function updateFoulDisplay() {
        const homeFouls = appData.players.reduce((sum, player) => sum + player.fouls, 0);
        homeFoulsDisplay.textContent = homeFouls;
        // Päivitetään myös raportin yhteenveto
        if (reportHomeFouls) reportHomeFouls.textContent = homeFouls;
    }

    // Input-kuuntelijat (Vanhemmasta)
    homeTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); }); // Päivitä otsikko heti
    awayTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); }); // Päivitä otsikko heti
    maxPlayersOnCourtSetting.addEventListener('change', saveData);

    // --- HISTORIA (Funktiot vanhemmasta versiosta) ---
    function logEvent(eventData) {
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let finalDescription = eventData.descriptionMaster || "";
        const eventQuarterForLog = getCurrentQuarterForLog(); // Käytetään nykyistä jakson tilaa

        if (!finalDescription) { // Muodostetaan kuvaus, jos master-kuvausta ei annettu
            let playerPrefix = "";
            if (eventData.playerId) {
                const player = appData.players.find(p => p.id === eventData.playerId);
                if (player) {
                    playerPrefix = `#${eventData.playerNumber || player.number} ${eventData.playerName || player.name} | `;
                } else if (eventData.playerNumber && eventData.playerName) { // Fallback, jos pelaaja poistettu
                     playerPrefix = `#${eventData.playerNumber} ${eventData.playerName} | `;
                }
            }
            finalDescription = `${timeString} ${eventQuarterForLog} – ${playerPrefix}${eventData.descriptionDetails || eventData.type || 'Tuntematon tapahtuma'}`;
        } else { // Jos master-kuvaus annettu, lisätään aika ja jakso eteen (jos järkevää)
            if (!finalDescription.includes(timeString) &&
                (appData.gameStarted || ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END', 'OPPONENT_SCORE'].includes(eventData.type))) {
                 finalDescription = `${timeString} ${eventQuarterForLog} – ${finalDescription}`;
            }
        }
        // Kerätään kaikki relevantit tiedot tapahtumaobjektiin
        const fullEventData = {
            id: generateEventId(),
            timestamp: timestamp,
            quarterInfo: eventQuarterForLog, // Jakson tila loggaushetkellä
            description: finalDescription,
            type: eventData.type, // Tapahtuman tyyppi (SCORE, FOUL, etc.)
            value: eventData.value, // Esim. pisteiden määrä
            playerId: eventData.playerId,
            playerName: eventData.playerName, // Tallennetaan nimi historian varalle
            playerNumber: eventData.playerNumber // Tallennetaan numero historian varalle
        };
        // Poistetaan turhat kentät, jos ne ovat jo mukana descriptionissa tms.
        // delete fullEventData.descriptionDetails;
        // delete fullEventData.descriptionMaster;
        appData.gameHistory.push(fullEventData);
        // HUOM: Ei kutsuta renderHistory() tai saveData() tässä, vaan sen jälkeen kun logEvent on kutsuttu.
    }

    function renderHistory() {
        gameHistoryLog.innerHTML = '';
        const gameTitle = (appData.homeTeamName || "Koti") + " vs " + (appData.awayTeamName || "Vieras");

        // Lisätään otsikko vain jos nimet on asetettu tai historiaa on
        if ((appData.homeTeamName && appData.awayTeamName) || appData.gameHistory.length > 0) {
            const gameNameHeader = document.createElement('div');
            gameNameHeader.className = 'history-log-entry game-title-header'; // Oma luokka CSS:ää varten
            gameNameHeader.innerHTML = `<p>Peli: ${gameTitle}</p>`;
            gameHistoryLog.appendChild(gameNameHeader);
        }

        if (appData.gameHistory.length === 0) {
            gameHistoryLog.innerHTML += '<p>Ei tapahtumia vielä.</p>'; return;
        }
        // Käydään historia läpi käänteisessä järjestyksessä
        [...appData.gameHistory].reverse().forEach(event => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'history-log-entry';
            const p = document.createElement('p');
            p.textContent = event.description;
            entryDiv.appendChild(p);
            // Sallitaan vain pelaajakohtaisten tapahtumien (ei vaihdot) ja vastustajan pisteiden poisto
            const removableTypes = ['SCORE', 'FOUL', 'ASSIST', 'REBOUND', 'OPPONENT_SCORE'];
            if (removableTypes.includes(event.type)) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn';
                removeBtn.textContent = 'Peru'; // Selkeämpi teksti
                removeBtn.title = "Poista tämä tapahtuma ja kumoa sen vaikutukset";
                removeBtn.dataset.eventId = event.id;
                removeBtn.addEventListener('click', () => removeHistoryEvent(event.id));
                entryDiv.appendChild(removeBtn);
            }
            gameHistoryLog.appendChild(entryDiv);
        });
        // Skrollaa uusimpaan tapahtumaan (ei välttämätön, mutta voi olla hyödyllinen)
        // gameHistoryLog.scrollTop = 0;
    }

    function removeHistoryEvent(eventId) {
        const eventIndex = appData.gameHistory.findIndex(event => event.id === eventId);
        if (eventIndex === -1) { console.error("Poistettavaa tapahtumaa ei löytynyt:", eventId); return; }

        const eventToRemove = appData.gameHistory[eventIndex];

        if (!confirm(`Haluatko varmasti poistaa tapahtuman: "${eventToRemove.description}"? Tätä ei voi kumota.`)) return;

        const player = eventToRemove.playerId ? appData.players.find(p => p.id === eventToRemove.playerId) : null;

        // Kumoaa vaikutukset pelaajan tilastoihin tai vastustajan pisteisiin
        if (player) {
            switch (eventToRemove.type) {
                case 'SCORE': if (typeof eventToRemove.value === 'number') { player.points = Math.max(0, player.points - eventToRemove.value); } break;
                case 'FOUL':
                    player.fouls = Math.max(0, player.fouls - 1);
                    // Jos pelaaja oli 'fouled out' ja virheiden määrä laskee alle 5, poistetaan fouledOut-tila
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        // HUOM: Ei automaattisesti palauta kentälle tai kumoa penkille siirtoa.
                        logEvent({ type: 'GAME_EVENT', playerId: player.id, playerName: player.name, playerNumber: player.number, descriptionMaster: `#${eventToRemove.playerNumber || player.number} ${eventToRemove.playerName || player.name} | Ei enää 'fouled out' (virheen poisto)` });
                    } break;
                case 'ASSIST': player.assists = Math.max(0, player.assists - 1); break;
                case 'REBOUND': player.rebounds = Math.max(0, player.rebounds - 1); break;
                // Vaihtojen (SUBSTITUTION) kumoaminen jätetty pois monimutkaisuuden vuoksi
            }
        } else if (eventToRemove.type === 'OPPONENT_SCORE') {
            if (typeof eventToRemove.value === 'number') {
                appData.opponentScore = Math.max(0, appData.opponentScore - eventToRemove.value);
            }
        }

        // Poista tapahtuma historiasta
        appData.gameHistory.splice(eventIndex, 1);

        // HUOM: Peliajan kumoaminen on erittäin monimutkaista ja jätetty toteuttamatta.
        console.warn("Tapahtuma poistettu, mutta pelaajien peliaikoja EI ole korjattu taannehtivasti.");

        saveData(); renderAll(); // Päivitä kaikki näkymät
    }

    copyHistoryBtn.addEventListener('click', () => {
        let historyText = `${appData.homeTeamName || "Koti"} vs ${appData.awayTeamName || "Vieras"}\n`;
        historyText += `Pelaajia kentällä (max): ${appData.maxPlayersOnCourt}\n`;
        const homeScore = appData.players.reduce((sum, p) => sum + p.points, 0);
        historyText += `Lopputulos: ${homeScore} - ${appData.opponentScore}\n--------------------\n`;
        appData.gameHistory.forEach(event => { historyText += event.description + '\n'; });
        if (navigator.clipboard) {
            navigator.clipboard.writeText(historyText)
                .then(() => alert('Historia kopioitu leikepöydälle!'))
                .catch(err => { console.error('Virhe kopioinnissa: ', err); alert('Kopiointi epäonnistui.'); });
        } else { // Fallback
            const textArea = document.createElement("textarea"); textArea.value = historyText;
            document.body.appendChild(textArea); textArea.focus(); textArea.select();
            try { document.execCommand('copy'); alert('Historia kopioitu leikepöydälle!'); }
            catch (err) { console.error('Fallback kopiointivirhe: ', err); alert('Kopiointi epäonnistui.'); }
            document.body.removeChild(textArea);
        }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot sekä peliajat? Pelaajia, joukkueiden nimiä ja asetuksia ei poisteta.")) {
            resetGameStatsAndState(true); // Säilytä pelaajat ja asetukset, nollaa muut
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData(); renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot/peliajat nollattu.");
        }
    });

    // --- OHJEIDEN POPUP (Vanhemmasta)---
    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) {
        openInstructionsLink.addEventListener('click', (e) => { e.preventDefault(); instructionsModal.classList.remove('hidden'); });
        closeInstructionsBtn.addEventListener('click', () => { instructionsModal.classList.add('hidden'); });
        instructionsModal.addEventListener('click', (e) => { if (e.target === instructionsModal) { instructionsModal.classList.add('hidden'); } });
    } else { console.warn("Ohjeiden popup-elementtejä ei löytynyt."); }

    // --- RAPORTTINÄKYMÄN LOGIIKKA (Uudemmasta, korjattu peliajan laskenta) ---
    function renderReportView() {
        // Varmistetaan, että elementit ovat olemassa
        if (!reportView || !reportTableContainer || !reportGameStatus || !reportTotalGameTime || !reportHomeScore || !reportOpponentScore || !reportHomeFouls) {
             console.error("Raporttinäkymän elementtejä puuttuu!");
             if(reportView) reportView.innerHTML = "<p>Virhe raporttinäkymän elementeissä.</p>";
             return;
        }
        if (reportView.classList.contains('hidden')) return;

        // Päivitetään yhteenveto ensin (pisteet/virheet päivittyvät jo muualla)
        reportGameStatus.textContent = appData.gameEnded ? "Päättynyt" : (appData.gameStarted ? (appData.isGamePaused ? "Katkolla" : `Käynnissä - ${getCurrentQuarterForLog()}`) : "Ei aloitettu");

        if (!appData.gameStarted && !appData.gameEnded) {
            reportTableContainer.innerHTML = "<p>Peli ei ole vielä alkanut tai dataa ei ole saatavilla.</p>";
            reportTotalGameTime.textContent = "00:00";
            return;
        }

        // 1. Laske pelin kokonaiskesto aktiivisena (tarkempi laskenta)
        let gameActiveDurationSeconds = 0;
        if (appData.startTime) {
            const referenceEndTime = appData.endTime || new Date(); // Käytä nykyhetkeä, jos peli kesken
            const grossDurationSeconds = (referenceEndTime - appData.startTime) / 1000;

            // Laske jaksojen välisten taukojen kesto
            let totalQuarterBreakSeconds = 0;
            for (let i = 0; i < appData.quarterEndTimes.length; i++) {
                if (appData.quarterStartTimes[i + 1] instanceof Date && appData.quarterEndTimes[i] instanceof Date) {
                    // Tauko jaksojen i ja i+1 välillä
                    totalQuarterBreakSeconds += (appData.quarterStartTimes[i + 1] - appData.quarterEndTimes[i]) / 1000;
                }
            }

            // Jos viimeinen jakso on päättynyt, mutta peli ei (endGameBtn ei painettu),
            // lasketaan aika tästä hetkestä jakson loppuun tauoksi.
            const lastEndedQuarterIndex = appData.quarterEndTimes.length - 1;
            if (!appData.gameEnded && appData.quarterEndTimes[lastEndedQuarterIndex] instanceof Date && !(appData.quarterStartTimes[lastEndedQuarterIndex + 1] instanceof Date)) {
                 totalQuarterBreakSeconds += (new Date() - appData.quarterEndTimes[lastEndedQuarterIndex]) / 1000;
            }


            gameActiveDurationSeconds = grossDurationSeconds - (appData.totalManualPauseDurationSeconds || 0) - totalQuarterBreakSeconds;
            gameActiveDurationSeconds = Math.max(0, gameActiveDurationSeconds); // Varmistus
        }

        reportTotalGameTime.textContent = formatTimeMMSS(gameActiveDurationSeconds);

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
            // Laske nykyisen session aika, jos pelaaja kentällä JA peli/jakso aktiivisesti käynnissä
            const qIndex = appData.currentQuarter - 1;
            const isQuarterCurrentlyActive = appData.currentQuarter > 0 &&
                                           appData.quarterStartTimes[qIndex] instanceof Date &&
                                           !(appData.quarterEndTimes[qIndex] instanceof Date);

            if (player.onCourt && player.lastTimeEnteredCourt instanceof Date && !appData.isGamePaused && isQuarterCurrentlyActive) {
                currentSessionTimeSeconds = (new Date() - player.lastTimeEnteredCourt) / 1000;
            }
            const totalPlayerTime = (player.timeOnCourtSeconds || 0) + currentSessionTimeSeconds;
            const playingTimeFormatted = formatTimeMMSS(totalPlayerTime);
            // Vältetään nollalla jako pelin alussa
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


    // --- NÄKYMIEN VAIHTO (Uudemmasta, lisätty tarkistus ja saveData)---
    function showView(viewId) {
        // Varmistetaan, että kaikki näkymäelementit löytyvät
         if (!setupView || !gameView || !historyView || !reportView) {
             console.error("Yksi tai useampi näkymäelementti puuttuu!");
             document.body.innerHTML = "Virhe: Sovelluksen käyttöliittymäelementtejä ei löytynyt.";
             return;
         }

        [setupView, gameView, historyView, reportView].forEach(view => {
            view.classList.toggle('hidden', view.id !== viewId);
        });
        // Päivitetään näkymäkohtaiset asiat vain tarvittaessa
        if (viewId === 'gameView') { renderGamePlayerList(); updateGameControlsAndDisplays(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView') {
            updateCurrentGameNameDisplay(); // Varmistaa raportin otsikon
            renderReportView(); // Generoi raportin sisällön
        }
    }

    navigateToGameBtn.addEventListener('click', () => {
        // Käytetään input-kenttien arvoja tarkistukseen, koska appData voi olla oletus
        if ((homeTeamNameInput.value.trim() || "Kobrat").toLowerCase().includes("kobra") && appData.players.length === 0) {
            alert("Lisää vähintään yksi pelaaja kotijoukkueelle tai muuta joukkueen nimi."); return;
        }
        if (!homeTeamNameInput.value.trim() || !awayTeamNameInput.value.trim()) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        saveData(); // Tallennetaan varmuuden vuoksi asetukset ennen siirtymistä
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView'));
    // Yksi nappi molemmista näkymistä takaisin peliin
    if(backToGameFromHistoryBtnReport) backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    if(backToGameFromReportBtn) backToGameFromReportBtn.addEventListener('click', () => showView('gameView'));


    // --- ALUSTUS ---
    loadData(); // Ladataan tallennettu data (tai alustetaan oletuksilla)
    showView('setupView'); // Näytetään aluksi asetukset
});