# Tech Stack — Skyforge Circuit

> **Upgrading?** See [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) for what’s safe to upgrade without breaking the code.

## Rendering (3D / Graphics)

| Layer | Technology |
|-------|------------|
| **3D engine** | **Three.js** (r183dev, from GitHub) |
| **Renderer** | **WebGPU** (default) with **WebGL fallback** — `THREE.WebGPURenderer`. WebGPU is required because the TSL materials exceed WebGL's 16KB uniform block limit. WebGL fallback for older browsers only. |
| **Shading / materials** | **TSL (Three.js Shading Language)** — `three/tsl` for node-based materials (e.g. `MeshDefaultMaterial`, bloom, DOF). |
| **Post-processing** | Three.js PostProcessing + custom **Bloom** and **cheap DOF** passes. |

**Summary:** The app uses **WebGPU** by default. The TSL node materials generate shader uniform blocks larger than 16KB, which exceeds WebGL's hard limit (`GL_MAX_UNIFORM_BLOCK_SIZE`). WebGPU has no such limit. WebGL is only used as a fallback when the browser lacks WebGPU support, and can be forced with `?webgl` in the URL for testing.

### Hosting (live)

Production builds on Vercel use **WebGPU** (same as dev). The WebGPU validation warnings in the console (`Binding size ... is zero`) are harmless Three.js internals and are suppressed by the error filter in `index.js`. Add `?webgl` to force WebGL for testing (some shaders will break due to the 16KB limit).

**Vercel:** See [VERCEL.md](./VERCEL.md) for headers, deploy notes, and troubleshooting.

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
