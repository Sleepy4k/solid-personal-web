---
name: solid-start-meta-tags
description: Manage SolidStart document head with @solidjs/meta — SSR-rendered Title/Meta/Link for SEO, Open Graph, Twitter cards, canonical URLs, and consistent profile-based titles across all routes using a shared stores/profile.ts helper.
related:
  - solid-start-island-architecture-ssr
  - solid-start-ssr-hydration-matching
  - solid-start-security-hardening
  - solid-start-project-structure
  - solid-start-basic-code
---

# SolidStart Meta Tags
- Document head is managed with `@solidjs/meta` (`Title`, `Meta`, `Link`) so tags are present in the **server-rendered** HTML for crawlers and social scrapers.
- Every public page has: `<Title>`, description, keywords, robots, og:type/title/description/locale/image, twitter:card/title/description/image, and a canonical `<Link>`.
- A shared `buildTitle(pageLabel, profile)` helper in `src/stores/profile.ts` produces consistent `"Page | Name - Title"` format across all routes (falls back to `"Portfolio"` when profile data is absent).
- `getProfileMeta()` is a lightweight `query()` (name, title, bio, avatar only) added to every page's `route.preload` for parallel fetching.

## Safety contract: non-negotiable
- Abort if meta tags are set by mutating `document.title`/`document.head` on the client only — crawlers and social scrapers see the SSR HTML, not client-side mutations.
- Abort if `<MetaProvider>` is missing at the root — all `Title`/`Meta` components no-op without it.
- Abort if untrusted user data is injected into meta content without escaping — head injection / broken HTML.
- Abort if every route shares one static title/description — poor SEO, wrong social previews.
- Abort if `og:image` uses a `VITE_` env-var value that contains a secret API key — og:image must be a public URL, never a credentialed endpoint.

## Required tools
- `@solidjs/meta` (`MetaProvider`, `Title`, `Meta`, `Link`).
- `src/stores/profile.ts`: `getProfileMeta`, `useProfileMeta`, `buildTitle` (project-specific, but recreate the pattern for new projects).
- `@solidjs/router`: `useLocation` for the canonical href; `useSearchParams` optionally if filtering is present.

## Gotchas
- `<MetaProvider>` must wrap the whole app once (SolidStart root usually does this in `app.tsx`).
- Later (deeper) `Title`/`Meta` in the tree override earlier ones — set sensible root defaults, specifics per route.
- `og:image` should be an **absolute URL** for social scrapers. For portfolio projects without a configured `SITE_URL`, the avatar path (e.g. `/uploads/avatar.jpg`) works for indexing but not for social cards unless the domain is known.
- Use `<Show when={ogImage()}>` around og:image/twitter:image to avoid rendering empty `content=""` attributes when no avatar is set.
- `twitter:card` should be `"summary_large_image"` (not `"summary"`) when an image is present for better previews.
- The canonical `href` should match `useLocation().pathname` (no query params) so filtered listing pages don't create duplicate canonical issues.
- `keywords` meta has no direct ranking impact but helps internal tracking and some minor search engines; include the profile name + title in them.

## Workflow
1. Add `getProfileMeta` to the page's `route.preload`: `preload: () => { getPageData(); getProfileMeta(); }`.
2. In the component, call `const profile = useProfileMeta()` and `const location = useLocation()`.
3. Derive reactive title: `const pageTitle = () => buildTitle("Page Label", profile())`.
4. Derive description and keywords as accessor functions that incorporate `profile()?.name`.
5. Render the full meta block (see Good Example 2), adding `<Show when={ogImage()}>` for the image pair.
6. Dashboard (noindex) pages: only update `<Title>`, skip OG/Twitter since they won't be crawled.

## Code Examples (Good vs Bad)

### Bad Example 1 (client-only head mutation — crawlers miss it)
```tsx
export default function Post() {
  const post = createAsync(() => getPost());
  onMount(() => { document.title = post()?.title ?? ""; }); // SSR HTML has no title
  return <article>{post()?.body}</article>;
}
```

### Bad Example 2 (no MetaProvider — all meta components no-op)
```tsx
// app.tsx — WRONG: no MetaProvider
export default function App() {
  return <Router><FileRoutes /></Router>; // Title/Meta components render nothing
}
```

### Bad Example 3 (raw HTML string built for the head — injection risk)
```tsx
const tag = `<meta property="og:title" content="${post.title}">`; // unescaped -> broken markup or injection
return <head innerHTML={tag} />;
```

### Bad Example 4 (meta set inside createEffect — missed by SSR)
```tsx
createEffect(() => {
  document.querySelector('meta[name=description]')!.setAttribute('content', desc());
  // runs only in the browser → SSR HTML still has the default description
});
```

### Bad Example 5 (hardcoded title, no profile name, no OG/Twitter)
```tsx
// WRONG — non-crawlable, generic, no social preview support
<Title>Semua Proyek - Portfolio</Title>
<Meta name="description" content="Daftar proyek." />
// missing: og:*, twitter:*, canonical, keywords
```

