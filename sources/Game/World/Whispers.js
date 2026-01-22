import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { billboarding, cameraPosition, color, Fn, instanceIndex, log, min, mix, modelViewMatrix, mul, normalWorld, positionGeometry, positionViewDirection, positionWorld, smoothstep, storage, texture, time, uv, vec2, vec3, vec4 } from 'three/tsl'
import { hash } from 'three/tsl'
import gsap from 'gsap'
import { Bubble } from './Bubble.js'
import emojiRegex from 'emoji-regex'
import { InputFlag } from '../InputFlag.js'

export class Whispers
{
    constructor()
    {
        this.game = Game.getInstance()

        this.count = parseInt(import.meta.env.VITE_WHISPERS_COUNT)

        this.setSounds()
        this.setFlames()
        this.setData()
        this.setBubble()
        this.setMenu()
        this.setInputs()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)
    }

    setSounds()
    {
        this.sounds = {}
        
        this.sounds.ignite = this.game.audio.register({
            path: 'sounds/fire/ignite-1.mp3',
            autoplay: false,
            loop: false,
            volume: 0.4,
            antiSpam: 0.1
        })
        
        this.sounds.flicker = this.game.audio.register({
            path: 'sounds/fire/Cloth_Movement_Hung_Clothes_Blowing_in_Wind_ODY-1520-031.mp3',
            autoplay: true,
            loop: true,
            volume: 0.5,
            positions: new THREE.Vector3(),
            distanceFade: 10
        })
    }

    setFlames()
    {
        // Reveal buffer
        this.revealArray = new Float32Array(this.count)
        this.revealBuffer = new THREE.StorageInstancedBufferAttribute(this.revealArray, 1)
        this.revealBufferNeedsUpdate = true
        
        const revealAttribute = storage(this.revealBuffer, 'float', this.count).toAttribute()

        // Geometry
        const beamGeometry = new THREE.PlaneGeometry(1.5, 1.5 * 2, 1, 16)
        beamGeometry.rotateY(Math.PI * 0.25)
        
        // Material
        const beamMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, wireframe: false, depthWrite: false })
        beamMaterial.positionNode = Fn(() =>
        {
            const newPosition = positionGeometry.toVar()

            const random = hash(instanceIndex)
            const noiseStrength = uv().y.remapClamp(0.25, 1, 0, 1).mul(0.6)
            const noiseUv = vec2(random, uv().y.mul(0.5).sub(this.game.ticker.elapsedScaledUniform.mul(0.1)))
            const noise = texture(this.game.noises.perlin, noiseUv).r.sub(0.5).mul(noiseStrength)
            newPosition.x.addAssign(noise)

            return newPosition
        })()

        beamMaterial.outputNode = Fn(() =>
        {
            const baseUv = vec2(uv().x, uv().y.oneMinus())
            const mask = texture(this.game.resources.whisperFlameTexture,baseUv).r.sub(revealAttribute.oneMinus())
            const color = texture(this.game.materials.gradientTexture, vec2(0, mask))
            const alpha = smoothstep(0.05, 0.3, mask)

            return vec4(vec3(color.mul(2)), alpha.mul(revealAttribute))
        })()

        // Instanced mesh
        this.flames = new THREE.InstancedMesh(beamGeometry, beamMaterial, this.count)
        this.flames.renderOrder = 3
        this.flames.frustumCulled = false
        this.flames.visible = true
        this.flames.position.y = 0.25
        this.game.scene.add(this.flames)
    }

    setData()
    {
        this.data = {}
        this.data.needsUpdate = false
        this.data.items = []

        for(let i = 0; i < this.count; i++)
        {
            this.data.items.push({
                index: i,
                matrix: new THREE.Matrix4(),
                available: true,
                needsUpdate: false
            })
        }

        this.data.findById = (id) =>
        {
            return this.data.items.find(_item => _item.id === id)
        }

        this.data.findAvailable = () =>
        {
            const item = this.data.items.find(_item => _item.available)

            if(item)
            {
                item.available = false
                return item
            }
            else
            {
                console.warn('can\'t find available item')
                return null
            }
        }

        this.data.insert = (input) =>
        {
            let item = this.data.findById(input.id)

            // Update
            if(item)
            {
                // Hide
                const dummy = { value: 1 }
                gsap.to(
                    dummy,
                    {
                        value: 0,
                        onUpdate: () =>
                        {
                            this.revealArray[item.index] = dummy.value
                            this.revealBufferNeedsUpdate = true
                        },
                        onComplete: () =>
                        {
                            // Show update
                            item.message = input.message
                            item.countryCode = input.countrycode
                            item.position.set(input.x, input.y, input.z)
                            item.matrix.setPosition(item.position)
                            item.needsUpdate = true

                            // If is closest => Reset closest (to have it update naturally)
                            if(item === this.bubble.closest)
                                this.bubble.closest = null

                            gsap.to(
                                dummy,
                                {
                                    value: 1,
                                    onUpdate: () =>
                                    {
                                        this.revealArray[item.index] = dummy.value
                                        this.revealBufferNeedsUpdate = true
                                    }
                                }
                            )
                        }
                    }
                )
            }

            // Insert
            else
            {
                item = this.data.findAvailable()

                if(item)
                {
                    const dummy = { value: 0 }
                    gsap.to(
                        dummy,
                        {
                            value: 1,
                            onUpdate: () =>
                            {
                                this.revealArray[item.index] = dummy.value
                                this.revealBufferNeedsUpdate = true
                            }
                        }
                    )

                    item.id = input.id
                    item.available = false
                    item.message = input.message,
                    item.countryCode = input.countrycode,
                    item.position = new THREE.Vector3(input.x, input.y, input.z)
                    item.matrix.setPosition(item.position)
                    item.needsUpdate = true
                }
            }
        }

        this.data.delete = (input) =>
        {
            let item = this.data.findById(input.id)

            if(item)
            {
                item.available = true

                const dummy = { value: 1 }
                gsap.to(
                    dummy,
                    {
                        value: 0,
                        onUpdate: () =>
                        {
                            this.revealArray[item.index] = dummy.value
                            this.revealBufferNeedsUpdate = true
                        }
                    }
                )
            }
        }

        // Server message event
        this.game.server.events.on('message', (data) =>
        {
            // Init and insert
            if(data.type === 'init' || data.type === 'whispersInsert')
            {
                for(const whisper of data.whispers)
                    this.data.insert(whisper)
            }

            // Delete
            else if(data.type === 'whispersDelete')
            {
                for(const whisper of data.whispers)
                {
                    this.data.delete(whisper)
                }
            }
        })

        // Message already received
        if(this.game.server.initData)
        {
            for(const whisper of this.game.server.initData.whispers)
                this.data.insert(whisper)
        }
    }

    setBubble()
    {
        this.bubble = {}
        this.bubble.instance = new Bubble()
        this.bubble.closest = null
        this.bubble.minDistance = 3
    }

    setMenu()
    {
        // Whisper menu UI removed - whispers still display in the world
        // Just need the inputFlag for displaying flags on existing whispers
        this.menu = {}
        this.menu.inputFlag = new InputFlag(null) // Dummy flag selector for display purposes
        
        // Try to get flag countries if available
        try {
            const flagElement = document.querySelector('.js-input-flag')
            if(flagElement) {
                this.menu.inputFlag = new InputFlag(flagElement)
            }
        } catch(e) {
            // Flag selector not available, that's okay
        }
    }

    setInputs()
    {
        // Whisper menu UI removed - whispers still work in the world but no menu to leave them
        // (Keeping this method for compatibility but no inputs needed)
    }

    update()
    {
        // Data
        let instanceMatrixNeedsUpdate = false

        for(const item of this.data.items)
        {
            if(item.needsUpdate)
            {
                instanceMatrixNeedsUpdate = true
                this.flames.setMatrixAt(item.index, item.matrix)
                item.needsUpdate = false
            }
        }

        if(instanceMatrixNeedsUpdate)
            this.flames.instanceMatrix.needsUpdate = true

        // Bubble
        let closestWhisper = null
        let closestDistance = Infinity
        for(const item of this.data.items)
        {
            if(!item.available)
            {
                const distance = this.game.player.position.distanceTo(item.position)

                if(distance < closestDistance)
                {
                    closestDistance = distance
                    closestWhisper = item
                }
            }
        }

        if(closestDistance < this.bubble.minDistance)
        {
            if(closestWhisper !== this.bubble.closest)
            {
                const position = closestWhisper.position.clone()
                position.y += 1.25

                let imageUrl = null

                if(closestWhisper.countryCode)
                {
                    const country = this.menu.inputFlag.countries.get(closestWhisper.countryCode)

                    if(country)
                        imageUrl = country.imageUrl
                }

                this.bubble.instance.tryShow(closestWhisper.message, position, imageUrl)
                this.bubble.closest = closestWhisper
            }
        }
        else
        {
            this.bubble.closest = null
            this.bubble.instance.hide()
        }

        if(this.revealBufferNeedsUpdate)
        {
            this.revealBuffer.needsUpdate = true
            this.revealBufferNeedsUpdate = false
        }

        // Sound
        if(closestWhisper)
            this.sounds.flicker.positions[0].copy(closestWhisper.position)
    }
}