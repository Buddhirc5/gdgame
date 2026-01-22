import * as THREE from 'three/webgpu'
import { InteractivePoints } from '../../InteractivePoints.js'
import { Area } from './Area.js'
import { color, Fn, mix, texture, uv, vec2, vec3, vec4 } from 'three/tsl'
import { MeshDefaultMaterial } from '../../Materials/MeshDefaultMaterial.js'
import gsap from 'gsap'

export class TimeMachine extends Area {
    constructor(model) {
        super(model)

        // Blank World coordinates - far from main world
        this.blankWorldPosition = new THREE.Vector3(500, 2, 500)
        this.returnPosition = null
        this.isInBlankWorld = false

        // Create blank world environment
        this.createBlankWorld()

        this.setInteractivePoint()
        this.setTV()
        this.setAchievement()
    }

    createBlankWorld() {
        const worldSize = 800 // Much larger for racing track
        const worldCenter = this.blankWorldPosition.clone()
        worldCenter.y = 0

        // Create ground floor
        const floorGeometry = new THREE.PlaneGeometry(worldSize, worldSize, 32, 32)
        floorGeometry.rotateX(-Math.PI / 2)

        const grassColor = color('#7ab55c')
        const dirtColor = color('#8b7355')

        const floorColorNode = Fn(() => {
            // Simple noise-based grass/dirt mix
            const noiseUv = vec2(uv().x.mul(10), uv().y.mul(10))
            const noise = texture(this.game.noises.perlin, noiseUv).r
            return mix(grassColor, dirtColor, noise.mul(0.3))
        })()

        const floorMaterial = new MeshDefaultMaterial({
            colorNode: floorColorNode,
            normalNode: vec3(0, 1, 0),
            hasWater: false,
            hasLightBounce: false
        })

        this.blankFloor = new THREE.Mesh(floorGeometry, floorMaterial)
        this.blankFloor.position.copy(worldCenter)
        this.blankFloor.receiveShadow = true
        this.game.scene.add(this.blankFloor)

        // Create water plane
        const waterGeometry = new THREE.PlaneGeometry(worldSize * 3, worldSize * 3)
        waterGeometry.rotateX(-Math.PI / 2)

        const waterColor = color('#2d8a9e')
        const waterMaterial = new MeshDefaultMaterial({
            colorNode: waterColor,
            normalNode: vec3(0, 1, 0),
            hasWater: false,
            hasLightBounce: false,
            transparent: true,
            opacity: 0.85,
            depthWrite: false // Fix transparency z-sorting issues
        })

        this.blankWater = new THREE.Mesh(waterGeometry, waterMaterial)
        this.blankWater.position.copy(worldCenter)
        this.blankWater.position.y = -2.0 // Lower slightly to avoid shore clipping
        this.game.scene.add(this.blankWater)

        // Add physics collider for the floor - much larger
        this.blankFloorPhysics = this.game.objects.add(
            null,
            {
                type: 'fixed',
                position: { x: worldCenter.x, y: -0.5, z: worldCenter.z },
                friction: 0.5,
                restitution: 0.1,
                colliders: [
                    { shape: 'cuboid', parameters: [worldSize / 2, 0.5, worldSize / 2], category: 'floor' }
                ]
            }
        )

        // Create return portal visual
        const portalGeometry = new THREE.TorusGeometry(3, 0.5, 16, 48)
        const portalMaterial = new THREE.MeshBasicNodeMaterial()
        portalMaterial.colorNode = vec3(0.2, 1, 0.5)

        this.returnPortalMesh = new THREE.Mesh(portalGeometry, portalMaterial)
        this.returnPortalMesh.position.set(
            this.blankWorldPosition.x,
            3,
            this.blankWorldPosition.z + 15
        )
        this.game.scene.add(this.returnPortalMesh)

        // Animate portal rotation
        this.game.ticker.events.on('tick', () => {
            if (this.returnPortalMesh) {
                this.returnPortalMesh.rotation.z += 0.01
            }
        })

        // Create return portal interactive point
        const portalInteractPosition = this.returnPortalMesh.position.clone()
        portalInteractPosition.y = 1.5

        this.returnPortal = this.game.interactivePoints.create(
            portalInteractPosition,
            'Return Portal',
            InteractivePoints.ALIGN_CENTER,
            InteractivePoints.STATE_CONCEALED,
            () => {
                this.teleportToMainWorld()
            },
            () => {
                if (this.isInBlankWorld)
                    this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () => {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () => {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )

        // Add environment elements
        this.createMountains(worldCenter)
        this.createClouds(worldCenter)
        this.create2DSprites(worldCenter)
        this.createRaceTrack(worldCenter)
    }

    createRaceTrack(worldCenter) {
        const trackLength = 600
        const trackWidth = 20

        // Asphalt road surface
        const roadGeometry = new THREE.PlaneGeometry(trackWidth, trackLength, 1, 1)
        roadGeometry.rotateX(-Math.PI / 2)

        const asphaltColor = color('#2a2a2a')
        const roadMaterial = new THREE.MeshBasicNodeMaterial()
        roadMaterial.colorNode = asphaltColor

        this.raceRoad = new THREE.Mesh(roadGeometry, roadMaterial)
        this.raceRoad.position.set(worldCenter.x, 0.02, worldCenter.z)
        this.raceRoad.receiveShadow = true
        this.game.scene.add(this.raceRoad)

        // White center line (dashed)
        const centerLineCount = 40
        const lineLength = trackLength / centerLineCount * 0.5
        const lineGap = trackLength / centerLineCount

        for (let i = 0; i < centerLineCount; i++) {
            const lineGeometry = new THREE.PlaneGeometry(0.3, lineLength)
            lineGeometry.rotateX(-Math.PI / 2)

            const lineMaterial = new THREE.MeshBasicNodeMaterial()
            lineMaterial.colorNode = color('#ffffff')

            const line = new THREE.Mesh(lineGeometry, lineMaterial)
            line.position.set(
                worldCenter.x,
                0.03,
                worldCenter.z - trackLength / 2 + i * lineGap + lineGap / 2
            )
            this.game.scene.add(line)
        }

        // Side stripes (yellow)
        const sideStripes = [-trackWidth / 2 + 0.5, trackWidth / 2 - 0.5]
        for (const offset of sideStripes) {
            const stripeGeometry = new THREE.PlaneGeometry(0.5, trackLength)
            stripeGeometry.rotateX(-Math.PI / 2)

            const stripeMaterial = new THREE.MeshBasicNodeMaterial()
            stripeMaterial.colorNode = color('#ffcc00')

            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial)
            stripe.position.set(
                worldCenter.x + offset,
                0.03,
                worldCenter.z
            )
            this.game.scene.add(stripe)
        }

        // Start/Finish line
        const startLineGeometry = new THREE.PlaneGeometry(trackWidth, 2)
        startLineGeometry.rotateX(-Math.PI / 2)

        const startLineMaterial = new THREE.MeshBasicNodeMaterial()
        startLineMaterial.colorNode = color('#ffffff')

        const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial)
        startLine.position.set(worldCenter.x, 0.03, worldCenter.z - trackLength / 2 + 10)
        this.game.scene.add(startLine)

        // Checkered pattern on start line
        const checkerSize = 2
        for (let x = 0; x < trackWidth / checkerSize; x++) {
            for (let z = 0; z < 2; z++) {
                if ((x + z) % 2 === 0) {
                    const checkerGeometry = new THREE.PlaneGeometry(checkerSize, 1)
                    checkerGeometry.rotateX(-Math.PI / 2)

                    const checkerMaterial = new THREE.MeshBasicNodeMaterial()
                    checkerMaterial.colorNode = color('#000000')

                    const checker = new THREE.Mesh(checkerGeometry, checkerMaterial)
                    checker.position.set(
                        worldCenter.x - trackWidth / 2 + x * checkerSize + checkerSize / 2,
                        0.04,
                        worldCenter.z - trackLength / 2 + 10 + z - 0.5
                    )
                    this.game.scene.add(checker)
                }
            }
        }
    }

    createMountains(worldCenter) {
        this.mountains = []

        // Mountain layer configurations (distance, height, color, count)
        const layers = [
            { distance: 300, height: 80, color: '#1a3a4a', count: 8, scale: 1.5 },
            { distance: 200, height: 50, color: '#2a5a6a', count: 10, scale: 1.2 },
            { distance: 150, height: 35, color: '#3a7a8a', count: 12, scale: 1.0 },
        ]

        for (const layer of layers) {
            for (let i = 0; i < layer.count; i++) {
                const angle = (i / layer.count) * Math.PI * 2

                // Create triangular mountain shape
                const mountainGeometry = new THREE.ConeGeometry(
                    layer.height * 0.8 * layer.scale,
                    layer.height * layer.scale,
                    4
                )

                const mountainMaterial = new THREE.MeshBasicNodeMaterial()
                mountainMaterial.colorNode = color(layer.color)
                mountainMaterial.side = THREE.DoubleSide

                const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial)
                mountain.position.set(
                    worldCenter.x + Math.cos(angle) * layer.distance,
                    layer.height * layer.scale * 0.5,
                    worldCenter.z + Math.sin(angle) * layer.distance
                )
                // Slight random rotation for variety
                mountain.rotation.y = Math.random() * Math.PI

                this.game.scene.add(mountain)
                this.mountains.push(mountain)
            }
        }
    }