### Good Example 1 (root MetaProvider in app.tsx with defaults)
```tsx
import { MetaProvider, Title, Meta } from "@solidjs/meta";
export default function App() {
  return (
    <MetaProvider>
      <Title>Portfolio</Title>
      <Meta name="robots" content="index, follow" />
      <Router><FileRoutes /></Router>
    </MetaProvider>
  );
}
```

### Good Example 2 (full public page SEO with profile-based title + OG + Twitter)
```tsx
import { useLocation, type RouteDefinition } from "@solidjs/router";
import { Title, Meta, Link } from "@solidjs/meta";
import { Show } from "solid-js";
import { getAllProjects } from "~/server/db/portfolio";
import { useProfileMeta, buildTitle, getProfileMeta } from "~/stores/profile";

export const route: RouteDefinition = {
  preload: () => { getAllProjects(); getProfileMeta(); }
};

export default function ProjectsPage() {
  const profile = useProfileMeta();
  const location = useLocation();
  const pageTitle = () => buildTitle("Semua Proyek", profile());
  const description = () =>
    `Daftar lengkap proyek ${profile()?.name ?? ""} — filter berdasarkan teknologi.`.trim();
  const keywords = () =>
    ["proyek", profile()?.name, profile()?.title, "portfolio", "developer"]
      .filter(Boolean).join(", ");
  const ogImage = () => profile()?.avatar?.path;

  return (
    <>
      <Title>{pageTitle()}</Title>
      <Meta name="description" content={description()} />
      <Meta name="keywords" content={keywords()} />
      <Meta name="robots" content="index, follow" />
      <Meta property="og:type" content="website" />
      <Meta property="og:title" content={pageTitle()} />
      <Meta property="og:description" content={description()} />
      <Meta property="og:locale" content="id_ID" />
      <Show when={ogImage()}>
        <Meta property="og:image" content={ogImage()!} />
        <Meta name="twitter:image" content={ogImage()!} />
      </Show>
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={pageTitle()} />
      <Meta name="twitter:description" content={description()} />
      <Link rel="canonical" href={location.pathname} />
      {/* page content */}
    </>
  );
}
```

### Good Example 3 (buildTitle helper in src/stores/profile.ts)
```ts
// src/stores/profile.ts
import { createAsync } from "@solidjs/router";
import { getProfileMeta } from "~/server/db/portfolio";

export { getProfileMeta };

export function useProfileMeta() {
  return createAsync(() => getProfileMeta());
}

export function buildTitle(
  pageLabel: string | undefined,
  profile: { name?: string | null; title?: string | null } | null | undefined
): string {
  const base =
    profile?.name && profile?.title
      ? `${profile.name} - ${profile.title}`
      : "Portfolio";
  return pageLabel ? `${pageLabel} | ${base}` : base;
}
// Produces: "Semua Proyek | Naka - Backend" or just "Naka - Backend" (homepage)
```

### Good Example 4 (homepage — og:image from profile avatar)
```tsx
// src/routes/index.tsx
const title = () =>
  data()?.profile?.name
    ? `${data()!.profile!.name} - ${data()!.profile!.title}`
    : "Portfolio";

return (
  <>
    <Title>{title()}</Title>
    <Meta name="keywords" content={keywords()} />
    <Meta property="og:type" content="profile" />
    <Meta property="og:title" content={title()} />
    <Meta property="og:description" content={description()} />
    <Meta property="og:locale" content="id_ID" />
    <Show when={data()?.profile?.avatar?.path}>
      <Meta property="og:image" content={data()!.profile!.avatar!.path} />
      <Meta name="twitter:image" content={data()!.profile!.avatar!.path} />
    </Show>
    <Meta name="twitter:card" content="summary_large_image" />
    <Link rel="canonical" href={location.pathname} />
  </>
);
```

### Good Example 5 (dashboard page — noindex, title only, reuses profile name)
```tsx
// src/routes/dashboard/projects.tsx
import { useProfileMeta, buildTitle, getProfileMeta } from "~/stores/profile";

export const route: RouteDefinition = {
  preload: () => { getProjects(); getProfileMeta(); }
};

export default function ProjectsPage() {
  const profile = useProfileMeta();
  // ...
  return (
    <DashboardLayout>
      <Title>{buildTitle("Proyek", profile())}</Title>
      <Meta name="robots" content="noindex, nofollow" />
      {/* no OG/Twitter needed — noindex page */}
    </DashboardLayout>
  );
}
```

## Related skills
- [[solid-start-island-architecture-ssr]] — meta tags must be in SSR output, not client-only.
- [[solid-start-ssr-hydration-matching]] — head tags consistent across SSR/CSR passes.
- [[solid-start-security-hardening]] — escaping dynamic head content; no raw HTML in meta.
- [[solid-start-project-structure]] — root layout where MetaProvider lives; stores/ for shared hooks.
- [[solid-start-basic-code]] — query()/createAsync() pattern used by getProfileMeta.
