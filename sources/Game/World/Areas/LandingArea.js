  import * as THREE from 'three/webgpu'
import { color, float, Fn, instancedArray, mix, normalWorld, positionGeometry, step, texture, uniform, uv, vec2, vec3, vec4 } from 'three/tsl'
import { Inputs } from '../../Inputs/Inputs.js'
import { InteractivePoints } from '../../InteractivePoints.js'
import { Area } from './Area.js'
import gsap from 'gsap'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'

export class LandingArea extends Area
{
    constructor(model)
    {
        super(model)

        this.localTime = uniform(0)

        this.hideOriginalLetters()
        this.setFloatingName()
        this.setKiosk()
        this.setControls()
        this.setBonfire()
        this.setAchievement()
    }

    hideOriginalLetters()
    {
        const references = this.references.items.get('letters')

        for(const reference of references)
        {
            // Hide the mesh
            reference.visible = false
            
            // Disable physics
            const physical = reference.userData.object.physical
            if(physical && physical.body)
            {
                physical.body.setEnabled(false)
            }
        }
    }

    setFloatingName()
    {
        // Create canvas texture for the name
        const canvas = document.createElement('canvas')
        const height = 128
        const font = `700 ${height * 0.8}px "Amatic SC"`
        
        const context = canvas.getContext('2d')
        context.font = font
        
        const text = 'Buddhi Sandeepa'
        const textMetrics = context.measureText(text)
        const width = Math.ceil(textMetrics.width) + 40
        
        canvas.width = width
        canvas.height = height
        
        // Clear and draw text
        context.fillStyle = '#000000'
        context.fillRect(0, 0, width, height)
        
        context.font = font
        context.fillStyle = '#ffffff'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(text, width / 2, height / 2)
        
        const nameTexture = new THREE.CanvasTexture(canvas)
        nameTexture.minFilter = THREE.LinearFilter
        nameTexture.magFilter = THREE.LinearFilter
        
        // Create floating text mesh
        const aspect = width / height
        const scale = 3
        const geometry = new THREE.PlaneGeometry(aspect * scale, scale)
        
        // Create material with glow effect
        const floatOffset = uniform(0)
        this.floatOffset = floatOffset
        
        const material = new THREE.MeshBasicNodeMaterial({ 
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        })
        
        material.outputNode = Fn(() =>
        {
            const baseUv = uv()
            const textMask = texture(nameTexture, baseUv).r
            
            // Blue glow color matching the scene
            const glowColor = vec3(0.4, 0.5, 1.0)
            const textColor = vec3(0.6, 0.7, 1.0)
            
            // Mix colors based on text mask
            const finalColor = mix(glowColor.mul(0.3), textColor, textMask)
            const alpha = textMask.mul(0.95).add(0.05)
            
            return vec4(finalColor, alpha.mul(textMask.smoothstep(0.1, 0.5)))
        })()
        
        // Position the floating text where the original letters were
        const mesh = new THREE.Mesh(geometry, material)
        
        // Get position from first letter reference as base
        const references = this.references.items.get('letters')
        if(references && references.length > 0)
        {
            // Calculate center position of all letters
            let centerX = 0, centerY = 0, centerZ = 0
            for(const ref of references)
            {
                centerX += ref.position.x
                centerY += ref.position.y
                centerZ += ref.position.z
            }
            centerX /= references.length
            centerY /= references.length
            centerZ /= references.length
            
            mesh.position.set(centerX, centerY + 2.5, centerZ)
        }
        else
        {
            mesh.position.set(0, 3, -5)
        }
        
        // Make text face forward and display in front
        mesh.rotation.reorder('YXZ')
        mesh.rotation.x = 0 // Face forward horizontally
        mesh.rotation.y = 0 // No rotation around Y axis
        mesh.rotation.z = 0 // No rotation around Z axis
        
        // Ensure it renders in front
        mesh.renderOrder = 999
        mesh.material.depthTest = false
        
        this.floatingNameMesh = mesh
        this.game.scene.add(mesh)
    }