    createClouds(worldCenter) {
        this.clouds = []
        const cloudCount = 15

        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group()

            // Create cloud from multiple spheres
            const cloudColor = color('#ffffff')
            const puffCount = 3 + Math.floor(Math.random() * 3)

            for (let j = 0; j < puffCount; j++) {
                const puffGeometry = new THREE.SphereGeometry(
                    5 + Math.random() * 5,
                    8,
                    6
                )
                const puffMaterial = new THREE.MeshBasicNodeMaterial()
                puffMaterial.colorNode = cloudColor
                puffMaterial.transparent = true
                puffMaterial.opacity = 0.9

                const puff = new THREE.Mesh(puffGeometry, puffMaterial)
                puff.position.set(
                    (j - puffCount / 2) * 6,
                    Math.random() * 3,
                    Math.random() * 4 - 2
                )
                puff.scale.y = 0.6
                cloudGroup.add(puff)
            }

            // Position cloud randomly around the world
            const angle = Math.random() * Math.PI * 2
            const distance = 50 + Math.random() * 150
            cloudGroup.position.set(
                worldCenter.x + Math.cos(angle) * distance,
                30 + Math.random() * 30,
                worldCenter.z + Math.sin(angle) * distance
            )

            // Store animation data
            cloudGroup.userData.speed = 0.02 + Math.random() * 0.03
            cloudGroup.userData.angle = angle
            cloudGroup.userData.distance = distance
            cloudGroup.userData.center = worldCenter.clone()

            this.game.scene.add(cloudGroup)
            this.clouds.push(cloudGroup)
        }

