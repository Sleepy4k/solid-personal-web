---
name: solid-start-meta-tags
description: Manage SolidStart document head with @solidjs/meta - Title/Meta in SSR output for SEO and Open Graph, per-route overrides, and escaped dynamic values - instead of client-only head mutation.
related:
  - solid-start-island-architecture-ssr
  - solid-start-ssr-hydration-matching
  - solid-start-security-hardening
  - solid-start-project-structure
---

# SolidStart Meta Tags
- Document head is managed with `@solidjs/meta` (`Title`, `Meta`, `Link`) so tags are present in the **server-rendered** HTML for crawlers/social.
- Each route sets its own title/description/OG tags; child routes override parent defaults.
- Dynamic values (titles from data) are escaped and validated — never raw HTML into the head.

## Safety contract: non-negotiable
- Abort if meta tags are set by mutating `document.title`/`document.head` on the client only (crawlers/social see the default, not the page's).
- Abort if `<MetaProvider>` is missing at the root (the meta components have nowhere to render).
- Abort if untrusted data is injected into meta content without escaping (head injection / broken tags).
- Abort if every route shares one static title/description (poor SEO; wrong social previews).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/meta` (`MetaProvider`, `Title`, `Meta`, `Link`).

## Gotchas
- Wrap the app once in `<MetaProvider>` (the SolidStart root usually does this); without it, `Title`/`Meta` no-op.
- `@solidjs/meta` injects into the SSR head so the tags exist before JS runs — essential for SEO/OG.
- Later (deeper) `Title`/`Meta` override earlier ones, so set sensible app defaults at the root and specifics per route.
- Keep dynamic meta values as plain text; the components escape attribute values, but don't build raw tag strings yourself.

## Workflow
1. Ensure `<MetaProvider>` wraps the app (root layout).
2. Set default `Title`/`Meta` at the root.
3. Override per route with page-specific title/description/OG tags from data.
4. Keep dynamic values escaped/plain text.

## Code Examples (Good vs Bad)

### Bad Example 1 (client-only head mutation)
```tsx
export default function Post(props) {
  onMount(() => { document.title = props.post.title; }); // crawlers/SSR see the default title
  return <article>{props.post.body}</article>;
}
```

### Bad Example 2 (no MetaProvider / shared static meta)
```tsx
// App has no <MetaProvider> -> these render nothing:
<Title>My Site</Title>                 {/* same title on every page; no per-route SEO */}
```

### Bad Example 3 (raw HTML string built for the head)
```tsx
const tag = `<meta property="og:title" content="${post.title}">`; // unescaped data -> head injection / broken markup
return <head innerHTML={tag} />;
```

### Bad Example 4 (meta set inside createEffect, missed by SSR)
```tsx
createEffect(() => { document.querySelector('meta[name=description]')!.setAttribute('content', desc()); });
// runs only in the browser -> the SSR HTML still has the default description
```

### Bad Example 5 (title depends on data but no fallback)
```tsx
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug));
  return <Title>{post()!.title}</Title>; // post() is undefined during SSR/suspense -> throws, no title rendered
}
```

### Good Example 1 (root defaults under MetaProvider)
```tsx
import { MetaProvider, Title, Meta } from '@solidjs/meta';
export default function Root(props) {
  return (
    <MetaProvider>
      <Title>Acme</Title>
      <Meta name="description" content="Acme default description" />
      {props.children}
    </MetaProvider>
  );
}
```

### Good Example 2 (per-route dynamic, escaped OG tags)
```tsx
import { Title, Meta } from '@solidjs/meta';
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug));
  return (
    <Show when={post()}>
      <Title>{post()!.title} — Acme</Title>          {/* in SSR head, escaped */}
      <Meta property="og:title" content={post()!.title} />
      <Meta property="og:description" content={post()!.excerpt} />
      <article>{post()!.body}</article>
    </Show>
  );
}
```

### Good Example 3 (let the component escape attribute values)
```tsx
import { Meta } from '@solidjs/meta';
<Meta property="og:title" content={post().title} /> {/* component escapes the value; never build the tag yourself */}
```

### Good Example 4 (canonical + robots per route)
```tsx
import { Link, Meta } from '@solidjs/meta';
export default function Post(props) {
  return <>
    <Link rel="canonical" href={`https://acme.com/blog/${props.params.slug}`} />
    <Meta name="robots" content="index,follow" />
  </>;
}
```

### Good Example 5 (safe fallback while data loads)
```tsx
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug));
  return <>
    <Title>{post()?.title ?? 'Loading… — Acme'}</Title> {/* defined during suspense, overridden when ready */}
    <Suspense><article>{post()?.body}</article></Suspense>
  </>;
}
```

## Related skills
- [[solid-start-island-architecture-ssr]] — meta tags rendered server-side.
- [[solid-start-ssr-hydration-matching]] — head tags consistent across SSR/CSR.
- [[solid-start-security-hardening]] — escaping dynamic head content.
- [[solid-start-project-structure]] — root layout where MetaProvider lives.
