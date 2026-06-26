# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev           # start dev server
bun run build         # production build
bun run start         # run production server

# Database
bun run db:generate   # regenerate Prisma client after schema changes
bun run db:push       # apply schema to DB without migration history (development)
bun run db:migrate    # create migration files (production)
bun run db:seed       # create/reset admin user from env
bun run db:studio     # open Prisma Studio
```

Run `db:generate` after modifying `prisma/schema.prisma`.

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL`: MariaDB connection string (`mysql://user:pass@host:3306/db`)
- `JWT_SECRET`: HS256 key (min 32 chars)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Admin login credentials
- `GITHUB_USERNAME` / `GITHUB_TOKEN`: Credentials for contributions API (optional)
- `UPLOAD_DIR`: Absolute path for uploaded files (optional; defaults to `public/uploads`)

Server env vars are injected into SSR code via the `ssrDefine` block in `vite.config.ts` using `process.env.*` defines — this is required because Nitro/Bun can lose `process.env` at runtime without it.

## Architecture

### Framework & Config
- **SolidStart 2.0.0-alpha.2** — config in `vite.config.ts`.
- Plugin: `@solidjs/start/config` with `solidStart({ ssr: true, middleware: './src/middleware/index.ts' })`.
- Tailwind v4 — via `@tailwindcss/vite`. Custom design tokens in `src/app.css` under `@theme {}`. No `tailwind.config.js`.
- No `tailwind.config.js` — all theming via CSS `@theme` block in `src/app.css`.
- Primary brand color: `#ff6b00`. CSS vars: `--c-bg`, `--c-bg-alt`, `--c-text`, `--c-text-muted`, `--c-border`.
- Dark mode via `data-theme="dark"` attribute on `<html>`, toggled and persisted in localStorage.

### Vite Config Pitfalls — DO NOT regress
- `environments.ssr.define` must NOT contain `"import.meta.env.DEV": "false"` or `"import.meta.env.START_DEV_OVERLAY": "false"`. Those values only belong in the top-level `define` block (already conditioned on `command === "build"`). Setting them unconditionally in the SSR environment definition causes SolidStart to think it's in production during `vite dev` and look for a Vite manifest file that doesn't exist, producing the error: `Error: No entry found in vite manifest for 'src/entry-client.tsx'`.
- `optimizeDeps.exclude` must NOT include `"nprogress"`. NProgress is a CJS-only package; excluding it from Vite's pre-bundling causes the raw CJS file to be served without a default export, producing `SyntaxError: ... does not provide an export named 'default'`. Always keep `optimizeDeps: { include: ["nprogress"] }` and do NOT set `noExternal: ["nprogress"]` in the SSR environment.

### Data Layer
- **Prisma 7** + `@prisma/adapter-mariadb` (requires `engineType = "library"` in `prisma/schema.prisma`).
- DB client singleton: `src/server/db/client.ts` (marked `"use server"` at file top; cached on `globalThis` in non-prod).
- Reads split by concern: `src/server/db/portfolio.ts` (landing page), `src/server/db/dashboard.ts` (admin), `src/server/db/contact.ts`.
- All query functions use `query(async () => { "use server"; ... }, "unique-key")` pattern — NOT file-level `"use server"`.

### Server Actions
- All mutations in `src/server/actions/`. Every action is `action(async (form: FormData) => { "use server"; ... }, "name")`.
- Input validated with **Zod** inside the server function. No unvalidated client input ever touches the DB.
- Actions call `revalidate(queryFn.key)` after writes to refresh cached reads.
- No public API routes — all mutations go through `action()`.

### Authentication
- Cookie session: `HttpOnly` cookie named `session`, `SameSite=Strict`, 7-day expiry.
- Token: JWT signed with `HS256` (jose library), 7-day expiry.
- Password hashing: `argon2id` via `argon2` package (64MB memory cost), in `src/lib/shared/hashing.ts`.
- Route protection: `src/middleware/auth.ts` (`adminAuthMW`) blocks all `/dashboard/**` at middleware level.
- Session lookup hits DB every request (in middleware); `event.locals.userId` and `event.locals.user` are set for downstream use.

### Middleware
- `onRequest`: `[fixUrlMW, adminAuthMW]`
  - `fixUrlMW` (in `src/middleware/index.ts`): Patches missing `headers.get()` method and converts relative URLs to absolute (Bun/Nitro quirk where `req.url` can start with `/` and headers may lack `.get()`).
  - `adminAuthMW` (`src/middleware/auth.ts`): Checks session cookie, redirects unauthenticated requests to `/login` for all `/dashboard/**` paths.
