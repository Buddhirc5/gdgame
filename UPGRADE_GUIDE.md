# Tech Stack Upgrade Guide

This guide explains what you can upgrade **without harming the code**, and what to avoid or test carefully.

---

## Safe to upgrade (low risk)

These use semver ranges (`^x.y.z`) and can be updated with **patch/minor** bumps. Run `npm update` and test.

| Package | Current | Action |
|---------|---------|--------|
| **gsap** | ^3.12.5 | `npm update gsap` — minor updates are backward compatible |
| **howler** | ^2.2.4 | `npm update howler` |
| **camera-controls** | ^3.1.2 | `npm update camera-controls` |
| **tweakpane** | ^4.0.4 | `npm update tweakpane` |
| **dotenv** | ^17.2.3 | `npm update dotenv` |
| **vite** | ^7.2.4 | `npm update vite` — stay on Vite 7.x |
| **vite-plugin-*** | various | `npm update` — keep same major versions |
| **uuid** | ^11.1.0 | `npm update uuid` |
| **seedrandom** | ^3.0.5 | `npm update seedrandom` |
| **@dimforge/rapier3d** | ^0.17.3 | `npm update @dimforge/rapier3d` — stay on 0.17.x; test physics |
| **@mediapipe/tasks-vision** | ^0.10.22-rc… | Prefer keeping this version; newer RCs may change hand-tracking API |
| **stylus** | ^0.64.0 | `npm update stylus` |
| **stats-gl** | ^3.6.0 | `npm update stats-gl` |

**Recommended safe step:**

```bash
npm update --legacy-peer-deps
npm run build
npm run preview
# Then test the game (drive, hand tracking, menus)
```

`--legacy-peer-deps` is needed because `vite-plugin-restart` declares peer support only up to Vite 6; the project uses Vite 7 and the plugin works fine. Three.js is left unchanged (still the pinned GitHub commit).

---

## Do not upgrade without a plan (high risk)

### Three.js (pinned to a GitHub commit)

- **Current:** `github:mrdoob/three.js#2880327e14e5cc4853f1f140c7aa640d760eed55` (r183dev)
- **Risk:** The project depends on:
  - `three/webgpu` and `three/tsl`
  - Internal paths: `three/src/renderers/common/CubeRenderTarget.js`, `three/src/math/MathUtils.js`
  - Addons: `three/addons/tsl/...`, `three/addons/loaders/...`, `three/addons/lines/...`, `three/examples/jsm/...`

Moving to another commit or an npm release can break:

- WebGPU/WebGL renderer API
- TSL node names or signatures
- Addon paths or exports
- Internal `three/src/...` paths

**If you must upgrade Three.js:**

1. Prefer a **tagged release** that includes WebGPU and TSL (e.g. a later r18x).
2. In a branch: switch dependency to that version (e.g. `"three": "^0.xxx.0"` or a specific commit).
3. Run the app and fix:
   - Any import path renames (e.g. `three/addons` → `three/examples/jsm` or vice versa).
   - Any TSL/WebGPU API renames or removals.
4. Re-test rendering, materials, post-processing, and physics.

Until then, **leave the Three.js dependency as-is** to avoid breaking the build or runtime.

---

## Optional / tooling upgrades

| Package | Note |
|---------|------|
| **@gltf-transform/cli**, **@gltf-transform/functions** | Dev/build tools; upgrade on a branch and re-run your glTF pipeline |
| **sharp** | Image processing; minor updates usually safe |
| **opentype.js** (dev) | Only if you use it for font tooling; test font rendering |

---

## Summary

| Category | Action |
|----------|--------|
| **Safe** | Run `npm update` and test build + gameplay |
| **Risky** | Do not change **Three.js** without a dedicated upgrade branch and full testing |
| **Optional** | Upgrade GLTF-Transform, sharp, opentype in a branch and test |

Sticking to **safe** upgrades and leaving **Three.js** unchanged will upgrade the rest of the stack without harming the code.
