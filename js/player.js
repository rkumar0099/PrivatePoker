class Player {
    currentCards = [];
    availableBalance = 0;
    tableBalance = 0;
    Id = 0;
    playing = false;
    stake = 0;
    staked = 0;
    socket = undefined;
    responded = false;
    noResponse = false;
    timer = 0;
    maxhand = -1;
    allin = false;

    constructor(Id, socket) {
        this.Id = Id;
        this.socket = socket;
        this.playing = true;
        this.availableBalance = 100000;
        this.currentCards[0] = -1;
        this.currentCards[1] = -1;
    }

    name() {
        return `player${this.Id}`;
    }
}

module.exports = Player;


// append img to html tag img
// credits: https://stackoverflow.com/questions/9596887/display-an-image-in-a-div-with-javascript

// some credits: https://devpress.csdn.net/mongodb/62fc7b9ec67703293080135f.html