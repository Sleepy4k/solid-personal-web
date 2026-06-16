---
name: solid-start-headers-caching-config
description: Control SolidStart HTTP caching - Cache-Control on responses, route preload, never caching authenticated/personalized pages, and CDN-friendly headers - instead of caching private data or nothing at all.
related:
  - solid-start-solidstart-v2-features
  - solid-start-compression-brotli-assets
  - solid-start-security-hardening
  - solid-start-request-response-handling
---

# SolidStart Headers & Caching Config
- Cacheable responses set explicit `Cache-Control` (`max-age`/`s-maxage`/`stale-while-revalidate`) suited to the data's volatility.
- Authenticated/personalized responses are `private, no-store` so a CDN/proxy never serves one user's page to another.
- Static assets get long-lived immutable caching; HTML/data get short or revalidated caching.

## Safety contract: non-negotiable
- Abort if an authenticated/personalized response is cached publicly (`public, max-age=...`) — cross-user data leak via CDN.
- Abort if responses set no `Cache-Control` and rely on undefined defaults (inconsistent across runtimes/CDNs).
- Abort if user-specific content is cached without a `Vary: Cookie`/`private` directive.
- Abort if mutable data is cached `immutable` (stale forever); only fingerprinted assets are immutable.

## Required tools
- `@solidjs/start` >= 1, Web `Response` headers, `@solidjs/meta` `HttpHeader`, a CDN/edge that honors Cache-Control.

## Gotchas
- `s-maxage` targets shared caches (CDN) while `max-age` targets the browser — tune them separately.
- `stale-while-revalidate` serves stale content while refetching in the background — great for semi-static data.
- Authenticated HTML must be `private, no-store` (or at least `private`); a `public` directive lets a CDN cache it.
- Fingerprinted assets (`app.abc123.js`) are safe to cache `immutable, max-age=31536000`; never the HTML entry.

## Workflow
1. Classify each response: static asset, public data, or private/personalized.
2. Set `Cache-Control` accordingly; use `private, no-store` for authenticated content.
3. Use `stale-while-revalidate`/`s-maxage` for CDN-friendly semi-static data.
4. Add `Vary` where representation depends on a header (cookie, accept-encoding).

## Code Examples (Good vs Bad)

### Bad Example 1 (public-caching a personalized page)
```ts
export async function GET() {
  const dashboard = await getUserDashboard();          // user-specific
  return Response.json(dashboard, { headers: { 'cache-control': 'public, max-age=600' } }); // CDN leaks it
}
```

### Bad Example 2 (no headers / immutable on mutable data)
```ts
return Response.json(await getPrices());                // no Cache-Control -> undefined behavior
// or: 'cache-control': 'public, max-age=31536000, immutable' on data that changes hourly
```

### Bad Example 3 (immutable on the HTML entry)
```ts
return new Response(html, { headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=31536000, immutable' } });
// the HTML references hashed assets; freezing it forever pins users to a stale deploy
```

### Bad Example 4 (personalized data cached without Vary)
```ts
return Response.json(await getRecommendations(userId), {
  headers: { 'cache-control': 'public, s-maxage=300' }, // no `Vary: Cookie` -> CDN serves one user's recs to all
});
```

### Bad Example 5 (caching a Set-Cookie response)
```ts
const res = Response.json(profile, { headers: { 'cache-control': 'public, max-age=600' } });
res.headers.append('set-cookie', sessionCookie); // a shared cache may store + replay the session cookie
return res;
```

### Good Example 1 (private for authenticated, swr for public)
```ts
// authenticated
return Response.json(dashboard, { headers: { 'cache-control': 'private, no-store' } });
// public, semi-static
return Response.json(prices, {
  headers: { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' },
});
```

### Good Example 2 (HttpHeader in a page + immutable assets)
```tsx
import { HttpHeader } from '@solidjs/meta';
export default function Blog() {
  return <><HttpHeader name="Cache-Control" value="public, s-maxage=3600, stale-while-revalidate=86400" />...</>;
}
// fingerprinted asset response: 'cache-control': 'public, max-age=31536000, immutable'
```

### Good Example 3 (short max-age on the HTML entry)
```ts
return new Response(html, {
  headers: { 'content-type': 'text/html', 'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600' },
}); // entry revalidates quickly; only the fingerprinted assets it references are immutable
```

### Good Example 4 (personalized data: private + Vary)
```ts
return Response.json(await getRecommendations(userId), {
  headers: { 'cache-control': 'private, max-age=60', 'vary': 'Cookie' }, // per-user, never shared
});
```

### Good Example 5 (separate cacheable read from cookie-setting response)
```ts
// the login action sets the cookie with no-store; subsequent reads are cached separately
return Response.json(profile, { headers: { 'cache-control': 'private, no-store' } }); // never store auth responses
```

## Related skills
- [[solid-start-solidstart-v2-features]] — query-level caching complements HTTP caching.
- [[solid-start-compression-brotli-assets]] — compression + caching for assets.
- [[solid-start-security-hardening]] — never caching private data.
- [[solid-start-request-response-handling]] — setting response headers.
