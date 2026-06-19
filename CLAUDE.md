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
- `DATABASE_URL`: MariaDB connection string
- `JWT_SECRET`: HS256 key (min 32 chars)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Admin login credentials
- `GITHUB_USERNAME` / `GITHUB_TOKEN`: Credentials for contributions API (optional)

## Architecture

### Framework & Config
- **SolidStart 2.0.0-alpha.2** — config in `vite.config.ts`.
- Nitro plugin: `@solidjs/vite-plugin-nitro-2`. Caching/routing rules defined here.
- Middleware: `./src/middleware/index.ts` registered in `vite.config.ts`.
- Tailwind v4 — Custom tokens in `src/app.css` under `@theme {}`. No `tailwind.config.js`.

### Data Layer
- **Prisma 7** + `@prisma/adapter-mariadb` (requires `engineType = "library"` in schema).
- DB client: `src/server/db/client.ts` (marked `"use server"`).
- Reads split by concern: `src/server/db/portfolio.ts` (landing page), `src/server/db/dashboard.ts` (admin), `src/server/db/contact.ts`.

### Server Actions
- Mutations in `src/server/actions/`. Every action is server-only (`"use server"`) and validated with Zod.
- No public API routes. Use `action()` for all mutations.

### Authentication
- Cookie session: `HttpOnly` cookie named `session`.
- Token: JWT signed with `HS256` (jose), 7-day expiry.
- Password hashing: `argon2id` via `argon2` package (64MB memory cost).
- Route protection: `src/middleware/auth.ts` (`adminAuthMW`) blocks `/dashboard/**`.

### Middleware
- `onRequest`: `adminAuthMW` (redirects unauthenticated to `/login`).
- `onBeforeResponse`: `securityHeadersMW` (sets CSP, X-Frame-Options, etc.).

### Routing
- File-based routing (`@solidjs/start/router`).
- `/` — landing page (below-fold sections lazy loaded).
- `/dashboard/` — Admin CRUD dashboard.
- `/projects`, `/experience`, `/volunteering` — list pages with server-side debounced search and custom filter.

### File Uploads
- `uploadAssetAction` in `src/server/actions/assets.ts`.
- Files written to `public/uploads/` via `fs.writeFile()`. `/uploads/**` route cached immutably.

### Data Patterns
- Reads: `query()` + `createAsync()`.
- Writes: `action()` + `useSubmission()`.
- Route preloading: `preload` in RouteDefinition.
- Do not use deprecated `cache`/`createRouteData` APIs.
