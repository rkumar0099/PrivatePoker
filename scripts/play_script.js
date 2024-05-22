const socket = io();
const baseURI = 'http://localhost:8080/';

let url;
let cardsDrawn = [];
let playerInfo = {};
let requiredAmount = 0;
let playerId = -1;
let playerElement = undefined;
let playerSeat = undefined;
let elementTurn = undefined;
let responded = true;
let seated = [-1, -1, -1, -1, -1];
let chatParticipants = [false, false, false, false, false];

let from = undefined;
let to = undefined;

function emitConnectionData(socket) {
    let cookie = document.cookie;
    let tokens = window.location.href.split('/');
    url = `"${tokens[tokens.length - 1]}"`;
    let data;
    if (cookie === '') {
        data = `{"cookie":${null}, "url":${url}}`;
    } else {
        let cookies = cookie.split(';');
        playerId = Number(cookies[0].split("=")[1]);
        data = `{"cookie":"${cookie}", "url":${url}}`;
    }
    socket.emit('connectionData', ({data:data}));
}


socket.on('connect', (event) => {
    console.log("Connected to the server");
    emitConnectionData(socket);
});

socket.on('disconnect', (event) => {
    playerId = -1;
    playerSeat = undefined;
    console.log('Disconnected from the server');
});


// 0 - hearts, 1 - diamonds, 2 - spades, 3 - clubs
let types = { 0: "hearts", 1: "diamonds", 2: "spades", 3: "clubs" };
let numbers = { 1: "ace", 11: "jack", 12: "queen", 13: "king" };
let cards = [];

function getImgURL(card) {
    if (card == -1) {
        return "/images/card_back.png";
    }
    let type = Math.floor(card/13);
    let rank = (card%13)+1;
    let imgURL = "/images/";
    if (rank >= 2 && rank <= 10) {
        imgURL += rank.toString() + "_of_" + types[type] + ".png";
    } else {
        imgURL += numbers[rank] + "_of_" + types[type] + ".png";
    }
    return imgURL;
}

socket.on('newPlayer', ({data}) => {
    data = JSON.parse(data);
    document.cookie = `playerId=${data['Id']};`;
    playerId = data['Id'];
});

socket.on('playerInfo', ({data}) => {
    data = JSON.parse(data);
    if (url === '/lobby') {
        playerInfo['playerBalance'] = data['playerBalance'];
        playerInfo['tableBalance'] = 0;
        playerInfo['staked'] = 0;
    } else {
        playerInfo['playerBalance'] = data['playerBalance'];
        playerInfo['tableBalance'] = data['tableBalance'];
        playerInfo['staked'] = data['staked'];
    }
    setPlayerInfo();
});


