import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { endPoints } from './Service'
import { serverEmail } from './Common'

const smtpConfig: SMTPTransport.Options = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      type: "OAuth2",
      user: serverEmail,
      clientId: process.env.clientId,
      clientSecret: process.env.clientSecret,
      accessToken: process.env.accessToken,
      refreshToken: process.env.refreshToken,
      expires: Number(process.env.expiresIn),
    },
}

const transporter = nodemailer.createTransport(smtpConfig)

export const sendVerificationLink = async (email: string, hash: string) => {
    const link = `${endPoints.verify}/${hash}`
    const msg = `Click on the link ${link} to verify your email address`;
    var emailOptions = {
        from: serverEmail,
        to: email,
        subject: '[PrivatePoker] Email Verification Link',
        text: msg
      };
    let emailSent = false
    return new Promise((resolve, reject) => {
        transporter.sendMail(emailOptions, function(error, info) {
            if (!error) {
                resolve(info)
            } else {
                reject(error)
            }
        });
    })
}







