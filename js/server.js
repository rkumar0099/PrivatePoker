const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const https = require('https')
const fs = require('fs')
const app = express();
app.use(express.json())
const key = fs.readFileSync("./https/rk.local/rk.local.key")
const cert = fs.readFileSync("./https/rk.local/rk.local.pem")
const httpsOptions = {
    key: key,
    cert: cert
}
//const server = http.createServer(app)
const server = https.createServer(httpsOptions, app)
const io = socketio(server);
const path = require('node:path');
const url = require('url');
const Player = require("./player");
const Database = require('./database');
const Login = require('./login')
const nodemailer = require('nodemailer')

const axios = require('axios')

const crypto = require('crypto')

const service = require("./service").newService(axios)

const {google} = require('googleapis')

const bcrypt = require('bcrypt')

const web3 = require('web3')

const db_url = "https://rk.local:8080/poker-servlet-1.0/"

const agent = new https.Agent({
    rejectUnauthorized: false,
})

axios.defaults.httpsAgent = agent


let socketToPlayer = {};
let players = {};
let gamePlayers = [undefined, undefined, undefined, undefined, undefined];
let totalPlayers = 0;
let playersJoined = [];
let gameBalance = 0;
let gameRunning = false;
let cardsDrawn = [];
let winners = [];
let activePlayers = [];
let roundInfo = {"skip":0, "raisedAmount":0, "gameBalance":0};
let gameFlow = {"round0Completed":false, "round1Completed":false, "round2Completed":false, "round3Completed":false, "winnerDecided":false, "gameEnded":false};
let seats = {};
let index = -1;
let playersPlaying = 0;
let playersAllin = 0;

let db = undefined;
let serverEmail = 'noreplyprivatepoker@gmail.com'


let handRanks = {'royalflush': 10000000000, 'straightflush': 1000000000, 
'fourofakind': 100000000, 'fullhouse': 10000000, 'flush': 1000000, 'straight': 100000, 
'threeofakind': 10000, 'twopair': 1000, 'onepair': 100};

let forms = {}


let cards = [];
let threeCombinations = [[0,1,2], [0,1,3], [0,1,4], [0,2,3], [0,2,4], [0,3,4], [1,2,3], [1,2,4], [1,3,4], [2,3,4]];
let fourCombinations = [[0,1,2,3], [0,1,2,4], [0,1,3,4], [0,2,3,4], [1,2,3,4]]

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
})

app.get('/dashboard', (req, res) => {
    //dashboard_file = "/mnt/c/users/'rabindar kumar'/appdata/local/programs/web/project1/dashboard.html"
    res.sendFile(path.join(__dirname, 'dashboard.html'));
})


app.post("/users/requests", (req, res) => {
    const from = req.body.from
    const to = req.body.to
    if (from === undefined || to === undefined) {
        internalError(res, "both from and to required")
        return
    }
    console.log(`[friend request] from: ${from}, to: ${to}`)
    service.findRequests(to).then(data => {
        console.log(data.success)
        let requests = ''
        console.log(data.data)
        if (data.data !== undefined) {
            requests = data.data;
        }
        requests += `${from};`
        console.log(requests)
        let params = {"username": to, "requests": requests}
        service.updateRequests(params).then(data => {
            if (data.success == true) {
                res.send(data)
            } else {
                res.send({"success": false, "error": "error sending friend request"})
            }
        }, error => {  
            console.log(error)
            res.send(error) })
    }, error => { 
        console.log(error)
        res.send(error) })
})

app.delete("/users/requests", (req, res) => {
    const from = req.query.from
    const to = req.query.to
    service.findRequests(to).then(data => {
        if (data.data === undefined) {
            res.send({"success": false, "error": "request do not exists"})
            return
        }
        console.log(data.data)
        let requests = data.data;
        let newRequests = ''
        const tokens = requests.split(";")
        let isDeleted = false;
        for (let token of tokens) {
            // varchar is longer than from, so empty string after ; is also sent
            if (token != from && token != '') {
                newRequests += `${token};`
                continue
            }
            isDeleted = true
        }
        if (isDeleted) {
            if (newRequests == '') {
                newRequests = null
            }
            console.log(newRequests);
            let params = {"username": to, "requests": newRequests}
            service.updateRequests(params).then(data => {
                if (data.success == true) {
                    res.send(data)
                } else {
                    res.send({"success": false, "error": "error deleting friend request"})
                }
            }, error => {  
                console.log(error)
                res.send(error) })
        } else {
            res.send({"success": false, "error": "request do not exists"})
        }

    }, error => { 
        console.log(error)
        res.send(error)
    })
})

