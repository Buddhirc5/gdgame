# Tech Stack — Skyforge Circuit

> **Upgrading?** See [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) for what’s safe to upgrade without breaking the code.

## Rendering (3D / Graphics)

| Layer | Technology |
|-------|------------|
| **3D engine** | **Three.js** (r183dev, from GitHub) |
| **Renderer** | **WebGPU renderer with WebGL fallback** — `THREE.WebGPURenderer` with `forceWebGL: true` by default, so production runs on **WebGL**. WebGPU is opt-in via `?webgpu`. |
| **Shading / materials** | **TSL (Three.js Shading Language)** — `three/tsl` for node-based materials (e.g. `MeshDefaultMaterial`, bloom, DOF). |
| **Post-processing** | Three.js PostProcessing + custom **Bloom** and **cheap DOF** passes. |

**Summary:** The app uses **WebGL** by default (via Three.js WebGPU renderer in WebGL mode). WebGPU is experimental and enabled with `?webgpu` in the URL.

---

## Build & Tooling

- **Bundler / dev server:** **Vite 7**
- **CSS:** **Stylus** (`.styl`), compiled by Vite
- **Module system:** ES modules (`type: "module"`)

---

## Physics

- **3D physics:** **Rapier 3D** (`@dimforge/rapier3d`) — rigid bodies, vehicles, collisions

---

## Audio

- **Howler.js** — music, SFX, spatial/vehicle sounds

---

## Animation & UI

- **GSAP** — tweens, intro sequences, UI/camera animations
- **Tweakpane** — debug panels (with CameraKit, Essentials plugins)

---

## Input

- **camera-controls** — orbit/free/third-person camera
- **MediaPipe Tasks Vision** — hand tracking for gesture controls
- Custom handling for pointer, gamepad, keyboard, wheel

---

## Assets

- **Models:** GLB (compressed)
- **Textures:** KTX (GPU-compressed), some PSD/EXR in `resources/`
- **GLTF-Transform** — CLI/tooling for processing models

---

## Other

- **WASM** (e.g. Rapier) via `vite-plugin-wasm` and `vite-plugin-top-level-await`
- **Node polyfills** for Vite build
- **dotenv** for env (e.g. `VITE_PLAYER_SPAWN`)
