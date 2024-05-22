function getAccountUsername() {
    const tokens = document.cookie.split(";")
    if (tokens.length == 0) {
        return undefined
    }
    for(let token of tokens) {
        const sub_tokens = token.split("=")
        if (sub_tokens[0] == 'username') {
            return sub_tokens[1]
        }
    }
    return undefined
}

let accountUsername = getAccountUsername()
console.log(`account username: ${accountUsername}`)

function incrInviteCount() {
    let inviteCount = Number(document.getElementById("invite_count").innerHTML) + 1
    document.getElementById("invite_count").innerText = inviteCount   
}

function decrInviteCount() {
    let inviteCount = Number(document.getElementById("invite_count").innerHTML) - 1
    document.getElementById("invite_count").innerText = inviteCount
}

function addInvite(from) {
    let invite = document.createElement("div")
    invite.className = "invite"
    invite.id = from

    let name = document.createElement("div")
    name.innerHTML = from
    let accept = document.createElement("button")
    accept.innerHTML = "accept"
    let reject = document.createElement("button")
    reject.innerHTML = "reject"
   
    name.className = "invite_name"
    accept.className = "common_button accept"
    reject.className = "common_button reject"

    accept.onclick = acceptRequest

    invite.appendChild(name)
    invite.appendChild(accept)
    invite.appendChild(reject)

    document.getElementById("invites_list").appendChild(invite)

    incrInviteCount()
}

function acceptRequest(event) {
    // every invite is associated with username 
    let elem = event.target.parentElement
    let friendUsername = elem.id;
    let params = {}
    params.username = accountUsername
    params.friend = friendUsername
    addFriend(axios, params).then(data => {
        if (!data.success) {
            console.log('error adding friend')
            return
        }
        params = {}
        params.username = friendUsername
        params.friend = accountUsername
        addFriend(axios, params).then(data => {
            if (!data.success) {
                res.send({success: false, error: "error adding friend"})
                return
            }
            console.log('friend added')
            params = {}
            params.from = friendUsername
            params.to = accountUsername
            UnsendRequest(axios, params).then(data => {
                if (data.success == true) {
                    console.log('request deleted')
                    document.getElementById('invites_list').removeChild(elem)
                    decrInviteCount()
                }
            }, error => { console.log(error) })
        }, error => { console.log(error) })
    }, error => { console.log(error) })

}

function initRequests(requests) {
    if (requests === undefined || requests == null) {
        return;
    }
    const tokens = requests.split(";")
    for (let token of tokens) {
        if (token != '') {
            // receive friend request from this account
            addInvite(token)
        }
    }
}

function appendFriend(picture, name, balance) {
    let friendProfileElem = document.createElement("div")
    friendProfileElem.className = "friend_profile"
    friendProfileElem.id = name

    let pictureElem = document.createElement("div")
    let nameElem = document.createElement("div")
    let balanceElem = document.createElement("div")
    
    pictureElem.className = 'picture'
    nameElem.className = 'name'
    balanceElem.className = 'balance'

    pictureElem.style['background-image'] = `url(${picture})`
    nameElem.innerHTML = name
    if (balance == null) {
        balance = 0
    }
    balanceElem.innerHTML = `$${balance}`

    friendProfileElem.appendChild(pictureElem)
    friendProfileElem.appendChild(nameElem)
    friendProfileElem.appendChild(balanceElem)

    document.getElementById("friends_list_wrapper").appendChild(friendProfileElem)
}

function initFriends(friends) {
    if (friends === undefined || friends == null) {
        return
    }
    const tokens = friends.split(";")
    for (let token of tokens) {
        if (token == '') {
            continue
        }
        let params = {identifier: token, email: null, password: null}
        findUser(axios, params).then(data => {
            if (data.success) {
                const user = data.data
                console.log(user)
                appendFriend(user.picture, user.username, user.balance)
            }
        })
    }
}

function updateUserDashboard(username) {
    console.log(`updating dashboard for ${username}`)
    if (username === undefined) {
        return
    }
    let params = {}
    params.identifier = username
    params.email = null
    params.password = null
    findUser(axios, params).then(data => {
        console.log(`[service find user response] ${JSON.stringify(data)}`)
        const user = data.data
        initRequests(user.requests)
        initFriends(user.friends)
    })

}

updateUserDashboard(accountUsername)


function hideElementById(id) {
    document.getElementById(id).style['visibility'] = 'hidden'
}

function showElementById(id) {
    document.getElementById(id).style['visibility'] = 'visible'
}

function publicRooms(event) {
    hideElementById('private_rooms')
    showElementById('public_rooms')
}

function privateRooms(event) {
    hideElementById('public_rooms')
    showElementById('private_rooms')
}


function clickAddFriend(event) {
    // add friend
    console.log(`add friend is clicked`)
    const username = document.getElementById('search_name').innerText
    const from = accountUsername
    const to = username
    let params = {from: from, to: to}
    friendRequest(axios, params).then(data => {
        if (data.success == true) {
            console.log('request sent')
            let status = {status0: "sent", status1: "unsend"}
            updateSearchStatus(status)
            handleSearchResult(username, status)
        }
        // todo: handle !data.success 
        console.log(data)
    }, 
    error => { 
        console.log(error)
        msg = "error sending friend request. Please try again"
        handleSearchError(msg)
    })

}

