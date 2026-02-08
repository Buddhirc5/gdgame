<p align="center">
  <img src="./resources/renders/render-4.png" alt="Skyforge Circuit — Night chase" width="100%" />
</p>

<h1 align="center">Skyforge Circuit</h1>

<p align="center">
  <strong>A drifting adventure across the Skyforge Isles.</strong><br>
  Built by <a href="https://github.com/Buddhirc5">Buddhi Sandeepa</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r183dev-black?logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Rapier-3D_Physics-orange" alt="Rapier" />
  <img src="https://img.shields.io/badge/WebGL-Production-green?logo=webgl" alt="WebGL" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="MIT" />
</p>

---

<p align="center">
  <img src="./resources/renders/render-3-front.png" alt="Vehicle render" width="45%" />
  &nbsp;&nbsp;
  <img src="./resources/renders/render-0-front.png" alt="Vehicle clay render" width="45%" />
</p>

---

## What is this?

Skyforge Circuit is a **browser-based 3D driving game** where you drift through stylized floating islands, explore districts, complete contracts, and race a full circuit -- all rendered in real time with Three.js.

### Highlights

- Real-time **physics** (Rapier 3D), **weather**, and **day/night cycles**
- Multiple camera modes: isometric, third person, top-down, first person, cinematic, free
- **Hand tracking** via MediaPipe -- steer with your hands, no controller needed
- Keyboard, gamepad, and touch controls
- Post-processing: bloom, depth of field
- Achievements, interactive points, secrets
- WebGL for universal browser support; experimental WebGPU in dev

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- npm

### Install and run

```bash
# Clone and enter the project
git clone https://github.com/Buddhirc5/gdgame.git
cd gdgame

# Install dependencies
npm install --legacy-peer-deps

# Start dev server (opens http://localhost:5173)
npm run dev
```

### Build for production

```bash
npm run build       # Output in dist/
npm run preview     # Preview the production build locally
```

### Deploy to Vercel

Push to `main` and Vercel auto-deploys. See [VERCEL.md](./VERCEL.md) for config details.

---

## Controls

| Input | Action |
|-------|--------|
| **W / Arrow Up** | Accelerate |
| **S / Arrow Down** | Brake / Reverse |
| **A / D / Arrows** | Steer |
| **Space** | Handbrake |
| **Shift** | Boost |
| **V** | Cycle camera mode |
| **Gamepad** | Full support (sticks, triggers, buttons) |
| **Hand tracking** | Palm tilt = throttle, hand position = steer, fist = brake, two hands = boost |

---

## Architecture

### Game loop (tick order)

```
 0  Time, Inputs
 1  Player (pre-physics)
 2  PhysicalVehicle (pre-physics)
 3  Physics (Rapier step)
 4  PhysicsWireframe, Objects
 5  PhysicalVehicle (post-physics)
 6  Player (post-physics)
 7  View / Camera
 8  Intro, DayCycles, YearCycles, Weather, Zones, VisualVehicle
 9  Wind, Lighting, Tornado, InteractivePoints, Tracks
10  Areas, Foliage, Fog, Reveal, Terrain, Trails, Floor, Grass,
    Leaves, Lightnings, Rain, Snow, WaterSurface, Whispers ...
13  InstancedGroups
14  Audio, Notifications, Title
998 Rendering (PostProcessing)
999 Monitoring
```

### Tech stack

| Layer | Technology |
|-------|------------|
| 3D engine | **Three.js** r183dev (TSL node materials) |
| Renderer | **WebGL** in production, WebGPU opt-in in dev (`?webgpu`) |
| Physics | **Rapier 3D** (WASM) |
| Audio | **Howler.js** |
| Animation | **GSAP** |
| Build | **Vite 7** |
| CSS | **Stylus** |
| Hand tracking | **MediaPipe Tasks Vision** |

See [TECH_STACK.md](./TECH_STACK.md) for the full breakdown and [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) for safe dependency upgrades.

---

## Blender workflow

### Export

- Mute the palette texture node (loaded in Three.js `Materials` directly)
- Use corresponding export presets
- Don't use compression (done later via CLI)

### Compress assets

```bash
npm run compress
```

This traverses `static/` and:

| Type | Action |
|------|--------|
| **GLB models** | Compress embedded textures with `etc1s --quality 255` |
| **Textures** (png/jpg) | Compress to KTX with `--encode etc1s --qlevel 255` |
| **UI images** | Convert to WebP |

Tools: [gltf-transform](https://gltf-transform.dev/cli) | [KTX-Software](https://github.com/KhronosGroup/KTX-Software)

---

## Project structure

```
sources/
  Game/
    Rendering.js        # WebGL/WebGPU renderer, post-processing
    Game.js             # Singleton, init sequence, resource loading
    Player.js           # Vehicle input, respawn, flip detection
    View.js             # 6 camera modes
    Physics/            # Rapier world, vehicle, wireframe debug
    World/              # Scenery, areas, foliage, weather effects
    Inputs/             # Keyboard, gamepad, pointer, hand tracking
    Materials/          # TSL node materials (MeshDefaultMaterial)
    Cycles/             # Day/night and seasonal cycles
  data/                 # Achievements, projects, social, countries
  style/                # Stylus stylesheets
static/                 # GLB models, KTX textures, fonts, UI assets
resources/              # Blender files, renders, sounds (not deployed)
```

---

## License

[MIT](./license.md) -- Buddhi Sandeepa, 2025