app.post("/users/friends", (req, res) => {
    const username = req.body.username
    const friend = req.body.friend
    if (username === undefined || friend === undefined) {
        res.send({"success": false, "error": "both username and friend required"})
        return
    }

    service.findFriends(username).then(data => {
        if (!data.success) {
            res.send({"success": false, "error": "error adding friend"})
            return
        }
        let friends = ''
        if (data.success && data.data != null) {
            friends = data.data
        }
        friends += `${friend};`
        let params = {"username": username, "friends": friends}
        service.updateFriends(params).then(data => {
            console.log('updating friends')
            if (data.success) {
                console.log('friend added')
                res.send(data)
                return
            }
            console.log('error adding friend')
            res.send({"success": false, "error": "error adding friend"})
        }, error => { res.send(error) })

    }, error => { res.send(error) })

})  

app.delete("/users/friends", (req, res) => {
    const username = req.query.username
    const friend = req.query.friend
    if (username === undefined || friend === undefined) {
        res.send({success: false, error: "both username and friend params are required"})
        return
    }
    service.findFriends(username).then(data => {
        if (!data.success) {
            res.send({success: false, error: "error removing friend"})
            return
        }
        console.log(data.data)
        let friends = data.data
        let newFriends = ''
        const tokens = friends.split(";")
        let isDeleted = false;
        for (let token of tokens) {
            // varchar is longer than from, so empty string after ; is also sent
            if (token != friend && token != '') {
                newFriends += `${token};`
                continue
            }
            isDeleted = true
        }
        if (isDeleted) {
            if (newFriends == '') {
                newFriends = null
            }
            let params = {"username": username, "friends": newFriends}
            service.updateFriends(params).then(data => {
                if (data.success == true) {
                    res.send(data)
                } else {
                    res.send({"success": false, "error": "error removing friend"})
                }
            }, error => {  
                console.log(error)
                res.send(error) })
        } else {
            res.send({"success": false, "error": "friend do not exists"})
        }
    }, error => { res.send(error) })
    
})

app.get('/', (req, res) => {
    let ipAddr = req.socket.remoteAddress;
    console.log(`Received request from addr: ${ipAddr}`);
    res.sendFile(path.join(__dirname, 'play.html'));

});

app.get("/*.*", (req, res) => {
    const basepath = (url.parse(req.url)).pathname;
    console.log(`basepath: ${basepath}`);
    res.sendFile(path.join(__dirname, basepath));
});


function initCards() {
    for (let i = 0; i < 52; i ++) {
        cards[i] = i;
    }
}

// Fisher - Yates Shuffle Algorithm
// Credits: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
}


function checkStraight(ranks) {
    if (ranks[4] == 13 && ranks[3] == 12 && ranks[2] == 11 && ranks[1] == 10 && ranks[0] == 1) {
        return true;
    }
    let flag = true;
    for(let i = 0; i < 4; i ++) {
        if (ranks[i]+1 !== ranks[i+1]) {
            flag = false;
            break;
        }
    }
    return flag;
}

function checkFlush(types) {
   return types.filter(x => x === types[0]).length == types.length
}

function checkRoyalFlush(ranks, types) {
    if (checkStraight(ranks) && checkFlush(types)) {
        if (ranks[4] == 13 && ranks[3] == 12 && ranks[2] == 11 && ranks[1] == 10 && ranks[0] == 1) {
            return true;
        }
    }
    return false;
}

function checkFourOfAKind(ranks) {
    if (ranks.filter(x => { return x === ranks[0] }).length === 4) {
        return true;
    }
    if (ranks.filter(x => { return x === ranks[1] }).length === 4) {
        return true;
    }
    return false;
}

function checkFullHouse(ranks) {
    if ((ranks[0] == ranks[1]) && (ranks[1] == ranks[2]) && (ranks[3] == ranks[4])) {
        return true;
    }

    if ((ranks[0] == ranks[1]) && (ranks[2] == ranks[3]) && (ranks[3] == ranks[4])) {
        return true;
    }

    return false;
}

