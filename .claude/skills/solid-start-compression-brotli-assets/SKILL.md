---
name: solid-start-compression-brotli-assets
description: Serve compressed SolidStart assets - Brotli/gzip via Nitro compressPublicAssets or the CDN/edge, precompressed static files, and fingerprinted immutable caching - instead of shipping uncompressed bundles.
related:
  - solid-start-headers-caching-config
  - solid-start-custom-adapters-deploy
  - solid-start-telemetry-performance-monitoring
  - solid-start-best-practices
---

# SolidStart Compression & Brotli Assets
- Text assets (JS/CSS/HTML/JSON) are served Brotli/gzip-compressed, either by the platform/CDN or via Nitro's `compressPublicAssets`.
- Static assets are precompressed at build so the server doesn't compress on every request.
- Fingerprinted assets ship with `immutable` long-cache headers; compression and caching work together.

## Safety contract: non-negotiable
- Abort if large text bundles are served uncompressed when the client advertises `Accept-Encoding` (wasted bandwidth, slow loads).
- Abort if compression is done per-request on the hot path instead of precompressing static files (CPU burn under load).
- Abort if already-compressed binaries (images, video, woff2) are re-compressed (wasted CPU, no gain — can enlarge).
- Abort if `Content-Encoding`/`Vary: Accept-Encoding` is wrong, so caches serve a Brotli body to a client that can't decode it.

## Required tools
- `@solidjs/start` >= 1, Nitro `compressPublicAssets` option, or a CDN/edge that compresses; build-time precompression.

## Gotchas
- `compressPublicAssets: { brotli: true }` in the Nitro config precompresses public assets at build (`.br`/`.gz`).
- Many hosts (Vercel/Cloudflare/Netlify) compress at the edge automatically — don't double-compress; pick one layer.
- Don't compress images/fonts that are already compressed; target text content types only.
- Ensure `Vary: Accept-Encoding` so a shared cache keys the compressed and identity variants correctly.

## Workflow
1. Enable Brotli/gzip precompression for public assets (or rely on the CDN/edge).
2. Limit compression to text content types; skip already-compressed binaries.
3. Set fingerprinted assets to `immutable` long-cache (see [[solid-start-headers-caching-config]]).
4. Verify `Content-Encoding`/`Vary` on responses.

## Code Examples (Good vs Bad)

### Bad Example 1 (no compression)
```ts
// app.config.ts
export default defineConfig({}); // public JS/CSS served uncompressed -> large transfers
```

### Bad Example 2 (per-request compress everything, including images)
```ts
// custom server middleware brotli-compressing every response, every time:
res.setHeader('content-encoding', 'br');
res.end(brotli(imageBuffer)); // re-compresses an already-compressed PNG; CPU burn, no win; wrong on hot path
```

### Bad Example 3 (double compression at edge + server)
```ts
export default defineConfig({ server: { preset: 'cloudflare-pages', compressPublicAssets: { brotli: true } } });
// the CF edge already compresses -> two layers, wasted build CPU and possible double-encoding bugs
```

### Bad Example 4 (missing Vary header poisons a shared cache)
```ts
return new Response(js, { headers: { 'content-type': 'text/javascript', 'content-encoding': 'br' } });
// no `Vary: Accept-Encoding` -> CDN serves the brotli body to a client that sent `Accept-Encoding: identity`
```

### Bad Example 5 (compressing tiny responses)
```ts
res.setHeader('content-encoding', 'br');
res.end(brotli(Buffer.from('{"ok":true}'))); // 11-byte body -> compression overhead exceeds any saving
```

### Good Example 1 (build-time precompression)
```ts
// app.config.ts
import { defineConfig } from '@solidjs/start/config';
export default defineConfig({
  server: { compressPublicAssets: { brotli: true, gzip: true } }, // precompressed at build
});
```

### Good Example 2 (lean on the CDN + correct headers)
```ts
// On Vercel/Cloudflare the edge compresses automatically; just set caching + Vary:
return new Response(css, {
  headers: {
    'content-type': 'text/css',
    'cache-control': 'public, max-age=31536000, immutable', // fingerprinted asset
    'vary': 'Accept-Encoding',
  },
});
```

### Good Example 3 (one compression layer per platform)
```ts
// Node self-host: compress at build because there's no edge in front
export default defineConfig({ server: { preset: 'node-server', compressPublicAssets: { brotli: true, gzip: true } } });
// On Vercel/CF/Netlify instead: leave compressPublicAssets off and let the edge do it
```

### Good Example 4 (correct Vary + content-type targeting)
```ts
const isText = /^(text\/|application\/(json|javascript|xml))/.test(contentType);
const headers: Record<string, string> = { 'content-type': contentType, 'vary': 'Accept-Encoding' };
if (isText) headers['content-encoding'] = 'br';            // only text types get compressed
return new Response(isText ? brotli(body) : body, { headers });
```

### Good Example 5 (skip compression below a size threshold)
```ts
const MIN = 1024; // bytes
const compress = body.length >= MIN && isText;
return new Response(compress ? brotli(body) : body, {
  headers: compress ? { 'content-encoding': 'br', 'vary': 'Accept-Encoding' } : { 'vary': 'Accept-Encoding' },
});
```

## Related skills
- [[solid-start-headers-caching-config]] — caching the compressed assets.
- [[solid-start-custom-adapters-deploy]] — which layer compresses per platform.
- [[solid-start-telemetry-performance-monitoring]] — measuring transfer size/load time.
- [[solid-start-best-practices]] — compression as a perf default.
