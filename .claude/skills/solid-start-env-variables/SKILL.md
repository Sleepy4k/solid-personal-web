---
name: solid-start-env-variables
description: Split SolidStart env vars correctly - VITE_-prefixed public values via import.meta.env for the client, secrets via process.env in "use server" code only - so keys never reach the browser bundle.
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

## Safety contract: non-negotiable
- Abort if a secret is `VITE_`-prefixed or read via `import.meta.env` in client-reachable code (it ships in the JS bundle — public).
- Abort if `.env` with real secrets is committed (only `.env.example` belongs in git).
- Abort if `process.env.SECRET` is referenced from a module that a client component imports without a `"use server"` boundary (bundler may inline/expose or fail).
- Abort if a required env var is unvalidated and silently `undefined` at runtime (subtle production failures).

## Required tools
- `@solidjs/start` >= 1, Vite `import.meta.env`, Node `process.env`, optionally a schema (Zod) to validate env at boot.

## Gotchas
- Vite only exposes `VITE_`-prefixed vars to the client; non-prefixed vars are `undefined` in the browser — by design.
- `process.env` works in server code (`"use server"`, `routes/api`, middleware); in client code it's empty/replaced.
- Anything reachable from a client component's import graph can be bundled — keep secrets behind `"use server"`.
- Validate critical env vars once at startup so a missing key fails loudly, not deep in a request.

## Workflow
1. Name public vars `VITE_*`; read with `import.meta.env`.
2. Read secrets via `process.env` only inside server code.
3. Commit `.env.example`; gitignore `.env`.
4. Validate required vars with a schema at server startup.

## Code Examples (Good vs Bad)

### Bad Example 1 (secret exposed to client)
```tsx
const STRIPE = import.meta.env.VITE_STRIPE_SECRET;   // VITE_ + secret -> shipped to browser
export default function Pay() { return <Checkout key={STRIPE} />; } // key is public now
```

### Bad Example 2 (process.env secret in a client component)
```tsx
// src/routes/index.tsx (a page/client component)
const dbUrl = process.env.DATABASE_URL;              // undefined client-side, or leaked if forced in
```

### Bad Example 3 (committing real .env)
```bash
git add .env            # contains DATABASE_URL + SESSION_SECRET -> secrets now in history forever
git commit -m "add env"
```

### Bad Example 4 (secret in a shared module a page imports)
```ts
// src/lib/stripe.ts — imported by both a page and an action, NO "use server"
export const stripe = new Stripe(process.env.STRIPE_SECRET!); // bundler pulls the key toward the client
```

### Bad Example 5 (unvalidated env, silent undefined)
```ts
const ttl = Number(process.env.SESSION_TTL);  // unset -> NaN -> sessions expire immediately, no error at boot
const session = await useSession({ password: process.env.SESSION_SECRET!, cookie: { maxAge: ttl } });
```

### Good Example 1 (correct split)
```tsx
// client: public base URL
const base = import.meta.env.VITE_API_BASE;
// server-only secret behind a boundary
const charge = action(async (amount: number) => {
  'use server';
  const stripe = new Stripe(process.env.STRIPE_SECRET!); // never leaves the server
  return stripe.charge(amount);
});
```

### Good Example 2 (validated env at boot)
```ts
// src/lib/env.server.ts
import { z } from 'zod';
export const env = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
}).parse(process.env);                                // fails loudly at startup if missing
```

### Good Example 3 (.gitignore + committed example)
```bash
# .gitignore
.env
.env.*.local
# committed instead: .env.example documents keys with placeholder values
# DATABASE_URL=postgres://user:pass@host/db
# SESSION_SECRET=change-me-min-32-chars
```

### Good Example 4 (secret module isolated behind "use server")
```ts
// src/lib/stripe.server.ts
export async function charge(amount: number) {
  'use server';                                  // boundary -> key never crosses to the client
  return new Stripe(process.env.STRIPE_SECRET!).charge(amount);
}
```

### Good Example 5 (typed, validated env accessor)
```ts
import { env } from '~/lib/env.server';          // parsed once at boot via Zod
const session = await useSession({
  password: env.SESSION_SECRET,                  // typed string, guaranteed >=32 chars
  cookie: { maxAge: env.SESSION_TTL },           // typed number, validated range
});
```

## Related skills
- [[solid-start-security-hardening]] — keeping secrets out of the client bundle.
- [[solid-start-best-practices]] — the server/client boundary rule.
- [[solid-start-session-cookies]] — SESSION_SECRET handling.
- [[solid-start-initiation-scaffold]] — setting up the env split at bootstrap.
