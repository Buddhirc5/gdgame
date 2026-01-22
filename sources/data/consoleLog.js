import * as THREE from 'three/webgpu'

const text = `
███████╗██╗  ██╗██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██║ ██╔╝╚██╗ ██╔╝██╔════╝██╔════╝ ██╔══██╗██╔═══██╗██╔════╝
███████╗█████╔╝  ╚████╔╝ █████╗  ██║  ███╗██████╔╝██║   ██║█████╗  
╚════██║██╔═██╗   ╚██╔╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
███████║██║  ██╗   ██║   ███████╗╚██████╔╝██║  ██║╚██████╔╝███████╗
╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
                                                                  
 ██████╗██╗██████╗  ██████╗██╗   ██╗██╗████████╗
██╔════╝██║██╔══██╗██╔════╝██║   ██║██║╚══██╔══╝
██║     ██║██████╔╝██║     ██║   ██║██║   ██║   
██║     ██║██╔══██╗██║     ██║   ██║██║   ██║   
╚██████╗██║██║  ██║╚██████╗╚██████╔╝██║   ██║   
 ╚═════╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝   

╔═ Welcome ═══════════════╗
║ Skyforge Circuit is live!
║ Build: Three.js ${THREE.REVISION}
╚═════════════════════════╝

╔═ Systems ═══════════════╗
║ Real-time physics, weather, and day/night cycles
║ Explore districts, complete contracts, and race the circuit
╚═════════════════════════╝

╔═ Credits ═══════════════╗
║ Three.js ⇒ https://threejs.org/
║ Rapier  ⇒ https://rapier.rs/
║ Howler ⇒ https://howlerjs.com/
╚═════════════════════════╝
`
let finalText = ''
let finalStyles = []
const stylesSet = {
    letter: 'color: #ffffff; font: 400 1em monospace;',
    pipe: 'color: #D66FFF; font: 400 1em monospace;',
}
let currentStyle = null
for(let i = 0; i < text.length; i++)
{
    const char = text[i]

    const style = char.match(/[╔║═╗╚╝╔╝]/) ? 'pipe' : 'letter'
    if(style !== currentStyle)
    {
        currentStyle = style
        finalText += '%c'

        finalStyles.push(stylesSet[currentStyle])
    }
    finalText += char
}

export default [finalText, ...finalStyles]
