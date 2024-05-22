import axios from 'axios'
import https from 'https'
import { GET, POST, PATCH, DELETE } from '../js/service'

const agent = new https.Agent({
    rejectUnauthorized: false,
})

axios.defaults.httpsAgent = agent

const baseURL = process.env.baseURL

// nodejs server endpoints (localhost)
export const endPoints = {
    verify: `${baseURL}/verify`
}

export class Service {
    apis = {
        users: "https://rk.local:8080/poker-servlet-1.0/users",
        friends: "https://rk.local:8080/poker-servlet-1.0/users/friends",
        requests: "https://rk.local:8080/poker-servlet-1.0/users/requests",
    }

    constructor() {}

    insertUser = async (form) => {
        let path = this.apis['users']
        let body = {'username': form.username, 'email': form.email, 'password': form.password}
        console.log(`[service insertUser] inserting user with data ${body}`)
        return POST(axios, path, body)
    }

    findUserByIdentifier = async (value) => {
        let path = this.apis['users']
        path = `${path}?identifier=${value}`
        return GET(axios, path)
    }

    findUserByUsernameOrEmail = async (username, email) => {
        let path = this.apis['users']
        path = `${path}?username=${username}&email=${email}`
        return GET(axios, path)
    }

    findUserByUsername = async (username) => {
        let path = this.apis['users']
        path = `${path}?username=${username}`
        return GET(axios, path)
    }

    findUserByEmail = async (email): Promise<any> => {
        let path = this.apis['users']
        path = `${path}?email=${email}`
        return GET(axios, path)
    }

    handleOauthRequest = async (url) => {
        return GET(axios, url)
    }

    findRequests = async (username) => {
        let path = this.apis['requests']
        path = `${path}?username=${username}`
        return GET(axios, path)
    }

    updateRequests = async (body) => {
        let path = this.apis['requests']
        return PATCH(axios, path, body)
    }

    findFriends = async (username) => {
        let path = this.apis['friends']
        path = `${path}?username=${username}`
        return GET(axios, path)
    }

    updateFriends = async (body) => {
        let path = this.apis['friends']
        return PATCH(axios, path, body)
    }

    api = (key) => {
        if (this.apis[key] !== undefined) {
            return this.apis[key]
        }
        return this.apis[key]
    }

}