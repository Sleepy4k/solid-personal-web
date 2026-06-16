---
name: solid-start-island-architecture-ssr
description: Control SolidStart rendering modes - SSR by default, clientOnly for browser-only widgets, and minimal client JS - so pages render on the server and only interactive parts hydrate.
related:
  - solid-start-ssr-hydration-matching
  - solid-start-static-site-generation-ssg
  - solid-start-runtime-compatibility
  - solid-start-best-practices
---

# SolidStart Island Architecture & SSR
- Pages render on the server (SSR) by default; Solid's fine-grained reactivity ships far less hydration JS than a VDOM framework.
- Browser-only widgets (maps, editors using `window`) are isolated with `clientOnly()` so they don't run during SSR.
- Server-only data/work stays behind `"use server"`; the client bundle holds only what's interactive.

## Safety contract: non-negotiable
- Abort if a browser-only library is imported into an SSR-rendered component without `clientOnly()` (server crash on `window`/`document`).
- Abort if heavy server-only modules leak into the client bundle (large bundle, possible secret exposure).
- Abort if SSR is disabled app-wide just to dodge a hydration bug instead of fixing the determinism (loses SEO/first paint — see [[solid-start-ssr-hydration-matching]]).
- Abort if a `clientOnly` component is expected to produce server HTML for SEO (it renders nothing on the server).

## Required tools
- `@solidjs/start` >= 1, `clientOnly` from `@solidjs/start`, SolidJS SSR renderer, `isServer`.

## Gotchas
- `const Map = clientOnly(() => import('./Map'))` skips SSR for that component and mounts it on the client only.
- SSR is the default; you rarely disable it globally — isolate the problematic widget instead.
- `clientOnly` content isn't in the server HTML, so don't rely on it for SEO-critical text.
- Keep server-only imports behind `"use server"`/server modules so they tree-shake out of the client.

## Workflow
1. Render pages with SSR (default); keep render deterministic.
2. Wrap browser-only widgets in `clientOnly()`.
3. Provide a fallback/placeholder for the client-only region.
4. Keep server-only code behind `"use server"` to minimize client JS.

## Code Examples (Good vs Bad)

### Bad Example 1 (browser lib SSR-rendered)
```tsx
import Leaflet from 'leaflet';                  // touches window at import -> SSR crash
export default function Page() { return <div>{new Leaflet.Map('m')}</div>; }
```

### Bad Example 2 (SSR disabled to hide a bug)
```tsx
export default defineConfig({ ssr: false }); // blank server HTML, lost SEO/first paint
// the real fix was a non-deterministic render, now masked
```

### Bad Example 3 (clientOnly for SEO-critical content)
```tsx
const Article = clientOnly(() => import('~/components/Article')); // body never in server HTML
export default function Post() { return <Article />; }            // crawlers see an empty page -> bad SEO
```

### Bad Example 4 (heavy server module pulled into a client component)
```tsx
import { renderPdf } from '~/lib/pdf-server'; // 2MB native dep, no "use server"
export default function Page() {
  const onClick = () => renderPdf();          // bundles the whole server lib into the client chunk
  return <button onClick={onClick}>Export</button>;
}
```

### Bad Example 5 (window during render instead of onMount)
```tsx
export default function Widget() {
  const w = window.innerWidth;                // evaluated during SSR render -> ReferenceError
  return <div data-w={w} />;
}
```

### Good Example 1 (clientOnly widget with fallback)
```tsx
import { clientOnly } from '@solidjs/start';
const Map = clientOnly(() => import('~/components/Map'));  // browser-only, no SSR
export default function Page() {
  return <><h1>Locations</h1><Map fallback={<div class="map-skeleton" />} /></>;
}
```

### Good Example 2 (SSR page + server data, minimal client JS)
```tsx
const getPosts = query(async () => { 'use server'; return db.post.findMany(); }, 'posts');
export const route = { preload: () => getPosts() };
export default function Blog() {
  const posts = createAsync(() => getPosts());   // rendered on the server, hydrated minimally
  return <Suspense><For each={posts()}>{(p) => <Article post={p} />}</For></Suspense>;
}
```

### Good Example 3 (SEO content server-rendered, widget isolated)
```tsx
const Comments = clientOnly(() => import('~/components/Comments'));
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug)); // SSR'd, in the HTML for crawlers
  return <><article>{post()?.body}</article><Comments fallback={<div />} /></>;
}
```

### Good Example 4 (server work behind "use server")
```tsx
const exportPdf = action(async (id: string) => {
  'use server';
  const { renderPdf } = await import('~/lib/pdf-server'); // stays server-side, tree-shaken from client
  return renderPdf(id);
});
```

### Good Example 5 (browser API read in onMount)
```tsx
export default function Widget() {
  const [w, setW] = createSignal(0);
  onMount(() => setW(window.innerWidth)); // runs client-only, after hydration
  return <div data-w={w()} />;
}
```

## Related skills
- [[solid-start-ssr-hydration-matching]] — keeping SSR/CSR output identical.
- [[solid-start-static-site-generation-ssg]] — prerendering fully static routes.
- [[solid-start-runtime-compatibility]] — server vs browser API boundaries.
- [[solid-start-best-practices]] — minimal client JS as a goal.
