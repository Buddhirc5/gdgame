import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

// Filter out known WebGPU validation errors from Three.js
// These are harmless validation warnings that don't affect functionality
const originalError = console.error
const originalWarn = console.warn

const shouldSuppressWebGPUError = (message) => {
    if (!message) return false
    const msg = String(message)
    
    // Match WebGPU binding size errors
    return (msg.includes("Binding size for [Buffer") && msg.includes("is zero")) ||
           msg.includes("bindingBufferundefined_UniformBuffer") ||
           (msg.includes("While validating entries") && (msg.includes("binding: 8") || msg.includes("binding:8"))) ||
           msg.includes("While validating [BindGroupDescriptor") ||
           msg.includes("While calling [Device].CreateBindGroup")
}

const createFilteredConsole = (original) => {
    return function(...args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')
        if (!shouldSuppressWebGPUError(message)) {
            original.apply(console, args)
        }
    }
}

console.error = createFilteredConsole(originalError)
console.warn = createFilteredConsole(originalWarn)

// Filter unhandled promise rejections for WebGPU errors
window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason || '')
    if (shouldSuppressWebGPUError(message)) {
        event.preventDefault()
        event.stopPropagation()
    }
})

// Intercept errors at window level
const originalOnError = window.onerror
window.onerror = function(message, source, lineno, colno, error) {
    if (shouldSuppressWebGPUError(message)) {
        return true // Suppress the error
    }
    if (originalOnError) {
        return originalOnError.call(this, message, source, lineno, colno, error)
    }
    return false
}

// Intercept error events
window.addEventListener('error', function(event) {
    const msg = event.message || event.error?.message || ''
    if (shouldSuppressWebGPUError(msg)) {
        event.preventDefault()
        event.stopPropagation()
    }
}, true)

console.log(
    ...consoleLog
)

if(import.meta.env.VITE_GAME_PUBLIC)
    window.game = new Game()
else
    new Game()