socket.on('roomInfo', ({data}) => {
    data = JSON.parse(data);
    let seatsInfo = data['seatsInfo'];
    for(let i = 0; i < 5; i ++) {
        let seat = i+1;
        let seatInfo = seatsInfo[i];
        if (seatInfo === null && playerSeat == seat) {
            playerSeat = undefined;
            let otherActions = document.getElementById('other_actions').children;
            otherActions[0].disabled = true;
            otherActions[1].disabled = true;
            break;
        }
    }


    let emptySeats = 0;
    for(let i = 0; i < 5; i ++) {
        let seat = i+1;
        let seatInfo = seatsInfo[i];
        if (seatInfo !== null) {
            if (seated[i] === -1) {
                let profile = document.getElementById(`player${seat}`);
                profile.innerText = '';
                profile.className = 'profile';
                profile.style['opacity'] = 1;
                profile.removeEventListener('click', ()=>{});
                // fetch profile picture from database using Id in seatInfo
            } else if (seated[i] !== seatInfo['Id']) {
                // change profile picture
            }


            let stake = document.getElementById(`stake${seat}`);
            let tableBalance = document.getElementById(`table_balance${seat}`);
            stake.innerText = `$${seatInfo['staked']}`;
            tableBalance.innerText = `$${seatInfo['tableBalance']}`;
            tableBalance.style['opacity'] = 1;
            if (seatInfo['staked'] > 0) {
                stake.style['opacity'] = 1;
            } else {
                stake.style['opacity'] = 0;
            }

            seated[i] = seatInfo['Id'];
            if (playerSeat == seat) {
                console.log('Enabling other actions');
                let otherActions = document.getElementById('other_actions').children;
                otherActions[0].disabled = false;
                otherActions[1].disabled = false;
            }
        } else {
            let profile = document.getElementById(`player${seat}`);
            profile.className = 'sit';
            emptySeats += 1;
            if (playerSeat !== undefined) {
                // hide the s
                profile.style['opacity'] = 0;
                profile.style['cursor'] = 'none';
                profile.removeEventListener('click', ()=>{});
            } else {
                profile.innerText = 'SIT';
                profile.style['opacity'] = 1;
                profile.style['cursor'] = 'pointer';
                profile.addEventListener('click', (event) => {
                    playerSeat = event.target.id.substring("player".length)
                    document.getElementById('dialog_box').show();
                });
            }
            let stake = document.getElementById(`stake${seat}`);
            let tableBalance = document.getElementById(`table_balance${seat}`);
            let cards = document.getElementById(`cards${seat}`);
            let timer = document.getElementById(`timer${seat}`);
            stake.style['opacity'] = 0;
            tableBalance.style['opacity'] = 0;
            cards.style['opacity'] = 0;
            timer.style['opacity'] = 0;

            seated[i] = -1;
        }
    }
    
    console.log(`Number of empty seats: ${emptySeats}`);

    let tableCards = document.getElementsByClassName('table_cards')[0].children;
    for(let i = 0; i < data['tableCards'].length; i ++) {
        tableCards[i].style.opacity = 1;
        tableCards[i].style['background-image'] = `url(${getImgURL(data['tableCards'][i])})`;
    }

    document.getElementsByClassName('game_balance')[0].innerHTML = `Game Pot: $${data['gameBalance']}`;

    if (playerSeat !== undefined) {
        let participantsList = document.getElementById('participants_list');
        if (participantsList.children[0] === undefined) {
            let participant = document.createElement('button');
            participant.innerText = 'Everyone';
            participant.id = `everyone`;
            participant.className = 'participant';
            participant.addEventListener('click', (event) => {
                updateParticipant(event);
            });
            participantsList.appendChild(participant);
        }
        for(let i = 0; i < 5; i ++) {
            let seat = i+1;
            if (seated[i] !== -1 && !chatParticipants[i]) {
                if (playerSeat === seat) {
                    from = seat
                    chatParticipants[i] = true;
                } else {
                    let participant = document.createElement('button');
                    participant.innerText = `player${seat}`;
                    participant.id = `chat${seat}`;
                    participant.className = 'participant';
                    participant.addEventListener('click', (event) => {
                        updateParticipant(event);
                    });
                    participantsList.appendChild(participant);
                    chatParticipants[i] = true;
                }
            } else if (seated[i] === -1 && chatParticipants[i]) {
                let participant = document.getElementById(`chat${seat}`);
                participantsList.removeChild(participant);
                chatParticipants[i] = false;
            }
        }
    }
});


socket.on('playerCards', ({data}) => {
    console.log("Received cards");
    data = JSON.parse(data);
    let cards = document.getElementById(`cards${playerSeat}`);
    cards.style['opacity'] = 1;
    cards.children[0].style['background-image'] = `url(${getImgURL(data['card0'])})`;
    cards.children[1].style['background-image'] = `url(${getImgURL(data['card1'])})`;
});

