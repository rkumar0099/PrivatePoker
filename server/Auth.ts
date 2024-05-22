import { google } from 'googleapis'
import { Router, Request, Response } from 'express'

export const authRouter: Router = Router()

const baseURI="https://accounts.google.com/o/oauth2/v2/auth"
const redirectURI = `${process.env.baseURL}/oauth/response`
const grantedScopes='true'
const responseType='code'
const accessType='offline'
const clientId = process.env.clientId
const clientSecret = process.env.clientSecret

const allMailScope='https://mail.google.com/'

const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectURI
  );

interface AuthResponse {
    accessToken: String,
    refreshToken: String,
    expiresIn: Number
}

let authResponse: AuthResponse = {
    accessToken: process.env.accessToken,
    refreshToken: process.env.refreshToken,
    expiresIn: Number(process.env.expiresIn)
}

const getAuthorizedURL = () => {
    // Access scopes for read-only Drive activity.
    const scopes = [
        allMailScope
    ];
    
    // Generate a url that asks permissions for the Drive activity scope
    const authorizationUrl = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      /** Pass in the scopes array defined above.
        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
    });
    return authorizationUrl
}

const initAuthResponse = (accessToken: string, refreshToken: string, expiresIn: number) => {
    authResponse.accessToken = accessToken
    authResponse.refreshToken = refreshToken
    authResponse.expiresIn = expiresIn
}

authRouter.get('/oauth', (req: Request, res: Response) => {
    res.redirect(getAuthorizedURL())
})

authRouter.get('/oauth/response', (req: Request, res: Response) => {
    if (!req.query.code) {
        console.log(`oauth response error`)
        return
    }
    console.log('oauth response success')

    let code: string = String(req.query.code)
    oauth2Client.getToken(code).then(data => {
        const tokens = data.tokens
        console.log(tokens)
        initAuthResponse(tokens.access_token , tokens.refresh_token, tokens.expiry_date)
        res.send({success: true, msg: "tokens init"})
    }, error => { res.send({ success: false, error: error }) })

})