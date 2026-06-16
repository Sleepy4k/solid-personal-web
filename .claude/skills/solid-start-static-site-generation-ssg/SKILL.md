---
name: solid-start-static-site-generation-ssg
description: Prerender SolidStart routes to static HTML - configure prerender in app.config.ts, enumerate dynamic paths via crawl/routes, and choose SSG vs SSR per route - instead of SSR-ing content that never changes.
related:
  - solid-start-island-architecture-ssr
  - solid-start-headers-caching-config
  - solid-start-custom-adapters-deploy
  - solid-start-best-practices
---

# SolidStart Static Site Generation (SSG)
- Routes whose content rarely changes are prerendered to static HTML at build time via the Nitro `prerender` config.
- Dynamic paths are enumerated (explicit route list or crawl from links) so each is emitted as a static file.
- Pages needing per-request/personalized data stay SSR; SSG is chosen per route, not all-or-nothing.

## Safety contract: non-negotiable
- Abort if a personalized/authenticated page is prerendered (the build-time HTML is served to every user — stale/leaky).
- Abort if dynamic routes are prerendered without enumerating their paths (only some pages emit; others 404 or fall back unexpectedly).
- Abort if prerendered content is treated as live data (it's frozen at build; needs a rebuild or ISR-style revalidation to update).
- Abort if build-time data fetching reads secrets that then end up embedded in static HTML.

## Required tools
- `@solidjs/start` >= 1, Nitro `prerender` options in `app.config.ts`, a static-capable preset (`static`, or a host with SSG).

## Gotchas
- Configure `server.prerender.routes` (explicit) and/or `crawlLinks: true` to discover pages from internal links.
- Prerendered pages are static — they update only on rebuild (or a host's incremental regeneration), unlike SSR which is per-request.
- Mixed mode is normal: marketing/docs as SSG, dashboard as SSR — decide by data volatility and personalization.
- Don't prerender pages behind auth; their content is user-specific and must render per request.

## Workflow
1. Identify routes with stable, public content.
2. Add them to `server.prerender.routes` (or enable `crawlLinks`).
3. Enumerate dynamic params for prerendered dynamic routes.
4. Keep personalized/auth routes on SSR; rebuild to refresh SSG content.

## Code Examples (Good vs Bad)

### Bad Example 1 (prerender a personalized page)
```ts
export default defineConfig({
  server: { prerender: { routes: ['/dashboard'] } }, // user-specific -> everyone gets the build user's HTML
});
```

### Bad Example 2 (dynamic route, no paths enumerated)
```ts
server: { prerender: { routes: ['/blog/[slug]'] } } // literal '[slug]' isn't a real page -> nothing useful emitted
```

### Bad Example 3 (treating prerendered data as live)
```ts
// /pricing prerendered at build, but prices change daily:
server: { prerender: { routes: ['/pricing'] } } // shows last build's prices until the next deploy -> stale
```

### Bad Example 4 (secret embedded into static HTML)
```ts
prerender: { routes: async () => {
  const data = await fetch('https://api/internal', { headers: { authorization: process.env.ADMIN_KEY! } }).then(r => r.json());
  return data.pages.map(p => p.path); // if private fields render into the page, they're frozen into public HTML
}}
```

### Bad Example 5 (prerender an auth-gated route)
```ts
server: { prerender: { crawlLinks: true } } // crawler follows a link to /account -> bakes one user's page statically
```

### Good Example 1 (static public routes + crawl)
```ts
// app.config.ts
export default defineConfig({
  server: { prerender: { routes: ['/', '/about', '/pricing'], crawlLinks: true } },
});
```

### Good Example 2 (enumerate dynamic slugs at build)
```ts
export default defineConfig({
  server: {
    prerender: {
      crawlLinks: false,
      routes: async () => {
        const slugs = await getPublishedSlugs();      // build-time, public data only
        return ['/blog', ...slugs.map((s) => `/blog/${s}`)];
      },
    },
  },
});
```

### Good Example 3 (SSR for volatile data, SSG for the shell)
```ts
// /pricing stays SSR (or ISR) because prices change; /about + /docs are SSG
export default defineConfig({ server: { prerender: { routes: ['/about', '/docs'] } } });
// /pricing simply isn't listed -> rendered per request with fresh data
```

### Good Example 4 (build-time fetch of public data only)
```ts
prerender: { routes: async () => {
  const posts = await fetch('https://cms/public/posts').then(r => r.json()); // no auth, public content
  return ['/blog', ...posts.map((p: { slug: string }) => `/blog/${p.slug}`)];
}}
```

### Good Example 5 (exclude private paths from crawl)
```ts
server: { prerender: { crawlLinks: true, ignore: ['/account', '/admin', '/api'] } }
// crawler emits public pages but never freezes authenticated ones
```

## Related skills
- [[solid-start-island-architecture-ssr]] — SSR vs static rendering modes.
- [[solid-start-headers-caching-config]] — caching static + dynamic responses.
- [[solid-start-custom-adapters-deploy]] — static-capable deploy presets.
- [[solid-start-best-practices]] — choosing render mode by data volatility.