function checkThreeOfAKind(ranks) {
    if (ranks.filter(x => { return x === ranks[0] }).length === 3) {
        return true;
    }
    if (ranks.filter(x => { return x === ranks[1] }).length === 3) {
        return true;
    }

    if (ranks.filter(x => { return x === ranks[2] }).length === 3) {
        return true;
    }

    return false;
}

function checkTwoPair(ranks) {
    if (ranks[0] == ranks[1]) {
        return (ranks[2] == ranks[3] || ranks[3] == ranks[4]);
    } else {
        return (ranks[1] == ranks[2] && ranks[3] == ranks[4])
    }
}

function checkOnePair(ranks) {
    for (let i = 0; i < 4; i ++) {
        if (ranks.filter(x => x === ranks[i]).length == 2) {
            return true;
        }
    }
    return false;
}

function getPlayerHands(player, tableCards) {
    let tableType = [];
    let tableRank = [];

    for(let i = 0; i < 5; i ++) {
        tableType[i] = Math.floor(tableCards[i] / 13);
        tableRank[i] = (tableCards[i] % 13) + 1;
    }

    let playerType = [ Math.floor(player.currentCards[0] / 13), Math.floor(player.currentCards[1] / 13) ];
    let playerRank = [ (player.currentCards[0] % 13) + 1, (player.currentCards[1] % 13) + 1];

    let hands = {};

    // check with three combinations
    for (let i = 0; i < 10; i ++) {
        let combination = threeCombinations[i];
        let types = [playerType[0], playerType[1], tableType[combination[0]], tableType[combination[1]], tableType[combination[2]]]
        let ranks = [playerRank[0], playerRank[1], tableRank[combination[0]], tableRank[combination[1]], tableRank[combination[2]]];
        ranks.sort();

        if (checkRoyalFlush(ranks, types)) {
            if (hands['royalflush'] === undefined) {
                hands['royalflush'] = [];
            }
            hands["royalflush"].push(handRanks['royalflush']);
        } else if (checkStraight(ranks) && checkFlush(types)) {
            if (hands['straighflush'] === undefined) {
                hands['straightflush'] = [];
            }
            let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
            hands['straightflush'].push(handRanks['straightflush'] + finalRank);
        } else if (checkFourOfAKind(ranks)) {
            if (hands['fourofakind'] === undefined) {
                hands['fourofakind'] = [];
            }
            let finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
            hands['fourofakind'].push(handRanks['fourofakind'] + finalRank);
        } else if (checkFullHouse(ranks)) {
            if (hands['fullhouse'] === undefined) {
                hands['fullhouse'] = [];
            }
            let finalRank;
            if (ranks[2] == ranks[3]) {
                finalRank = (ranks[2] + (Math.floor(1/ranks[2]))*13) + (ranks[1] + (Math.floor(1/ranks[1]))*13);
            } else {
                finalRank = (ranks[2] + (Math.floor(1/ranks[2]))*13) + (ranks[3] + (Math.floor(1/ranks[3]))*13);
            }
            hands['fullhouse'].push(handRanks['fullhouse'] + finalRank);
        } else if (checkFlush(types)) {
            if (hands['flush'] === undefined) {
                hands['flush'] = [];
            }
            let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
            hands['flush'].push(handRanks['flush'] + finalRank);
        } else if (checkStraight(ranks)) {
            if (hands['straight'] === undefined) {
                hands['straight'] = [];
            }
            let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
            hands['straight'].push(handRanks['straight'] + finalRank);
        }  else if (checkThreeOfAKind(ranks)) {
            if (hands['threeofakind'] === undefined) {
                hands['threeofakind'] = [];
            }
            let finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
            hands['threeofakind'].push(handRanks['threeofakind'] + finalRank);
        } else if (checkTwoPair(ranks)) {
            if (hands['twopair'] === undefined) {
                hands['twopair'] = [];
            }
            let subRank0 = ranks[1] + Math.floor((1/ranks[1]))*13;
            let subRank1 = ranks[3] + Math.floor((1/ranks[3]))*13;
            if (subRank0 > subRank1) {
                let finalRank = subRank0*10+subRank1;
                hands['twopair'].push(handRanks['twopair'] + finalRank);
            } else {
                let finalRank = subRank1*10+subRank0;
                hands['twopair'].push(handRanks['twopair'] + finalRank);
            }
        
        } else if (checkOnePair(ranks)) {
            if (hands['onepair'] === undefined) {
                hands['onepair'] = [];
            }
            let finalRank;
            if (ranks[0] == ranks[1]) {
                finalRank = ranks[0] + Math.floor((1/ranks[0]))*13;
            } else if (ranks[1] == ranks[2]) {
                finalRank = ranks[1] + Math.floor((1/ranks[1]))*13;
            } else if (ranks[2] == ranks[3]) {
                finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
            } else {
                finalRank = ranks[3] + Math.floor((1/ranks[3]))*13;
            }
            hands['onepair'].push(handRanks['onepair'] + finalRank);
        }
    }

    // check four combinations for each indivdual player's cards
    for(let i = 0; i < 5; i ++) {
        let combination = fourCombinations[i];
        for(let j = 0; j < 2; j ++) {
            let types = [tableType[combination[0]], tableType[combination[1]], tableType[combination[2]], tableType[combination[3]], playerType[j]];
            let ranks = [tableRank[combination[0]], tableRank[combination[1]], tableRank[combination[2]], tableRank[combination[3]], playerRank[j]];
            ranks.sort();

            if (checkRoyalFlush(ranks, types)) {
                if (hands['royalflush'] === undefined) {
                    hands['royalflush'] = [];
                }
                hands["royalflush"].push(handRanks['royalflush']);
            } else if (checkStraight(ranks) && checkFlush(types)) {
                if (hands['straighflush'] === undefined) {
                    hands['straightflush'] = [];
                }
                let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
                hands['straightflush'].push(handRanks['straightflush'] + finalRank);
            } else if (checkFourOfAKind(ranks)) {
                if (hands['fourofakind'] === undefined) {
                    hands['fourofakind'] = [];
                }
                let finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
                hands['fourofakind'].push(handRanks['fourofakind'] + finalRank);
            } else if (checkFullHouse(ranks)) {
                if (hands['fullhouse'] === undefined) {
                    hands['fullhouse'] = [];
                }
                let finalRank;
                if (ranks[2] == ranks[3]) {
                    finalRank = (ranks[2] + (Math.floor(1/ranks[2]))*13) + (ranks[1] + (Math.floor(1/ranks[1]))*13);
                } else {
                    finalRank = (ranks[2] + (Math.floor(1/ranks[2]))*13) + (ranks[3] + (Math.floor(1/ranks[3]))*13);
                }
                hands['fullhouse'].push(handRanks['fullhouse'] + finalRank);
            } else if (checkFlush(types)) {
                if (hands['flush'] === undefined) {
                    hands['flush'] = [];
                }
                let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
                hands['flush'].push(handRanks['flush'] + finalRank);
            } else if (checkStraight(ranks)) {
                if (hands['straight'] === undefined) {
                    hands['straight'] = [];
                }
                let finalRank = (ranks[0] + Math.floor((1/ranks[0]))*13) + (ranks[4] + Math.floor((1/ranks[4]))*13);
                hands['straight'].push(handRanks['straight'] + finalRank);
            }  else if (checkThreeOfAKind(ranks)) {
                if (hands['threeofakind'] === undefined) {
                    hands['threeofakind'] = [];
                }
                let finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
                hands['threeofakind'].push(handRanks['threeofakind'] + finalRank);
            } else if (checkTwoPair(ranks)) {
                if (hands['twopair'] === undefined) {
                    hands['twopair'] = [];
                }
                let subRank0 = ranks[1] + Math.floor((1/ranks[1]))*13;
                let subRank1 = ranks[3] + Math.floor((1/ranks[3]))*13;
                if (subRank0 > subRank1) {
                    let finalRank = subRank0*10+subRank1;
                    hands['twopair'].push(handRanks['twopair'] + finalRank);
                } else {
                    let finalRank = subRank1*10+subRank0;
                    hands['twopair'].push(handRanks['twopair'] + finalRank);
                }
            
            } else if (checkOnePair(ranks)) {
                if (hands['onepair'] === undefined) {
                    hands['onepair'] = [];
                }
                let finalRank;
                if (ranks[0] == ranks[1]) {
                    finalRank = ranks[0] + Math.floor((1/ranks[0]))*13;
                } else if (ranks[1] == ranks[2]) {
                    finalRank = ranks[1] + Math.floor((1/ranks[1]))*13;
                } else if (ranks[2] == ranks[3]) {
                    finalRank = ranks[2] + Math.floor((1/ranks[2]))*13;
                } else {
                    finalRank = ranks[3] + Math.floor((1/ranks[3]))*13;
                }
                hands['onepair'].push(handRanks['onepair'] + finalRank);
            }
        }
    }

    return hands;
}