socket.on('play', ({data}) => {
    data = JSON.parse(data);
    console.log(`Received play request from server with data ${data}`);
    let seat = data['seat'];
    if (seat == playerSeat) {
        let raisedAmount = data['raisedAmount'];
        playerInfo['tableBalance'] = data['tableBalance'];
        playerInfo['staked'] = data['staked'];
        requiredAmount = raisedAmount - data['staked'];
        console.log(`Required amount: ${requiredAmount}`);
        let actionButtons = document.getElementsByClassName('action');
        if (requiredAmount > 0) {
            actionButtons[0].innerHTML = "CALL";
        } else {
            actionButtons[0].innerHTML = "CHECK";  
        }

        if (requiredAmount < playerInfo['tableBalance']) {
            document.getElementsByClassName('raise_amount')[0].disabled = false;
            actionButtons[2].disabled = false;
        }

        actionButtons[0].disabled = false;
        actionButtons[1].disabled = false;
    }

    let timer = document.getElementById(`timer${seat}`);
    timer.style['opacity'] = 1;
    timer.style['animation-name'] = 'changeHeight';
    timer.style['animation-duration'] = '20s';
});

socket.on('stop', ({data}) => {
    console.log('received stop play request from server');
    data = JSON.parse(data);
    let seat = data['seat'];
    let timer = document.getElementById(`timer${seat}`);
    timer.style['opacity'] = 0;
    timer.style['animation-name'] = 'none';
    timer.style['animation-duration'] = '0s';
    if (seat == playerSeat) {
        stop();
    }
});

socket.on('showCards', ({data}) => {
    data = JSON.parse(data);
    for(let i = 0; i < data['players'].length; i ++) {
        let info = data['players'][i];
        let seat = info['seat'];
        if (seat != playerSeat) {
            let cards = document.getElementById(`cards${seat}`);
            cards.style['opacity'] = 1;
            cards.children[0].style['background-image'] = `url(${getImgURL(info['card0'])})`;
            cards.children[1].style['background-image'] = `url(${getImgURL(info['card1'])})`;
        }
    }
});

socket.on('gameEnd', (event) => {
    for(let i = 0; i < 5; i ++) {
        let seat = i+1;
        let cards = document.getElementById(`cards${seat}`);
        cards.children[0].style['background-image'] = 'url("/images/card_back.png")';
        cards.children[1].style['background-image'] = 'url("/images/card_back.png")';
        if (playerSeat == seat) {
            continue;
        } else {
            cards.style['opacity'] = 0;
        }

    }
    let tableCards = document.getElementsByClassName('table_cards')[0].children;
    for (let child of tableCards) {
        child.style['opacity'] = 0;
        child.style['background-image'] = 'url("/images/card_back.png")';
    }
});

socket.on('newMsg', ({data}) => {
    data = JSON.parse(data);
    console.log('Recieved new message');
    let msg = document.createElement('p');
    msg.innerText = data['msg'];
    document.getElementById('room').appendChild(msg);
});

function stop() {
    let element;
    for(element of document.getElementById('player_actions').children) {
        element.disabled = true;
    }
    element = document.getElementsByClassName('raise_amount')[0];
    element.value = "0";
    element.disabled = true;
}

function setPlayerInfo() {
    let element;
    element = document.getElementById('player_info');
    element.children[0].innerHTML = `Available Balance: $${playerInfo['playerBalance']}`;
    element.children[1].innerHTML = `Table Balance: $${playerInfo['tableBalance']}`;
    element.children[2].innerHTML = `Current Stake: $${playerInfo['staked']}`;
}

function setDefaultView() {
    let element;
    element = document.getElementById('player_info');
    console.log(element)
    element.children[0].innerHTML = 'Available Balance: $0';
    element.children[1].innerHTML = 'Table Balance: $0';
    element.children[2].innerHTML = 'Current Stake: $0';

    let tableCards = document.getElementsByClassName('table_card');
    for (let child of tableCards) {
        child.style['opacity'] = 0;
        child.style['background-image'] = 'url("/images/card_back.png")';
    }

    let cards = document.getElementsByClassName('cards');
    for(let child of cards) {
        child.style['opacity'] = 0;
        child.children[0].style['background-image'] = 'url("/images/card_back.png")';
        child.children[1].style['background-image'] = 'url("/images/card_back.png")';
    }

    let stakes = document.getElementsByClassName('stakes')[0].children;
    for(let child of stakes) {
        child.innerText = '$0';
        child.style['opacity'] = 0;
    }

    let tableBalances = document.getElementsByClassName('table_balance')[0].children;
    for(let child of tableBalances) {
        child.innerText = '$0';
        child.style['opacity'] = 0;
    }

    let timers = document.getElementsByClassName('timer');
    for(let child of timers) {
        child.style['opacity'] = 0;
    }

    for(let child of document.getElementsByClassName('sit')) {
        child.addEventListener('click', (event) => {
            playerSeat = event.target.id.substring("player".length);
            console.log(`Player clicked sit ${playerSeat}\n`);
            document.getElementById('dialog_box').show();
        });
    }
}


