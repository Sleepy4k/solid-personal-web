---
name: solid-start-prisma-database
description: Set up a Prisma 7 ORM singleton with MariaDB/MySQL adapter in SolidStart so every server function shares one connection pool, schema changes are safe, and no DB credentials reach the client.
related:
  - solid-start-basic-code
  - solid-start-env-variables
  - solid-start-server-actions-mutations
  - solid-start-security-hardening
---

# Prisma Database
- A `globalThis`-based singleton prevents Prisma from opening a new connection pool on every hot-reload in development.
- `engineType = "library"` in `schema.prisma` is required for Bun/Nitro runtimes — the default binary engine does not exist in these environments.
- All query functions use `query(async () => { "use server"; ... }, "key")` — NOT a file-level `"use server"` directive — so SolidStart can cache reads independently.
- `DATABASE_URL` is injected via `ssrDefine` in `vite.config.ts`; it never appears in VITE_ vars or the client bundle.

## Safety contract: non-negotiable
- Abort if `new PrismaClient()` is called at module level without a `globalThis` guard — each hot-reload creates a new pool and exhausts database connections within minutes.
- Abort if `DATABASE_URL` is prefixed with `VITE_` or read via `import.meta.env` — the connection string (credentials included) ships to the browser.
- Abort if `engineType = "library"` is missing from `schema.prisma` — Prisma silently falls back to the binary engine which fails at runtime under Bun.
- Abort if `db:push` is used in a production migration — it silently drops columns that don't match the new schema. Use `db:migrate` for production.
- Abort if query functions are defined with a file-level `"use server"` directive — the entire module becomes a server RPC and loses per-function cache key isolation.

## Required tools
- `prisma@7` + `@prisma/client@7`.
- `@prisma/adapter-mariadb` (for MariaDB/MySQL; swap for `@prisma/adapter-pg` for PostgreSQL).
- `bun` runtime (or Node >=18 — same pattern, different adapter may be needed).
- `DATABASE_URL` env var with a valid `mysql://` connection string.

## Gotchas
- `prisma.config.ts` (Prisma 7+) replaces `.env`-based `datasource` URL for programmatic config; if using the new config file the `DATABASE_URL` ssrDefine entry must match the key used there.
- `db.model.findMany` with deep `include` chains can over-fetch — add `select` to limit columns or `take` to limit rows for large relations.
- Prisma's `$transaction` with `isolationLevel` is not supported on all MariaDB versions; test against your target version (>= 10.6 recommended).
- After any change to `prisma/schema.prisma`, run `bun run db:generate` to regenerate the Prisma client types — stale types cause TypeScript to accept incorrect queries that fail at runtime.
- `log: ["query"]` in development is extremely verbose under hot-reload; use `["warn", "error"]` to avoid flooding the terminal.

## Workflow
1. Add `engineType = "library"` to the `generator client` block in `prisma/schema.prisma`.
2. Create `src/server/db/client.ts` with the `globalThis` singleton pattern; mark the file `"use server"` at the top.
3. Add `DATABASE_URL` to `ssrDefine` in `vite.config.ts` via `process.env.DATABASE_URL`.
4. Write query functions in `src/server/db/portfolio.ts` / `dashboard.ts` using `query(async () => { "use server"; ... }, "unique-key")`.
5. Run `bun run db:generate` after every schema change; use `db:push` for dev-only schema sync, `db:migrate` for production.

## Code Examples (Good vs Bad)

### Bad Example 1 (new PrismaClient at module level — connection exhaustion on hot-reload)
```ts
// src/server/db/client.ts — WRONG
import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient(); // new pool on every HMR reload → "Too many connections"
```

### Bad Example 2 (DATABASE_URL in VITE_ var — credentials in client bundle)
```ts
// vite.config.ts — WRONG
export default defineConfig({
  // ...
  define: {
    "import.meta.env.VITE_DATABASE_URL": JSON.stringify(process.env.DATABASE_URL), // ships to browser
  },
});
```

### Bad Example 3 (file-level "use server" on the queries module — no per-function cache isolation)
```ts
// src/server/db/portfolio.ts — WRONG
"use server"; // every export becomes one RPC; individual query keys don't work correctly
import { query } from "@solidjs/router";
export const getProfile = query(async () => { /* ... */ }, "profile");
```

### Bad Example 4 (missing engineType = "library" — binary engine not found under Bun)
```prisma
// prisma/schema.prisma — WRONG
generator client {
  provider = "prisma-client-js"
  // engineType missing → Prisma uses binary engine → "Engine file not found" under Bun
}
```

### Bad Example 5 (db:push in production CI — silently drops columns)
```bash
# CI deploy script — WRONG
bun run db:push   # drops any column in DB not in schema.prisma — data loss in production
```

### Good Example 1 (globalThis singleton with MariaDB adapter)
```ts
// src/server/db/client.ts
"use server";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const g = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL ?? "mysql://root:password@localhost:3306/portfolio_db";

export const db =
  g.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
```

### Good Example 2 (schema.prisma with correct engineType)
```prisma
generator client {
  provider   = "prisma-client-js"
  engineType = "library"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Profile {
  id    String @id @default(cuid())
  name  String
  bio   String @db.Text
  @@map("profiles")
}
```

### Good Example 3 (ssrDefine injection in vite.config.ts)
```ts
// vite.config.ts
const SERVER_ENV_KEYS = ["DATABASE_URL", "JWT_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD"] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const ssrDefine = Object.fromEntries(
    SERVER_ENV_KEYS.map((key) => [
      `process.env.${key}`,
      JSON.stringify(env[key] ?? process.env[key] ?? ""),
    ]),
  );
  return {
    environments: { ssr: { define: ssrDefine } },
    // ...
  };
});
```

### Good Example 4 (query functions with per-function "use server" and cache key)
```ts
// src/server/db/portfolio.ts
import { query } from "@solidjs/router";
import { db } from "~/server/db/client";

export const getProfile = query(async () => {
  "use server";
  return db.profile.findFirst({ include: { links: true, avatar: true } });
}, "profile");

export const getAllProjects = query(async (params?: { q?: string }) => {
  "use server";
  const q = params?.q?.trim();
  return db.project.findMany({
    where: q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : undefined,
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: { technologies: { include: { technology: true } }, cover: true },
  });
}, "all-projects");
```

### Good Example 5 (migration workflow: dev vs production)
```bash
# Development — fast schema sync, no migration history
bun run db:push

# After schema change — always regenerate client types
bun run db:generate

# Production — creates versioned migration files, never drops data silently
bun run db:migrate

# Seed initial data (admin user, etc.)
bun run db:seed

# Inspect data visually
bun run db:studio
```

## Related skills
- [[solid-start-env-variables]] — DATABASE_URL must be in ssrDefine, never VITE_.
- [[solid-start-server-actions-mutations]] — mutations import `db` and run inside action() with "use server".
- [[solid-start-security-hardening]] — no raw user input into db queries; always use Prisma parameterized calls.
- [[solid-start-basic-code]] — query() wrapping pattern for all DB reads.