io.on('connection', socket => {
    // new socket connection
    console.log("Received new connection");
    socketToPlayer[socket.id] = undefined;
    listenFromPlayer(socket);
});

function send(event, player) {
    if (event == 'playerInfo') {
        let data = `{"playerBalance":${player.availableBalance}, "tableBalance":${player.tableBalance}, "staked":${player.staked}}`;
        //console.log(`sending player info ${data}`);
        player.socket.emit('playerInfo', {data:data});
    } else if (event == 'roomInfo') {
        let roomData = [];
        gamePlayers.forEach(gamePlayer => {
            if (gamePlayer !== undefined) {
                roomData.push({Id: gamePlayer.Id, tableBalance: gamePlayer.tableBalance, staked: gamePlayer.staked})
            } else {
                roomData.push(null);
            }
        });
        //console.log(`room data: ${roomData}`);
        let data = `{"seatsInfo":${JSON.stringify(roomData)}, "gameBalance":${gameBalance}, "tableCards":${JSON.stringify(cardsDrawn)}}`;
        //console.log(`Sending room info to player${player.Id} with socket ${player.socket.id}\nroom data is ${data}`);
        player.socket.emit('roomInfo', {data:data});
    } else if (event == 'playerCards') {
        let data = `{"card0":${player.currentCards[0]}, "card1":${player.currentCards[1]}}`;
        player.socket.emit('playerCards', {data:data});
    }
}

