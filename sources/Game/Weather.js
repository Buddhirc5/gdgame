import gsap from 'gsap'
import { Game } from './Game.js'
import { lerp, remapClamp } from './utilities/maths.js'

export class Weather
{
    constructor()
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '🌦️ Weather',
                expanded: false,
            })
        }

        this.properties = []
        this.setOverride()

        // Temperature
        this.addProperty(
            'temperature',
            -15,
            40,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.temperature.value
                const dayValue = this.game.dayCycles.properties.temperature.value

                const frequency = 0.4
                const amplitude = 7.5
                const variation = this.noise(this.game.dayCycles.absoluteProgress * frequency) * amplitude

                return yearValue + dayValue + variation
            }
        )

        // Humidity
        this.addProperty(
            'humidity',
            0,
            1,
            () =>
            {
                const yearValue = this.game.yearCycles.properties.humidity.value

                const frequency = 0.36
                const amplitude = 0.2
                const variation = this.noise(this.game.dayCycles.absoluteProgress * frequency) * amplitude

                return yearValue + variation
            }
        )

        // Electric field
        this.addProperty(
            'electricField',
            -1,
            1,
            () =>
            {
                const dayValue = this.game.dayCycles.properties.electricField.value
                
                const frequency = 0.53
                const amplitude = 1
                const variation = this.noise(this.game.dayCycles.absoluteProgress * frequency) * amplitude

                return dayValue * variation
            }
        )

        // Clouds
        this.addProperty(
            'clouds',
            -1,
            1,
            () =>
            {
                const frequency = 0.44
                const amplitude = 1
                const variation = this.noise(this.game.dayCycles.absoluteProgress * frequency) * amplitude
                return variation
            }
        )

        // Wind
        this.addProperty(
            'wind',
            0,
            1,
            () =>
            {
                const frequency = 1
                const variation = this.noise(this.game.dayCycles.absoluteProgress * frequency) * 0.5 + 0.5
                return variation
            }
        )

        // Rain
        this.addProperty(
            'rain',
            0,
            1,
            () =>
            {
                return remapClamp(this.humidity.value, 0.65, 1, 0, 1) * remapClamp(this.clouds.value, 0, 1, 0, 1)
            }
        )

        // Snow
        this.addProperty(
            'snow',
            -1,
            1,
            () =>
            {
                const rainRatio = remapClamp(this.rain.value, 0.05, 0.3, 0, 1)
                const freezeRatio = remapClamp(this.temperature.value, 0, -5, 0, 1)
                const meltRatio = remapClamp(this.temperature.value, 0, 10, 0, -1)

                return rainRatio * freezeRatio + meltRatio
            }
        )
        
        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 8)
    }

    noise(x)
    {
        return Math.sin(x) * Math.sin(x * 1.678) * Math.sin(x * 2.345)
    }

    addProperty(name, min, max, get)
    {
        const property = {}
        property.name = name
        property.manual = false
        property.min = min
        property.max = max

        property.value = get()
        property.overrideValue = null

        // Debug
        property.binding = this.game.debug.addManualBinding(
            this.debugPanel,
            property,
            'value',
            { label: name, min: property.min, max: property.max, step: 0.001 },
            () =>
            {
                let value = get()
                
                if(this.override.strength > 0 && property.overrideValue !== null)
                {
                    value = lerp(value, property.overrideValue, this.override.strength)

                    // if(name === 'humidity')
                    // {
                    //     console.log(value)
                    // }
                }
                
                return value
            }
        )

        if(this.game.debug.active)
        {
            this.debugPanel.addBinding(property, 'value', { readonly: true })
            this.debugPanel.addBinding(
                property,
                'value',
                {
                    label: `${property.min} -> ${property.max}`,
                    readonly: true,
                    view: 'graph',
                    min: property.min,
                    max: property.max,
                }
            )
            this.debugPanel.addBlade({ view: 'separator' })
        }

        this[name] = property
        this.properties.push(property)
    }

    setOverride()
    {
        this.override = {}
        this.override.strength = 0
        
        this.override.start = (values = {}, duration = 5) =>
        {
            for(const property of this.properties)
            {
                if(typeof values[property.name] !== 'undefined')
                    property.overrideValue = values[property.name]
                else
                    property.overrideValue = null
            }

            if(duration === 0)
                this.override.strength = 1
            else
                gsap.to(this.override, { strength: 1, duration, overwrite: true })
        }

        this.override.end = (duration = 5) =>
        {
            if(duration === 0)
                this.override.strength = 0
            else
                gsap.to(this.override, { strength: 0, duration, overwrite: true })
        }
        
        // Weather presets (including day/night cycles)
        this.presets = [
            {
                name: 'Clear (Day)',
                values: { humidity: 0, electricField: 0, clouds: -1, wind: 0.2, temperature: 20 },
                dayCycle: { progress: 0.1 } // Day time
            },
            {
                name: 'Rainy',
                values: { humidity: 0.8, electricField: 0, clouds: 1, wind: 0.5, temperature: 15 }
            },
            {
                name: 'Stormy',
                values: { humidity: 0.9, electricField: 1, clouds: 1, wind: 0.8, temperature: 18 }
            },
            {
                name: 'Snowy',
                values: { humidity: 0.7, electricField: 0, clouds: 0.5, wind: 0.3, temperature: -5 }
            },
            {
                name: 'Windy',
                values: { humidity: 0.3, electricField: 0, clouds: 0, wind: 1, temperature: 18 }
            },
            {
                name: 'Cloudy',
                values: { humidity: 0.4, electricField: 0, clouds: 0.8, wind: 0.4, temperature: 16 }
            },
            {
                name: 'Hot',
                values: { humidity: 0.2, electricField: 0, clouds: -1, wind: 0.1, temperature: 35 }
            },
            {
                name: 'Cold',
                values: { humidity: 0.3, electricField: 0, clouds: -0.5, wind: 0.2, temperature: -10 }
            },
            {
                name: 'Daytime',
                values: { humidity: 0.2, electricField: 0, clouds: -0.5, wind: 0.3, temperature: 20 },
                dayCycle: { progress: 0.1 } // Bright day
            },
            {
                name: 'Dusk',
                values: { humidity: 0.3, electricField: 0.25, clouds: 0.2, wind: 0.4, temperature: 12 },
                dayCycle: { progress: 0.25 } // Dusk
            },
            {
                name: 'Nighttime',
                values: { humidity: 0.4, electricField: 1, clouds: 0.3, wind: 0.3, temperature: 5 },
                dayCycle: { progress: 0.5 } // Night
            },
            {
                name: 'Dawn',
                values: { humidity: 0.3, electricField: 0.25, clouds: 0.1, wind: 0.3, temperature: 10 },
                dayCycle: { progress: 0.8 } // Dawn
            }
        ]
        
        this.currentPresetIndex = 0
        
        // Set up weather cycling
        this.setWeatherControls()
    }
    
    setWeatherControls()
    {
        this.game.inputs.addActions([
            { name: 'weatherChange', categories: [ 'wandering', 'racing' ], keys: [ 'Keyboard.KeyW' ] }
        ])
        
        this.game.inputs.events.on('weatherChange', (action) =>
        {
            if(action.active)
            {
                this.cycleWeather()
            }
        })
    }
    
    cycleWeather()
    {
        // Cycle to next preset
        this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presets.length
        const preset = this.presets[this.currentPresetIndex]
        
        // Apply weather preset
        this.override.start(preset.values, 3)
        
        // Apply day/night cycle if specified
        if(preset.dayCycle && this.game.dayCycles)
        {
            this.game.dayCycles.override.start(preset.dayCycle, 3)
        }
        else if(this.game.dayCycles)
        {
            // Reset day cycle to natural if not specified
            this.game.dayCycles.override.end(3)
        }
        
        // Show notification
        const html = /* html */`
            <div class="top">
                <div class="title">Weather: ${preset.name}</div>
            </div>
        `
        
        this.game.notifications.show(html, 'weather', 2)
        
        console.log(`Weather changed to: ${preset.name}`)
    }
    
    setWeatherPreset(presetName)
    {
        const preset = this.presets.find(p => p.name.toLowerCase() === presetName.toLowerCase())
        if(preset)
        {
            const index = this.presets.indexOf(preset)
            this.currentPresetIndex = index
            this.override.start(preset.values, 3)
            return true
        }
        return false
    }

    update()
    {
        for(const property of this.properties)
            property.binding.update()
    }
}