function closeDialog(event) {
    console.log('closing the dialog box');
    playerElement = undefined;
    playerSeat = undefined;
    document.getElementById('dialog_box').close();
    event.preventDefault();
}

function join(event) {
    event.preventDefault();
    let creditAmount = Math.floor(Number(document.getElementsByClassName('credit_amount')[0].value));
    creditAmount = Math.min(creditAmount, playerInfo['playerBalance']);
    console.log(`player${playerSeat} sent the sit request with credit amount ${creditAmount}`);
    if (creditAmount < 1000) {
        document.getElementById("err_msg").style.opacity = 1;
        setTimeout(() => {
            document.getElementById("err_msg").style.opacity = 0;
        }, 3000);
    } else {
        document.getElementById('dialog_box').close();
        let data = `{"seat":${playerSeat}, "balance":${creditAmount}}`;
        console.log(`Sending sit request with data ${data}`);
        socket.emit('sit', {data:data});
    }
}

function clickedCheck(event) {
    responded = true;
    if (requiredAmount == 0) {
        socket.emit('checked');
        return;
    }
    let data;
    if (requiredAmount > playerInfo['tableBalance']) {
        data = `{"amount":${playerInfo['tableBalance']}}`;
    } else {
        data = `{"amount":${requiredAmount}}`;
    }
    socket.emit('called', {data:data});
}

function clickedFold(event) {
    socket.emit("folded");
}

function clickedRaise(event) {
    let amount = Math.floor(Number(document.getElementsByClassName('raise_amount')[0].value));
    amount = Math.max(amount, requiredAmount);
    amount = Math.min(amount, playerInfo['tableBalance']);
    console.log(`Final amount ${amount}`);
    let data = `{"amount":${amount}}`;
    socket.emit("raised", {data:data});

    document.getElementsByClassName('raise_amount')[0].innerHTML = "0";
}

function clickedStand() {
    socket.emit('stand');
    let timer = document.getElementById(`timer${playerSeat}`);
    timer.style['opacity'] = 0;
    timer.style['animation-name'] = 'none';
    timer.style['animation-duration'] = '0s';
}

function clickedLobby(event) {

}

function showParticipantsList() {
    let list = document.getElementById('participants_list');
    list.style['opacity'] = 1 - list.style['opacity'];
}

function updateParticipant(event) {
    event.preventDefault();
    console.log('Updating participant');
    document.getElementById('chosen_participant').innerText = event.target.innerText;
    to = Number(event.target.id.substring("chat".length));
    let list = document.getElementById('participants_list');
    list.style['opacity'] = 1 - list.style['opacity'];
}

function sendMessage(event) {
    event.preventDefault();
    let element = document.getElementById('content');
    let input = `${element.value}`;
    let len = input.length;
    while(input[len-1] == '\n' || input[len-1] == ' ') {
        len -= 1;
    }
    input = input.substring(0, len)
    console.log(`Player input is ${input}`);
    element.value = '';
    element.placeholder = 'Type your message here';
    //console.log(`Send msg, from ${from}, to ${to}, ${input}`);
    if (input !== '' && from !== undefined && to !== undefined) {
        let data = `{"from":"${from}", "to":"${to}", "msg":"${input}"}`;
        console.log(`Sending msg request to server with data ${data}`);
        socket.emit('sendMsg', {data:data});
    }
}


setDefaultView();