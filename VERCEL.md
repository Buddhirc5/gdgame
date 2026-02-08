# Vercel hosting

This project is configured to deploy on Vercel. Production uses **WebGPU** (the same renderer as development).

## Why WebGPU, not WebGL?

The TSL node materials generate shader uniform blocks larger than **16KB**. WebGL has a hard limit (`GL_MAX_UNIFORM_BLOCK_SIZE = 16384`), causing shader compilation failures. WebGPU has no such limit and is what the codebase was designed for.

| Environment | Renderer | Notes |
|-------------|----------|-------|
| **Production (Vercel)** | **WebGPU** | Default. Required for TSL materials. |
| **Fallback** | WebGL | Only when browser lacks WebGPU. Some shaders will break. |
| **Force WebGL** | WebGL | Add `?webgl` to URL (for testing only). |

## WebGPU console warnings

You will see `Binding size ... is zero` warnings in the console. These are **harmless** Three.js WebGPU validation messages and are suppressed by the error filter in `sources/index.js`. They do not affect rendering.

## Vercel configuration

### `vercel.json`

- **installCommand**: `npm install --legacy-peer-deps` (Vite 7 + plugins)
- **rewrites**: All routes -> `/index.html` (SPA); static files served directly
- **Headers**:
  - `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on all responses (required for WASM/SharedArrayBuffer)
  - `index.html`: `Cache-Control: max-age=0, must-revalidate` (users always get latest build)
  - `/assets/*` and `/static/*`: immutable long cache (hashed filenames)
  - `.wasm`: correct `Content-Type` and long cache

### Node version

`package.json` has `"engines": { "node": ">=20.0.0" }`.

## After deploy

1. Open the live URL in a **WebGPU-capable browser** (Chrome 113+, Edge 113+, Firefox 141+, Safari 18.2+).
2. Hard refresh or use incognito to avoid cached old bundles.
3. Console should show: `[Renderer] Using WebGPU`.
4. If the browser lacks WebGPU, it falls back to WebGL automatically (some visual glitches expected).

## Force redeploy

If the live site still shows old code:

- Vercel dashboard -> Deployments -> Redeploy (no cache)
- Or: `git commit --allow-empty -m "redeploy" && git push`
