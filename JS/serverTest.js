"use strict"

const http = require("http");
const websocket = require("websocket");

const server = http.createServer((request, response) => {
    console.log("Received request for URL: ", request.url);

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Button Mash Server. Beep Boop");
});

server.listen(8080, () => {
    console.log("Server has started listening on port 8080.");
});

let wsServer = new websocket.server({
    "httpServer": server
});

// Websocket Server Connection Logic

function isConnectionAllowed(request) {
    // TODO: Add functionality to filter requests that are from the wrong source
    
    return true
}

// Game stuff

// Create the lobbies
let gameLobbies = [];
let numLobby = 5;

for (let i=0; i < numLobby; i++) {
    gameLobbies.push({
        status: "empty",
        players: [],
        lobbyId: i+1
    });
}

// Create a JSON object for the lobby list

function createLobbyString() {
    let lobbies = [];

    for (let i=0; i < gameLobbies.length; i++) {
        lobbies.push(gameLobbies[i].status);
    }

    let message = {type: "lobby-list", lobbies: lobbies};
    let messageString = JSON.stringify(message);

    return messageString
}

// Send the 
function sendLobbyList(connection) {
    
    let messageString = createLobbyString()
    connection.send(messageString);
}

function sendAllLobbyList() {
    let messageString = createLobbyString();

    players.forEach((player) => {
        player.connection.send(messageString);
    });
}

function joinLobby(player, lobbyId) {
    let lobby = gameLobbies[lobbyId-1];

    console.log(`Adding player to room ${lobbyId}`);
    lobby.players.push(player);
    player.lobby = lobby;

    if (lobby.players.length === 1) {
        lobby.status = "waiting";
    } else if (lobby.players.length >= 2) {
        lobby.status = "starting";
    }
        

    let confirmationMessage = { type: "joined-room", lobbyId: lobbyId}
    let confirmationMessageString = JSON.stringify(confirmationMessage);



    player.connection.send(confirmationMessageString);
    return lobby
}

function leaveLobby(player, lobbyId) {
    let lobby = gameLobbies[lobbyId-1];

    console.log(`Removing player from lobby ${lobbyId}`);

    let index = lobby.players.indexOf(player);
    if (index > -1) {
        lobby.players.splice(index, 1);
    }

    delete player.room;

    if (lobby.players.length === 0) {
        lobby.status = "empty";
    } else {
        lobby.status = "waiting";
    }
}


// Store all players connected to the server
let players = []

wsServer.on("request", (request) => {
    let connection = request.accept();

    console.log(`Connection from ${request.remoteAddress} accepted.`);

    let player = {
        "connection": connection,
        "name": "test",
        "latencyTrips": []
    };

    // Add player to list of all players
    players.push(player);

    // Send a list of the lobbies when the player connects for the first time
    sendLobbyList(connection);

    connection.on("message", (message) => {
        if (message.type === "utf8") {
            let clientMessage = JSON.parse(message.utf8Data);

            switch (clientMessage.type) {
                case "join-lobby":
                    joinLobby(player, clientMessage.lobbyId);
                    sendAllLobbyList();
                    break;
                
                case "leave-lobby":
                    leaveLobby(player, clientMessage.lobbyId);
                    sendAllLobbyList();
                    break;

                case "game-tick":
            }
        }
    });

    connection.on("close", () => {
        console.log(`Connection from ${connection.remoteAddress} closed.`);

        let index = players.indexOf(connection);

        if (index > -1) {
            players.splice(index, 1);
        }

        let lobby = player.lobby;
        if (lobby) {
            leaveLobby(player, lobby.lobbyId);
            sendAllLobbyList();
        }
    });

});