    setKiosk()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('kioskInteractivePoint')[0].position,
            'Map',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.modals.open('map')
                // interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // this.game.map.items.get('map').events.on('close', () =>
        // {
        //     interactivePoint.show()
        // })
    }

    setControls()
    {
        // Interactive point
        const interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('controlsInteractivePoint')[0].position,
            'Controls',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.inputs.interactiveButtons.clearItems()
                this.game.menu.open('controls')
                interactivePoint.hide()
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // Menu instance
        const menuInstance = this.game.menu.items.get('controls')

        menuInstance.events.on('close', () =>
        {
            interactivePoint.show()
        })

        menuInstance.events.on('open', () =>
        {
            if(this.game.inputs.mode === Inputs.MODE_GAMEPAD)
                menuInstance.tabs.goTo('gamepad')
            else if(this.game.inputs.mode === Inputs.MODE_MOUSEKEYBOARD)
                menuInstance.tabs.goTo('mouse-keyboard')
            else if(this.game.inputs.mode === Inputs.MODE_TOUCH)
                menuInstance.tabs.goTo('touch')
        })
    }

    setBonfire()
    {
        const position = this.references.items.get('bonfireHashes')[0].position

        // Particles
        let particles = null
        {
            const emissiveMaterial = this.game.materials.getFromName('emissiveOrangeRadialGradient')
    
            const count = 30
            const elevation = uniform(5)
            const positions = new Float32Array(count * 3)
            const scales = new Float32Array(count)
    
    
            for(let i = 0; i < count; i++)
            {
                const i3 = i * 3
    
                const angle = Math.PI * 2 * Math.random()
                const radius = Math.pow(Math.random(), 1.5) * 1
                positions[i3 + 0] = Math.cos(angle) * radius
                positions[i3 + 1] = Math.random()
                positions[i3 + 2] = Math.sin(angle) * radius
    
                scales[i] = 0.02 + Math.random() * 0.06
            }
            
            const positionAttribute = instancedArray(positions, 'vec3').toAttribute()
            const scaleAttribute = instancedArray(scales, 'float').toAttribute()
    
            const material = new THREE.SpriteNodeMaterial()
            material.outputNode = emissiveMaterial.outputNode
    
            const progress = float(0).toVar()
    
            material.positionNode = Fn(() =>
            {
                const newPosition = positionAttribute.toVar()
                progress.assign(newPosition.y.add(this.localTime.mul(newPosition.y)).fract())
    
                newPosition.y.assign(progress.mul(elevation))
                newPosition.xz.addAssign(this.game.wind.direction.mul(progress))
    
                const progressHide = step(0.8, progress).mul(100)
                newPosition.y.addAssign(progressHide)
                
                return newPosition
            })()
            material.scaleNode = Fn(() =>
            {
                const progressScale = progress.remapClamp(0.5, 1, 1, 0)
                return scaleAttribute.mul(progressScale)
            })()
    
            const geometry = new THREE.CircleGeometry(0.5, 8)
    
            particles = new THREE.Mesh(geometry, material)
            particles.visible = false
            particles.position.copy(position)
            particles.count = count
            this.game.scene.add(particles)
        }

        // Hashes
        {
            const alphaNode = Fn(() =>
            {
                const baseUv = uv(1)
                const distanceToCenter = baseUv.sub(0.5).length()
    
                const voronoi = texture(
                    this.game.noises.voronoi,
                    baseUv
                ).g
    
                voronoi.subAssign(distanceToCenter.remap(0, 0.5, 0.3, 0))
    
                return voronoi
            })()
    
            const material = new MeshDefaultMaterial({
                colorNode: color(0x6F6A87),
                alphaNode: alphaNode,
                hasWater: false,
                hasLightBounce: false
            })
    
            const mesh = this.references.items.get('bonfireHashes')[0]
            mesh.material = material
        }

        // Burn
        const burn = this.references.items.get('bonfireBurn')[0]
        burn.visible = false

        // Interactive point
        this.game.interactivePoints.create(
            this.references.items.get('bonfireInteractivePoint')[0].position,
            'Res(e)t',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () =>
            {
                this.game.reset()

                gsap.delayedCall(2, () =>
                {
                    // Bonfire
                    particles.visible = true
                    burn.visible = true
                    this.game.ticker.wait(2, () =>
                    {
                        particles.geometry.boundingSphere.center.y = 2
                        particles.geometry.boundingSphere.radius = 2
                    })

                    // Sound
                    this.game.audio.groups.get('campfire').items[0].positions.push(position)
                })
            },
            () =>
            {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () =>
            {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setAchievement()
    {
        this.events.on('boundingIn', () =>
        {
            this.game.achievements.setProgress('areas', 'landing')
        })
        this.events.on('boundingOut', () =>
        {
            this.game.achievements.setProgress('landingLeave', 1)
        })
    }

    update()
    {
        this.localTime.value += this.game.ticker.deltaScaled * 0.1
        
        // Floating animation for the name
        if(this.floatingNameMesh)
        {
            const baseY = this.floatingNameMesh.userData.baseY || this.floatingNameMesh.position.y
            if(!this.floatingNameMesh.userData.baseY)
            {
                this.floatingNameMesh.userData.baseY = baseY
            }
            
            // Gentle floating motion
            this.floatingNameMesh.position.y = baseY + Math.sin(this.localTime.value * 2) * 0.3
        }
    }
}