function broadcast(event, player=undefined) {
    if (event == 'roomInfo') {
        playersJoined.forEach(player => {
            send('roomInfo', player);
        });
    } else if (event == 'play') {
        let seat = seats[player.Id];
        let data = `{"seat":${seat}, "raisedAmount":${roundInfo['raisedAmount']}, "tableBalance":${player.tableBalance}, "staked":${player.staked}}`;
        playersJoined.forEach(joinedPlayer => {
            joinedPlayer.socket.emit('play', {data:data});
        });
    } else if (event == 'stop') {
        let data = `{"seat":${seats[player.Id]}}`
        playersJoined.forEach(joinedPlayer => {
            joinedPlayer.socket.emit('stop', {data:data});
        });
    } else if (event == 'showCards') {
        let players = [];
        activePlayers.filter(activePlayer => {
            if (activePlayer.playing) {
                players.push({seat:seats[activePlayer.Id], card0:activePlayer.currentCards[0], card1:activePlayer.currentCards[1]});
            }
        });
        let data = `{"players":${JSON.stringify(players)}}`;
        playersJoined.forEach(joinedPlayer => {
            joinedPlayer.socket.emit('showCards', {data:data});
        });
    }  else if (event == 'gameEnd') {
        let roomData = []
        for(let i = 0; i < 5; i ++) {
            let gamePlayer = gamePlayers[i];
            if (gamePlayer !== undefined && gamePlayer.tableBalance === 0) {
                seats[gamePlayer.Id] = 0;
                gamePlayers[i] = undefined;
                roomData.push(null);
            } else if (gamePlayer !== undefined) {
                roomData.push({Id: gamePlayer.Id, tableBalance: gamePlayer.tableBalance, staked: gamePlayer.staked});
            } else {
                roomData.push(null);
            }
        }
        cardsDrawn = [];
        winners = [];
        let data = `{"seatsInfo":${JSON.stringify(roomData)}, "gameBalance":${gameBalance}, "tableCards":${JSON.stringify(cardsDrawn)}}`;
        playersJoined.forEach(joinedPlayer => {
            joinedPlayer.socket.emit('gameEnd');
            joinedPlayer.socket.emit('roomInfo', {data:data});
        });
        setTimeout(playGame, 2000);
    }
}