function clickCancelSearchResult(event) {
    document.getElementById('search_result').style['visibility'] = 'hidden'
}

function clickRemoveFriend(event) {
    // remove friend
    const friendName = document.getElementById("search_name").innerHTML
    let params = {}
    params.username = accountUsername
    params.friend = friendName
    removeFriend(axios, params).then(data => {
        if (!data.success) {
            console.log('error removing friend')
            return
        }
        params = {}
        params.username = friendName
        params.friend = accountUsername
        removeFriend(axios, params).then(data => {
            if (data.success) {
                console.log('friend removed')
                let status = {status0: "add", status1: "cancel"}
                handleSearchResult(friendName, status)
                //updateSearchStatus(status)
            }

        })
        
    })
    
}

function clickCancelRequest(event) {
    // cancel request
    console.log(`add friend is clicked`)
    const username = document.getElementById('search_name').innerText
    const from = accountUsername
    const to = username
    let params = {from: from, to: to}
    UnsendRequest(axios, params).then(data => {
        console.log(data)
        if (data.success == true) {
            console.log('request unsent')
            let status = {status0: "add", status1: "cancel"}
            //updateSearchStatus(status)
            handleSearchResult(username, status)
        }
        // todo: handle !data.success 
        //console.log(data)
    }, 
    error => { 
        console.log(error)
        msg = "error unsending friend request. Please try again"
        handleSearchError(msg)
    })

}

function handleSearchError(error) {
    //hideElementById("search_result")
    document.getElementById("search_error").innerText = error
    showElementById("search_error")
}

// return status for search user relative to given account
function getStatus(user) {
    console.log(user.friends, user.requests)
    if (user.friends !== null) {
        let tokens = user.friends.split(";")
        for (let token of tokens) {
            if (token == accountUsername) {
                return {status0: "friend", status1: "remove"}
            }
        }
    }

    if (user.requests !== null) {
        let tokens = user.requests.split(";")
        for (let token of tokens) {
            if (token == accountUsername) {
                return {status0: "sent", status1: "unsent"}
            }
        }   
    }

    return {status0: "add", status1: "cancel"}
    
}

function updateSearchStatus(status) {
    let elem0 = document.getElementById('search_status').children[0]
    let elem1 = document.getElementById('search_status').children[1]
    elem0.classList[1] = status.status0
    elem0.innerHTML = status.status0

    elem1.classList[1] = status.status1
    elem1.innerHTML = status.status1
}

function handleSearchResult(username, status) {
    console.log(`handling search result ${username}, ${status}`)
    document.getElementById("search_name").innerText = username
    updateSearchStatus(status)
    
    const elem0 = document.getElementById('search_status').children[0]
    const elem1 = document.getElementById('search_status').children[1]
    if (username == accountUsername) {
        elem0.disabled = true
        elem1.disabled = false
        elem1.onclick = clickCancelSearchResult
        console.log('showing search result')
        showElementById("search_result")
        hideElementById("search_error")
        return
    }

    if (status.status0 == 'friend') {
        elem0.disabled = true
        elem1.disabled = false
        elem1.onclick = clickRemoveFriend
    } else if (status.status0 == 'add') {
        elem0.disabled = false
        elem0.onclick = clickAddFriend
        elem1.disabled = false
        elem1.onclick = clickCancelSearchResult
    } else if (status.status0 == 'sent') {
        elem0.disabled = true
        elem1.disabled = false
        elem1.onclick = clickCancelRequest
    }
    console.log(`showing search result for user ${username}`)
    showElementById("search_result")
    hideElementById("search_error")
}

async function handleSearch(event) {
    if (event.key !== 'Enter') {
        return
    }
    let username = document.getElementById("search_bar").value
    console.log(username)
    if (username === '') {
        return
    }
    if (username == accountUsername) {
        let status = {status0: "you", status1: "cancel"}
        handleSearchResult(username, status)
        return
    }

    console.log(`finding user ${username}`)
    let params = {}
    params.identifier = username
    params.email = null
    params.password = null
    findUser(axios, params).then(data => {
        console.log(`[service find user response] ${JSON.stringify(data)}`)
        document.getElementById("search_bar").value = ''
        if (data.success !== undefined && data.success == true) {
            const user = data.data
            const status = getStatus(user)
            handleSearchResult(user.username, status)
        }
        else if (data.success !== undefined && data.success == false) {
            handleSearchError(`no account by username ${username} exists`)
        } else {
            handleSearchError("error fetching user. please try again")
        }
    })

}

// make invite id to be the username
function showInvites() {
    console.log('showing invites list')
    document.getElementById("invites_list").style['visibility'] = 'visible';
}

function hideInvites() {
    console.log('hiding invites list')
    document.getElementById("invites_list").style['visibility'] = 'hidden';
}