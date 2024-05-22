const apis = {
    // node and tomcat endpoints for frontend
    "findUserByIdentifier": "https://localhost:8080/poker-servlet-1.0/users",
    "findUser": "https://localhost:8082/users",
    "submitForm": "https://localhost:8082/login",
    "auth":  "https://localhost:8082/oauth/request",
    "verify": "https://localhost:8082/verify",
    "requests": "https://localhost:8082/users/requests",
    "friends": "https://localhost:8082/users/friends"
}


const GET = async (axios, url) => {
    console.log(`[service get] request path: ${url}`)
    try {
        const {data} = await axios.get(url)
        console.log(data)
        return data
    }
    catch(error) {
        console.log(`error executing get request`)
        console.log(error)
    }
}

const POST = async (axios, url, body) => {
    console.log(`[service post] request path: ${url}`)
    try {
        const {data} = await axios.post(url, body, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        return data;
    }
    catch(error) {
        console.log(error)
    }
    
}

const PATCH = async (axios, url, body) => {
    console.log(`[service patch] request path: ${url}`)
    try {
        const {data} = await axios.patch(url, body, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        return data;
    }
    catch(error) {
        console.log(error)
    }
    
}

const DELETE = async (axios, url) => {
    console.log(`[service delete] request path: ${url}`)
    try {
        const {data} = await axios.delete(url)
        return data
    }
    catch(error) {
        console.log(error)
    }
}

const fetchUserByEmail = async (email) => {
    path = apis['findUserByEmail']
    path = `${path}?email=${email}`
    return await GET(axios, path)
}

const OauthAccessRequest = (url) => {
    path = apis['auth']
    path = `${path}?url=${url}`
    return GET(axios, path)
}

const submitFormServer = async (form) => {
    console.log(form['username'], form['email'], form['password'])
    form = JSON.stringify(form)
    console.log(`submitting a form ${form}`)
    path = apis['submitForm']
    return POST(axios, path, form)
   
}

const findUserByIdentifier = async (axios, value) => {
    let path = apis['findUserByIdentifier']
    path = `${path}?identifier=${value}`
    return GET(axios, path)
}

const findUser = async (axios, params) => {
    if (params.identifier === undefined || params.email === undefined || params.password === undefined) {
        return new Promise((resolve, reject) => {
            resolve({"success": false, "error": '[service findUser] must include all identifier, email, and password'})
        })
    }
    let path = apis['findUser']
    if (params.identifier !== null) {
        return findUserByIdentifier(axios, params.identifier)
        //path = `${path}?identifier=${params.identifier}`
        //return GET(axios, path)
    } else if (params.email !== null && params.password !== null) {
        path = `${path}?email=${params.email}&password=${encodeURIComponent(params.password)}`
        return GET(axios, path)
    } else {
        return new Promise((resolve, reject) => {
            //resolve({"success": false, "error": '[service findUser] email and password must not be null'})
            reject({"success": false, "error": '[service findUser] email and password must not be null'})
        })
    }
}

const friendRequest = async (axios, params) => {
    if (params.from === undefined || params.to === undefined) {
        return new Promise((resolve, reject) => {
            reject("[service friendRequest] both from and to params required")
        })
    }
    let path = apis['requests']
    let body = {
        "from": params.from,
        "to": params.to,
    }
    console.log(`path=${path}, body=${body}`)
    return POST(axios, path, body)

}

const UnsendRequest = async(axios, params) => {
    if (params.from === undefined || params.to === undefined) {
        return new Promise((resolve, reject) => {
            reject("[service UnsendRequest] both from and to params required")
        })
    }
    let path = apis['requests']
    path = `${path}?from=${params.from}&to=${params.to}`
    return DELETE(axios, path)
}

const addFriend = async (axios, params) => {
    if (params.username === undefined || params.friend === undefined) {
        return new Promise((resolve, reject) => {
            reject("[service addFriend] both username and friend params required")
        })
    }
    let path = apis['friends']
    let body = {"username": params.username, "friend": params.friend}
    return POST(axios, path, body)
}

const removeFriend = async (axios, params) => {
    if (params.username === undefined || params.friend === undefined) {
        return new Promise((resolve, reject) => {
            reject("[service removeFriend] both username and friend params required")
        })
    }
    let path = apis['friends']
    path = `${path}?username=${params.username}&friend=${params.friend}`
    return DELETE(axios, path)
}

// used by server.js
class Service {
    constructor(axios) {
        this.apis = {
             // tomcat endpoints rk.local
            "users": "https://rk.local:8080/poker-servlet-1.0/users",
            "friends": "https://rk.local:8080/poker-servlet-1.0/users/friends",
            "requests": "https://rk.local:8080/poker-servlet-1.0/users/requests",
        }
        this.axios = axios
    }

    insertUser = async (form) => {
        let path = this.apis['users']
        let body = {'username': form['username'], 'email': form['email'], 'password': form['password_hash']}
        console.log(`[service insertUser] inserting user with data ${body}`)
        return POST(this.axios, path, body)
    }

    findUserByIdentifier = async (value) => {
        let path = this.apis['users']
        path = `${path}?identifier=${value}`
        return GET(this.axios, path)
    }

    findUserByUsernameOrEmail = async (username, email) => {
        let path = this.apis['users']
        path = `${path}?username=${username}&email=${email}`
        return GET(this.axios, path)
    }

    findUserByUsername = async (username) => {
        let path = this.apis['users']
        path = `${path}?username=${username}`
        return GET(this.axios, path)
    }

    findUserByEmail = async (email) => {
        let path = this.apis['users']
        path = `${path}?email=${email}`
        return GET(this.axios, path)
    }

    handleOauthRequest = async (url) => {
        return GET(this.axios, url)
    }

    findRequests = async (username) => {
        let path = this.apis['requests']
        path = `${path}?username=${username}`
        return GET(this.axios, path)
    }

    updateRequests = async (body) => {
        let path = this.apis['requests']
        return PATCH(this.axios, path, body)
    }

    findFriends = async (username) => {
        let path = this.apis['friends']
        path = `${path}?username=${username}`
        return GET(this.axios, path)
    }

    updateFriends = async (body) => {
        let path = this.apis['friends']
        return PATCH(this.axios, path, body)
    }

    api = (key) => {
        if (this.apis[key] !== undefined) {
            return this.apis[key]
        }
        return apis[key]
    }

}

function newService(axios) {
    return new Service(axios)
}

exports = this

exports.apis = apis
exports.Service = Service
exports.newService = newService
exports.GET = GET
exports.POST = POST
exports.PATCH = PATCH
exports.DELETE = DELETE

