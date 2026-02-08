# Vercel hosting — WebGL / WebGPU

This project is set up to run correctly on Vercel. Production uses **WebGL** so the game works in all supported browsers.

## Renderer (WebGL vs WebGPU)

| Environment | Renderer | Notes |
|-------------|----------|--------|
| **Production (Vercel)** | **WebGL** | Forced in code (`import.meta.env.PROD`). No WebGPU so no binding errors. |
| **Development** | WebGL by default | Add `?webgpu` to the URL to test WebGPU locally. |

There is no “version” of WebGL to configure: the browser provides WebGL 2 (or WebGL 1 fallback). Three.js uses it via `THREE.WebGPURenderer` with `forceWebGL: true` in production.

## Vercel configuration

### `vercel.json`

- **installCommand**: `npm install --legacy-peer-deps` — matches local install (Vite 7 + plugins).
- **rewrites**: All routes → `/index.html` for the SPA; static files in `dist/` are still served as files.
- **Headers**
  - **COOP / COEP** on all responses: needed for optional WebGPU/WASM features and cross-origin isolation; safe for WebGL.
  - **index.html**: `Cache-Control: public, max-age=0, must-revalidate` — users get the latest HTML and JS after each deploy.
  - **/assets/** and **/static/** : long-lived immutable cache for hashed assets.
  - **.wasm**: `Content-Type: application/wasm` and long cache for Rapier.

### Node version

- **package.json** `"engines": { "node": ">=20.0.0" }` so Vercel uses a compatible Node (e.g. 20.x) for install and build.

## After deploy

1. Open the live URL and hard refresh (or use incognito) so the browser doesn’t use an old cached bundle.
2. In the console you should see: `[Renderer] Production: WebGL (live host)`.
3. The canvas should not show `data-engine="... webgpu"` in production; the app is using WebGL.

## Optional: force redeploy

If the live site still looks like the old build:

- Vercel dashboard → your project → Deployments → … on latest → **Redeploy** (no cache).
- Or push an empty commit: `git commit --allow-empty -m "redeploy" && git push`.
