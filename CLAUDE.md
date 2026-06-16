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
bun run db:seed       # create/reset admin user from .env
bun run db:studio     # open Prisma Studio
```

Run `db:generate` any time `prisma/schema.prisma` changes.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL="mysql://user:password@localhost:3306/portfolio_db"
JWT_SECRET="random-secret-min-32-chars"
ADMIN_EMAIL="email@example.com"
ADMIN_PASSWORD="strongpassword"
GITHUB_USERNAME="..."   # optional
GITHUB_TOKEN="ghp_..."  # optional
```

## Architecture

### Framework & Config
- **SolidStart 2.0.0-alpha.2** — config lives in `vite.config.ts` (not `app.config.ts`).
- Nitro plugin: `@solidjs/vite-plugin-nitro-2`. Route rules (caching headers) are set there.
- Middleware registered in `vite.config.ts` via `solidStart({ middleware: "./src/middleware/index.ts" })`.
- Tailwind v4 — custom tokens defined with `@theme {}` in `src/app.css`, no `tailwind.config.js`.

### Data Layer
- **Prisma 7** + `@prisma/adapter-mariadb`. Two Prisma configs exist:
  - `prisma.config.ts` — used by the Prisma CLI (references `prisma/schema.prisma`).
  - `src/server/db/client.ts` — singleton `db` export used at runtime; always marked `"use server"`.
- `engineType = "library"` is set in `schema.prisma` (required for the adapter).
- DB queries are split by concern: `src/server/db/portfolio.ts` (landing page reads), `src/server/db/dashboard.ts` (admin reads), `src/server/db/contact.ts`.

### Server Actions
All mutations go through `action()` in `src/server/actions/`. Every action is server-only (`"use server"`) and validated with Zod before touching the DB. There are no public API routes — use `action()` for all writes.

### Authentication
- Session stored in an `HttpOnly` cookie named `session`.
- JWT signed with `HS256` via `jose` (7-day expiry). Session row also stored in DB for revocation.
- Password hashing: `argon2id` via the `argon2` package (not `Bun.password`), memory cost 64 MB.
- Auth guard is in `src/middleware/auth.ts` (`adminAuthMW`). It blocks all `/dashboard/**` requests without a valid session.

### Middleware
`src/middleware/index.ts` composes two handlers:
- `onRequest`: `adminAuthMW` — redirects unauthenticated requests to `/login`.
- `onBeforeResponse`: `securityHeadersMW` — sets CSP, X-Frame-Options, etc.

### Routing
File-based routing via `@solidjs/start/router`. Key conventions:
- `src/routes/index.tsx` — landing page; below-fold sections are `lazy()`-loaded.
- `src/routes/dashboard/` — eight CRUD pages (profile, education, experience, projects, volunteering, assets, contact).
- `src/routes/[...404].tsx` — catch-all 404 page.
- Public list pages (`/projects`, `/experience`, `/volunteering`) use server-side debounced search and `CustomSelect` filter; search is handled by the DB query, not client-side filtering.

### Code Organisation
```
src/
  middleware/       auth guard + security headers
  lib/
    client/         browser-only code (NProgress)
    server/         server-only utilities: session, assets, github
    shared/         TypeScript types + Zod schemas
  server/
    db/             read queries per concern
    actions/        write mutations per entity
  features/
    landing/        homepage sections (Hero, About, Experience, …)
    dashboard/      dashboard layout, sidebar, file upload
  components/
    ui/             Button, Card, Skeleton, LazyAsset, ConfirmModal
    form/           FormField, Input, Textarea, Select, CustomSelect, SaveStatus
    shared/         Header (dark-mode toggle), Footer, ScrollToTop
```

### File Uploads
`uploadAssetAction` in `src/server/actions/assets.ts` handles multipart uploads. Files are written to `public/uploads/` via `fs.writeFile()` and recorded in the `Asset` table. The `/uploads/**` route rule sets immutable caching headers.

### SolidStart Data Patterns
- Reads: `query()` + `createAsync()`.
- Writes: `action()` + `useSubmission()`.
- Route preloading: `export const route: RouteDefinition = { preload: () => ... }`.
- Never use `cache`/`createRouteData` (deprecated v1 API).
