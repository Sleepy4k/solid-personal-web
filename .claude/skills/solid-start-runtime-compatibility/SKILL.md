---
name: solid-start-runtime-compatibility
description: Keep SolidStart portable across deploy targets - Web-standard APIs over Node-only ones, the right Nitro preset, isServer guards, and edge-safe dependencies - instead of code that only runs on one platform.
related:
  - solid-start-custom-adapters-deploy
  - solid-start-request-response-handling
  - solid-start-ssr-hydration-matching
  - solid-start-best-practices
---

# SolidStart Runtime Compatibility
- Server code uses Web-standard APIs (`Request`/`Response`/`fetch`/`crypto.subtle`) so it runs on Node, edge, and workers.
- The Nitro `server.preset` in `app.config.ts` matches the deploy target; node-only APIs are avoided unless the preset guarantees Node.
- Browser-only code is guarded with `isServer`/`onMount`; dependencies are checked for edge compatibility.

## Safety contract: non-negotiable
- Abort if Node-only APIs (`fs`, `Buffer`, `process` internals) are used under an edge/worker preset that lacks them (runtime crash).
- Abort if the `server.preset` doesn't match the deploy platform (builds locally, fails deployed — see [[solid-start-custom-adapters-deploy]]).
- Abort if browser globals are read during SSR without an `isServer` guard (server crash).
- Abort if a dependency that needs Node built-ins is bundled into an edge build (cryptic bundling/runtime errors).

## Required tools
- `@solidjs/start` >= 1, Nitro presets (`node-server`, `vercel`, `cloudflare-*`, `netlify`), `isServer` from `solid-js/web`, Web Crypto.

## Gotchas
- Edge/worker runtimes lack `fs`, `Buffer`, and parts of `process`; use `crypto.subtle`, `TextEncoder`, and `globalThis.fetch` instead.
- `app.config.ts` `server.preset` selects the Nitro target; set it explicitly per environment.
- `isServer` lets the bundler drop the wrong-side branch; pair with `onMount` for browser-only setup.
- Verify third-party libs are "edge-safe" before deploying to Cloudflare/Vercel Edge; many assume Node.

## Workflow
1. Prefer Web-standard APIs in all server code.
2. Set `server.preset` to the deploy target in `app.config.ts`.
3. Guard browser globals with `isServer`/`onMount`.
4. Audit dependencies for Node-built-in usage before an edge deploy.

## Code Examples (Good vs Bad)

### Bad Example 1 (Node APIs under an edge preset)
```ts
import fs from 'node:fs';
export async function GET() {
  const buf = Buffer.from(fs.readFileSync('./data.json')); // fs/Buffer absent on edge -> crash
  return new Response(buf);
}
```

### Bad Example 2 (preset mismatch + browser global on server)
```ts
// app.config.ts: preset 'cloudflare-pages' but code uses node-only crypto:
import { createHash } from 'node:crypto';
const id = createHash('sha256').update(window.name).digest('hex'); // node crypto + window on server
```

### Bad Example 3 (process.env read at module top, client-bundled)
```ts
const region = process.env.AWS_REGION; // evaluated when the module loads -> undefined/inlined wrong on client
export function Region() { return <span>{region}</span>; }
```

### Bad Example 4 (Node Buffer for base64 in shared code)
```ts
export const encode = (s: string) => Buffer.from(s).toString('base64'); // Buffer absent on edge/browser
```

### Bad Example 5 (assuming __dirname / import paths)
```ts
import path from 'node:path';
const p = path.join(__dirname, 'templates'); // __dirname & node:path missing on workers -> crash
```

### Good Example 1 (Web-standard, portable)
```ts
export async function GET() {
  const data = await fetch(new URL('./data.json', import.meta.url)).then(r => r.json()); // no fs
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
  return Response.json({ etag: [...new Uint8Array(digest)].map(b => b.toString(16)).join('') });
}
```

### Good Example 2 (matching preset + isServer guard)
```ts
// app.config.ts
export default defineConfig({ server: { preset: 'cloudflare-pages' } }); // matches target
// component
import { isServer } from 'solid-js/web';
if (!isServer) onMount(() => console.log(window.location.href));         // browser-only
```

### Good Example 3 (read env inside a "use server" function)
```ts
export const getRegion = query(async () => {
  'use server';
  return process.env.AWS_REGION ?? 'us-east-1'; // read on the server, per request, never client-bundled
}, 'region');
```

### Good Example 4 (Web base64 helpers)
```ts
export const encode = (s: string) => btoa(unescape(encodeURIComponent(s))); // works on Node 16+, edge, browser
export const decode = (b: string) => decodeURIComponent(escape(atob(b)));
```

### Good Example 5 (resolve assets via URL, not __dirname)
```ts
const tpl = await fetch(new URL('./templates/email.html', import.meta.url)).then(r => r.text()); // runtime-agnostic
```

## Related skills
- [[solid-start-custom-adapters-deploy]] — choosing/extending the preset.
- [[solid-start-request-response-handling]] — Web Request/Response over Node req/res.
- [[solid-start-ssr-hydration-matching]] — deterministic server/client render.
- [[solid-start-best-practices]] — portability as a standing rule.
