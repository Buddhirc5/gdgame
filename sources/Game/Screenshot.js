import { Game } from './Game.js'

export class Screenshot
{
    constructor()
    {
        this.game = Game.getInstance()
        this.setButton()
        this.setInputs()
    }

    setButton()
    {
        this.buttonElement = document.querySelector('.js-screenshot-button')
        
        if(this.buttonElement)
        {
            this.buttonElement.addEventListener('click', () =>
            {
                this.takeScreenshot()
            })
        }
    }

    setInputs()
    {
        this.game.inputs.addActions([
            { 
                name: 'screenshot', 
                categories: [ 'wandering', 'racing', 'cinematic' ], 
                keys: [ 'Keyboard.F12', 'Keyboard.PrintScreen', 'Keyboard.KeyP' ] 
            }
        ])

        // Prevent F12 default behavior (dev tools) when screenshot action is active
        window.addEventListener('keydown', (event) =>
        {
            if(event.code === 'F12' && !event.shiftKey && !event.ctrlKey && !event.altKey)
            {
                const action = this.game.inputs.actions.get('screenshot')
                if(action && action.active)
                {
                    event.preventDefault()
                }
            }
        })

        // Listen for screenshot action using the standard pattern
        this.game.inputs.events.on('screenshot', (action) =>
        {
            if(action.active)
            {
                this.takeScreenshot()
            }
        })
    }

    takeScreenshot()
    {
        const canvas = this.game.canvasElement
        
        if(!canvas)
            return

        // Convert canvas to blob
        canvas.toBlob((blob) =>
        {
            if(!blob)
                return

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
            link.download = `skyforge-circuit-${timestamp}.png`
            link.href = url
            
            // Trigger download
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 100)
            
            // Show notification
            if(this.game.notifications)
            {
                this.game.notifications.add('Screenshot saved!', 2000)
            }
        }, 'image/png')
    }
}