function listenFromPlayer(socket) {
    socket.on('connectionData', ({data}) => {
        // check socketToPlayer[socket] === undefined later
        data = JSON.parse(data);
        console.log(`Received connection data from ${socket.id}`);
        let playerId;
        if (data['cookie'] === null) {
            // new player
            totalPlayers += 1;
            let player = new Player(totalPlayers, socket);
            playerId = player.Id;
            players[playerId] = player;
            let data = `{"Id":${playerId}}`
            socket.emit('newPlayer', {data:data});
        } else {
            let cookies = data['cookie'].split(';');
            playerId = Number(cookies[0].split("=")[1]);
            if (players[playerId] === undefined) {
                totalPlayers += 1;
                let player = new Player(playerId, socket);
                players[playerId] = player;
            } 
        }

        let player = players[playerId];
        console.log(`Received Join request from player${player.Id} with available balance: ${player.availableBalance}`);
        player.socket = socket;
        socketToPlayer[socket.id] = player;
        if (data['path'] === 'lobby' ) {
            playersJoined = playersJoined.filter(joinedPlayer => {
                return joinedPlayer.Id !== player.Id;
            });
            let data = `{"playerBalance":${player.availableBalance}}`;
            socket.emit('playerInfo', {data:data});
            return;
        } else {
            if (!playersJoined.includes(player)) {
                playersJoined.push(player);
            }
            console.log(`Players Joined: ${playersJoined.length}`);
            send('playerInfo', player);
            broadcast('roomInfo', player);
        }
    });

    socket.on('sit', ({data}) => {
        data = JSON.parse(data);
        let player = socketToPlayer[socket.id];
        // assume validation is done at client side
        console.log(`Player ${player.Id} sent sit request`);
        let seat = data['seat'];
        player.tableBalance += data["balance"];
        player.availableBalance -= data["balance"];
        player.playing = false;
        gamePlayers[seat - 1] = socketToPlayer[socket.id];
        seats[player.Id] = seat;
        player.currentCards[0] = -1;
        player.currentCards[1] = -1;
        send('playerInfo', player);
        send('playerCards', player);
        broadcast('roomInfo');
        console.log(`Player${seat} seated`);
        setTimeout(() => {
            if (!gameRunning) {
                if (gamePlayers.filter(player => { return player !== undefined }).length > 1) {
                    gameRunning = true;
                    playGame();
                }
            }
        }, 1000);
        
    });

    socket.on('stand', (event) => {
        let player = socketToPlayer[socket.id];
        console.log(`Player${player.Id} sent stand request`);
        player.availableBalance += player.tableBalance;
        player.tableBalance = 0;
        //roundInfo['gameBalance'] += player.staked;
        player.staked = 0;
        let seat = seats[player.Id];
        gamePlayers[seat - 1] = undefined;
        seats[player.Id] = 0;
        player.playing = false;
        playersPlaying -= 1;
        
        send('playerInfo', player);
        broadcast('roomInfo');
    });

    socket.on('called', ({data}) => {
        data = JSON.parse(data);
        let player = socketToPlayer[socket.id];
        player.responded = true;
        player.stake = data["amount"];
    });

    socket.on('checked', (event) => {
        let player = socketToPlayer[socket.id];
        player.responded = true;
    });

    socket.on('raised', ({data}) => {
        data = JSON.parse(data);
        let player = socketToPlayer[socket.id];
        player.responded = true;
        player.stake = data["amount"];
    });

    socket.on('folded', (event) => {
        let player = socketToPlayer[socket.id];
        //roundInfo['gameBalance'] += player.staked;
        player.staked = 0;
        player.responded = true;
        player.playing = false;
        playersPlaying -= 1;

        send('playerInfo', player);
    });

    socket.on('sendMsg', ({data}) => {
        data = JSON.parse(data);
        console.log('Received sendMsg request');
        let from = Number(data['from']);
        let to = data['to'];
        let msg = data['msg'];
        console.log(`Received sendMsg req: from ${from}, to ${to} msg ${msg}`);
        if(to === 'everyone' && from !== undefined) {
            console.log('Sending message to everyone');
            let content = `You to everyone: ${msg}`
            let data = `{"msg":"${content}"}`;
            gamePlayers[from-1].socket.emit('newMsg', {data:data});
            content = `player${from} to everyone: ${msg}`
            data = `{"msg":"${content}"}`;
            playersJoined.filter(player => {
                if (player.Id !== gamePlayers[from-1].Id) {
                    player.socket.emit('newMsg', {data:data});
                }
            });
        } else if (from !== undefined && to !== undefined) {
            to = Number(to);
            let content = `You to player${to}: ${msg}`;
            let data = `{"msg":"${content}"}`;
            gamePlayers[from - 1].socket.emit('newMsg', {data:data});
            content = `player${from} to you: ${msg}`;
            data = `{"msg":"${content}"}`;
            gamePlayers[to - 1].socket.emit('newMsg', {data:data});
        }
    });

    socket.on('disconnect', (event) => {
        let player = socketToPlayer[socket.id];
        console.log(`Disconnecting player${player.Id}`);
        player.availableBalance += player.tableBalance;
        player.tableBalance = 0;
        roundInfo['gameBalance'] += player.staked;
        player.staked = 0;
        player.playing = false;
        for(let i = 0; i < 5; i ++) {
            if (gamePlayers[i] !== undefined && gamePlayers[i] === player) {
                console.log(`Removing player${player.Id} from game players list`);
                gamePlayers[i] = undefined;
                break;
            }
        }
        socketToPlayer[socket.id] = undefined;
    });
}

