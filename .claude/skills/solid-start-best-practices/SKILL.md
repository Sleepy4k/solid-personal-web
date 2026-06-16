---
name: solid-start-best-practices
description: Enforce the SolidStart quality gate - server/client code separation via "use server", query/action for data, validated inputs on the server, and no secrets in client bundles - across the app.
related:
  - solid-start-basic-code
  - solid-start-security-hardening
  - solid-start-server-actions-mutations
  - solid-start-project-structure
---

# SolidStart Best Practices
- A clear server/client boundary: server-only modules use `"use server"` or live in `routes/api`; client code never imports DB/secrets.
- Reads go through `query()`, writes through `action()`, both with server-side input validation.
- Env vars are split: `VITE_`-prefixed for the client (public), everything else server-only.

## Safety contract: non-negotiable
- Abort if a server module's secret/DB import can reach a client component (check the bundle; `"use server"` isolates it).
- Abort if an `action`/server function trusts client input without re-validation (the client is untrusted).
- Abort if a non-`VITE_` secret is read in client code (undefined or, if forced in, leaked).
- Abort if data fetching bypasses `query`/`createAsync` so it isn't cached/SSR-serialized (waterfalls, hydration mismatch).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router`, a schema validator (Zod/Valibot), TypeScript strict, `eslint-plugin-solid`.

## Gotchas
- `"use server"` at the top of a function/file makes it an RPC endpoint; everything it imports stays server-side — the key separation tool.
- Validate inside the server function, not just in the browser; a crafted request hits the endpoint directly.
- `import.meta.env` only exposes `VITE_` keys to the client; server reads use `process.env`.
- Co-locate `query`/`action` definitions so route preloading and revalidation are coherent.

## Workflow
1. Mark server-only code with `"use server"`; keep DB/secret imports out of client components.
2. Validate every server-function input with a schema.
3. Use `query`/`createAsync` for reads and `action` for writes.
4. Enforce TS strict + lint in CI; keep secrets in non-`VITE_` env.

## Code Examples (Good vs Bad)

### Bad Example 1 (unvalidated server action + client secret)
```tsx
const KEY = import.meta.env.STRIPE_SECRET;        // not VITE_ -> undefined client-side
const pay = action(async (form: FormData) => {
  'use server';
  await charge(form.get('amount'));               // no validation: amount could be anything
});
```

### Bad Example 2 (fetch bypasses query, server import in client)
```tsx
import { db } from '~/db';                         // pulled into client bundle
export default function P() {
  const [d, setD] = createSignal();
  fetch('/api/report').then(r => r.json()).then(setD); // no cache/SSR
}
```

### Bad Example 3 (secret interpolated into client JSX)
```tsx
export default function P() {
  return <img src={`https://api.co/x?key=${process.env.MAPS_KEY}`} />; // key ends up in the HTML/bundle
}
```

### Bad Example 4 (business logic duplicated client + server, drifts)
```tsx
function priceClient(qty) { return qty * 9.99; }   // UI total
const checkout = action(async (form) => {
  'use server';
  await charge(Number(form.get('qty')) * 8.5);     // server uses a DIFFERENT price -> mismatch/abuse
});
```

### Bad Example 5 (no schema, manual ad-hoc parsing)
```tsx
const save = action(async (form: FormData) => {
  'use server';
  const age = parseInt(form.get('age') as string);  // NaN passes; negative passes; no bounds
  await db.user.update({ data: { age } });
});
```

### Good Example 1 (validated server action)
```tsx
import { z } from 'zod';
const schema = z.object({ amount: z.coerce.number().int().positive() });
const pay = action(async (form: FormData) => {
  'use server';
  const { amount } = schema.parse(Object.fromEntries(form)); // re-validated on server
  await charge(amount);                                       // secret read via process.env here
});
```

### Good Example 2 (query/createAsync + public env)
```tsx
const getReport = query(async () => { 'use server'; return db.report.latest(); }, 'report');
export default function P() {
  const report = createAsync(() => getReport());   // cached + serialized
  const base = import.meta.env.VITE_API_BASE;       // public value only
  return <Suspense><Chart data={report()} /></Suspense>;
}
```

### Good Example 3 (public key via VITE_, secret stays server-side)
```tsx
// client: only the publishable/public value is exposed
const pk = import.meta.env.VITE_MAPS_PUBLIC_KEY;
const tiles = query(async () => { 'use server'; return loadTiles(process.env.MAPS_SECRET!); }, 'tiles');
```

### Good Example 4 (single source of truth on the server)
```tsx
const price = (qty: number) => qty * 9.99;          // shared pure helper
const checkout = action(async (form: FormData) => {
  'use server';
  const qty = z.coerce.number().int().positive().parse(form.get('qty'));
  await charge(price(qty));                          // server computes the authoritative total
});
```

### Good Example 5 (schema with bounds, server-validated)
```tsx
const schema = z.object({ age: z.coerce.number().int().min(0).max(150) });
const save = action(async (form: FormData) => {
  'use server';
  const { age } = schema.parse(Object.fromEntries(form)); // rejects NaN / out-of-range
  await db.user.update({ data: { age } });
});
```

## Related skills
- [[solid-start-basic-code]] — the core query/action/"use server" idioms.
- [[solid-start-security-hardening]] — boundary and secret rules as security controls.
- [[solid-start-server-actions-mutations]] — validated mutations.
- [[solid-start-project-structure]] — where the boundary lives in the tree.
