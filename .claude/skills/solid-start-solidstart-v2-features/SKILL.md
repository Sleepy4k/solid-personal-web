---
name: solid-start-solidstart-v2-features
description: Use the modern SolidStart data model - query() for cached reads, createAsync to consume, action() + useSubmission for mutations, and revalidate - instead of the deprecated cache/createRouteData API.
related:
  - solid-start-basic-code
  - solid-start-server-actions-mutations
  - solid-start-optimistic-ui-updates
  - solid-start-headers-caching-config
---

# SolidStart Modern Data Features
- Reads are defined with `query(fn, 'key')` (cached, deduplicated, preloadable) and consumed via `createAsync`.
- Mutations are `action(fn)`; UI tracks them with `useSubmission`/`useAction` and refreshes data with `revalidate`.
- Route `preload` warms queries on navigation so data is ready on arrival.

## Safety contract: non-negotiable
- Abort if a data loader performs writes (loaders/queries must be side-effect-free reads; use `action` for mutations).
- Abort if server-only loader internals (secrets/DB handles) leak to the client (wrap in `"use server"`).
- Abort if the deprecated `cache`/`createRouteData`/`useRouteData` API is used in a new app instead of `query`/`createAsync`/`action`.
- Abort if `query` keys collide or are non-deterministic (wrong cache hits / no dedup).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`query`, `action`, `createAsync`, `useSubmission`, `revalidate`, `preload`).

## Gotchas
- `query` replaced `cache`; `createAsync` replaced `createRouteData`/`useRouteData` — the old names are deprecated.
- A `query` is keyed; `getX.keyFor(args)` gives the cache key to `revalidate` after a mutation.
- Define a route `preload` that calls the query so navigation prefetches it (no waterfall on render).
- `createAsync` suspends; wrap consumers in `<Suspense>` and an `<ErrorBoundary>`.

## Workflow
1. Define reads as `query(fn, 'key')`; keep server bits behind `"use server"`.
2. Add a route `preload` that invokes the query.
3. Consume with `createAsync` under `<Suspense>`.
4. Mutate with `action`; `revalidate` the query key (see [[solid-start-optimistic-ui-updates]]).

## Code Examples (Good vs Bad)

### Bad Example 1 (loader does a write)
```tsx
const loadUser = query(async (id: string) => {
  'use server';
  await db.user.update({ where: { id }, data: { lastSeen: new Date() } }); // write in a read loader
  return db.user.findUnique({ where: { id } });
}, 'user');
```

### Bad Example 2 (deprecated API + fetch on render)
```tsx
import { createRouteData, useRouteData } from 'solid-start'; // deprecated names
export const routeData = ({ params }) => createRouteData(() => fetch(`/api/u/${params.id}`));
```

### Bad Example 3 (non-deterministic query key)
```tsx
const getFeed = query(async () => { 'use server'; return db.feed(); }, `feed-${Date.now()}`); // key changes every call -> never dedups/caches
```

### Bad Example 4 (reading createAsync value without Suspense)
```tsx
export default function User(props) {
  const user = createAsync(() => getUser(props.params.id)); // suspends
  return <span>{user().name}</span>;                         // no <Suspense> -> throws while pending
}
```

### Bad Example 5 (manual refetch signal instead of revalidate)
```tsx
const [tick, setTick] = createSignal(0);
const users = createAsync(() => { tick(); return listUsers(); }); // hacky cache-buster
const onSave = async () => { await saveUser(); setTick(t => t + 1); }; // should be revalidate(listUsers.key)
```

### Good Example 1 (query + preload + createAsync)
```tsx
import { query, createAsync, type RouteDefinition } from '@solidjs/router';
const getUser = query(async (id: string) => { 'use server'; return db.user.findUnique({ where: { id } }); }, 'user');
export const route = { preload: ({ params }) => getUser(params.id) } satisfies RouteDefinition;
export default function User(props) {
  const user = createAsync(() => getUser(props.params.id));
  return <Suspense fallback={<Spinner/>}>{user()?.name}</Suspense>;
}
```

### Good Example 2 (action + useSubmission + revalidate)
```tsx
import { action, useSubmission, revalidate } from '@solidjs/router';
const rename = action(async (id: string, name: string) => {
  'use server';
  await db.user.update({ where: { id }, data: { name } });
  return revalidate(getUser.keyFor(id));
});
function Form(props) {
  const submission = useSubmission(rename);
  return <button disabled={submission.pending} onClick={() => rename(props.id, 'Ada')}>Save</button>;
}
```

### Good Example 3 (stable, descriptive query key)
```tsx
const getFeed = query(async (cursor: string) => { 'use server'; return db.feed({ cursor }); }, 'feed'); // dedups by 'feed' + args
```

### Good Example 4 (Suspense + ErrorBoundary around createAsync)
```tsx
export default function User(props) {
  const user = createAsync(() => getUser(props.params.id));
  return (
    <ErrorBoundary fallback={<p>Failed</p>}>
      <Suspense fallback={<Spinner/>}><span>{user()?.name}</span></Suspense>
    </ErrorBoundary>
  );
}
```

### Good Example 5 (revalidate the key after a mutation)
```tsx
const saveUser = action(async (data: FormData) => {
  'use server';
  await db.user.update({ /* ... */ });
  return revalidate(listUsers.key); // refreshes the cached read, no manual signal
});
```

## Related skills
- [[solid-start-basic-code]] — the everyday usage of these primitives.
- [[solid-start-server-actions-mutations]] — actions and `"use server"` in depth.
- [[solid-start-optimistic-ui-updates]] — `useSubmission` for optimistic UI.
- [[solid-start-headers-caching-config]] — caching reads at the HTTP layer too.
