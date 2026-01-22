import { Events } from '../Events.js'
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision'

export class HandTracking {
    constructor() {
        this.events = new Events()

        // State
        this.active = false
        this.enabled = false
        this.initialized = false
        this.status = 'idle' // idle, initializing, ready, tracking, error

        // Control values (output)
        this.steering = 0      // -1 (left) to 1 (right)
        this.accelerating = 0  // 0 to 1
        this.braking = 0       // 0 or 1
        this.boosting = 0      // 0 or 1

        // Hand detection data
        this.handsCount = 0
        this.landmarks = null

        // DOM elements
        this.toggleButton = document.querySelector('.js-hand-tracking-toggle')
        this.card = document.querySelector('.js-hand-tracking-card')
        this.closeButton = document.querySelector('.js-hand-tracking-close')
        this.video = document.querySelector('.js-hand-tracking-video')
        this.canvas = document.querySelector('.js-hand-tracking-canvas')
        this.statusElement = document.querySelector('.js-hand-tracking-status')

        // MediaPipe
        this.handLandmarker = null
        this.drawingUtils = null
        this.lastVideoTime = -1
        this.animationFrameId = null

        // Settings
        this.smoothing = 0.3
        this.deadZone = 0.15

        this.setEventListeners()
    }

    setEventListeners() {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggle())
        }

        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.disable())
        }
    }

    async toggle() {
        if (this.enabled)
            this.disable()
        else
            await this.enable()
    }

    async enable() {
        if (this.enabled) return

        this.enabled = true
        this.setStatus('initializing')

        // Show card
        if (this.card) this.card.classList.add('is-visible')
        if (this.toggleButton) this.toggleButton.classList.add('is-active')

        try {
            // Initialize MediaPipe if not done
            if (!this.initialized) {
                await this.initMediaPipe()
            }

            // Start camera
            await this.startCamera()

            this.setStatus('ready')
            this.startDetection()

            this.events.trigger('enabled')
        }
        catch (error) {
            console.error('Hand tracking initialization failed:', error)
            this.setStatus('error')
            this.disable()
        }
    }

    disable() {
        if (!this.enabled) return

        this.enabled = false
        this.active = false

        // Stop detection loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }

        // Stop camera
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks()
            tracks.forEach(track => track.stop())
            this.video.srcObject = null
        }

        // Reset controls
        this.steering = 0
        this.accelerating = 0
        this.braking = 0
        this.boosting = 0
        this.handsCount = 0

        // Hide card
        if (this.card) this.card.classList.remove('is-visible')
        if (this.toggleButton) this.toggleButton.classList.remove('is-active')

        // Clear canvas
        if (this.canvas) {
            const ctx = this.canvas.getContext('2d')
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        }

        this.setStatus('idle')
        this.events.trigger('disabled')
    }

    async initMediaPipe() {
        // Load WASM files
        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )

        // Create hand landmarker
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        this.initialized = true
    }

    async startCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        })

        this.video.srcObject = stream

        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play()

                // Set canvas size to match video
                this.canvas.width = this.video.videoWidth
                this.canvas.height = this.video.videoHeight

                // Initialize drawing utils
                const ctx = this.canvas.getContext('2d')
                this.drawingUtils = new DrawingUtils(ctx)

                resolve()
            }
        })
    }

    startDetection() {
        const detect = () => {
            if (!this.enabled) return

            this.animationFrameId = requestAnimationFrame(detect)

            // Only process new frames
            if (this.video.currentTime === this.lastVideoTime) return
            this.lastVideoTime = this.video.currentTime

            // Run detection
            const results = this.handLandmarker.detectForVideo(this.video, performance.now())

            // Process results
            this.processResults(results)

            // Draw landmarks
            this.drawResults(results)
        }

        detect()
    }

    processResults(results) {
        const wasActive = this.active
        this.handsCount = results.landmarks.length
        this.active = this.handsCount > 0

        if (this.active) {
            this.setStatus('tracking')
            this.landmarks = results.landmarks

            // Get primary hand (first detected)
            const hand = results.landmarks[0]

            // Calculate controls from hand landmarks
            this.calculateControls(hand, results.handedness[0])

            // Two hands = boost
            this.boosting = this.handsCount >= 2 ? 1 : 0

            if (!wasActive) {
                this.events.trigger('handDetected')
            }
        }
        else {
            this.setStatus('ready')
            this.landmarks = null

            // Smoothly decay controls
            this.steering *= 0.9
            this.accelerating *= 0.9
            this.braking = 0
            this.boosting = 0

            if (wasActive) {
                this.events.trigger('handLost')
            }
        }

        this.events.trigger('handUpdate', [this])
    }

    calculateControls(landmarks, handedness) {
        // Landmark indices:
        // 0: WRIST
        // 4: THUMB_TIP
        // 8: INDEX_FINGER_TIP
        // 12: MIDDLE_FINGER_TIP
        // 16: RING_FINGER_TIP
        // 20: PINKY_TIP

        const wrist = landmarks[0]
        const indexTip = landmarks[8]
        const middleTip = landmarks[12]
        const thumbTip = landmarks[4]
        const pinkyTip = landmarks[20]
        const middleBase = landmarks[9] // MCP joint of middle finger

        // === STEERING ===
        // Based on wrist horizontal position (x: 0-1, where 0.5 is center)
        // Hand moving right = steer right, hand moving left = steer left
        let rawSteering = (wrist.x - 0.5) * 2 // -1 to 1

        // Apply dead zone
        if (Math.abs(rawSteering) < this.deadZone)
            rawSteering = 0
        else
            rawSteering = (rawSteering - Math.sign(rawSteering) * this.deadZone) / (1 - this.deadZone)

        // Clamp
        rawSteering = Math.max(-1, Math.min(1, rawSteering))

        // Smooth
        this.steering += (rawSteering - this.steering) * this.smoothing

        // === HAND OPENNESS (for acceleration/braking) ===
        // Calculate average distance from fingertips to wrist
        const fingertipDistances = [
            this.distance(indexTip, wrist),
            this.distance(middleTip, wrist),
            this.distance(thumbTip, wrist),
            this.distance(pinkyTip, wrist)
        ]
        const avgDistance = fingertipDistances.reduce((a, b) => a + b, 0) / fingertipDistances.length

        // Normalize - roughly 0.15 is closed fist, 0.4 is open palm
        const openness = Math.max(0, Math.min(1, (avgDistance - 0.15) / 0.25))

        // === HAND TILT (for forward/reverse) ===
        // Check if hand is tilted down (fingers pointing down = reverse)
        // When middle finger tip Y > wrist Y, fingers are pointing down (Y increases downward in image coords)
        const tiltAmount = middleTip.y - wrist.y // positive = fingers pointing down = reverse
        const isReversing = tiltAmount > 0.08 // threshold for reverse gesture

        // === ACCELERATION ===
        // Open palm = accelerate (forward or reverse based on tilt)
        let targetAccelerating = 0
        if (openness > 0.5) {
            const accelStrength = Math.pow((openness - 0.5) * 2, 1.5)
            if (isReversing) {
                targetAccelerating = -accelStrength // Negative = reverse
            } else {
                targetAccelerating = accelStrength // Positive = forward
            }
        }
        this.accelerating += (targetAccelerating - this.accelerating) * this.smoothing

        // === BRAKING ===
        // Closed fist = brake
        this.braking = openness < 0.3 ? 1 : 0
    }

    distance(p1, p2) {
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const dz = (p1.z || 0) - (p2.z || 0)
        return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }

    drawResults(results) {
        const ctx = this.canvas.getContext('2d')
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        if (!results.landmarks.length) return

        // Draw each hand
        for (const landmarks of results.landmarks) {
            // Draw connections
            this.drawingUtils.drawConnectors(
                landmarks,
                HandLandmarker.HAND_CONNECTIONS,
                { color: '#00FF88', lineWidth: 3 }
            )

            // Draw landmarks
            this.drawingUtils.drawLandmarks(
                landmarks,
                {
                    color: '#FF4488',
                    lineWidth: 1,
                    radius: 4
                }
            )
        }
    }

    setStatus(status) {
        this.status = status

        const statusTexts = {
            'idle': 'Hand Tracking Off',
            'initializing': 'Initializing...',
            'ready': 'Show your hand',
            'tracking': `Tracking (${this.handsCount} hand${this.handsCount > 1 ? 's' : ''})`,
            'error': 'Error - Check camera'
        }

        if (this.statusElement) {
            this.statusElement.textContent = statusTexts[status] || status
        }
    }

    update() {
        // Called each frame from Inputs.update()
        // Detection runs in its own animation frame loop
    }
}
