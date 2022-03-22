"use strict"

const http = require("http");
const websocket = require("websocket");

const server = http.createServer((request, response) => {
    console.log("Received request for URL: ", request.url);

    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Button Mash Server. Beep Boop");
});

let port = process.env.PORT || 8080;

server.listen(port, () => {
    console.log(`Server has started listening on port ${port}.`);
});

let wsServer = new websocket.server({
    "httpServer": server
});

// Websocket Server Connection Logic

function isConnectionAllowed(request) {
    // TODO: Add functionality to filter requests that are from the wrong source
    
    return true
}

function sendMessageToClient(connection, messageObject) {
    let messageString = JSON.stringify(messageObject);
    connection.send(messageString);
}

// Game stuff

// Create the lobbies
let gameLobbies = [];
let numLobby = 5;

for (let i=0; i < numLobby; i++) {
    gameLobbies.push({
        status: "empty",
        players: [],
        scores: undefined,
        lobbyId: i+1
    });
}

function initializeGame(lobbyId) {

    let lobby = gameLobbies[lobbyId-1];
    lobby.playersReady = 0;

    let scores = {};

    lobby.players.forEach((player) => {
        scores[player.username] = null;
    });

    lobby.scores = scores;

    let message = { type: "init-game", players: lobby.players.map((player) => player.username)};
    sendLobbyWebSocketMessage(lobby, message);
}

function storeLobbyScores(score, player) {
    let lobby = player.lobby;

    lobby.scores[player.username] = score;
    // lobby.scores.push(score);
}

function scoresNotNull(scores) {

    for (let key in scores) {
        if (scores[key] === null) {
            return false;
        }
    }

    return true;

}


// Lobby Functions

function checkUsernameExist(playername, lobbyId) {
    let lobby = gameLobbies[lobbyId-1];
    let usernames = lobby.players.map((player) => player.username);

    if (usernames.includes(playername)) {
        return true;
    }
    return false;
}

// Create a JSON object for the lobby list
function createLobbyString() {
    let lobbies = [];

    for (let i=0; i < gameLobbies.length; i++) {
        
        // Get the array of player usernames in the lobby
        let players = gameLobbies[i].players.map((player) => player.username);
        let lobby = {status: gameLobbies[i].status, players: players};

        lobbies.push(lobby);
    }

    let message = {type: "lobby-list", lobbies: lobbies};
    let messageString = JSON.stringify(message);

    return messageString
}

// Send the lobby information to an individual connection
function sendLobbyList(connection) {
    
    let messageString = createLobbyString()
    connection.send(messageString);
}

// Send lobby information to all connections
function sendAllLobbyList() {
    let messageString = createLobbyString();

    players.forEach((player) => {
        player.connection.send(messageString);
    });
}

// Send the player information to the members of the lobby
function sendLobbyPlayerList(lobbyId) {

    let lobby = gameLobbies[lobbyId-1];

    let players = lobby.players.map((player) => player.username);

    let message = { type: 'player-list', players: players };
    
    sendLobbyWebSocketMessage(lobby, message);
}

function joinLobby(player, lobbyId) {
    let lobby = gameLobbies[lobbyId-1];

    console.log(`Adding ${player.username} to room ${lobbyId}`);
    lobby.players.push(player);
    player.lobby = lobby;

    if (lobby.players.length === 1) {
        lobby.status = "waiting";
    } else if (lobby.players.length >= 2) {
        lobby.status = "starting";
    }
        
    let usernames = lobby.players.map((player) => player.username)
    let confirmationMessage = { type: "joined-lobby", lobbyId: lobbyId, players: usernames }
    
    sendMessageToClient(player.connection, confirmationMessage);
    return lobby
}

function leaveLobby(player, lobbyId) {
    let lobby = gameLobbies[lobbyId-1];

    console.log(`Removing ${player.username} from lobby ${lobbyId}`);

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

function sendLobbyWebSocketMessage(lobby, messageObject) {
    let messageString = JSON.stringify(messageObject);
    
    lobby.players.forEach((player) => {
        player.connection.send(messageString);
    });
}

// Store all players connected to the server
let players = []

wsServer.on("request", (request) => {
    let connection = request.accept();
    let currentTime = new Date();
    console.log(`Connection from ${request.remoteAddress} accepted at ${currentTime}`);

    let player = {
        "connection": connection,
        "username": undefined,
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
                    if (!checkUsernameExist(clientMessage.username, clientMessage.lobbyId)) {
                        player.username = clientMessage.username;
                        joinLobby(player, clientMessage.lobbyId);
                        sendAllLobbyList();
                        sendLobbyPlayerList(clientMessage.lobbyId);
                    } else {
                        let message = {type: 'failed-join'};
                        sendMessageToClient(player.connection, message);
                    }            
                    break;
                
                case "leave-lobby":
                    leaveLobby(player, clientMessage.lobbyId);
                    sendAllLobbyList();
                    sendLobbyPlayerList(clientMessage.lobbyId);
                    break;

                case "game-begin":
                    initializeGame(clientMessage.lobbyId);
                    break;

                case "game-tick":
                    storeLobbyScores(clientMessage.score, player);

                    let scores = player.lobby.scores;

                    if (scoresNotNull(scores)){
                        let message = {
                            type: 'update-score',
                            scores: player.lobby.scores
                        };
    
                        sendLobbyWebSocketMessage(player.lobby, message);
                        Object.keys(scores).forEach((i) => scores[i] = null);
                        
                    }
                    
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
            sendLobbyPlayerList(lobby.lobbyId);
        }
    });

});



