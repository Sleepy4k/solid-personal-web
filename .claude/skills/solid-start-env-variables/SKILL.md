---
name: solid-start-env-variables
description: Split SolidStart env vars correctly - VITE_-prefixed public values via import.meta.env for the client, secrets via process.env in "use server" code only, and ssrDefine in vite.config.ts to guarantee env availability in SSR - so keys never reach the browser bundle.
related:
  - solid-start-security-hardening
  - solid-start-best-practices
  - solid-start-session-cookies
  - solid-start-initiation-scaffold
---

# SolidStart Env Variables
- Public client config is `VITE_`-prefixed and read with `import.meta.env.VITE_X`; everything else is server-only.
- Secrets (DB URLs, API keys, session secret) are read with `process.env.X` inside `"use server"`/server modules.
- `.env` holds real values and is gitignored; `.env.example` documents the keys and is committed.
- On Bun/Nitro, `process.env` can be absent or incomplete in SSR code — inject critical server env vars explicitly via `define` in `vite.config.ts` using `loadEnv`.

## The ssrDefine pattern (required for Bun/Nitro)
Vite's `loadEnv` reads `.env` at build/dev time. Pass the values into SSR via `environments.ssr.define` so they're available as `process.env.KEY` in server functions even when the runtime strips the real `process.env`:

```ts
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import { solidStart } from '@solidjs/start/config';

const SERVER_ENV_KEYS = ['JWT_SECRET', 'DATABASE_URL', 'ADMIN_EMAIL', 'NODE_ENV'] as const;

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const ssrDefine = Object.fromEntries(
    SERVER_ENV_KEYS.map(key => [
      `process.env.${key}`,
      JSON.stringify(env[key] ?? process.env[key] ?? ''),
    ]),
  );
  return {
    plugins: [solidStart({ ssr: true, middleware: './src/middleware/index.ts' })],
    environments: {
      ssr: {
        define: ssrDefine,   // <-- server env vars guaranteed available
        noExternal: ['nprogress'],
      },
    },
    define: command === 'build' ? {
      'import.meta.env.DEV': 'false',
      'import.meta.env.START_DEV_OVERLAY': 'false',
    } : {},
  };
});
```

**Critical:** Do NOT put `"import.meta.env.DEV": "false"` inside `environments.ssr.define` — it applies in dev mode too and causes SolidStart to look for a Vite manifest that doesn't exist, throwing `Error: No entry found in vite manifest for 'src/entry-client.tsx'`. Only put it in the top-level `define` conditioned on `command === 'build'`.

## Safety contract: non-negotiable
- Abort if a secret is `VITE_`-prefixed or read via `import.meta.env` in client-reachable code (it ships in the JS bundle — public).
- Abort if `.env` with real secrets is committed (only `.env.example` belongs in git).
- Abort if `process.env.SECRET` is referenced from a module without a `"use server"` boundary (bundler may inline/expose or fail).
- Abort if `"import.meta.env.DEV": "false"` is set unconditionally in `environments.ssr.define` — causes dev manifest error.
- Abort if a required env var is unvalidated and silently `undefined` at runtime (subtle production failures).

## Required tools
- `@solidjs/start` >= 1, Vite `loadEnv` + `import.meta.env`, Node `process.env`, optionally Zod to validate env at boot.

## Gotchas
- Vite only exposes `VITE_`-prefixed vars to the client; non-prefixed vars are `undefined` in the browser — by design.
- On Bun/Nitro SSR, `process.env` may be empty even for vars in `.env` — the `ssrDefine` pattern guarantees they're compiled in.
- `process.env` works in server code (`"use server"`, middleware); in client code it's empty/replaced.
- Anything reachable from a client component's import graph can be bundled — keep secrets behind `"use server"`.
- The top-level `define` block applies to ALL environments; `environments.ssr.define` applies only to SSR. Don't duplicate dev-mode overrides in both.

## Workflow
1. Name public vars `VITE_*`; read with `import.meta.env`.
2. Read secrets via `process.env` only inside server code.
3. Add all server env key names to `SERVER_ENV_KEYS` in `vite.config.ts`; they'll be injected via `ssrDefine`.
4. Commit `.env.example`; gitignore `.env`.
5. (Optional) Validate required vars with Zod at server startup.

## Code Examples (Good vs Bad)

### Bad Example 1 (secret exposed to client)
```tsx
const STRIPE = import.meta.env.VITE_STRIPE_SECRET;   // VITE_ + secret -> shipped to browser
export default function Pay() { return <Checkout key={STRIPE} />; }
```

### Bad Example 2 (process.env secret in a client component)
```tsx
// src/routes/index.tsx (a page component — client-reachable)
const dbUrl = process.env.DATABASE_URL;  // undefined client-side or leaked if forced in
```

### Bad Example 3 (DEV override in ssr env — causes dev manifest error)
```ts
// vite.config.ts
environments: {
  ssr: {
    define: {
      ...ssrDefine,
      'import.meta.env.DEV': 'false',          // ✗ applies in dev too -> manifest error
      'import.meta.env.START_DEV_OVERLAY': 'false', // ✗ same
    },
  },
},
```

### Bad Example 4 (secret in a shared module a page imports, no "use server")
```ts
// src/lib/stripe.ts — imported by both a page and an action
export const stripe = new Stripe(process.env.STRIPE_SECRET!); // bundler pulls key toward client
```

### Good Example 1 (ssrDefine pattern — all server keys guaranteed available)
```ts
// vite.config.ts
const SERVER_ENV_KEYS = ['JWT_SECRET', 'DATABASE_URL', 'ADMIN_EMAIL', 'NODE_ENV'] as const;
const ssrDefine = Object.fromEntries(
  SERVER_ENV_KEYS.map(key => [`process.env.${key}`, JSON.stringify(env[key] ?? process.env[key] ?? '')])
);
// in environments.ssr.define: ssrDefine (no DEV overrides here)
// in top-level define: { 'import.meta.env.DEV': 'false' } only when command === 'build'
```

### Good Example 2 (correct client/server split)
```tsx
// client: public base URL only
const base = import.meta.env.VITE_API_BASE;

// server-only secret behind "use server"
const charge = action(async (amount: number) => {
  'use server';
  const stripe = new Stripe(process.env.STRIPE_SECRET!); // never leaves the server
  return stripe.charge(amount);
});
```

### Good Example 3 (Zod-validated env at boot)
```ts
// src/lib/server/env.ts
'use server';
import { z } from 'zod';
export const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email(),
}).parse(process.env);  // fails loudly at startup if missing
```

### Good Example 4 (session module isolated, reads env correctly)
```ts
// src/lib/server/session.ts
'use server';  // file-level boundary
import { SignJWT, jwtVerify } from 'jose';
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-for-dev-only-32-chars!');
export async function createSession(userId: string) { ... }
```

## Related skills
- [[solid-start-security-hardening]] — keeping secrets out of the client bundle.
- [[solid-start-best-practices]] — the server/client boundary rule.
- [[solid-start-session-cookies]] — JWT_SECRET and session cookie handling.
- [[solid-start-initiation-scaffold]] — setting up the env split at bootstrap.
