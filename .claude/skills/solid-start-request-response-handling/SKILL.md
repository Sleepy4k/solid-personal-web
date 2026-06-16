---
name: solid-start-request-response-handling
description: Work with the request/response in SolidStart - getRequestEvent for headers/cookies, redirect/json helpers, status codes, and streaming - instead of assuming Node req/res or a browser context.
related:
  - solid-start-api-routes
  - solid-start-middleware
  - solid-start-session-cookies
  - solid-start-runtime-compatibility
---

# SolidStart Request/Response Handling
- Server code accesses the current request via `getRequestEvent()` (Web `Request`, headers, cookies), not Node's `req`/`res`.
- Responses are built with Web `Response`/`Response.json`, `redirect()`, and explicit status codes.
- Code is runtime-agnostic (Node/edge/workers) — it uses Web standards, not Node-only APIs.

## Safety contract: non-negotiable
- Abort if Node-specific `req`/`res` objects are assumed (breaks on edge/worker runtimes — see [[solid-start-runtime-compatibility]]).
- Abort if request headers/cookies are read in client code (they only exist on the server via `getRequestEvent`).
- Abort if a redirect is done by mutating `location` on the server instead of throwing/returning `redirect()`.
- Abort if untrusted header values (Host, X-Forwarded-*) are trusted for security decisions without validation.

## Required tools
- `@solidjs/start` >= 1, `getRequestEvent` from `solid-js/web`, `@solidjs/router` `redirect`/`json`, Web `Request`/`Response`.

## Gotchas
- `getRequestEvent()` returns the event only on the server; it's `undefined` in the browser — guard with `isServer` if shared.
- The event exposes `request` (a Web `Request`) and `nativeEvent` (Vinxi/h3) for cookies/headers helpers.
- Throwing a `redirect('/x')` from a query/action/middleware short-circuits to a 3xx response.
- Web `Response` works across runtimes; don't reach for `res.writeHead`/Node streams unless the preset guarantees Node.

## Workflow
1. In server code, call `getRequestEvent()` to read headers/cookies.
2. Build responses with `Response`/`Response.json` and correct status.
3. Redirect with `redirect()`; don't touch `location` server-side.
4. Validate any forwarded/host headers before using them for trust decisions.

## Code Examples (Good vs Bad)

### Bad Example 1 (assumes Node req/res)
```ts
export async function GET({ nativeEvent }) {
  const ip = nativeEvent.req.socket.remoteAddress; // Node-only; undefined on edge/workers
  res.writeHead(200);                               // `res` doesn't exist here
}
```

### Bad Example 2 (reads headers in client code)
```tsx
export default function Page() {
  const auth = getRequestEvent().request.headers.get('authorization'); // undefined in browser -> crash
  return <span>{auth}</span>;
}
```

### Bad Example 3 (trusting X-Forwarded-For for rate limiting)
```ts
const ip = getRequestEvent()!.request.headers.get('x-forwarded-for'); // client-spoofable
if (await overLimit(ip)) return new Response('slow down', { status: 429 }); // attacker rotates the header
```

### Bad Example 4 (Node stream APIs under an edge preset)
```ts
export async function GET({ nativeEvent }) {
  nativeEvent.res.writeHead(200, { 'content-type': 'text/plain' }); // Node-only, crashes on workers
  nativeEvent.res.end('hi');
}
```

### Bad Example 5 (mutating location server-side for a redirect)
```ts
export async function GET() {
  location.href = '/login'; // `location` doesn't exist on the server -> ReferenceError
}
```

### Good Example 1 (getRequestEvent for headers + Response)
```ts
import { getRequestEvent } from 'solid-js/web';
export async function GET() {
  const event = getRequestEvent();
  const lang = event?.request.headers.get('accept-language') ?? 'en';
  return Response.json({ lang }, { status: 200, headers: { 'cache-control': 'no-store' } });
}
```

### Good Example 2 (redirect + validated host)
```ts
import { redirect } from '@solidjs/router';
function requireSameOrigin() {
  'use server';
  const event = getRequestEvent()!;
  const origin = event.request.headers.get('origin');
  if (origin && new URL(origin).host !== process.env.APP_HOST) throw redirect('/'); // validate, then trust
}
```

### Good Example 3 (only trust the forwarded header from a known proxy)
```ts
const event = getRequestEvent()!;
const fromTrustedProxy = event.request.headers.get('x-internal-proxy') === process.env.PROXY_SECRET;
const ip = fromTrustedProxy ? event.request.headers.get('x-forwarded-for') : event.clientAddress;
```

### Good Example 4 (stream with a Web ReadableStream, runtime-agnostic)
```ts
export async function GET() {
  const stream = new ReadableStream({
    start(c) { c.enqueue(new TextEncoder().encode('chunk')); c.close(); },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain' } });
}
```

### Good Example 5 (set a cookie via the response headers)
```ts
export async function POST() {
  const headers = new Headers();
  headers.append('set-cookie', `theme=dark; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 204, headers });
}
```

## Related skills
- [[solid-start-api-routes]] — endpoints returning Response.
- [[solid-start-middleware]] — per-request request/response interception.
- [[solid-start-session-cookies]] — reading/writing cookies on the event.
- [[solid-start-runtime-compatibility]] — Web standards over Node-only APIs.
