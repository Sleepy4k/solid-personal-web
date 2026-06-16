---
name: solid-start-project-structure
description: Lay out a SolidStart app with micro-file structure - file-based routes, feature-scoped components under features/, server layer in server/db/ and server/actions/, shared lib split into client/server/shared, and folder-based middleware - so each layer has a clear home.
related:
  - solid-start-initiation-scaffold
  - solid-start-best-practices
  - solid-start-api-routes
  - solid-start-middleware
---

# SolidStart Project Structure (Portfolio Edition)
- Pages live under `src/routes/` (file-based routing); API endpoints under `src/routes/api/`.
- Feature-specific components go in `src/features/{feature}/` — e.g., landing page sections in `features/landing/`, dashboard components in `features/dashboard/`.
- Global reusable UI in `src/components/ui/`, form primitives in `src/components/form/`, shared layout in `src/components/shared/`.
- All server queries (Prisma reads) go in `src/server/db/`; all mutations (server actions) go in `src/server/actions/`.
- `src/lib/` is split into `client/` (browser-only), `server/` (server-only `"use server"` modules), and `shared/` (types, utils for both).
- Middleware is folder-based: `src/middleware/auth.ts` + `src/middleware/security.ts` combined in `src/middleware/index.ts`.
- Database client (Prisma singleton) lives in `src/server/db/client.ts`.

## This project's folder layout
```
src/
  middleware/
    index.ts          → createMiddleware entry (registered in vite.config.ts)
    auth.ts           → adminAuthMW
    security.ts       → securityHeadersMW
  lib/
    client/           → browser-only helpers (NProgress config)
    server/           → "use server" modules (session, assets, github)
    shared/           → shared TypeScript types (GithubStats, ContribDay)
  server/
    db/
      client.ts       → Prisma singleton with MySQL adapter
      portfolio.ts    → getPortfolioData() query
      dashboard.ts    → all dashboard queries (getStats, getProfile, etc.)
    actions/
      auth.ts         → loginAction, logoutAction
      profile.ts      → saveProfile
      education.ts    → saveEducation, deleteEducation
      projects.ts     → saveProject, deleteProject
      experience.ts   → saveExperience, deleteExperience
      volunteering.ts → saveVolunteering, deleteVolunteering
      assets.ts       → deleteAssetAction
  features/
    landing/          → components only used on the homepage
      Hero.tsx, About.tsx, Education.tsx, Experience.tsx
      Projects.tsx, Volunteering.tsx, GitHubStats.tsx
    dashboard/        → components only used in dashboard
      Layout.tsx, Sidebar.tsx, FileUpload.tsx
  components/
    ui/               → generic UI primitives (Skeleton, Button, Card, LazyAsset)
    form/             → form primitives (FormField, Input, Textarea, Select, SaveStatus)
    shared/           → layout components (Header, Footer)
  routes/
    index.tsx         → homepage (imports from server/db/portfolio + features/landing/)
    login.tsx         → admin login (imports from server/actions/auth)
    [...404].tsx      → 404 catch-all
    dashboard/        → 7 CRUD pages (each imports from server/db/dashboard + server/actions/)
    api/              → REST endpoints (assets/upload, assets/[id], github)
```

## Safety contract: non-negotiable
- Abort if a `server/db/` or `server/actions/` file is imported by client-only code (leaks DB/secrets to bundle).
- Abort if business logic is defined inline in route files instead of the appropriate server layer.
- Abort if middleware is not registered in `vite.config.ts`.
- Abort if components that are only used in one feature are placed in `components/` (they belong in `features/`).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router`, Vite, Tailwind v4, Prisma 7, mysql2, `@prisma/adapter-mysql`.

## Gotchas
- `server/db/*.ts` files export `query()` functions — they DO NOT have `"use server"` at the file top, only inside each callback.
- `lib/server/*.ts` files have `"use server"` at the file top — they are not imported by client code.
- `server/db/client.ts` uses the MySQL driver adapter (`@prisma/adapter-mysql`). The `prisma.config.ts` is for CLI only.
- Features in `features/landing/` import from `components/ui/` but NOT from `features/dashboard/` (no cross-feature imports).
- Form primitives live in `components/form/` — shared between landing forms (if any) and dashboard forms.

## Workflow
1. New landing section → `features/landing/MySection.tsx`, import in `routes/index.tsx`.
2. New dashboard page → `routes/dashboard/mypage.tsx`, queries in `server/db/dashboard.ts`, actions in `server/actions/mypage.ts`.
3. New API endpoint → `routes/api/myendpoint.ts`, import helpers from `lib/server/`.
4. New shared component → `components/ui/` (primitive), `components/form/` (form), or `components/shared/` (layout).
5. New server utility → `lib/server/` with `"use server"` at top.

## Code Examples

### Good Example 1 (feature-scoped component)
```tsx
// src/features/landing/Experience.tsx  ✓ scoped to landing feature
import { Card } from '~/components/ui/Card';   // ✓ ui primitive
import { LazyImg } from '~/components/ui/LazyAsset';
export default function ExperienceSection(props) { ... }

// src/routes/index.tsx
import ExperienceSection from '~/features/landing/Experience'; // ✓ import from features
```

### Good Example 2 (server layer separation)
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
```

### Bad Example 1 (component not scoped to feature)
```tsx
// src/components/Experience.tsx  ✗ experience is only on landing page
// Should be: src/features/landing/Experience.tsx
```

### Bad Example 2 (query defined inline in route)
```tsx
// src/routes/dashboard/profile.tsx
const getProfile = query(async () => { 'use server'; ... }, 'profile'); // ✗ belongs in server/db/dashboard.ts
```

## Related skills
- [[solid-start-middleware]] — folder-based middleware setup.
- [[solid-start-solidstart-v2-features]] — query/action/createAsync patterns.
- [[solid-start-best-practices]] — keeping server/client boundary clean.