function updateRoundInfo(player) {
    let requiredAmount = roundInfo['raisedAmount'] - player.staked;
    player.staked += player.stake;
    player.tableBalance -= player.stake;
    if (player.stake > requiredAmount) {
        roundInfo['skip'] = player.Id;
        roundInfo['raisedAmount'] = player.staked;
    }
    roundInfo['gameBalance'] += player.stake;
    player.stake = 0;
    if (player.tableBalance === 0) {
        player.allin = true;
        playersAllin += 1;
    }
}

// assume responded if number of players playing are 1

function play(player) {
    player.responded = false;
    broadcast('play', player);

    player.timer = 20;
    setTimeout(function wait() {
        player.timer -= 1;
        if (!player.playing) {
            player.timer = 0;
            return;
        }
        if (player.responded) {
            console.log(`Player${player.Id} has responded`);
        } else if (player.timer > 0) {
            if (playersPlaying === 1) {
                player.responded = true;
            } else {
                setTimeout(wait, 1000);
            }
        } else {
            playersPlaying -= 1;
            player.playing = false;
        }
    }, 1000);
}


function decideWinner() {
    let key = 'round3Completed';
    setTimeout(function wait() {
        if (gameFlow[key] === true) {
            // at least 2 players are playing, decide using max hand
            let decidingPlayers = activePlayers.filter(player => {
                return player.playing;
            });
            let maxHand = [];
            decidingPlayers.forEach(player => {
                let hands = getPlayerHands(player, cardsDrawn);
                //console.log(hands);
                let arr = [];
                for(const [hand, hand_list] of Object.entries(hands)) {
                    arr.push(...hand_list);
                }
                player.maxhand = Math.max(0, Math.max(...arr));
                maxHand.push(player.maxhand);
            });
            let maxhand = Math.max(...maxHand);
            console.log(`Max hand ${maxhand}`);
            winners = decidingPlayers.filter(player => {
                console.log(`Player${player.Id} max hand ${player.maxhand}`);
                return player.maxhand === maxhand;
            });

            let winningAmount = Math.floor(roundInfo['gameBalance'] / winners.length);
            winners.forEach(player => {
                player.tableBalance += winningAmount;
                console.log(`Winner is ${player.Id} with hand ${maxhand}, table balance: ${player.tableBalance}`);
            });
            gameBalance = 0;
            broadcast('showCards');
            setTimeout(() => {
                winners.forEach(player => {
                    send('playerInfo', player);
                });
                broadcast('roomInfo');
            }, 3000);
            setTimeout(broadcast, 4000, 'gameEnd');
        } else if (playersPlaying === 1) {
            console.log('Decide winner ended');
            return;
        } else {
            setTimeout(wait, 1000);
        }
    }, 1000);
}

