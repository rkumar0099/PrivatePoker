import { Router, Request, Response } from 'express'
import { Service } from './Service'
import { getTime } from './Utils'
import { userVerifyTimeout } from './Common'
import { sha256Hash, bcryptHash, bcryptValidate } from './Utils'
import { sendVerificationLink } from './Email'

const service: Service = new Service()

type Form = {
    username: string,
    email: string,
    password: string,
    time: number,
    passwordHash: string,
}

export interface User {
    username?: string
    gameId?: string
}

let forms: Record<string, Form> = {}

export const userRouter = Router()

userRouter.post('/users', (req: Request, res: Response) => {
    console.log(req.body)
    let data = req.body
    const username = String(data.username)
    const email = String(data.email)
    const password = String(data.password)
    console.log(`[Login Post] username: ${username}, email: ${email}, password: ${password}`)
    if (username === undefined || email === undefined || password === undefined) {
        console.log('returning status code 406')
        res.status(406)
        res.send({success: false, "error": "username, email, and password required"})
        return
    }

    // user validation
    service.findUserByUsernameOrEmail(username, email).then(data => {
        if (data.success == true) {
            // user account already exists
            res.send({success: false, error: "user account already exists"})
            return
        }
        const time = getTime()
        const msg = username+email+password+String(time)
        const hash = sha256Hash(msg)
        let form: Form = {
            username: username,
            email: email,
            password: password,
            time: time,
            passwordHash: '',
        }
        bcryptHash(form['password']).then(data => {
            form.passwordHash = String(data)
            sendVerificationLink(email, hash).then(data => {
                forms[hash] = form
            }, error => {
                res.send({success: false, error: "error sending verification link"})
            })
        }, error => {
            res.send({success: false, error: "error creating bcrypt hash for password"})
        })
    },
    error => {
        res.send({success: false, error: error})
    })
})

userRouter.get('/verify/:hash', (req: Request, res: Response) => {
    const hash = String(req.params.hash)
    console.log(`received verify request with hash: ${hash}`)
    const time = getTime()
    if (!(hash in forms && time - forms.hash.time <= userVerifyTimeout)) {
        res.send({success: false, "error": "Link expired"})
        return
    }
    service.insertUser(forms[hash]).then(data => {
        if (data.success == true) {
            res.send({success: true, msg: "user added into db"})
        } else {
            res.send({success: false, msg: "link verified. error adding user into db"})
        }
    }, error => {
        res.send({success: false, error: error})
    })
})

userRouter.get("/users", (req: Request, res: Response) => {
    let username: string = getUsername(req)
    if (username !== null) {
        service.findUserByUsername(username).then(data => {
            res.send({success: true, "msg": "already logged in", data: data.user})
            return
        })
    }

    const email = req.query.email
    const password = Buffer.from(String(req.query.password), 'utf-8').toString()
    console.log(`[login request] email: ${email}, password: ${password}`)
    if (email === undefined || password === undefined) {
        res.send({success: false, error: "both email and password are required"})
        return
    } 
    service.findUserByEmail(email).then(data => {
        console.log(data)
        if (data === undefined) {
            res.send({success: false, error: "error connecting to db"})
            return
        }
        if (!data.success) {
            res.send({success: false, error: "user account do not exists"})
            return
        }
        const passwordHash = data.user.password
        bcryptValidate(password, passwordHash).then(status => {
            console.log(status)
            if (status == true) {
                // user authenticated, add user data in session
                let user: User = {username: data.user.username, gameId: data.user.gameId}
                req.session['user'] = user
                const expireTime = 3600 // seconds
                req.session.cookie.expires = new Date((getTime()+expireTime)*1000) // cookie expires in 300 seconds from current time
                res.send({success: true, msg: "login successful", data: data.user})
            } else {
                res.send({success: false, error: "login unsuccessful"})
            }
        }, error => { res.send({success: false, error: "passwords do not match"}) })
    }, error => {
        res.send({success: false, error: error})
    })
    
})

export const getUsername = (req: Request): string => {
    if ("user" in req.session) {
        let user: User = req.session['user']
        let username: string = user.username
        return username
    }
    return null
}

export const getGameId = (req: Request): string => {
    if ("user" in req.session) {
        let user: User = req.session['user']
        let gameId: string = user.gameId
        return gameId
    }
    return null
}