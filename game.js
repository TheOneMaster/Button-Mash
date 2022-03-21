"use strict"

let game = {

    maxTime: 30,   // in seconds
    totalPress: 0,
    score: 0,

    // Stores time in ms for accuracy
    startTime: undefined,
    currentTime: undefined,

    mashKey: ' ',
    freq: 100,   // in Hz

    tick: 0,

    initGame: function() {

        game.setCallbacks();
        game.startTime = new Date().getTime();

        let gameloop = setInterval(game.gameUpdate, 1000/game.freq);

        setTimeout(() => game.gameEnd(gameloop), 1000 * game.maxTime);
    },

    setCallbacks: function() {
        document.addEventListener("keydown", (e) => {
            if (game.mashKey === e.key) {
                game.totalPress += 1;
            }
        });
    },

    gameUpdate: function() {
        game.currentTime = new Date().getTime();
        game.score = game.totalPress / ((game.currentTime - game.startTime)/1000);

        if (game.score > 0){
            console.log('test');
        }

        let message = {type: "game-tick", score: game.score};
        multiplayer.sendWebSocketMessage(message);

    },

    gameEnd: function(loop) {
        game.gameUpdate();
        clearInterval(loop);

        multiplayer.sendWebSocketMessage({type: 'game-end', lobbyId: multiplayer.lobbyId});
    }

}