function runRound(roundNum) {
    let key;
    if (roundNum === 0) {
        key = `round${roundNum}Completed`;
    } else {
        key = `round${roundNum-1}Completed`;
    }
    if (roundNum === 0 || gameFlow[key] === true) {
        if (playersPlaying === 1) {
            console.log(`Round ${roundNum} ended`);
            return;
        }

        if (playersPlaying - playersAllin < 2) {
            setTimeout(() => {
                gameFlow[`round${roundNum}Completed`] = true;
            }, 1000);
            return;
        }

        let start = 0;
        let player = activePlayers[start];
        while(!player.playing || player.allin) {
            start = (start + 1) % activePlayers.length;
            player = players[start];
        }
        roundInfo['skip'] = player.Id;
        roundInfo['raisedAmount'] = 0;
        play(player);

        setTimeout(function wait() {
            if (!player.playing || player.responded) {
                console.log('Broadcasting stop request to players');
                broadcast('stop', player);
                if (player.responded && player.playing) {
                    if (playersPlaying === 1) {
                        player.tableBalance += roundInfo['gameBalance'];
                        player.staked = 0;
                        gameBalance = 0;
                        broadcast('roomInfo');
                        send('playerInfo', player);
                        broadcast('gameEnd');
                        return;
                    }
                    updateRoundInfo(player);
                    send('playerInfo', player);
                    broadcast('roomInfo');
                    while(true) {
                        start = (start + 1) % activePlayers.length;
                        player = activePlayers[start];
                        if (roundInfo['skip'] === player.Id) {
                            gameBalance = roundInfo['gameBalance'];
                            activePlayers.filter(activePlayer => {
                            activePlayer.staked = 0;
                            });
                            activePlayers.filter(activePlayer => {
                                send('playerInfo', activePlayer);
                            });
                            broadcast('roomInfo');
                            console.log(`Round ${roundNum} completed`);
                            gameFlow[`round${roundNum}Completed`] = true;
                            return;
                        }
                        if (player.playing && !player.allin) {
                            break;
                        }
                    }
                    play(player);
                    setTimeout(wait, 1000);
                } else if (!player.playing) {
                    if (playersPlaying === 1) {
                        // announce the winner here
                        for(let i = 0; i < activePlayers.length; i ++) {
                            player = activePlayers[i];
                            if (player.playing) {
                                player.tableBalance += roundInfo['gameBalance'];
                                player.staked = 0;
                                gameBalance = 0;
                                broadcast('roomInfo');
                                send('playerInfo', player);
                                break;
                            }
                        }
                        broadcast('gameEnd');
                        return;
                    }
                    gameBalance += player.staked;
                    player.staked = 0;
                    send('playerInfo', player);
                    broadcast('roomInfo');
                } 
            } else if (player.timer > 0) {
                setTimeout(wait, 1000);
            }
        }, 1000);
    } else {
        if (playersPlaying > 1) {
            setTimeout(runRound, 1000, roundNum);
        } else {
            console.log(`Round${roundNum} ended`);
        }
    }
}

function drawCards(roundNum, numCards) {
    let key = `round${roundNum}Completed`;
    setTimeout(function wait() {
        if (gameFlow[key] === true) {
            console.log('drawing cards');
            for(let i = 0; i < numCards; i ++) {
                index += 1;
                cardsDrawn.push(cards[index]);
            }
            broadcast('roomInfo');
        } else {
            if (playersPlaying > 1) {
                setTimeout(wait, 1000);
            } else {
                console.log(`draw cards (${roundNum}, ${numCards}) ended`);
            }
        }
    }, 1000);
}

function playGame() {
    activePlayers = gamePlayers.filter(player => {
        if (player !== undefined) {
            player.playing = true;
            player.responded = false;
            player.allin = false;
            player.staked = 0;
            player.maxhand = -1;
            return true;
        }
    });
    if (activePlayers.length < 2) {
        gameRunning = false;
        console.log(`Returning from play game`);
        return;
    }

    playersPlaying = activePlayers.length;
    console.log(`Players playing game ${activePlayers.length}`);
    cardsDrawn = [];
    winners = [];
    gameBalance = 0;
    roundInfo['skip'] = 0;
    roundInfo['raisedAmount'] = 0;
    roundInfo['gameBalance'] = 0;
    index = -1;
    playersAllin = 0;
    gameFlow['round0Completed'] = false;
    gameFlow['round1Completed'] = false;
    gameFlow['round2Completed'] = false;
    gameFlow['round3Completed'] = false;

    broadcast('roomInfo');
    initCards();
    shuffle(cards);
    activePlayers.forEach(player => {
        player.playing = true;
        index++;
        let card0 = cards[index];
        index++;
        let card1 = cards[index];
        player.currentCards[0] = card0;
        player.currentCards[1] = card1;
        send('playerCards', player);
    });

    
    runRound(0);
    drawCards(0, 3);
    runRound(1);
    drawCards(1, 1);
    runRound(2);
    drawCards(2, 1);
    runRound(3);
    decideWinner(3);
}

// ref: https://developers.google.com/gmail/api/auth/scopes
// gmail scope: https://www.googleapis.com/auth/gmail.addons.current.action.compose # compose and send emails
// 


server.listen(8082, () => {
    console.log("Server listening on port 8082");
});



