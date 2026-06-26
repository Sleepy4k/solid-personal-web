---
name: solid-start-project-structure
description: Lay out a SolidStart app - file-based routes, feature-scoped components under features/, server layer split into server/db/ (reads) and server/actions/ (writes), shared lib split into client/server/shared, and folder-based middleware - so each layer has a clear home and nothing leaks across boundaries.
related:
  - solid-start-initiation-scaffold
  - solid-start-best-practices
  - solid-start-middleware
  - solid-start-solidstart-v2-features
---

# SolidStart Project Structure
- Pages live under `src/routes/` (file-based routing); API endpoints under `src/routes/api/` only when you need a raw `Response` (webhooks, third-party integrations).
- Feature-specific components go in `src/features/{feature}/` — e.g., landing sections in `features/landing/`, admin UI in `features/dashboard/`.
- Global reusable UI in `src/components/ui/`, form primitives in `src/components/form/`, shared layout in `src/components/shared/`.
- All server **reads** (Prisma queries, external fetches) go in `src/server/db/` as `query()` functions; all **writes** (mutations) go in `src/server/actions/` as `action()` functions.
- `src/lib/` is split into `client/` (browser-only), `server/` (server-only `"use server"` modules), and `shared/` (pure types/utils for both sides).
- Middleware is folder-based: one file per concern (`auth.ts`, `security.ts`), combined in `src/middleware/index.ts`, registered in `vite.config.ts`.
- Database client (Prisma singleton) lives in `src/server/db/client.ts`.

## Reference folder layout (portfolio project)
```
src/
  middleware/
    index.ts          → createMiddleware entry (registered in vite.config.ts)
    auth.ts           → adminAuthMW — session check, redirect for /dashboard/**
    security.ts       → securityHeadersMW — CSP, X-Frame-Options, etc.
  lib/
    client/           → browser-only (NProgress config, etc.)
    server/           → "use server" modules (session, assets, github API)
    shared/           → pure types (GithubStats, ContribDay), utils, Zod schemas
  server/
    db/
      client.ts       → Prisma singleton with DB adapter ("use server" at file top)
      portfolio.ts    → public-facing reads (getPortfolioData, getAllProjects, …)
      dashboard.ts    → admin reads (getStats, getProfile, getProjects, …)
      contact.ts      → contact form reads
    actions/
      auth.ts         → loginAction, logoutAction
      profile.ts      → saveProfile
      education.ts    → saveEducation, deleteEducation
      projects.ts     → saveProject, deleteProject
      experience.ts   → saveExperience, deleteExperience
      volunteering.ts → saveVolunteering, deleteVolunteering
      assets.ts       → uploadAssetAction, deleteAssetAction
      contact.ts      → submitContactAction
  features/
    landing/          → Hero, About, Education, Experience, Projects, Volunteering, GitHubStats, Contact
    dashboard/        → Layout, Sidebar, FileUpload (used only in admin)
  components/
    ui/               → Skeleton, Button, Card, LazyAsset, ConfirmModal
    form/             → FormField, Input, Textarea, Select, CustomSelect, SaveStatus
    shared/           → Header, Footer, ScrollToTop
  routes/
    index.tsx         → homepage (preloads getPortfolioData; lazy-loads below-fold sections)
    login.tsx         → admin login
    [...404].tsx      → 404 catch-all
    projects/index.tsx       → all-projects list (search + filter)
    experience/index.tsx     → all-experiences list
    volunteering/index.tsx   → all-volunteerings list
    dashboard/        → 8 CRUD admin pages
  entry-client.tsx    → mount(<StartClient />, #app)
  entry-server.tsx    → createHandler(<StartServer document={...} />)
  app.tsx             → Router + MetaProvider + NavProgress
  app.css             → Tailwind v4 @theme design tokens + base styles
  global.d.ts         → RequestEventLocals augmentation
```

