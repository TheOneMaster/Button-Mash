"use strict"

let multiplayer = {

    // Store the websocket connection here
    websocket: undefined,

    // Lobby possibilities
    statusMessages: {
        "starting": "Game starting",
        "running": "Game in Progress",
        "waiting": "Waiting for additional players",
        "empty": "Open"
    },

    start: function() {
        const websocketUrl = `ws://${window.location.hostname || "localhost"}:8080`;

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

            case "joined-room":
                multiplayer.lobbyId = messageObject.lobbyId;
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
        lobbylist.forEach((status, index) => {
            let statusMessage = multiplayer.statusMessages[status];
            let lobbyId = index + 1;
            let label = `Game ${lobbyId} - ${statusMessage}`;
            
            let row = document.createElement("tr");
            let cell = document.createElement("td");

            cell.innerHTML = label;
            cell.value = lobbyId;

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

        if (selectedLobby) {

            multiplayer.sendWebSocketMessage({type: "join-lobby", lobbyId: selectedLobby});

            document.getElementById("lobbylist").disabled = true;
            document.getElementById("lobbyjoin").disabled = true;
        } else {
            console.log("Select lobby to join");
        }
    }
}