        // Animate clouds
        this.game.ticker.events.on('tick', () => {
            for (const cloud of this.clouds) {
                cloud.userData.angle += cloud.userData.speed * 0.01
                cloud.position.x = cloud.userData.center.x + Math.cos(cloud.userData.angle) * cloud.userData.distance
                cloud.position.z = cloud.userData.center.z + Math.sin(cloud.userData.angle) * cloud.userData.distance
            }
        })
    }

    create2DSprites(worldCenter) {
        this.decorations = []

        // Layer 1: Background trees (far) - large, dark silhouettes
        this.createTreeLayer(worldCenter, 120, 150, 20, 0x1a4a3a, 15, 25)

        // Layer 2: Mid-background trees - medium distance
        this.createTreeLayer(worldCenter, 80, 120, 15, 0x2a6a4a, 12, 20)

        // Layer 3: Midground trees - closer
        this.createTreeLayer(worldCenter, 50, 80, 12, 0x3a8a5a, 8, 15)

        // Layer 4: Foreground bushes and small trees
        this.createBushLayer(worldCenter, 20, 50, 25, 0x4a9a6a, 3, 6)

        // Layer 5: Ground details - flowers and grass patches
        this.createGroundDetails(worldCenter, 10, 40, 40)
    }

    createTreeLayer(worldCenter, minDist, maxDist, count, treeColor, minHeight, maxHeight) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
            const distance = minDist + Math.random() * (maxDist - minDist)
            const height = minHeight + Math.random() * (maxHeight - minHeight)

            // Tree trunk (thin rectangle)
            const trunkGeometry = new THREE.PlaneGeometry(height * 0.15, height * 0.4)
            const trunkMaterial = new THREE.MeshBasicNodeMaterial()
            trunkMaterial.colorNode = color('#5a3a2a')
            trunkMaterial.side = THREE.DoubleSide

            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
            trunk.position.set(
                worldCenter.x + Math.cos(angle) * distance,
                height * 0.2,
                worldCenter.z + Math.sin(angle) * distance
            )
            trunk.lookAt(this.game.view.camera.position.x, trunk.position.y, this.game.view.camera.position.z)
            this.game.scene.add(trunk)
            this.decorations.push(trunk)

            // Tree crown (triangle/circle shape using circle geometry)
            const crownGeometry = new THREE.CircleGeometry(height * 0.4, 6)
            const crownMaterial = new THREE.MeshBasicNodeMaterial()
            crownMaterial.colorNode = color(treeColor)
            crownMaterial.side = THREE.DoubleSide

            const crown = new THREE.Mesh(crownGeometry, crownMaterial)
            crown.position.set(
                worldCenter.x + Math.cos(angle) * distance,
                height * 0.6,
                worldCenter.z + Math.sin(angle) * distance
            )
            this.game.scene.add(crown)
            this.decorations.push(crown)
        }
    }

    createBushLayer(worldCenter, minDist, maxDist, count, bushColor, minSize, maxSize) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = minDist + Math.random() * (maxDist - minDist)
            const size = minSize + Math.random() * (maxSize - minSize)

            // Bush (oval/circle shape)
            const bushGeometry = new THREE.CircleGeometry(size, 8)
            const bushMaterial = new THREE.MeshBasicNodeMaterial()
            bushMaterial.colorNode = color(bushColor)
            bushMaterial.side = THREE.DoubleSide

            const bush = new THREE.Mesh(bushGeometry, bushMaterial)
            bush.position.set(
                worldCenter.x + Math.cos(angle) * distance,
                size * 0.5,
                worldCenter.z + Math.sin(angle) * distance
            )
            this.game.scene.add(bush)
            this.decorations.push(bush)
        }
    }

    createGroundDetails(worldCenter, minDist, maxDist, count) {
        const flowerColors = [0xff6b6b, 0xffd93d, 0x9b59b6, 0x3498db, 0xff9ff3]

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = minDist + Math.random() * (maxDist - minDist)

            // Small flower/grass patch
            const size = 0.5 + Math.random() * 1
            const flowerGeometry = new THREE.CircleGeometry(size, 5)
            const flowerMaterial = new THREE.MeshBasicNodeMaterial()
            flowerMaterial.colorNode = color(flowerColors[i % flowerColors.length])
            flowerMaterial.side = THREE.DoubleSide

            const flower = new THREE.Mesh(flowerGeometry, flowerMaterial)
            flower.position.set(
                worldCenter.x + Math.cos(angle) * distance,
                size * 0.3,
                worldCenter.z + Math.sin(angle) * distance
            )
            flower.rotation.x = -Math.PI * 0.3 // Tilt slightly towards camera
            this.game.scene.add(flower)
            this.decorations.push(flower)
        }

        // Make decorations face camera on each tick
        this.game.ticker.events.on('tick', () => {
            for (const deco of this.decorations) {
                if (deco.geometry.type === 'CircleGeometry') {
                    deco.lookAt(
                        this.game.view.camera.position.x,
                        deco.position.y,
                        this.game.view.camera.position.z
                    )
                }
            }
        })
    }

    teleportToBlankWorld() {
        // Store current position for return
        this.returnPosition = this.game.player.position.clone()

        // Fade out effect
        gsap.to(this.game.view.vignetteIntensity, {
            value: 1,
            duration: 0.5,
            onComplete: () => {
                // Teleport to blank world
                this.game.physicalVehicle.moveTo(this.blankWorldPosition, 0)
                this.isInBlankWorld = true

                // Fade back in
                gsap.to(this.game.view.vignetteIntensity, {
                    value: 0,
                    duration: 0.5,
                    delay: 0.2
                })
            }
        })
    }

    teleportToMainWorld() {
        if (!this.returnPosition) return

        // Fade out effect
        gsap.to(this.game.view.vignetteIntensity, {
            value: 1,
            duration: 0.5,
            onComplete: () => {
                // Teleport back to main world
                this.game.physicalVehicle.moveTo(this.returnPosition, 0)
                this.isInBlankWorld = false

                // Fade back in
                gsap.to(this.game.view.vignetteIntensity, {
                    value: 0,
                    duration: 0.5,
                    delay: 0.2
                })
            }
        })
    }

    setInteractivePoint() {
        this.interactivePoint = this.game.interactivePoints.create(
            this.references.items.get('interactivePoint')[0].position,
            'Blank World',
            InteractivePoints.ALIGN_RIGHT,
            InteractivePoints.STATE_CONCEALED,
            () => {
                this.teleportToBlankWorld()
            },
            () => {
                this.game.inputs.interactiveButtons.addItems(['interact'])
            },
            () => {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            },
            () => {
                this.game.inputs.interactiveButtons.removeItems(['interact'])
            }
        )
    }

    setTV() {
        let canCollide = true
        let collideIndex = 0

        const screenTextures = [
            this.game.resources.timeMachineScreenFolioTexture,
            this.game.resources.timeMachineScreenMGSTexture,
        ]

        const alertSound = this.game.audio.register({
            path: 'sounds/tv/alert.mp3',
            autoplay: false,
            loop: false,
            volume: 0.3,
            preload: true
        })


        const tv = this.references.items.get('tv')[0]
        tv.userData.object.physical.onCollision = (force, position) => {
            if (canCollide) {
                canCollide = false
                collideIndex++
                material.outputNode = screenOutputNode()
                material.needsUpdate = true

                const clickSound = this.game.audio.groups.get('click')
                if (clickSound)
                    clickSound.play(true)

                if (collideIndex === 1)
                    alertSound.play()

                gsap.delayedCall(1, () => {
                    canCollide = true
                })
            }
        }

        const screenMesh = this.references.items.get('screen')[0]

        const material = new THREE.MeshBasicNodeMaterial()
        const screenOutputNode = Fn(() => {
            const baseUv = vec2(uv().x, uv().y)

            const textureColor = texture(screenTextures[collideIndex % screenTextures.length], baseUv)

            const stripes = texture(
                this.game.noises.perlin,
                vec2(
                    baseUv.y.add(this.game.ticker.elapsedScaledUniform.mul(0.1)),
                    0
                )
            ).r.smoothstep(0, 1)

            return vec4(textureColor.rgb.mul(stripes.mul(collideIndex % screenTextures.length === 0 ? 1 : 3).add(1)), 1)
        })
        material.outputNode = screenOutputNode()

        screenMesh.material = material
    }

    setAchievement() {
        this.events.on('boundingIn', () => {
            this.game.achievements.setProgress('areas', 'timeMachine')
        })
    }
}