- `onBeforeResponse`: `[securityHeadersMW]` (`src/middleware/security.ts`): Sets CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Registered in `vite.config.ts`: `solidStart({ middleware: './src/middleware/index.ts' })`.

### Type Extensions
- `src/global.d.ts` augments `@solidjs/start/server`'s `RequestEventLocals` with `userId`, `user`, and `cspNonce` fields — these are set by middleware and readable via `getRequestEvent().locals` in actions.

### Routing
- File-based routing (`@solidjs/start/router` + `FileRoutes`).
- `/` — landing page; preloads both `getPortfolioData()` and `getProfileMeta()`; below-fold sections are `lazy()`-loaded. Title reads from `useProfileMeta()` context, not from `data()?.profile`, to prevent hard-reload flash.
- `/projects`, `/experience`, `/volunteering` — list pages with server-side debounced search and custom filter.
- `/login` — admin login form.
- `/dashboard/**` — 7 CRUD admin pages (guarded by middleware).
- `[...404].tsx` — 404 catch-all route.
- Route preloading: `export const route: RouteDefinition = { preload: () => getXxx() }` in each page file.

### File Uploads
- `src/server/actions/assets.ts`: `uploadAssetAction` / `deleteAssetAction` (form actions); `uploadAssetFn` (plain server function used by `FileUpload.tsx` for direct programmatic calls).
- `src/lib/server/assets.ts`: Handles file I/O and DB write. Always writes to `public/uploads/`; override with `UPLOAD_DIR` env var.
- Assets tracked in the `Asset` Prisma model; referenced by other models via `coverId`, `logoId`, etc.

### Data Patterns
- Reads: `query(fn, key)` defined in `src/server/db/` → consumed with `createAsync(() => getFoo())` in routes.
- Writes: `action(fn, name)` defined in `src/server/actions/` → called via `useAction()` or `<form action={}>`.
- Route preloading: `preload` in `RouteDefinition` starts the fetch before the route component renders.
- Pending state: `useSubmission(action)` for inline form status; `createAsync` integrates with `<Suspense>`.
- Do not use deprecated `cache`/`createRouteData` APIs — use `query`/`action` from `@solidjs/router`.

### GitHub Integration
- `src/lib/server/github.ts`: Fetches contribution graph from the GitHub GraphQL API using `GITHUB_USERNAME` and `GITHUB_TOKEN`. Returns `GithubStats` type (defined in `src/types/github.ts`). Gracefully returns `null` if credentials are missing.
- Results are cached in the `GithubCache` Prisma model (keyed by username) to avoid repeated API calls.
- `getGithubStatsByYear(year)` in `src/server/db/portfolio.ts` allows fetching per-year contribution data (used by the year selector in `GitHubStats.tsx`).

### Global Stores (`src/stores/`)
- **Context-based pattern**: Stores expose data via SolidJS `createContext` + Provider components in `providers.tsx`. This avoids module-level reactive state (which would cause SSR data leakage across users).
- `src/stores/profile.ts`: `ProfileContext`, `useProfileMeta()`, `buildTitle(pageLabel, profile)`, `getProfileMeta` re-export.
  - `getProfileMeta()` is a lightweight `query()` (name, title, bio, avatar only) — used in every page's `route.preload` to pre-warm the SSR query cache.
  - `buildTitle("Semua Proyek", profile())` → `"Semua Proyek | Name - Title"` (falls back to `"Portfolio"` if no profile).
- `src/stores/auth.ts`: `AuthContext`, `useSessionUser()` — stub for session-aware UI components. Wire up by adding an `AuthProvider` to `providers.tsx` when needed. **Do NOT use `await import("@solidjs/start/server")` inside a `query()` callback** — `getRequestEvent` comes back as `undefined` in SolidStart 2.x/Bun. Instead, access `event.locals.user` via middleware-set data in server actions.
- `src/stores/providers.tsx`: `ProfileProvider` — context wrapper mounted once in `app.tsx`'s Router root. Ensures profile data is loaded once on app mount and shared across all route navigations (fixes client-nav title flash).
- SEO pattern on every public page: `<Title>`, `<Meta name="description">`, `<Meta name="keywords">`, `og:*`, `twitter:*`, `<Link rel="canonical">`.
- All pages call `getProfileMeta()` in their `route.preload`; SolidStart's query cache deduplicates — the provider's `createAsync` reads synchronously from this cache during SSR. **This is required even for the homepage** (which also calls `getPortfolioData()`). Without it, `ProfileProvider`'s `createAsync` has no cache to read on hydration and briefly returns `undefined`, flashing "Portfolio" as the title.

