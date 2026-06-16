---
name: solid-start-basic-code
description: Write idiomatic SolidStart - query()+createAsync for reads, action() for writes, "use server" for server-only code, and file-based routing - instead of fetch-in-effect or leaking server code to the client.
related:
  - solid-start-server-actions-mutations
  - solid-start-best-practices
  - solid-start-project-structure
  - solid-start-solidstart-v2-features
---

# SolidStart Basic Code
- Data reads use `query()` (cached, dedup'd, revalidatable) consumed via `createAsync`; writes use `action()`.
- Server-only logic is isolated with the `"use server"` directive so secrets/DB code never ship to the client.
- Routing is file-based under `src/routes`; pages are plain Solid components enhanced by the framework.

## Safety contract: non-negotiable
- Abort if data is fetched in `createEffect`/component body instead of `query()` + `createAsync` (no caching/SSR serialization, races).
- Abort if server-only code (DB clients, secret keys) runs in a module without `"use server"`/server-route isolation (bundled into the client → leak).
- Abort if a mutation is done by calling `fetch('/api', {method:'POST'})` by hand instead of an `action()` (no progressive enhancement, no revalidation).
- Abort if `query` keys aren't unique/stable (cache collisions or no dedup).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`query`, `action`, `createAsync`), SolidJS >= 1.8, Vinxi/Nitro.

## Gotchas
- `query(fn, 'key')` caches by key and dedups concurrent calls; read it through `createAsync(() => getX(id))` so the route can preload and serialize it.
- `"use server"` marks a function/file as server-only; the client gets an RPC stub, not the code — that's how secrets stay server-side.
- `createAsync` integrates with Suspense; the value is a signal you read with `data()`.
- The modern API is `query`/`action` (formerly `cache`/`createRouteData`); prefer it over the deprecated names.

## Workflow
1. Define a `query()` for each read; consume with `createAsync`.
2. Put server-only work behind `"use server"` (or in `routes/api`).
3. Define `action()` for writes; revalidate affected queries.
4. Wrap async consumers in `<Suspense>`/`<ErrorBoundary>`.

## Code Examples (Good vs Bad)

### Bad Example 1 (fetch in effect, no cache/SSR)
```jsx
export default function User(props) {
  const [data, setData] = createSignal();
  createEffect(() => fetch(`/api/u/${props.id}`).then(r => r.json()).then(setData)); // race, no SSR
  return <span>{data()?.name}</span>;
}
```

### Bad Example 2 (server code without "use server" -> leaks)
```jsx
import { db } from '~/db';                    // DB client bundled into the client chunk
export default function Page() {
  const user = db.user.findFirst();           // runs in the browser -> exposes DB / fails
  return <span>{user.name}</span>;
}
```

### Bad Example 3 (createResource loses SSR serialization)
```tsx
export default function User(props) {
  const [user] = createResource(() => props.id, fetchUser); // not query() -> no dedup, refetches on the client
  return <span>{user()?.name}</span>;
}
```

### Bad Example 4 (mutation via hand-rolled fetch)
```tsx
async function rename(id, name) {
  await fetch('/api/rename', { method: 'POST', body: JSON.stringify({ id, name }) });
  // no action() -> no progressive enhancement, no automatic revalidation of the cached read
}
```

### Bad Example 5 (non-unique query key collides)
```tsx
const getUser = query(async (id) => { 'use server'; return db.user.findUnique({ where: { id } }); }, 'data');
const getPost = query(async (id) => { 'use server'; return db.post.findUnique({ where: { id } }); }, 'data');
// both keyed 'data' -> cache collision, one read returns the other's value
```

### Good Example 1 (query + createAsync)
```tsx
import { query, createAsync } from '@solidjs/router';
const getUser = query(async (id: string) => {
  'use server';
  return db.user.findUnique({ where: { id } }); // server-only, cached, serialized
}, 'user');
export default function User(props) {
  const user = createAsync(() => getUser(props.id));
  return <Suspense fallback={<Spinner/>}><span>{user()?.name}</span></Suspense>;
}
```

### Good Example 2 (action for a write)
```tsx
import { action, revalidate } from '@solidjs/router';
const renameUser = action(async (id: string, name: string) => {
  'use server';
  await db.user.update({ where: { id }, data: { name } });
  return revalidate(getUser.keyFor(id));        // refresh the cached read
});
```

### Good Example 3 (unique, stable query keys)
```tsx
const getUser = query(async (id: string) => { 'use server'; return db.user.findUnique({ where: { id } }); }, 'user');
const getPost = query(async (id: string) => { 'use server'; return db.post.findUnique({ where: { id } }); }, 'post');
// distinct keys -> independent caches, correct dedup
```

### Good Example 4 (preload on the route for instant data)
```tsx
export const route = {
  preload: ({ params }) => getUser(params.id), // fetch starts with navigation -> data ready on arrival
};
export default function User(props) {
  const user = createAsync(() => getUser(props.params.id));
  return <Suspense fallback={<Spinner/>}>{user()?.name}</Suspense>;
}
```

### Good Example 5 (API route for a third-party webhook)
```ts
// src/routes/api/webhook.ts — not a page, returns a Response
export async function POST(event) {
  'use server';
  const body = await event.request.json();
  await handleWebhook(body);
  return new Response(null, { status: 204 });
}
```

## Related skills
- [[solid-start-server-actions-mutations]] — actions and `"use server"` in depth.
- [[solid-start-best-practices]] — the quality gate.
- [[solid-start-project-structure]] — where routes/queries/actions live.
- [[solid-start-solidstart-v2-features]] — the query/action/createAsync data model.
