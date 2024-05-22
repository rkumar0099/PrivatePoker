import crypto from 'crypto'
import bcrypt from 'bcrypt'

export const getTime = (): number => {
    // return current timestamp in seconds
    return Math.floor(Date.now()/1000)
}

// return hex digest of sha256 msg
export const sha256Hash = (msg): string => {
    return crypto.createHash('sha256').update(msg).digest('hex')
}

export const bcryptHash = async (data): Promise<string> => {
    return new Promise((resolve, reject) => {
        const saltRounds = 10
        bcrypt.genSalt(saltRounds).then(salt => {
            bcrypt.hash(data, salt).then(data => {
                resolve(data)
            }, error => { reject(error) })
        }, error => { reject(error) })
    })
} 

export const bcryptValidate = async (data, hash): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        bcrypt.compare(data, hash).then(status => {
            resolve(status)
        }, error => { reject(error) })
    })
}