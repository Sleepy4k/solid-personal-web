---
name: solid-start-authentication-guard-routes
description: Guard SolidStart routes - check the session in a query/middleware and redirect server-side before rendering, plus re-check in every action - instead of hiding UI on the client while data still loads.
related:
  - solid-start-session-cookies
  - solid-start-middleware
  - solid-start-server-actions-mutations
  - solid-start-security-hardening
---

# SolidStart Authentication Guard Routes
- Protected routes verify the session **on the server** (in a `query`/route `preload` or middleware) and `redirect` before any private data is sent.
- Every server action/endpoint re-checks auth — guarding the route UI is not enough, since actions are independent endpoints.
- Client-side hiding is cosmetic only; the authoritative gate is server-side.

## Safety contract: non-negotiable
- Abort if a route only hides content client-side (`<Show when={user()}>`) while the server already sent the private data (leak in the payload).
- Abort if the route is guarded but its actions/endpoints aren't (attacker calls the action directly — see [[solid-start-server-actions-mutations]]).
- Abort if the auth check reads a client-tamperable value (localStorage flag) instead of a signed server session.
- Abort if `redirect` happens after expensive private queries run (work + potential data exposure before the gate).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`query`, `redirect`, route `preload`), a session helper, optionally middleware.

## Gotchas
- Throw `redirect('/login')` from a `query`/server function so the redirect happens during SSR, before markup is generated.
- Put the auth check first in the data flow; don't fetch private data and then decide whether the user may see it.
- Middleware can attach `event.locals.user` once; route queries then read it instead of re-parsing the cookie each time.
- A guarded page still needs each action to verify auth independently.

## Workflow
1. Write a `requireUser()` server function that loads the session and `redirect`s if absent.
2. Call it first in the route's `preload`/data query.
3. Re-check auth/role inside every action and API route.
4. Optionally attach the user in middleware for reuse.

## Code Examples (Good vs Bad)

### Bad Example 1 (client-only hide, data already sent)
```tsx
export default function Admin() {
  const data = createAsync(() => getAllSalaries());   // server already fetched + serialized it
  return <Show when={useUser()()?.isAdmin}>{/* private data is in the HTML payload regardless */}
    <Table rows={data()} /></Show>;
}
```

### Bad Example 2 (route guarded, action open)
```tsx
// route checks admin, but:
export const deleteUser = action(async (id: string) => {
  'use server';
  await db.user.delete({ where: { id } });            // no auth check -> called directly = bypass
});
```

### Bad Example 3 (trusting a client-tamperable flag)
```tsx
export default function Dashboard() {
  if (localStorage.getItem('isAdmin') !== 'true') return <Redirect href="/login" />;
  // localStorage is attacker-controlled -> set it and walk in
  return <AdminPanel />;
}
```

### Bad Example 4 (fetch private data, then decide)
```tsx
const requireAdmin = query(async () => {
  'use server';
  const salaries = await db.salary.findMany();   // expensive private fetch runs first
  const user = await getSession();
  if (!user?.isAdmin) throw redirect('/login');  // gate too late — work already done, data nearly sent
  return salaries;
}, 'salaries');
```

### Bad Example 5 (no role check, only authentication)
```tsx
const requireUser = query(async () => {
  'use server';
  const user = await getSession();
  if (!user) throw redirect('/login');           // any logged-in user reaches the admin route
  return user;                                    // missing the isAdmin check
}, 'require-user');
```

### Good Example 1 (server-side guard before data)
```tsx
import { query, redirect, createAsync } from '@solidjs/router';
const requireAdmin = query(async () => {
  'use server';
  const user = await getSession();
  if (!user?.isAdmin) throw redirect('/login');        // SSR redirect, before private fetch
  return user;
}, 'require-admin');
export const route = { preload: () => requireAdmin() };
export default function Admin() {
  const data = createAsync(() => getSalaries());        // only reached when authorized
  return <Suspense><Table rows={data()} /></Suspense>;
}
```

### Good Example 2 (action re-checks auth)
```tsx
export const deleteUser = action(async (id: string) => {
  'use server';
  const user = await getSession();
  if (!user?.isAdmin) throw redirect('/login');         // independent gate
  await db.user.delete({ where: { id } });
});
```

### Good Example 3 (middleware attaches the user once)
```ts
import { createMiddleware } from '@solidjs/start/middleware';
export default createMiddleware({
  onRequest: async (event) => {
    event.locals.user = await getSession(event); // parsed once per request
  },
});
```

### Good Example 4 (route query reads locals, redirects early)
```tsx
import { getRequestEvent } from 'solid-js/web';
const requireAdmin = query(async () => {
  'use server';
  const user = getRequestEvent()!.locals.user;        // reuse middleware result
  if (!user?.isAdmin) throw redirect('/login');        // gate before any private fetch
  return user;
}, 'require-admin');
```

### Good Example 5 (role-checked guard with typed roles)
```tsx
const requireRole = (role: 'admin' | 'editor') => query(async () => {
  'use server';
  const user = await getSession();
  if (!user) throw redirect('/login');
  if (!user.roles.includes(role)) throw redirect('/403'); // authorization, not just authentication
  return user;
}, `require-${role}`);
```

## Related skills
- [[solid-start-session-cookies]] — the session the guard reads.
- [[solid-start-middleware]] — attaching the user per request.
- [[solid-start-server-actions-mutations]] — actions re-checking auth.
- [[solid-start-security-hardening]] — server-authoritative access control.
