const baseURI = process.env.baseURL
const basePath = '/home/rabindar/web/project1'

require('dotenv').config({ path: "../.env" });

import express, {Request, Response} from 'express'
import { authRouter } from './Auth'
import { getGameId, userRouter } from './User'

const app = express()
app.use(express.json())

import session from 'express-session'

app.use(session({
    secret: "session123",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 24*60*60 * 1000 // set max-age to 24 hours, and modify expires for timeout
      }
  }))

import https from 'https'
import fs from 'fs'
import {getUsername} from './User'

const key = fs.readFileSync(`${basePath}/https/rk.local/rk.local.key`)
const cert = fs.readFileSync(`${basePath}/https/rk.local/rk.local.pem`)
const httpsOptions = {
    key: key,
    cert: cert
}
//const server = http.createServer(app)
const server = https.createServer(httpsOptions, app)
import { Server, Socket } from 'socket.io'
const io = new Server(server)

let games: Record<string, Game> = {}

// keep track of players who access /play endpoint
let playersQueue: Record<string, Object> = {}
let connections: Record<string, Socket> = {}


io.on('connection', (socket: Socket) => {
    // new socket connection
    console.log("Received new connection");
    connections[socket.id] = socket
    //socketToPlayer[socket.id] = undefined;
    //listenFromPlayer(socket);
});

import path from 'node:path'
import url from 'url'
import { Game, isPlayerAllowed } from './Game';

app.use(authRouter)
app.use(userRouter)


app.get('/login', (req: Request, res: Response) => {
    res.sendFile(`${basePath}/html/login.html`)
})

function isLoggedIn(req: Request, res: Resonse) {
    if (!("user" in req.session)) {
        res.send({success: false, "error": "you must login first"})
        return false
    }
    return true
}

app.get('/dashboard', (req: Request, res: Response) => {
    if (isLoggedIn(req, res)) {
        console.log(`[/dashboard] user present in session`)
        const username: string = getUsername(req)
        const gameId: string = getGameId(req)
        if (!(gameId in games)) {
            if (username != null && gameId !== null) {
                games[gameId] = new Game(username, gameId)
            }
        } 
        res.sendFile(`${basePath}/html/dashboard.html`)
    }
    
})

app.get('/play', (req: Request, res: Response) => {
    if (!isLoggedIn()) {
        return
    }
    const gameId = String(req.query.gameId)
    const username = getUsername(req)
    if (username === null) {
        res.send({success: false, error: "internal server error"})
        return
    }
    
    isPlayerAllowed(username, gameId).then(status => {
        if (status == false) {
            res.send({success: false, error: "not allowed to join"})
            return
        }
        let id: string = req.session.id
        if (id in playersQueue == false) {
            playersQueue[id] = {username: username, gameId: gameId}
        }
        res.sendFile(`${basePath}/html/play.html`)
    })
})

// internal endpoint for play_script to authenticate the frontend socket
app.get('/play/authenticate', (req: Request, res: Response) => {
    if (!(req.session.id in req.session.playersQueue)) {
        res.send({success: false, error: "Not allowed to call this endpoint"})
        return
    }
    // only allow once to call this endpoint
    let playObj: Object = playersQueue[req.session.id]
    delete playersQueue[req.session.id]

    const sessionId = String(req.query.sessionId)
    const socketId = String(req.query.socketId)
    if (req.session.id !== sessionId) {
        res.send({success: false, error: "sessionId do not match with server"})
        return
    }
    if (!(socketId in connections)) {
        res.send({success: false, error: "socket id not stored on server"})
        return
    }
    const socket: Socket = connections[socketId]
    const username: string = playObj['username']
    const gameId: string = playObj['gameId']

})

app.get("/*.*", (req, res) => {
    const basepath = '..' + String((url.parse(req.url)).pathname)
    console.log(`basepath: ${basepath}`);
    res.sendFile(path.join(__dirname, basepath));
});

server.listen(8082, () => {
    console.log("Server listening on port 8082");
});



