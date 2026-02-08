<p align="center">
  <img src="./resources/renders/render-0-front.png" alt="Skyforge Circuit" width="100%" />
</p>

<h1 align="center">Skyforge Circuit</h1>

<p align="center">
  <strong>A drifting adventure across the Skyforge Isles</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-r183dev-black?logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/Rapier_3D-physics-blue" alt="Rapier" />
  <img src="https://img.shields.io/badge/Vite_7-bundler-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/WebGL-renderer-red" alt="WebGL" />
  <img src="https://img.shields.io/badge/GSAP-animation-88CE02?logo=greensock" alt="GSAP" />
  <img src="https://img.shields.io/badge/Howler.js-audio-orange" alt="Howler" />
</p>

---

## What is this?

Skyforge Circuit is a browser-based 3D driving experience built with **Three.js** (WebGPU renderer running in **WebGL** mode for production stability). Explore handcrafted districts, drift through circuits, discover secrets, and interact with the world using keyboard, gamepad, touch, or **hand tracking**.

<p align="center">
  <img src="./resources/renders/render-2-front.png" alt="Front view" width="48%" />
  <img src="./resources/renders/render-2-back.png" alt="Back view" width="48%" />
</p>

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20

### Install and run

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start dev server (opens browser)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Environment

Create a `.env` file based on `.env.example`.

| Variable | Description |
|----------|-------------|
| `VITE_PLAYER_SPAWN` | Starting spawn point (default: `landing`) |

---

## Features

| Feature | Description |
|---------|-------------|
| Real-time physics | Rapier 3D rigid bodies, vehicle suspension, collisions |
| Day/night cycles | Dynamic lighting, fog, and sky color that change over time |
| Weather system | Rain, snow, wind, and lightning |
| Multiple camera modes | Isometric, third-person, top-down, first-person, cinematic, free (press **V**) |
| Hand tracking | Gesture-based driving via MediaPipe (palm tilt = steer/accelerate) |
| Interactive districts | Career, projects, lab, social, achievements, and more |
| Post-processing | Bloom + depth-of-field passes |
| Audio system | Engine sounds, ambient music, spatial SFX via Howler.js |
| Achievements | Unlock achievements as you explore |

---

## Controls

| Input | Action |
|-------|--------|
| **W / Arrow Up** | Accelerate |
| **S / Arrow Down** | Brake / Reverse |
| **A / D / Arrows** | Steer |
| **Space** | Brake |
| **Shift** | Boost |
| **V** | Cycle camera modes |
| **Gamepad** | Full support (sticks, triggers, buttons) |
| **Touch** | On-screen nipple + buttons |
| **Hand tracking** | Palm gestures (enable in menu) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| 3D engine | **Three.js** r183dev (TSL node materials) |
| Renderer | **WebGL** in production, WebGPU opt-in with `?webgpu` in dev |
| Physics | **Rapier 3D** (WASM) |
| Animation | **GSAP** |
| Audio | **Howler.js** |
| Bundler | **Vite 7** |
| CSS | **Stylus** |
| Hand tracking | **MediaPipe Tasks Vision** |
| Debug | **Tweakpane** (CameraKit + Essentials) |

See [TECH_STACK.md](./TECH_STACK.md) for details. See [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) for safe upgrade steps.

---

## Hosting on Vercel

Production is pre-configured for Vercel. See [VERCEL.md](./VERCEL.md) for details.

```bash
# Deploy (auto via GitHub push, or manually)
vercel --prod
```

After deploy, confirm the console shows:
```
[Renderer] Production: WebGL (live host)
```

---

## Game loop

The tick system runs at priorities 0-999. Lower numbers run first.

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
     Leaves, Lightnings, Rain, Snow, Tornado, Water, Whispers, ...
 13  InstancedGroup
 14  Audio, Notifications, Title
998  Rendering (PostProcessing)
999  Monitoring
```

---

## Asset pipeline

### Models (GLB)

Exported from Blender with corresponding presets (no compression at export; compressed later).

### Textures (KTX)

GPU-compressed with `etc1s --quality 255`.

### Compress all

```bash
npm run compress
```

This traverses `static/` and:
- Compresses GLB textures to KTX (ETC1S)
- Compresses loose PNG/JPG to KTX
- Converts UI images to WebP

### Resources

- [gltf-transform CLI](https://gltf-transform.dev/cli)
- [KTX-Software](https://github.com/KhronosGroup/KTX-Software)
- [toktx reference](https://github.khronos.org/KTX-Software/ktxtools/toktx.html)

---

## Project structure

```
sources/
  index.html          Entry HTML
  index.js            Bootstrap + error tracking
  threejs-override.js Object3D.copy patch
  style/              Stylus stylesheets
  data/               Static data (achievements, projects, countries, ...)
  Game/
    Game.js           Singleton game manager
    Rendering.js      WebGPU/WebGL renderer + post-processing
    View.js           Camera modes (isometric, third-person, ...)
    Player.js         Player state + input → physics bridge
    Physics/          Rapier world, vehicle, wireframe
    Materials/        TSL node materials (MeshDefaultMaterial, MeshGridMaterial)
    World/            All world objects (terrain, trees, areas, weather, ...)
    Inputs/           Keyboard, pointer, gamepad, hand tracking, nipple
    Cycles/           Day and year cycles
    ...
static/               Public assets (models, textures, sounds, UI, fonts)
resources/            Source files (Blender, PSD, raw renders)
```

---

<p align="center">
  <img src="./resources/renders/render-4.png" alt="Skyforge Circuit" width="80%" />
</p>

<p align="center">
  Built with Three.js, Rapier, and a lot of drifting.
</p>
