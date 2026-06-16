---
name: solid-start-middleware
description: Run per-request logic in SolidStart with createMiddleware - onRequest/onBeforeResponse hooks for auth, headers, and locals - split across multiple files in a src/middleware/ folder and registered via the entry file.
related:
  - solid-start-project-structure
  - solid-start-authentication-guard-routes
  - solid-start-security-hardening
  - solid-start-request-response-handling
---

# SolidStart Middleware
- Cross-cutting per-request logic (auth context, security headers, logging) lives in `src/middleware/` via `createMiddleware`.
- Split middleware into separate files (`auth.ts`, `security.ts`, etc.) and combine in `src/middleware/index.ts`.
- `onRequest` runs before the route; `onBeforeResponse` runs after — used to set `locals`, short-circuit, or add headers.
- Middleware is registered in `vite.config.ts` via `solidStart({ middleware: './src/middleware/index.ts' })`.

## Project-specific: this portfolio uses
- `src/middleware/auth.ts` → `adminAuthMW` — checks session cookie, blocks non-admin on `/dashboard/**`
- `src/middleware/security.ts` → `securityHeadersMW` — sets X-Frame-Options, CSP, HSTS, etc.
- `src/middleware/index.ts` → combines both via `createMiddleware({ onRequest: [adminAuthMW], onBeforeResponse: [securityHeadersMW] })`
- Registered in `vite.config.ts`: `solidStart({ middleware: './src/middleware/index.ts' })`

## Safety contract: non-negotiable
- Abort if `middleware/index.ts` isn't referenced in `vite.config.ts` (`middleware:` key) — it silently does nothing.
- Abort if middleware authorizes but a route also needs object-level checks and skips them (middleware is coarse; pair with per-action authz).
- Abort if middleware mutates shared module state per request (leaks across requests on a persistent server).
- Abort if an `onRequest` throws unhandled for an expected case (auth) instead of returning a `redirect`/`Response`.

## Required tools
- `@solidjs/start` >= 1, `createMiddleware` from `@solidjs/start/middleware`, `vite.config.ts` with `solidStart` plugin.

## Gotchas
- Register the entry file: `solidStart({ middleware: './src/middleware/index.ts' })` — the single most common "why doesn't it run" mistake.
- Set per-request data on `event.locals`; downstream queries/actions read it via `getRequestEvent().locals`.
- Returning a `Response`/`redirect` from `onRequest` short-circuits the route — use it for auth gates.
- Middleware runs on every request including assets/API; scope expensive work with a path check.

## Workflow
1. Create `src/middleware/auth.ts` with auth guard logic.
2. Create `src/middleware/security.ts` with header-setting logic.
3. Combine in `src/middleware/index.ts` with `createMiddleware({ onRequest: [...], onBeforeResponse: [...] })`.
4. Register in `vite.config.ts`: `solidStart({ middleware: './src/middleware/index.ts' })`.

## Code Examples

### Good Example 1 (folder-based middleware, registered correctly)
```ts
// src/middleware/auth.ts
import type { FetchEvent } from '@solidjs/start/server';
import { getSessionFromCookie } from '~/lib/server/session';

export async function adminAuthMW(event: FetchEvent) {
  const { pathname } = new URL(event.request.url);
  if (!pathname.startsWith('/dashboard')) return;
  const session = await getSessionFromCookie(event.request.headers.get('cookie'));
  if (!session) return new Response(null, { status: 302, headers: { Location: '/login' } });
  event.locals.userId = session.userId;
}

// src/middleware/security.ts
import type { FetchEvent } from '@solidjs/start/server';
export function securityHeadersMW(event: FetchEvent) {
  event.response.headers.set('X-Content-Type-Options', 'nosniff');
  event.response.headers.set('X-Frame-Options', 'DENY');
}

// src/middleware/index.ts
import { createMiddleware } from '@solidjs/start/middleware';
import { adminAuthMW } from './auth';
import { securityHeadersMW } from './security';
export default createMiddleware({
  onRequest: [adminAuthMW],
  onBeforeResponse: [securityHeadersMW],
});

// vite.config.ts
solidStart({ middleware: './src/middleware/index.ts' })
```

### Bad Example 1 (single flat file, hard to maintain)
```ts
// src/middleware.ts — grows unbounded, mixing concerns
export default createMiddleware({ onRequest: [authFn, loggingFn, rateLimitFn, featureFlagsFn] });
```

### Bad Example 2 (middleware never registered)
```ts
// src/middleware/index.ts exists...
// vite.config.ts:
solidStart({}) // no middleware: key -> never runs
```

## Related skills
- [[solid-start-project-structure]] — overall folder layout including middleware folder.
- [[solid-start-authentication-guard-routes]] — auth gating via middleware + route checks.
- [[solid-start-security-hardening]] — security headers and per-request isolation.
