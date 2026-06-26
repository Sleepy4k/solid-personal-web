---
name: solid-start-middleware
description: Run per-request logic in SolidStart with createMiddleware - onRequest/onBeforeResponse hooks for URL normalization, auth, and security headers - split across multiple files in a src/middleware/ folder and registered via the entry file.
related:
  - solid-start-project-structure
  - solid-start-authentication-guard-routes
  - solid-start-security-hardening
  - solid-start-request-response-handling
---

# SolidStart Middleware
- Cross-cutting per-request logic (URL normalization, auth context, security headers) lives in `src/middleware/` via `createMiddleware`.
- Split middleware into separate files (`auth.ts`, `security.ts`, etc.) and combine in `src/middleware/index.ts`.
- `onRequest` runs before the route; `onBeforeResponse` runs after — use `onRequest` to set `locals` or short-circuit; use `onBeforeResponse` to add headers.
- Middleware is registered in `vite.config.ts` via `solidStart({ middleware: './src/middleware/index.ts' })`.

## Runtime quirk: URL normalization (Bun/Nitro)
On Bun + Nitro, `event.request.url` may be a relative path (starting with `/`) and `event.request.headers` may lack a `.get()` method. Always include a URL-normalization step first in the `onRequest` chain:

```ts
// src/middleware/index.ts
export async function fixUrlMW(event: FetchEvent) {
  const req = event.request;
  if (req) {
    const headers = req.headers as any;
    if (headers && typeof headers.get !== 'function') {
      Object.defineProperty(headers, 'get', {
        value(name: string) { return this[name.toLowerCase()] || this[name] || null; },
        configurable: true, writable: true,
      });
    }
    if (typeof req.url === 'string' && req.url.startsWith('/')) {
      const encrypted = (req as any).socket?.encrypted || (req as any).connection?.encrypted;
      const proto = encrypted || headers.get('x-forwarded-proto') === 'https' ? 'https:' : 'http:';
      const host = headers.get('host') || 'localhost';
      req.url = `${proto}//${host}${req.url}`;
    }
  }
}
```

Place `fixUrlMW` first in the `onRequest` array so all subsequent middleware can use `new URL(event.request.url)` safely.

## Project-specific middleware (portfolio)
- `src/middleware/index.ts` → `fixUrlMW` + `adminAuthMW` in `onRequest`; `securityHeadersMW` in `onBeforeResponse`.
- `src/middleware/auth.ts` → `adminAuthMW` — checks session cookie, blocks non-admin on `/dashboard/**`, sets `event.locals.userId` and `event.locals.user`.
- `src/middleware/security.ts` → `securityHeadersMW` — sets CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Registered in `vite.config.ts`: `solidStart({ middleware: './src/middleware/index.ts' })`.

## Safety contract: non-negotiable
- Abort if `middleware/index.ts` isn't referenced in `vite.config.ts` (`middleware:` key) — it silently does nothing.
- Abort if the URL normalization guard (`fixUrlMW` or equivalent) is missing when running on Bun/Nitro — downstream middleware using `new URL(event.request.url)` will throw on relative URLs.
- Abort if middleware authorizes but a route/action skips object-level checks (middleware is coarse-grained; actions need their own per-resource authz).
- Abort if middleware mutates shared module state per request (leaks across concurrent requests on a persistent server).
- Abort if an `onRequest` throws unhandled for an expected case like auth failure — always return a `Response` / redirect.

## Required tools
- `@solidjs/start` >= 1, `createMiddleware` from `@solidjs/start/middleware`, `FetchEvent` from `@solidjs/start/server`, `vite.config.ts` with `solidStart` plugin.

## Gotchas
- Register the entry file: `solidStart({ middleware: './src/middleware/index.ts' })` — the most common "why doesn't it run" mistake.
- Set per-request data on `event.locals`; downstream queries/actions read it via `getRequestEvent()!.locals`. Augment `RequestEventLocals` in `global.d.ts` for type safety.
- Returning a `Response`/redirect from `onRequest` short-circuits the route — use for auth gates.
- Middleware runs on every request including assets/API; scope expensive work with a path prefix check.
- `event.request.headers` on Bun may be a plain object without `.get()` — always use the `fixUrlMW` guard.

## Workflow
1. Create `src/middleware/index.ts` with `fixUrlMW` for URL normalization (required on Bun/Nitro).
2. Create `src/middleware/auth.ts` for session-based auth gating.
3. Create `src/middleware/security.ts` for response headers.
4. Combine in `src/middleware/index.ts` with `createMiddleware({ onRequest: [fixUrlMW, authMW], onBeforeResponse: [securityMW] })`.
5. Register in `vite.config.ts`: `solidStart({ middleware: './src/middleware/index.ts' })`.
6. Augment `RequestEventLocals` in `src/global.d.ts` for any values set in `event.locals`.

## Code Examples

### Good Example 1 (full middleware setup with URL normalization)
```ts
// src/middleware/index.ts
import { createMiddleware } from '@solidjs/start/middleware';
import type { FetchEvent } from '@solidjs/start/server';
import { adminAuthMW } from './auth';
import { securityHeadersMW } from './security';

export async function fixUrlMW(event: FetchEvent) {
  const req = event.request;
  if (req) {
    const headers = req.headers as any;
    if (headers && typeof headers.get !== 'function') {
      Object.defineProperty(headers, 'get', {
        value(name: string) { return this[name.toLowerCase()] || this[name] || null; },
        configurable: true, writable: true,
      });
    }
    if (typeof req.url === 'string' && req.url.startsWith('/')) {
      const encrypted = (req as any).socket?.encrypted || (req as any).connection?.encrypted;
      const proto = encrypted || headers.get('x-forwarded-proto') === 'https' ? 'https:' : 'http:';
      const host = headers.get('host') || 'localhost';
      req.url = `${proto}//${host}${req.url}`;
    }
  }
}

export default createMiddleware({
  onRequest: [fixUrlMW, adminAuthMW],
  onBeforeResponse: [securityHeadersMW],
});
```

### Good Example 2 (auth middleware reading normalized URL)
```ts
// src/middleware/auth.ts
import type { FetchEvent } from '@solidjs/start/server';
import { getSessionFromCookie } from '~/lib/server/session';

export async function adminAuthMW(event: FetchEvent) {
  const { pathname } = new URL(event.request.url);  // safe because fixUrlMW ran first
  if (!pathname.startsWith('/dashboard')) return;

  const headers = event.request.headers as any;
  const cookie = typeof headers.get === 'function' ? headers.get('cookie') : headers['cookie'];
  const session = await getSessionFromCookie(cookie);
  if (!session) return new Response(null, { status: 302, headers: { Location: '/login' } });

  event.locals.userId = session.userId;
  event.locals.user = { id: session.userId, email: session.user.email };
}
```

### Good Example 3 (security headers middleware)
```ts
// src/middleware/security.ts
import { randomBytes } from 'node:crypto';
import type { FetchEvent } from '@solidjs/start/server';

export function securityHeadersMW(event: FetchEvent) {
  const nonce = randomBytes(16).toString('base64');
  event.locals.cspNonce = nonce;
  const h = event.response.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.github.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join('; '));
}
```

### Good Example 4 (typed locals via global.d.ts augmentation)
```ts
// src/global.d.ts
/// <reference types="@solidjs/start/env" />
declare module '@solidjs/start/server' {
  interface RequestEventLocals {
    userId?: string;
    user?: { id: string; email: string };
    cspNonce?: string;
  }
}
```

### Bad Example 1 (middleware never registered)
```ts
// vite.config.ts:
solidStart({}) // no middleware: key -> fixUrlMW, adminAuthMW never run
```

### Bad Example 2 (missing URL normalization — breaks on Bun/Nitro)
```ts
export async function adminAuthMW(event: FetchEvent) {
  const { pathname } = new URL(event.request.url); // throws if url is '/dashboard' (relative)
  ...
}
```

### Bad Example 3 (single flat file, mixes concerns)
```ts
// src/middleware.ts — grows unbounded
export default createMiddleware({ onRequest: [urlFix, authFn, loggingFn, rateLimitFn] });
// Split into separate files under src/middleware/ instead
```

## Related skills
- [[solid-start-project-structure]] — overall folder layout including middleware folder.
- [[solid-start-authentication-guard-routes]] — auth gating via middleware + per-action re-check.
- [[solid-start-security-hardening]] — security headers and per-request isolation.
- [[solid-start-request-response-handling]] — working with FetchEvent, request/response objects.
