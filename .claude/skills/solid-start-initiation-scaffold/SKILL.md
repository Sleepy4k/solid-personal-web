---
name: solid-start-initiation-scaffold
description: Bootstrap a SolidStart app from zero - create-solid, pick an SSR preset, set the server/client env split, and wire the first route+server function - ready to render SSR pages with data.
related:
  - solid-start-project-structure
  - solid-start-env-variables
  - solid-start-best-practices
  - solid-start-custom-adapters-deploy
---

# SolidStart Initiation Scaffold
- A new app is created with `npm create solid@latest` (SolidStart option), giving file routing, SSR, and `app.config.ts`.
- The deployment preset (Node, Vercel, Cloudflare, etc.) is chosen in `app.config.ts` so the build targets the right runtime.
- Env vars are split (server secret vs `VITE_` public) and the first `query`/server function is wired before features.

## Safety contract: non-negotiable
- Abort if real secrets are committed in `.env` (only `.env.example` belongs in git) or placed under a `VITE_` prefix (public).
- Abort if the chosen server preset doesn't match the deploy target (build runs but fails at runtime on that platform).
- Abort if SSR is assumed but a route reads `window`/`document` during render (server crash — see [[solid-start-best-practices]]).
- Abort if `app.config.ts` is misconfigured so the dev server and build diverge (works locally, breaks deployed).

## Required tools
- Node >= 18, `npm create solid@latest` (or `create-solid`), `@solidjs/start`, Vinxi/Nitro; a deploy target.

## Gotchas
- `npm create solid@latest` scaffolds SolidStart with TS, routing, and SSR defaults; pick the template that matches your needs.
- `app.config.ts` `server.preset` selects the Nitro deployment preset; the default is Node — set it for Vercel/Cloudflare/etc.
- Client env vars must be `VITE_`-prefixed and are public; server secrets are read via `process.env` in `"use server"` code.
- Run `vinxi dev` for development and `vinxi build` for production; don't mix in a bare Vite config.

## Workflow
1. `npm create solid@latest my-app` (choose SolidStart) → `cd my-app && npm i`.
2. Set `server.preset` in `app.config.ts` to the deploy target.
3. Create `.env` (gitignored) + `.env.example`; split server/`VITE_` vars.
4. Add a route with a `query`/server function; verify SSR renders with data.

## Code Examples (Good vs Bad)

### Bad Example 1 (committed secret / public-prefixed secret)
```bash
git add .env                                  # leaks DB_URL, SESSION_SECRET
# .env: VITE_DB_PASSWORD=hunter2              # VITE_ -> shipped to the browser
```

### Bad Example 2 (preset mismatch)
```ts
// deploying to Cloudflare Workers but:
export default defineConfig({ server: { preset: 'node-server' } }); // builds, fails on CF runtime
```

### Bad Example 3 (window read during SSR render)
```tsx
export default function Home() {
  const theme = window.localStorage.getItem('theme'); // window is undefined on the server -> SSR crash
  return <main data-theme={theme}>...</main>;
}
```

### Bad Example 4 (bare Vite config instead of app.config.ts)
```ts
// vite.config.ts treated as the source of truth, no app.config.ts
export default defineConfig({ plugins: [solid()] }); // bypasses SolidStart/Nitro -> no SSR/routing wiring
```

### Bad Example 5 (mixing dev tooling)
```bash
vite dev            # bare Vite, not the SolidStart dev server
vinxi build         # build expects vinxi/app.config.ts -> dev and build diverge
```

### Good Example 1 (correct scaffold + preset)
```ts
// app.config.ts
import { defineConfig } from '@solidjs/start/config';
export default defineConfig({ server: { preset: 'vercel' } }); // matches deploy target
```

### Good Example 2 (env split + first server function)
```bash
cp .env.example .env && echo ".env" >> .gitignore  # secrets local-only
# .env: SESSION_SECRET=...   VITE_API_BASE=https://api.example.com (public)
```
```tsx
const ping = query(async () => { 'use server'; return { ok: true, at: Date.now() }; }, 'ping');
export default function Home() { const p = createAsync(() => ping()); return <span>{p()?.ok ? 'up' : '...'}</span>; }
```

### Good Example 3 (browser API guarded for SSR)
```tsx
import { isServer } from 'solid-js/web';
export default function Home() {
  const theme = isServer ? 'light' : localStorage.getItem('theme') ?? 'light'; // safe on both runtimes
  return <main data-theme={theme}>...</main>;
}
```

### Good Example 4 (canonical app.config.ts as source of truth)
```ts
import { defineConfig } from '@solidjs/start/config';
export default defineConfig({
  server: { preset: 'node-server' },
  vite: { plugins: [] }, // extra Vite plugins go HERE, under SolidStart's config
});
```

### Good Example 5 (consistent dev/build scripts)
```json
{ "scripts": { "dev": "vinxi dev", "build": "vinxi build", "start": "vinxi start" } }
```

## Related skills
- [[solid-start-project-structure]] — the layout to build into.
- [[solid-start-env-variables]] — the server/client env split.
- [[solid-start-best-practices]] — SSR-safe code from day one.
- [[solid-start-custom-adapters-deploy]] — choosing/extending the deploy preset.