## Safety contract: non-negotiable
- Abort if a `server/db/` or `server/actions/` file is imported by client-only code without a `"use server"` boundary (leaks DB/secrets to the bundle).
- Abort if business logic or queries are defined inline in route files instead of the appropriate server layer.
- Abort if middleware is not registered in `vite.config.ts` with the `middleware:` key (it silently does nothing).
- Abort if a component used by only one feature is placed in `components/` instead of `features/`.
- Abort if `routes/api/` is used for a mutation that should be an `action()` (bypasses progressive enhancement and revalidation).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router`, Vite, Tailwind v4, Prisma 7, `@prisma/adapter-mariadb`.

## Gotchas
- `server/db/*.ts` files do NOT have `"use server"` at the file top — only inside each `query()` callback. The file is imported by routes (client-reachable), so only the callback is server-only.
- `lib/server/*.ts` files DO have `"use server"` at the file top — they are never imported by client code directly.
- `server/db/client.ts` has `"use server"` at the file top because it exports the raw Prisma instance — only server code should import it.
- Features in `features/landing/` import from `components/ui/` but NOT from `features/dashboard/` (no cross-feature imports).
- `global.d.ts` augments `RequestEventLocals` to add `userId`, `user`, and `cspNonce` — these are typed, not cast, in middleware and actions.

## Workflow
1. New landing section → `features/landing/MySection.tsx`, lazy-import in `routes/index.tsx`.
2. New dashboard page → `routes/dashboard/mypage.tsx`, queries in `server/db/dashboard.ts`, actions in `server/actions/mypage.ts`.
3. New shared component → `components/ui/` (primitive), `components/form/` (form control), `components/shared/` (layout).
4. New server utility → `lib/server/myutil.ts` with `"use server"` at the file top.
5. New public API (webhook/third-party) → `routes/api/myendpoint.ts` returning `Response`.

## Code Examples

### Good Example 1 (feature-scoped component, lazy-loaded)
```tsx
// src/features/landing/Experience.tsx  ✓ scoped to the landing feature
import { Card } from '~/components/ui/Card';
export default function ExperienceSection(props) { ... }

// src/routes/index.tsx
const ExperienceSection = lazy(() => import('~/features/landing/Experience'));
```

### Good Example 2 (reads in server/db, writes in server/actions, both used from the route)
```ts
// src/server/db/dashboard.ts  — READS only
export const getProfile = query(async () => {
  'use server';
  return db.profile.findFirst({ include: { links: true } });
}, 'dashboard-profile');

// src/server/actions/profile.ts  — WRITES only
export const saveProfile = action(async (form: FormData) => {
  'use server';
  await db.profile.update({ ... });
  return revalidate(getProfile.key);
}, 'save-profile');

// src/routes/dashboard/profile.tsx
import { getProfile } from '~/server/db/dashboard';
import { saveProfile } from '~/server/actions/profile';
export const route: RouteDefinition = { preload: () => getProfile() };
export default function ProfilePage() {
  const data = createAsync(() => getProfile());
  ...
}
```

### Good Example 3 (server utility, file-level "use server")
```ts
// src/lib/server/session.ts
'use server';  // at file top — never imported by client code
import { SignJWT, jwtVerify } from 'jose';
export async function createSession(userId: string) { ... }
export async function getSessionFromCookie(cookie: string | null) { ... }
```

### Good Example 4 (global.d.ts augmentation for typed locals)
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

### Bad Example 1 (component not scoped to feature)
```tsx
// src/components/Experience.tsx  ✗ only used on the landing page
// Correct: src/features/landing/Experience.tsx
```

### Bad Example 2 (query defined inline in route)
```tsx
// src/routes/dashboard/profile.tsx
const getProfile = query(async () => { 'use server'; ... }, 'profile'); // ✗ belongs in server/db/dashboard.ts
```

### Bad Example 3 (mutation via routes/api when action() would do)
```ts
// src/routes/api/save-profile.ts
export async function POST(event) {          // ✗ no progressive enhancement, no revalidation
  const data = await event.request.json();
  await db.profile.update({ data });
  return new Response(null, { status: 204 });
}
// Use action() + revalidate() instead
```

## Related skills
- [[solid-start-middleware]] — folder-based middleware setup.
- [[solid-start-solidstart-v2-features]] — query/action/createAsync patterns.
- [[solid-start-best-practices]] — keeping server/client boundary clean.
- [[solid-start-initiation-scaffold]] — bootstrapping a new project with this structure.
