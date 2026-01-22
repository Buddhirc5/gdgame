import { Events } from './Events.js'
import { Game } from './Game.js'

export class Server
{
    constructor()
    {
        this.game = Game.getInstance()

        // Offline mode - no server connections
        this.connected = false
        this.initData = null
        this.events = new Events()
        
        // Always show as offline (no server needed for this portfolio)
        document.documentElement.classList.add('is-server-offline')
        document.documentElement.classList.remove('is-server-online')
    }

    start()
    {
        // Server disabled - this is an offline portfolio
        // No connection attempts will be made
    }

    connect()
    {
        // Server disabled - no connections
    }

    onReceive(message)
    {
        // Server disabled
    }

    send(message)
    {
        // Server disabled
        return false
    }

    decode(data)
    {
        return null
    }

    encode(data)
    {
        return null
    }
}