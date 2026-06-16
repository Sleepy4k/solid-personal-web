---
name: solid-start-telemetry-performance-monitoring
description: Observe SolidStart in production - Web Vitals from the client, server timing/error reporting, and OpenTelemetry-style spans - with sampling and PII scrubbing, instead of flying blind or logging secrets.
related:
  - solid-start-global-error-boundary
  - solid-start-headers-caching-config
  - solid-start-security-hardening
  - solid-start-best-practices
---

# SolidStart Telemetry & Performance Monitoring
- Real-user performance (Web Vitals: LCP/CLS/INP) is collected on the client and sent to an analytics/RUM endpoint.
- Server requests, errors, and slow spans are reported (logger/APM/OpenTelemetry) with request correlation.
- Telemetry is sampled to control cost and scrubbed of PII/secrets before leaving the server.

## Safety contract: non-negotiable
- Abort if PII (emails, tokens, full URLs with query secrets) is sent to a third-party telemetry service unscrubbed.
- Abort if every request/event is sent at 100% with no sampling (cost blowup, performance overhead).
- Abort if errors are reported to the client/console with stack traces but never to a server-side sink (lost in production — see [[solid-start-global-error-boundary]]).
- Abort if the telemetry endpoint/key is exposed such that anyone can spam it (no rate limit/validation).

## Required tools
- `@solidjs/start` >= 1, `web-vitals` (client), a logger/APM (OpenTelemetry, Sentry, etc.) server-side, a metrics/RUM endpoint.

## Gotchas
- Collect Web Vitals with the `web-vitals` library in `onMount` and beacon them (`navigator.sendBeacon`) so they're not lost on unload.
- Scrub query strings/headers (auth, tokens) before logging a request — full URLs often carry secrets.
- Sample (e.g. 10% of traces) to keep cost and overhead sane; always capture errors.
- Correlate client and server with a request id propagated via a header/middleware.

## Workflow
1. Collect Web Vitals on the client; beacon them to your endpoint.
2. Report server errors/slow spans to an APM with a correlation id.
3. Scrub PII/secrets; sample non-error traces.
4. Dashboard the signals; alert on regressions/error spikes.

## Code Examples (Good vs Bad)

### Bad Example 1 (PII + full URL to third party, no sampling)
```ts
onMount(() => {
  analytics.send({ user: currentUser().email, url: location.href }); // PII + query secrets
}); // every event, 100% -> cost + privacy issue
```

### Bad Example 2 (errors only to console in prod)
```tsx
<ErrorBoundary fallback={(e) => { console.error(e); return <p>Oops</p>; }}>
  {/* nothing reaches a server sink -> invisible in production */}
</ErrorBoundary>
```

### Bad Example 3 (vitals lost on unload via fetch)
```ts
onMount(() => onLCP((m) => fetch('/api/vitals', { method: 'POST', body: JSON.stringify(m) })));
// a normal fetch is cancelled when the page unloads -> the most important final metrics never arrive
```

### Bad Example 4 (secret-bearing telemetry endpoint exposed)
```ts
const SINK = `https://rum.vendor.com/ingest?key=${import.meta.env.VITE_RUM_WRITE_KEY}`; // write key public
navigator.sendBeacon(SINK, payload); // anyone can read the key and spam your RUM quota
```

### Bad Example 5 (logging the whole error object with request body)
```ts
logger.error({ error: err, body: await request.json() }); // dumps tokens/PII from the body into logs
```

### Good Example 1 (Web Vitals beacon, scrubbed)
```tsx
import { onLCP, onCLS, onINP } from 'web-vitals';
onMount(() => {
  const send = (m) => navigator.sendBeacon('/api/vitals',
    JSON.stringify({ name: m.name, value: m.value, path: location.pathname })); // path only, no query
  onLCP(send); onCLS(send); onINP(send);
});
```

### Good Example 2 (server error reporting + sampling)
```ts
export const reportError = async (err: unknown) => {
  'use server';
  const event = getRequestEvent();
  logger.error({
    msg: 'unhandled',
    requestId: event?.locals.requestId,
    path: new URL(event!.request.url).pathname,   // scrubbed of query/secrets
    error: err instanceof Error ? err.message : String(err), // message, not raw object
  });
};
// trace sampling: if (Math.random() < 0.1) startSpan(...)  // 10% of non-error traces
```

### Good Example 3 (sendBeacon survives unload)
```ts
onMount(() => {
  const send = (m: { name: string; value: number }) =>
    navigator.sendBeacon('/api/vitals', JSON.stringify({ name: m.name, value: m.value, path: location.pathname }));
  onLCP(send); onCLS(send); onINP(send); // beacon is queued by the browser even during unload
});
```

### Good Example 4 (ingest proxied through a server route)
```ts
// client beacons to your own first-party route; the write key stays server-side
export async function POST({ request }) {
  const body = await request.json();
  await fetch('https://rum.vendor.com/ingest', {
    method: 'POST', headers: { authorization: `Bearer ${process.env.RUM_WRITE_KEY}` }, body: JSON.stringify(body),
  });
  return new Response(null, { status: 202 });
}
```

### Good Example 5 (log a scrubbed, structured subset)
```ts
logger.error({
  msg: 'request failed',
  requestId: event.locals.requestId,
  path: new URL(event.request.url).pathname, // no query string
  error: err instanceof Error ? err.message : 'unknown', // message only, never the body
});
```

## Related skills
- [[solid-start-global-error-boundary]] — feeding caught errors into reporting.
- [[solid-start-headers-caching-config]] — performance overlaps with caching.
- [[solid-start-security-hardening]] — scrubbing PII/secrets from telemetry.
- [[solid-start-best-practices]] — observability as a production default.