### Types (`src/types/`)
- All shared TypeScript types are centralized in `src/types/`.
- `src/types/github.ts`: `GithubStats`, `ContribDay` interfaces for GitHub contribution data.
- `src/types/index.ts`: Re-exports all types from sub-files.
- `src/lib/shared/types.ts` has been deleted — all types now live in `src/types/` directly. Import from `~/types`.
- Prisma model types (auto-generated) are available as `import type { Profile, Project, ... } from "@prisma/client"` — do not duplicate in `src/types/`.

## Full Source Tree

```
src/
  middleware/
    index.ts          → createMiddleware entry + fixUrlMW (URL normalization / headers.get patch)
    auth.ts           → adminAuthMW (session check, redirect to /login for /dashboard/**)
    security.ts       → securityHeadersMW (CSP, X-Frame-Options, etc.)
  lib/
    client/
      nprogress.ts    → NProgress config (browser-only)
    server/
      session.ts      → JWT create/verify, DB session CRUD, cookie helpers ("use server" at file top)
      assets.ts       → uploadAsset/deleteAsset (file I/O + DB write, resolves upload dir dynamically)
      github.ts       → GitHub contributions GraphQL fetch ("use server" at file top)
    shared/
      hashing.ts      → argon2id hashPassword / verifyPassword
      utils.ts        → shared pure helpers
      validation.ts   → shared Zod schemas (reused by actions)
  server/
    db/
      client.ts       → Prisma singleton with MariaDB adapter ("use server" at file top)
      portfolio.ts    → getPortfolioData, getProfileMeta, getAllProjects, getAllExperiences, getAllVolunteerings, getAllTechnologies, getGithubStatsByYear
      dashboard.ts    → getStats, getProfile, getEducations, getProjects, getExperiences, getVolunteerings, getAssets
      contact.ts      → contact form queries
    actions/
      auth.ts         → loginAction, logoutAction
      profile.ts      → saveProfile
      education.ts    → saveEducation, deleteEducation
      projects.ts     → saveProject, deleteProject
      experience.ts   → saveExperience, deleteExperience
      volunteering.ts → saveVolunteering, deleteVolunteering
      assets.ts       → uploadAssetFn (direct), uploadAssetAction, deleteAssetAction
      contact.ts      → submitContactAction
  features/
    landing/          → section components used only on the homepage
      Hero.tsx, About.tsx, Education.tsx, Experience.tsx
      Projects.tsx, Volunteering.tsx, GitHubStats.tsx, Contact.tsx
    dashboard/        → components used only in the admin dashboard
      Layout.tsx, Sidebar.tsx, FileUpload.tsx
  components/
    ui/               → generic primitives: Skeleton, Button, Card, LazyAsset, ConfirmModal
    form/             → form primitives: FormField, Input, Textarea, Select, CustomSelect, SaveStatus
    shared/           → layout: Header, Footer, ScrollToTop
  routes/
    index.tsx         → homepage (preloads getPortfolioData; lazy-loads sections)
    login.tsx         → admin login (uses loginAction)
    [...404].tsx      → 404 catch-all
    projects/index.tsx       → all-projects list with search + tech filter
    experience/index.tsx     → all-experiences list
    volunteering/index.tsx   → all-volunteerings list
    dashboard/
      index.tsx       → stats overview
      profile.tsx     → profile CRUD
      projects.tsx    → projects CRUD
      education.tsx   → education CRUD
      experience.tsx  → experience CRUD
      volunteering.tsx → volunteering CRUD
      assets.tsx      → uploaded assets management
      contact.tsx     → contact form submissions
  types/
    github.ts         → ContribDay, GithubStats interfaces
    index.ts          → re-exports all shared types
  stores/
    profile.ts        → ProfileContext, useProfileMeta(), buildTitle(), getProfileMeta
    auth.ts           → AuthContext, useSessionUser() stub (wire up AuthProvider when needed)
    providers.tsx     → ProfileProvider (context wrapper mounted in app.tsx)
  entry-client.tsx    → mount(<StartClient />, #app)
  entry-server.tsx    → createHandler(<StartServer document={...} />)
  app.tsx             → Router + MetaProvider + ProfileProvider + NavProgress
  app.css             → Tailwind v4 @import + @theme design tokens + base styles
  global.d.ts         → RequestEventLocals augmentation (userId, user, cspNonce)
```
