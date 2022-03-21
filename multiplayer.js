"use strict"

let multiplayer = {

    // Store the websocket connection here
    websocket: undefined,

    // Lobby state possibilities
    statusMessages: {
        "starting": "Game starting",
        "running": "Game in Progress",
        "waiting": "Waiting for additional players",
        "empty": "Open"
    },

    start: function() {
        // const websocketUrl = 'ws://button-mash.herokuapp.com/'
        const websocketUrl = "ws://localhost:8080"

        this.websocket = new WebSocket(websocketUrl);

        // Add Event Listeners
        this.websocket.addEventListener("open", multiplayer.handleWebSocketOpen);
        this.websocket.addEventListener("message", multiplayer.handleWebSocketMessage);
        this.websocket.addEventListener("close", multiplayer.handleWebSocketConnectionError);
        this.websocket.addEventListener("error", multiplayer.handleWebSocketConnectionError);

    },

    handleWebSocketOpen: () => {
        console.log("Connection Accepted");
    },

    handleWebSocketMessage: (message) => {
        let messageObject = JSON.parse(message.data);

        switch (messageObject.type) {
            case "lobby-list":
                multiplayer.updateLobbyStatus(messageObject.lobbies);
                break;

            case "joined-lobby":
                multiplayer.lobbyId = messageObject.lobbyId;
                multiplayer.lobbySetup();
                break;
            
            case 'player-list':
                multiplayer.updateLobbyPlayers(messageObject.players);
                break;

            case "init-game":
                multiplayer.initGame(messageObject.players);
                break;

            case "update-score":
                multiplayer.updateScore(messageObject.scores);
                break;

        }
    },

    handleWebSocketConnectionError: () => {
        console.log("Connection Closed.");
        document.getElementById("mplobbyscreen").disabled = true;
    },

    sendWebSocketMessage: function(messageObject) {
        let messageString = JSON.stringify(messageObject);
        this.websocket.send(messageString);
    },

    selectRow: (index) => {
        let list = document.getElementById("lobbylist");

        // Clear Options
        for (let i=list.rows.length - 1; i >= 0; i--) {
            let row = list.rows[i];
            row.classList.remove("selected");
        }

        list.selectedIndex = index;
        let row = list.rows[index];

        list.value = row.cells[0].value;
        row.classList.add("selected");
    },

    updateLobbyStatus: function(lobbylist) {

        let list = document.getElementById("lobbylist");

        // Clear the current rows from the list
        for (let i=list.rows.length-1; i>= 0; i--) {
            list.deleteRow(i);
        }

        // Create new row for each lobby
        lobbylist.forEach((lobby, index) => {
            
            /*
            The lobby format is as follows: {
                status: str from list ['empty', 'waiting', 'starting', 'running'],
                players: num of players in the lobby 
            }
            */

            let status = lobby.status;
            // let statusMessage = multiplayer.statusMessages[status];
            let lobbyId = index + 1;
            let players = lobby.players.length;
            let label = `${lobbyId} - ${players} players`;
            
            let row = document.createElement("tr");
            let cell = document.createElement("td");

            cell.innerHTML = label;
            cell.value = lobbyId;
            cell.classList.add("lobbytablecell");

            row.appendChild(cell);

            row.addEventListener("click", () => {
                if (!list.disabled && !row.disabled) {
                    this.selectRow(index);
                }
            });
            
            row.className = status;
            row.classList.add("lobbyrow");
            list.appendChild(row);

            // Disable lobbies that have started
            if (status === "running" || status === "starting") {
                row.disabled = true;
            }

            if (multiplayer.lobbyId === lobbyId) {
                this.selectRow(index);
            }
        }, this)
    },

    joinLobby: () => {
        let selectedLobby = document.getElementById("lobbylist").value;
        let username = document.getElementById("username-input").value;

        if (selectedLobby && username) {

            multiplayer.sendWebSocketMessage({type: "join-lobby", lobbyId: selectedLobby, username: username});

            multiplayer.username = username;
        } else if (!selectedLobby){
            console.log("Select lobby to join");
            // alert("You must select a lobby before joining.");
        } 
    },

    leaveLobby: () => {
        if (multiplayer.lobbyId) {
            multiplayer.sendWebSocketMessage({type: 'leave-lobby', lobbyId: multiplayer.lobbyId})
        
            // Allow interacting with the lobby system again
            document.getElementById("lobbylist").disabled = false;
            document.getElementById("lobbyjoin").disabled = false;

            // Hide unnecessary elements
            document.getElementById("lobbyleave").hidden = true;
            document.getElementById("gameStart").hidden = true;
            document.getElementById("playerlist").hidden = true;

            // Show necessary elements
            document.getElementById("lobbylist").hidden = false;
            document.getElementById("lobbyjoin").hidden = false;

            delete multiplayer.lobbyId;

            let lobbylist = document.getElementById("lobbylist");
            lobbylist.removeAttribute("selected");
            
            delete lobbylist.value;

            document.getElementById("username-input").readOnly = false;
        }
    },

    lobbySetup: function() {

        // Set the lobby list as having been selected
        document.getElementById("lobbylist").hidden = true;

        // Disable the join button and hide it
        document.getElementById("lobbyjoin").hidden = true;

        // Show the leave lobby button
        document.getElementById("lobbyleave").hidden = false;

        document.getElementById("lobbylist").disabled = true;
        document.getElementById("lobbyjoin").disabled = true;

        document.getElementById("username-input").readOnly = true;

    },

    updateLobbyPlayers: function(players) {

        // Create a table of all players currently in the lobby

        let table = document.getElementById('playerlist');
        table.hidden = false;

        for (let i=table.rows.length-1; i>=0; i--) {
            table.deleteRow(i)
        }

        players.forEach((player) => {
            let row = document.createElement('tr');
            let cell = document.createElement('td');

            cell.innerHTML = player;
            cell.classList.add("lobbytablecell");
            row.classList.add("playerrow", "lobbyrow");
            row.appendChild(cell);

            if (player === multiplayer.username) {
                row.setAttribute("selected", "true");
                cell.innerHTML = "You";
            }

            table.appendChild(row);

        })

        // Show start button if lobby has enough players
        let start_button = document.getElementById("gameStart");
        if (players.length >= 2) {
            start_button.hidden = false;
        } else {
            start_button.hidden = true;
        }
    },


    // Game logic
    beginGame: () => {
        let message = { type: 'game-begin', lobbyId: multiplayer.lobbyId};

        multiplayer.sendWebSocketMessage(message);
    },

    initGame: function(players) {


        let gameOutput = document.getElementById("gameOutput");

        // Hide elements
        document.getElementById("gameStart").hidden = true;

        players.forEach((player) => {
            let score_track = document.createElement("textarea");
            score_track.id = `${player}-score`;

            score_track.setAttribute("rows", 10);
            score_track.setAttribute("cols", 80);

            gameOutput.appendChild(score_track);
        })

        game.initGame();
    },

    updateScore: function(scores) {
        
        let keys = Object.keys(scores);

        // for (let i=0; i < n; i++) {
        //     let username = usernames[i];
        //     let output = document.getElementById(`${username}-score`);
        //     output.value += `Score - ${scores[i]}\n`;
        // }

        keys.forEach((key) => {
            let output = document.getElementById(`${key}-score`);
            output.value += `Score - ${scores[key]}\n`;
        })
    }

}
