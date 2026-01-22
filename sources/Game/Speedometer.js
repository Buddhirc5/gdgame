import { Game } from './Game.js'

export class Speedometer
{
    constructor()
    {
        this.game = Game.getInstance()
        this.element = document.querySelector('.js-speedometer')
        
        if(!this.element)
            return

        this.speedElement = this.element.querySelector('.js-speed-value')
        this.unitElement = this.element.querySelector('.js-speed-unit')
        
        // Update on game tick
        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 0)
    }

    update()
    {
        if(!this.element || !this.game.physicalVehicle)
            return

        // Get speed from physical vehicle (in m/s, approximate)
        const speed = Math.abs(this.game.physicalVehicle.forwardSpeed || 0)
        
        // Convert to km/h (multiply by 3.6) or mph (multiply by 2.237)
        // Using km/h for now
        const speedKmh = speed * 3.6
        
        // Update display
        if(this.speedElement)
        {
            this.speedElement.textContent = Math.round(speedKmh)
        }
    }
}
