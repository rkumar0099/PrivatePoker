import { Service } from "./Service";

const service: Service = new Service()

export class Game {
    owner: string;
    gameId: string;

    constructor(owner: string, gameId: string) {
        this.owner = owner
        this.gameId = gameId
    }


}

function areFriends(friends: string, username: string) {
    let tokens = friends.split(";")
    for (let token of tokens) {
        if (token == username) {
            return true
        }
    }
    return false;
}

export const isPlayerAllowed = (username: string, gameId: string): Promise<Boolean> => {
    return new Promise((resolve, reject) => {
        service.findUserByIdentifier(gameId).then(data => {
            if (data !== undefined && data.success == true) {
                const user = data.user
                if (areFriends(user.friends, username)) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            } else {
                resolve(false)
            }
        }, error => { reject(error) })
    })
}