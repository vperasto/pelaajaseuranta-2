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
    const reportContent = document.getElementById('reportContent');

    const navigateToGameBtn = document.getElementById('navigateToGameBtn');
    const navigateToSetupBtn = document.getElementById('navigateToSetupBtn');
    const navigateToHistoryBtn = document.getElementById('navigateToHistoryBtn');
    const navigateToReportBtn = document.getElementById('navigateToReportBtn');
    const backToGameFromHistoryBtnReport = document.getElementById('backToGameFromHistoryBtnReport'); // Nimi voi olla harhaanjohtava, jos käytetään vain reportista
    const backToGameFromReportBtn = document.getElementById('backToGameFromReportBtn');

    let appData = {
        homeTeamName: "Kobrat",
        awayTeamName: "",
        players: [],
        gameHistory: [],
        gameStarted: false, gameEnded: false, isGamePaused: false, // isGamePaused = manuaalinen katko
        lastPauseStartTime: null, currentQuarter: 0,
        maxPlayersOnCourt: 5,
        opponentScore: 0,
        startTime: null, endTime: null, quarterTimes: [] // quarterTimes[0] = Q1 alkuaika, jne.
    };

    // --- DATAN HALLINTA ---
    function saveData() {
        appData.homeTeamName = homeTeamNameInput.value.trim() || "Kotijoukkue";
        appData.awayTeamName = awayTeamNameInput.value.trim() || "Vierasjoukkue";
        appData.maxPlayersOnCourt = parseInt(maxPlayersOnCourtSetting.value);
        localStorage.setItem('basketTrackerData_v1.2', JSON.stringify(appData));
    }

    function loadData() {
        const storedData = localStorage.getItem('basketTrackerData_v1.2');
        if (storedData) {
            const loaded = JSON.parse(storedData);
            appData = { ...appData, ...loaded };
            if (appData.startTime) appData.startTime = new Date(appData.startTime);
            if (appData.endTime) appData.endTime = new Date(appData.endTime);
            if (appData.lastPauseStartTime) appData.lastPauseStartTime = new Date(appData.lastPauseStartTime);
            appData.quarterTimes = (appData.quarterTimes || []).map(t => t ? new Date(t) : null).filter(t => t !== null);
            if (appData.gameHistory && Array.isArray(appData.gameHistory)) {
                appData.gameHistory.forEach(event => {
                    if (event.timestamp) event.timestamp = new Date(event.timestamp);
                });
            } else {
                appData.gameHistory = [];
            }
            appData.players = (appData.players || []).map(p => ({
                id: p.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Varmistetaan ID
                name: p.name || "Nimetön",
                number: p.number || "00",
                onCourt: p.onCourt || false,
                points: p.points || 0,
                fouls: p.fouls || 0,
                assists: p.assists || 0,
                rebounds: p.rebounds || 0,
                fouledOut: p.fouledOut || false
            }));
        }
        homeTeamNameInput.value = appData.homeTeamName || "Kobrat";
        awayTeamNameInput.value = appData.awayTeamName || "";
        maxPlayersOnCourtSetting.value = appData.maxPlayersOnCourt.toString();
        renderAll();
    }

    function renderAll() {
        renderPlayers(); // Setup-näkymä
        renderGamePlayerList(); // Peli-näkymä
        renderHistory(); // Historia-näkymä
        updateGameControlsAndDisplays(); // Peli-näkymän kontrollit ja näytöt
        if (reportView && !reportView.classList.contains('hidden')) { // Päivitetään raportti vain jos se on näkyvissä
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
    function generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    function getCurrentQuarterForLog() {
        if (!appData.gameStarted || appData.currentQuarter === 0) return "Ennen peliä";

        const isCurrentQuarterEnded = appData.gameHistory.some(
            event => event.type === 'QUARTER_END' && event.quarterNumber === appData.currentQuarter
        );

        if (appData.isGamePaused) return `Q${appData.currentQuarter} (Katko)`;
        if (isCurrentQuarterEnded && appData.currentQuarter < 4 && !appData.gameEnded) return `Tauko (ennen Q${appData.currentQuarter + 1})`;
        if (isCurrentQuarterEnded && appData.currentQuarter === 4 && !appData.gameEnded) return `Peli päättynyt (Q4 jälkeen)`;
        if (appData.gameEnded) return "Pelin jälkeen";

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
                id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, number, onCourt: false,
                points: 0, fouls: 0, assists: 0, rebounds: 0, fouledOut: false
            });
            playerNameInput.value = ''; playerNumberInput.value = '';
            saveData();
            renderPlayers(); renderGamePlayerList(); updateScoreDisplay(); updateFoulDisplay(); // Päivitä laskurit
        } else { alert('Syötä pelaajan nimi ja numero.'); }
    });

    function renderPlayers() { // Setup-näkymän pelaajalista
        playerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            playerListDiv.innerHTML = '<p>Ei pelaajia. Lisää pelaajia yllä.</p>'; return;
        }
        const sortedSetupPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));

        sortedSetupPlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name} (#${player.number})</h3>
                    <button class="remove-player-btn" data-id="${player.id}" title="Poista pelaaja">Poista</button>
                </div>
            `;
            playerListDiv.appendChild(card);
        });

        document.querySelectorAll('.remove-player-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const playerId = e.target.dataset.id;
                appData.players = appData.players.filter(p => p.id !== playerId);
                saveData();
                renderPlayers(); renderGamePlayerList(); updateScoreDisplay(); updateFoulDisplay();
            });
        });
    }

    function renderGamePlayerList() { // Pelinäkymän pelaajalista
        gamePlayerListDiv.innerHTML = '';
        if (appData.players.length === 0) {
            gamePlayerListDiv.innerHTML = '<p>Lisää pelaajia ensin Asetukset-näkymässä.</p>'; return;
        }
        const sortedPlayers = [...appData.players].sort((a, b) => {
            if (a.onCourt !== b.onCourt) { return b.onCourt - a.onCourt; } // Kentällä olevat ensin
            return parseInt(a.number) - parseInt(b.number); // Sitten numerojärjestyksessä
        });
        sortedPlayers.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.onCourt ? 'on-court' : 'on-bench'} ${player.fouledOut ? 'fouled-out' : ''}`;
            let fouledOutIndicator = player.fouledOut ? '<span class="player-fouled-out-indicator">5 VIRHETTÄ</span>' : '';
            let toggleBtnDisabled = player.fouledOut ? 'disabled' : '';
            let actionButtonsVisible = player.onCourt && !player.fouledOut && !appData.isGamePaused; // Toimintonapit näkyvillä vain jos kentällä, ei virhepoistossa EIKÄ manuaalisella katkolla
            let pointsAndFoulButtonsVisible = player.onCourt && !player.fouledOut; // Piste- ja virhenapit näkyvillä vaikka katkolla

            card.innerHTML = `
                <div class="player-info">
                    <h3>${player.name}</h3>
                    <span class="player-number">#${player.number}</span>
                    ${fouledOutIndicator}
                </div>
                <span class="player-stats">P: ${player.points} | V: ${player.fouls} | S: ${player.assists} | L: ${player.rebounds}</span>
                <div class="player-actions">
                    <button class="toggle-status-btn" data-id="${player.id}" ${toggleBtnDisabled}>
                        ${player.onCourt ? 'Penkille' : 'Kentälle'}
                    </button>
                    <div class="action-btn-group ${pointsAndFoulButtonsVisible ? '' : 'hidden-actions'}">
                        <button class="action-btn" data-id="${player.id}" data-action="1p">+1P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="2p">+2P</button>
                        <button class="action-btn" data-id="${player.id}" data-action="3p">+3P</button>
                    </div>
                    <div class="action-btn-group ${pointsAndFoulButtonsVisible ? '' : 'hidden-actions'}">
                        <button class="action-btn" data-id="${player.id}" data-action="foul">Virhe</button>
                        <button class="action-btn" data-id="${player.id}" data-action="assist" ${appData.isGamePaused ? 'disabled' : ''}>Syöttö</button>
                        <button class="action-btn" data-id="${player.id}" data-action="rebound" ${appData.isGamePaused ? 'disabled' : ''}>Levypallo</button>
                    </div>
                </div>`;
            gamePlayerListDiv.appendChild(card);
        });
        document.querySelectorAll('.toggle-status-btn').forEach(b => b.addEventListener('click', handleToggleStatus));
        document.querySelectorAll('.action-btn').forEach(b => b.addEventListener('click', handlePlayerAction));
    }

    function handleToggleStatus(event) { // Pelaajan vaihto kentälle/penkille
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
                    alert(`Kentällä voi olla enintään ${appData.maxPlayersOnCourt} pelaajaa! Ota ensin joku pois kentältä.`); return;
                }
            }
            player.onCourt = !player.onCourt;
            logEvent({
                type: 'SUBSTITUTION', playerId: player.id,
                descriptionDetails: `${player.onCourt ? 'Kentälle' : 'Penkille'}`
            });
            saveData(); renderGamePlayerList(); renderHistory();
        }
    }

    function handlePlayerAction(event) { // Pelaajakohtaiset tapahtumat
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
            if (!player.onCourt && action !== 'foul') { // Sallitaan virhe penkillä olevalle
                 alert(`Pelaaja #${player.number} ${player.name} ei ole kentällä.`); return;
            }
            if (player.fouledOut && action === 'foul') {
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
                        player.fouledOut = true;
                        const wasOnCourt = player.onCourt;
                        player.onCourt = false; // Automaattisesti penkille
                        eventDescriptionDetails += " - Poistettu pelistä (5 virhettä)!";
                        if(wasOnCourt){ // Jos oli kentällä, logataan vaihto penkille
                             logEvent({ type: 'SUBSTITUTION', playerId: player.id, descriptionDetails: `Penkille (5 virhettä)` });
                        }
                    }
                    break;
                case 'assist': eventType = 'ASSIST'; player.assists += 1; eventDescriptionDetails = "Syöttö"; break;
                case 'rebound': eventType = 'REBOUND'; player.rebounds += 1; eventDescriptionDetails = "Levypallo"; break;
            }
            logEvent({ type: eventType, playerId: player.id, value: eventValue, descriptionDetails: eventDescriptionDetails });
            saveData(); renderGamePlayerList(); updateScoreDisplay(); updateFoulDisplay(); renderHistory();
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
            logEvent({
                type: 'OPPONENT_SCORE',
                value: points,
                descriptionMaster: `Vastustaja +${points}p`
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
        appData.opponentScore = 0;
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
        if (appData.players.length === 0 && (appData.homeTeamName.toLowerCase().includes("kobra") || appData.homeTeamName.toLowerCase().includes("koti"))) {
            alert("Lisää pelaajia kotijoukkueelle tai muuta joukkueen nimi."); return;
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
        appData.currentQuarter = 0; // Valmistellaan Q1:n aloitus nextQuarterBtn:llä

        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli alkoi valmistelutilassa" }); // Selkeämpi logi
        saveData();
        renderAll();
    });

    nextQuarterBtn.addEventListener('click', () => {
        if (nextQuarterBtn.disabled) return;
        if (!appData.gameStarted || appData.gameEnded) return;

        if (appData.isGamePaused) {
            alert("Peli on katkaistu manuaalisesti. Jatka peliä ensin voidaksesi vaihtaa tai päättää jakson.");
            return;
        }

        const currentQuarterHasStarted = appData.currentQuarter > 0 && appData.quarterTimes[appData.currentQuarter -1];
        const currentQuarterHasEnded = appData.currentQuarter > 0 && appData.gameHistory.some(
            e => e.type === 'QUARTER_END' && e.quarterNumber === appData.currentQuarter
        );

        if (appData.currentQuarter === 0) { // Aloitetaan Q1
            appData.currentQuarter = 1;
            appData.quarterTimes[0] = new Date();
            logEvent({ type: 'QUARTER_START', quarterNumber: 1, descriptionMaster: `Jakso Q1 alkoi` });
        } else if (currentQuarterHasStarted && !currentQuarterHasEnded) { // Jakso on käynnissä -> Päätetään se
            logEvent({ type: 'QUARTER_END', quarterNumber: appData.currentQuarter, descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
            if (appData.currentQuarter === 4) {
                endGameBtn.focus();
            }
        } else if (currentQuarterHasEnded || !currentQuarterHasStarted) { // Edellinen jakso on päättynyt TAI Q0->Q1 (tämä ehto on jo yllä) -> aloitetaan seuraava
            if (appData.currentQuarter < 4) {
                appData.currentQuarter++;
                appData.quarterTimes[appData.currentQuarter - 1] = new Date();
                logEvent({ type: 'QUARTER_START', quarterNumber: appData.currentQuarter, descriptionMaster: `Jakso Q${appData.currentQuarter} alkoi` });
            } else {
                alert("Kaikki jaksot pelattu. Lopeta peli.");
            }
        }
        saveData();
        renderAll();
    });

    endGameBtn.addEventListener('click', () => {
        if (!appData.gameStarted || appData.gameEnded) return;

        if (appData.isGamePaused) {
            appData.isGamePaused = false;
            appData.lastPauseStartTime = null;
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Manuaalinen katko päätetty pelin lopetuksen yhteydessä" });
        }

        if (appData.currentQuarter > 0 && appData.currentQuarter <= 4) {
            const quarterAlreadyEnded = appData.gameHistory.some(
                event => event.type === 'QUARTER_END' && event.quarterNumber === appData.currentQuarter
            );
            if (!quarterAlreadyEnded) {
                 logEvent({ type: 'QUARTER_END', quarterNumber: appData.currentQuarter, descriptionMaster: `Jakso Q${appData.currentQuarter} päättyi` });
            }
        }

        appData.gameEnded = true; appData.endTime = new Date();
        logEvent({ type: 'GAME_EVENT', descriptionMaster: "Peli päättyi" });
        saveData();
        renderAll();
    });

    togglePauseBtn.addEventListener('click', () => {
        if (togglePauseBtn.disabled) return;
        if (!appData.gameStarted || appData.gameEnded) return;

        const currentQuarterIsActiveAndNotEnded = appData.currentQuarter > 0 &&
                                            appData.quarterTimes[appData.currentQuarter -1] &&
                                            !appData.gameHistory.some(e => e.type === 'QUARTER_END' && e.quarterNumber === appData.currentQuarter);

        if (!currentQuarterIsActiveAndNotEnded) {
            alert("Manuaalinen katko on tarkoitettu vain aktiivisesti käynnissä olevan jakson keskeyttämiseen.");
            return;
        }

        appData.isGamePaused = !appData.isGamePaused;
        if (appData.isGamePaused) {
            appData.lastPauseStartTime = new Date();
            logEvent({ type: 'PAUSE', descriptionMaster: "Pelikatko alkoi (manuaalinen)" });
        } else {
            const pauseEndTime = new Date();
            const pauseDuration = appData.lastPauseStartTime ? Math.round((pauseEndTime - appData.lastPauseStartTime) / 1000) : 0;
            logEvent({ type: 'RESUME', descriptionMaster: `Peli jatkuu (manuaalinen katko ${pauseDuration}s)` });
            appData.lastPauseStartTime = null;
        }
        saveData();
        renderAll(); // renderGamePlayerList() kutsutaan renderAll:n kautta, joka piilottaa/näyttää napit
    });

    function updateMainGameControlButtonsState() {
        startGameBtn.disabled = appData.gameStarted && !appData.gameEnded;
        endGameBtn.disabled = !appData.gameStarted || appData.gameEnded;
    }

    function updatePauseButtonState() {
        togglePauseBtn.textContent = appData.isGamePaused ? "Jatka Peliä" : "Aloita Katko";
        const currentQuarterIsActiveAndNotEnded = appData.currentQuarter > 0 &&
                                            appData.quarterTimes[appData.currentQuarter -1] &&
                                            !appData.gameHistory.some(e => e.type === 'QUARTER_END' && e.quarterNumber === appData.currentQuarter);

        togglePauseBtn.disabled = !appData.gameStarted || appData.gameEnded || !currentQuarterIsActiveAndNotEnded;

        if (appData.isGamePaused && currentQuarterIsActiveAndNotEnded) {
             togglePauseBtn.style.backgroundColor = "var(--accent-color-action)";
        } else {
            togglePauseBtn.style.backgroundColor = "";
        }
    }

    function updateQuarterButtonState() {
        if (!appData.gameStarted) {
            nextQuarterBtn.textContent = `Aloita Peli`; // Muutettu teksti
            nextQuarterBtn.disabled = false; // Alussa "Aloita Peli" on käytössä (kun joukkueet ok)
            startGameBtn.disabled = false; // startGameBtn on käytössä alussa
            if(homeTeamNameInput.value && awayTeamNameInput.value) {
                nextQuarterBtn.disabled = false; // Aktivoi, jos joukkueiden nimet on asetettu
            } else {
                nextQuarterBtn.disabled = true;
            }
            // Erillinen startGameBtn hoitaa pelin alkulogit, nextQuarterBtn tässä vain siirtyy Q1:een
            // Jos halutaan, että startGameBtn on AINOA tapa aloittaa, niin nextQuarterBtn.disabled = true;
            // Ja startGameBtn:n logiikkaa muutetaan. Nykyinen "Uusi JS" -logiikka:
            // startGameBtn valmistelee, nextQuarterBtn aloittaa Q1:n.
            // Tehdään niin, että startGameBtn on AINOA joka aloittaa pelin "valmistelutilaan"
            // ja nextQuarterBtn on disabloitu kunnes startGameBtn on painettu.
            startGameBtn.textContent = "Aloita Peli"; // Selkeyden vuoksi
            nextQuarterBtn.textContent = "Aloita Q1";
            nextQuarterBtn.disabled = true;


        } else if (appData.gameEnded) {
            nextQuarterBtn.textContent = `Peli Päättynyt`;
            nextQuarterBtn.disabled = true;
            startGameBtn.textContent = "Uusi Peli"; // Vaihdetaan teksti, kun peli on päättynyt
            startGameBtn.disabled = false;
        } else {
            startGameBtn.textContent = "Peli Käynnissä"; // Tai "Nollaa Peli"
            startGameBtn.disabled = true;

            const currentQuarterHasStarted = appData.currentQuarter > 0 && appData.quarterTimes[appData.currentQuarter -1];
            const currentQuarterHasEnded = appData.currentQuarter > 0 && appData.gameHistory.some(
                event => event.type === 'QUARTER_END' && event.quarterNumber === appData.currentQuarter
            );

            if (appData.currentQuarter === 0) { // Peli on aloitettu (startGameBtn painettu), mutta Q1 ei vielä
                nextQuarterBtn.textContent = `Aloita Q1`;
                nextQuarterBtn.disabled = appData.isGamePaused; // Ei voi aloittaa, jos manuaalinen katko päällä
            }
            else if (currentQuarterHasStarted && !currentQuarterHasEnded) { // Jakso on käynnissä
                 nextQuarterBtn.textContent = `Päätä Q${appData.currentQuarter}`;
                 nextQuarterBtn.disabled = appData.isGamePaused;
            } else if (currentQuarterHasEnded) { // Nykyinen jakso on päättynyt
                if (appData.currentQuarter < 4) {
                    nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`;
                    nextQuarterBtn.disabled = appData.isGamePaused;
                } else { // Q4 on päättynyt
                    nextQuarterBtn.textContent = `Peli Ohi`;
                    nextQuarterBtn.disabled = true;
                }
            } else { // Odotetaan jakson alkua (tätä tilaa ei pitäisi saavuttaa, jos logiikka oikein)
                 nextQuarterBtn.textContent = `Aloita Q${appData.currentQuarter + 1}`; // Oletus
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
    }

    function updateFoulDisplay() {
        const homeFouls = appData.players.reduce((sum, player) => sum + player.fouls, 0);
        homeFoulsDisplay.textContent = homeFouls;
    }

    homeTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); updateQuarterButtonState(); });
    awayTeamNameInput.addEventListener('input', () => { saveData(); updateCurrentGameNameDisplay(); updateQuarterButtonState(); });
    maxPlayersOnCourtSetting.addEventListener('change', saveData);

    // --- HISTORIA ---
    function logEvent(eventData) {
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let finalDescription = eventData.descriptionMaster || "";
        const eventQuarterForLog = eventData.quarterNumber ? `Q${eventData.quarterNumber}` : getCurrentQuarterForLog();

        if (!finalDescription) {
            let playerPrefix = "";
            if (eventData.playerId) {
                const player = appData.players.find(p => p.id === eventData.playerId) ||
                               appData.gameHistory.find(ev => ev.playerId === eventData.playerId && (ev.playerName && ev.playerNumber));
                if (player) {
                    playerPrefix = `#${player.number || eventData.playerNumber} ${player.name || eventData.playerName} | `;
                } else if (eventData.playerNumber && eventData.playerName) { // Varmuuden vuoksi, jos pelaajaa ei löydy
                    playerPrefix = `#${eventData.playerNumber} ${eventData.playerName} | `;
                }
            }
            finalDescription = `${timeString} ${eventQuarterForLog} – ${playerPrefix}${eventData.descriptionDetails || eventData.type || 'Tuntematon tapahtuma'}`;
        } else { // Jos descriptionMaster on annettu
            if (!finalDescription.includes(timeString) && (appData.gameStarted || ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END', 'OPPONENT_SCORE'].includes(eventData.type))) {
                 finalDescription = `${timeString} ${eventQuarterForLog} – ${finalDescription}`;
            }
        }
        const fullEventData = {
            id: generateEventId(), timestamp: timestamp,
            quarterLogText: eventQuarterForLog, // Tallennetaan lokiteksti
            quarterNumber: eventData.quarterNumber || appData.currentQuarter, // Tallennetaan numeerinen jakso
            description: finalDescription,
            type: eventData.type, // Varmistetaan tyyppi
            value: eventData.value, // Varmistetaan arvo
            playerId: eventData.playerId, // Varmistetaan pelaajan ID
            playerName: eventData.playerId ? (appData.players.find(p=>p.id === eventData.playerId) || {}).name : undefined,
            playerNumber: eventData.playerId ? (appData.players.find(p=>p.id === eventData.playerId) || {}).number : undefined,
        };
        // Poistetaan turhat, jos ne ovat jo fullEventData-objektissa
        delete fullEventData.descriptionDetails;
        delete fullEventData.descriptionMaster;
        appData.gameHistory.push(fullEventData);
    }

    function renderHistory() {
        gameHistoryLog.innerHTML = '';
        const gameTitle = (appData.homeTeamName || "Koti") + " vs " + (appData.awayTeamName || "Vieras");
        if (gameTitle !== "Koti vs Vieras" || appData.gameHistory.length > 0) { // Näytä otsikko jos on nimi tai historiaa
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
            const nonRemovableTypes = ['GAME_EVENT', 'PAUSE', 'RESUME', 'QUARTER_START', 'QUARTER_END'];
            if (!nonRemovableTypes.includes(event.type) && event.type) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-history-event-btn'; removeBtn.textContent = 'Peru'; // Selkeämpi teksti
                removeBtn.title = "Poista tämä tapahtuma ja kumoa sen vaikutukset";
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

        if (!confirm(`Haluatko varmasti poistaa tapahtuman: "${eventToRemove.description}"? Tätä ei voi kumota.`)) return;

        const player = eventToRemove.playerId ? appData.players.find(p => p.id === eventToRemove.playerId) : null;

        if (player) {
            switch (eventToRemove.type) {
                case 'SCORE': if (typeof eventToRemove.value === 'number') { player.points = Math.max(0, player.points - eventToRemove.value); } break;
                case 'FOUL':
                    player.fouls = Math.max(0, player.fouls - 1);
                    if (player.fouledOut && player.fouls < 5) {
                        player.fouledOut = false;
                        // Lisää logiikka pelaajan palauttamiseksi kentälle, jos tarpeen,
                        // tai poista automaattinen "SUBSTITUTION / Penkille (5 virhettä)" -logi, jos sellainen on.
                        // Tässä vaiheessa ei automaattisesti palauteta kentälle.
                        logEvent({ type: 'GAME_EVENT', playerId: player.id, descriptionMaster: `#${player.number} ${player.name} | Ei enää 'fouled out' (virheen poisto)` });
                    } break;
                case 'ASSIST': player.assists = Math.max(0, player.assists - 1); break;
                case 'REBOUND': player.rebounds = Math.max(0, player.rebounds - 1); break;
                case 'SUBSTITUTION': // Jos poistetaan vaihto, palautetaan pelaajan tila
                    player.onCourt = !player.onCourt;
                    logEvent({ type: 'GAME_EVENT', playerId: player.id, descriptionMaster: `#${player.number} ${player.name} | Vaihdon kumoaminen, tila nyt: ${player.onCourt ? 'Kentällä' : 'Penkillä'}` });
                    break;
            }
        } else if (eventToRemove.type === 'OPPONENT_SCORE') {
            if (typeof eventToRemove.value === 'number') {
                appData.opponentScore = Math.max(0, appData.opponentScore - eventToRemove.value);
            }
        }
        appData.gameHistory.splice(eventIndex, 1);
        saveData(); renderAll();
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
        } else { // Fallback vanhemmille selaimille
            const textArea = document.createElement("textarea");
            textArea.value = historyText;
            document.body.appendChild(textArea);
            textArea.focus(); textArea.select();
            try {
                document.execCommand('copy');
                alert('Historia kopioitu leikepöydälle!');
            } catch (err) {
                console.error('Fallback kopiointivirhe: ', err); alert('Kopiointi epäonnistui.');
            }
            document.body.removeChild(textArea);
        }
    });

    clearGameHistoryBtn.addEventListener('click', () => {
        if (confirm("Haluatko varmasti tyhjentää tämän pelin historian ja nollata pelaajien tilastot? Pelaajia, joukkueiden nimiä ja asetuksia ei poisteta.")) {
            resetGameStatsAndState(true); // Säilytä pelaajat ja asetukset
            logEvent({ type: 'GAME_EVENT', descriptionMaster: "Pelihistoria tyhjennetty ja tilastot nollattu" });
            saveData(); renderAll();
            alert("Pelihistoria tyhjennetty ja pelaajien tilastot nollattu.");
        }
    });

    // --- OHJEIDEN POPUP ---
    if (openInstructionsLink && instructionsModal && closeInstructionsBtn) {
        openInstructionsLink.addEventListener('click', (e) => { e.preventDefault(); instructionsModal.classList.remove('hidden'); });
        closeInstructionsBtn.addEventListener('click', () => { instructionsModal.classList.add('hidden'); });
        instructionsModal.addEventListener('click', (e) => { if (e.target === instructionsModal) { instructionsModal.classList.add('hidden'); } });
    } else { console.warn("Ohjeiden popup-elementtejä ei löytynyt."); }

    // --- RAPORTTINÄKYMÄ ---
    function renderReportView() {
        if (!reportContent || !reportGameNameDisplay) return;

        reportGameNameDisplay.textContent = `${appData.homeTeamName || "Koti"} vs ${appData.awayTeamName || "Vieras"}`;
        let reportHTML = `<h3>Pelin Yhteenveto</h3>`;
        const homeTotalScore = appData.players.reduce((sum, p) => sum + p.points, 0);
        reportHTML += `<p><strong>Lopputulos:</strong> ${appData.homeTeamName}: ${homeTotalScore} - ${appData.awayTeamName}: ${appData.opponentScore}</p>`;
        if (appData.startTime) {
            reportHTML += `<p><strong>Alkoi:</strong> ${appData.startTime.toLocaleString('fi-FI')}</p>`;
        }
        if (appData.endTime) {
            reportHTML += `<p><strong>Päättyi:</strong> ${appData.endTime.toLocaleString('fi-FI')}</p>`;
        }
         appData.quarterTimes.forEach((qt, index) => {
            if (qt) reportHTML += `<p><strong>Jakso Q${index + 1} alkoi:</strong> ${qt.toLocaleTimeString('fi-FI')}</p>`;
        });

        reportHTML += `<h3>Kotijoukkueen (${appData.homeTeamName}) Pelaajatilastot</h3>`;
        if (appData.players.length > 0) {
            reportHTML += `
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nimi</th>
                            <th>Pisteet</th>
                            <th>Virheet</th>
                            <th>Syötöt</th>
                            <th>Levypallot</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            const sortedReportPlayers = [...appData.players].sort((a,b) => parseInt(a.number) - parseInt(b.number));
            sortedReportPlayers.forEach(player => {
                reportHTML += `
                    <tr>
                        <td>${player.number}</td>
                        <td class="player-name-report">${player.name}</td>
                        <td>${player.points}</td>
                        <td>${player.fouls} ${player.fouledOut ? '(POIS)' : ''}</td>
                        <td>${player.assists}</td>
                        <td>${player.rebounds}</td>
                    </tr>
                `;
            });
            reportHTML += `</tbody></table>`;
        } else {
            reportHTML += `<p>Ei pelaajatietoja.</p>`;
        }
        reportContent.innerHTML = reportHTML;
    }


    // --- NÄKYMIEN VAIHTO ---
    function showView(viewId) {
        [setupView, gameView, historyView, reportView].forEach(view => {
            if (view) view.classList.toggle('hidden', view.id !== viewId);
        });
        // Kutsutaan päivitysfunktioita vain tarvittaessa
        if (viewId === 'gameView') { renderGamePlayerList(); updateGameControlsAndDisplays(); }
        if (viewId === 'historyView') { renderHistory(); }
        if (viewId === 'setupView') { renderPlayers(); }
        if (viewId === 'reportView') { renderReportView(); }
    }

    navigateToGameBtn.addEventListener('click', () => {
        if (appData.players.length === 0 && (appData.homeTeamName.toLowerCase().includes("kobra") || appData.homeTeamName.toLowerCase().includes("koti"))) {
            alert("Lisää vähintään yksi pelaaja kotijoukkueelle tai muuta joukkueen nimi."); return;
        }
        if (!appData.homeTeamName || !appData.awayTeamName) {
            alert("Määritä joukkueiden nimet asetuksissa."); return;
        }
        showView('gameView');
    });
    navigateToSetupBtn.addEventListener('click', () => showView('setupView'));
    navigateToHistoryBtn.addEventListener('click', () => showView('historyView'));
    navigateToReportBtn.addEventListener('click', () => showView('reportView'));
    // Yksi nappi molemmista näkymistä takaisin peliin
    if(backToGameFromHistoryBtnReport) backToGameFromHistoryBtnReport.addEventListener('click', () => showView('gameView'));
    if(backToGameFromReportBtn) backToGameFromReportBtn.addEventListener('click', () => showView('gameView'));


    // --- ALUSTUS ---
    loadData(); // Tämä kutsuu renderAll, joka kutsuu tarvittavia päivitysfunktioita
    showView('setupView'); // Aloitusnäkymä
    updateQuarterButtonState(); // Varmistetaan nappien oikea tila alussa
});