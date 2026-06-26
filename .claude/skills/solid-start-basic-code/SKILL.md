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
- Routing is file-based under `src/routes`; pages are plain Solid components with `export const route` for preloading.

## Safety contract: non-negotiable
- Abort if data is fetched in `createEffect`/component body instead of `query()` + `createAsync` (no caching/SSR serialization, races).
- Abort if server-only code (DB clients, secret keys) runs in a module without `"use server"` isolation (bundled into the client → leak).
- Abort if a mutation is done by calling `fetch('/api', {method:'POST'})` by hand instead of an `action()` (no progressive enhancement, no revalidation).
- Abort if `query` keys aren't unique/stable (cache collisions or no dedup).

## Required tools
- `@solidjs/start` >= 2 alpha, `@solidjs/router` (`query`, `action`, `createAsync`, `revalidate`), SolidJS >= 1.8.

## Gotchas
- `query(fn, 'key')` caches by key and dedups concurrent calls; consume it via `createAsync(() => getX())` so the route can preload and serialize it.
- `"use server"` marks a function/file as server-only; the client gets an RPC stub, not the code — that's how secrets stay server-side.
- `createAsync` integrates with Suspense; the value is a signal you read with `data()`.
- The modern API is `query`/`action` from `@solidjs/router` (formerly `cache`/`createRouteData`); do NOT use the deprecated names.
- `server/db/*.ts` query files do NOT have `"use server"` at the file top — only inside each `query()` callback. The file is imported by routes.
- `lib/server/*.ts` utility files DO have `"use server"` at the file top — never imported by client code.
- Always wrap `createAsync` consumers in `<Suspense>` — the data is undefined until the promise resolves.

## Workflow
1. Define a `query(async () => { "use server"; ... }, "unique-key")` in `src/server/db/`.
2. Preload it in the route: `export const route: RouteDefinition = { preload: () => getX() }`.
3. Consume with `const data = createAsync(() => getX())` inside the component.
4. Wrap async output in `<Suspense fallback={<Skeleton />}>`.
5. For writes, define `action(async (form: FormData) => { "use server"; ...; return revalidate(getX.key); }, "name")` in `src/server/actions/`.
6. Use `useAction(myAction)` or `<form action={myAction}>` in the component.

## Code Examples (Good vs Bad)

### Bad Example 1 (fetch in effect, no cache/SSR)
```tsx
export default function User(props) {
  const [data, setData] = createSignal();
  createEffect(() => fetch(`/api/u/${props.id}`).then(r => r.json()).then(setData)); // race, no SSR
  return <span>{data()?.name}</span>;
}
```

### Bad Example 2 (server code without "use server" -> leaks)
```tsx
import { db } from '~/server/db/client';   // DB client bundled into the client chunk
export default function Page() {
  const user = db.user.findFirst();        // runs in the browser -> exposes DB / fails
  return <span>{user.name}</span>;
}
```

### Bad Example 3 (createResource loses SSR serialization)
```tsx
export default function User(props) {
  const [user] = createResource(() => props.id, fetchUser); // not query() -> no dedup, refetches on client
  return <span>{user()?.name}</span>;
}
```

### Bad Example 4 (mutation via hand-rolled fetch)
```tsx
async function rename(id, name) {
  await fetch('/api/rename', { method: 'POST', body: JSON.stringify({ id, name }) });
  // no action() -> no progressive enhancement, no automatic revalidation
}
```

### Bad Example 5 (non-unique query key collides)
```tsx
const getProjects = query(async () => { 'use server'; return db.project.findMany(); }, 'data');
const getStats = query(async () => { 'use server'; return db.stats.count(); }, 'data');
// both keyed 'data' -> cache collision
```

### Good Example 1 (query + createAsync + Suspense — real project pattern)
```tsx
// src/server/db/portfolio.ts
import { query } from '@solidjs/router';
import { db } from '~/server/db/client';

export const getPortfolioData = query(async () => {
  'use server';
  const [profile, projects] = await Promise.all([
    db.profile.findFirst({ include: { links: true } }),
    db.project.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }] }),
  ]);
  return { profile, projects };
}, 'portfolio');

// src/routes/index.tsx
export const route: RouteDefinition = { preload: () => getPortfolioData() };
export default function Home() {
  const data = createAsync(() => getPortfolioData());
  return (
    <Suspense fallback={<Hero loading />}>
      <Hero profile={data()?.profile} loading={data() === undefined} />
    </Suspense>
  );
}
```

### Good Example 2 (action for a write + revalidate — real project pattern)
```tsx
// src/server/actions/projects.ts
import { action, revalidate } from '@solidjs/router';
import { db } from '~/server/db/client';
import { getProjects } from '~/server/db/dashboard';

export const deleteProject = action(async (form: FormData) => {
  'use server';
  await db.project.delete({ where: { id: String(form.get('id')) } });
  return revalidate(getProjects.key);
}, 'delete-project');

// src/routes/dashboard/projects.tsx
const doDelete = useAction(deleteProject);
const form = new FormData();
form.set('id', proj.id);
await doDelete(form);
```

### Good Example 3 (unique, stable query keys)
```tsx
export const getProjects = query(async () => { 'use server'; return db.project.findMany(); }, 'dashboard-projects');
export const getProfile = query(async () => { 'use server'; return db.profile.findFirst(); }, 'dashboard-profile');
// distinct keys -> independent caches, correct dedup
```

### Good Example 4 (preload on the route for instant data)
```tsx
export const route: RouteDefinition = { preload: () => getProjects() };
export default function ProjectsPage() {
  const items = createAsync(() => getProjects());
  return (
    <Suspense fallback={<SkeletonCard />}>
      <For each={items()}>{proj => <ProjectCard proj={proj} />}</For>
    </Suspense>
  );
}
```

### Good Example 5 (action with FormData + useAction)
```tsx
// component with useAction (programmatic submission)
function DeleteButton(props: { id: string }) {
  const doDelete = useAction(deleteProject);
  const [loading, setLoading] = createSignal(false);
  return (
    <button disabled={loading()} onClick={async () => {
      setLoading(true);
      const form = new FormData();
      form.set('id', props.id);
      await doDelete(form);
      setLoading(false);
    }}>
      Delete
    </button>
  );
}
```

## Related skills
- [[solid-start-server-actions-mutations]] — actions and `"use server"` in depth.
- [[solid-start-best-practices]] — the quality gate.
- [[solid-start-project-structure]] — where routes/queries/actions live.
- [[solid-start-solidstart-v2-features]] — the query/action/createAsync data model.
