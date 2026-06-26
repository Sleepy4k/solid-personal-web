---
name: solid-start-server-actions-mutations
description: Mutate data with SolidStart actions - "use server" functions that authenticate via event.locals (set by middleware), validate input with Zod, perform the write, and revalidate - treating every action as a public, untrusted endpoint.
related:
  - solid-start-solidstart-v2-features
  - solid-start-session-cookies
  - solid-start-security-hardening
  - solid-start-optimistic-ui-updates
---

# SolidStart Server Actions & Mutations
- Writes are `action(async (form: FormData) => { 'use server'; ... }, 'name')` functions; the client gets an RPC stub, the code runs only on the server.
- Auth context comes from `getRequestEvent()!.locals` (set by `adminAuthMW` middleware) — always check it, never trust client input for identity.
- Every action validates input with Zod before touching the database.
- On success the action calls `revalidate(queryFn.key)` so the UI reflects the change.

## Auth via event.locals (middleware-first pattern)
This project sets `event.locals.userId` and `event.locals.user` in `adminAuthMW` for all `/dashboard/**` requests. Actions inside dashboard routes verify the session by reading locals, not by re-hitting the DB:

```ts
import { getRequestEvent } from 'solid-js/web';
const event = getRequestEvent()!;
if (!event.locals.userId) throw redirect('/login');  // already verified by middleware, this is a belt+suspenders check
```

For actions accessible outside middleware-protected routes (e.g., login itself), do the full session lookup manually.

## Safety contract: non-negotiable
- Abort if an action performs a write without verifying the session/role (it's a public endpoint anyone can POST to).
- Abort if client input is used unvalidated (IDOR / injection risk).
- Abort if the action returns sensitive data (passwordHash, tokens) or internal error stacks to the client.
- Abort if a mutation doesn't `revalidate` the relevant query (stale UI after write).
- Abort if auth is only enforced in the UI (`<Show when={isAdmin}>`) but not inside the action.

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`action`, `revalidate`, `redirect`), Zod, `solid-js/web` (`getRequestEvent`).

## Gotchas
- A `"use server"` action is reachable by direct HTTP POST — never assume it's called only from your UI.
- `getRequestEvent()` is available inside `"use server"` function bodies during a request; it gives access to `locals`, `request`, and `response`.
- `revalidate(queryFn.key)` refreshes one cached read; use the `.key` static property on the `query` function object.
- `throw redirect('/login')` from an action bounces unauthenticated users; it must be thrown, not returned.
- When using `useAction(myAction)` programmatically, build a `FormData` object and pass it; the action always receives `FormData`.
- For pending state, use `useSubmission(myAction)` — it gives `.pending`, `.result`, `.error`.

## Workflow
1. Define `action(async (form: FormData) => { 'use server'; ... }, 'name')` in `src/server/actions/`.
2. Check `getRequestEvent()!.locals.userId` (or do a full session lookup for non-middleware-protected routes).
3. Parse and validate input with Zod.
4. Perform the write.
5. `return revalidate(affectedQuery.key)`.
6. In the component, call via `useAction(myAction)` or `<form action={myAction}>`.

## Code Examples (Good vs Bad)

### Bad Example 1 (no auth, raw client input)
```ts
export const deleteProject = action(async (form: FormData) => {
  'use server';
  await db.project.delete({ where: { id: String(form.get('id')) } }); // anyone can delete any id
});
```

### Bad Example 2 (leaks internals, no revalidate)
```ts
export const updateProfile = action(async (form: FormData) => {
  'use server';
  try { await db.profile.update({ data: { name: form.get('name') } }); } // unvalidated
  catch (e) { return { error: e.stack }; }  // leaks stack trace; UI not revalidated
});
```

### Bad Example 3 (auth only in UI)
```tsx
export const deleteProject = action(async (form: FormData) => {
  'use server';
  await db.project.delete({ where: { id: form.get('id') as string } }); // no server-side check
});
function Admin() {
  return <Show when={isLoggedIn()}><button onClick={() => doDelete(id)}>Delete</button></Show>;
  // hiding the button is cosmetic — direct HTTP POST bypasses it
}
```

### Good Example 1 (auth via locals + Zod + revalidate — real project pattern)
```ts
// src/server/actions/projects.ts
import { action, revalidate } from '@solidjs/router';
import { getRequestEvent } from 'solid-js/web';
import { z } from 'zod';
import { db } from '~/server/db/client';
import { getProjects } from '~/server/db/dashboard';

const deleteSchema = z.object({ id: z.string().min(1) });

export const deleteProject = action(async (form: FormData) => {
  'use server';
  const event = getRequestEvent()!;
  if (!event.locals.userId) throw redirect('/login');  // belt+suspenders; middleware already checked

  const { id } = deleteSchema.parse(Object.fromEntries(form));
  await db.project.delete({ where: { id } });
  return revalidate(getProjects.key);
}, 'delete-project');
```

### Good Example 2 (upsert with full validation)
```ts
export const saveProject = action(async (form: FormData) => {
  'use server';
  if (!getRequestEvent()!.locals.userId) throw redirect('/login');

  const id = String(form.get('id') ?? '');
  const techs = JSON.parse(String(form.get('techs') ?? '[]')) as string[];
  const data = {
    title: String(form.get('title') ?? ''),
    featured: form.get('featured') === 'true',
    order: Number(form.get('order') ?? 0),
    status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).parse(form.get('status')),
  };
  z.object({ title: z.string().min(1), order: z.number().int() }).parse(data);

  let projId = id;
  if (id) {
    await db.project.update({ where: { id }, data });
  } else {
    const created = await db.project.create({ data });
    projId = created.id;
  }
  // sync junction table
  await db.projectTechnology.deleteMany({ where: { projectId: projId } });
  for (const name of techs.filter(Boolean)) {
    const tech = await db.technology.upsert({ where: { name }, create: { name }, update: {} });
    await db.projectTechnology.upsert({
      where: { projectId_technologyId: { projectId: projId, technologyId: tech.id } },
      create: { projectId: projId, technologyId: tech.id },
      update: {},
    });
  }
  return revalidate(getProjects.key);
}, 'save-project');
```

### Good Example 3 (programmatic submission with useAction)
```tsx
// src/routes/dashboard/projects.tsx
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
      Hapus
    </button>
  );
}
```

### Good Example 4 (login action — full session lookup, no locals)
```ts
// src/server/actions/auth.ts — outside middleware-protected zone
export const loginAction = action(async (form: FormData) => {
  'use server';
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Email dan password wajib diisi' };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: 'Email atau password salah' };
  }
  const { token, expiresAt } = await createSession(user.id);
  getRequestEvent()!.response.headers.set('Set-Cookie', sessionCookie(token, expiresAt));
  throw redirect('/dashboard');
}, 'login');
```

### Good Example 5 (pending state via useSubmission)
```tsx
function SaveButton(props: { action: typeof saveProject }) {
  const sub = useSubmission(props.action);
  return (
    <Button type="submit" loading={sub.pending}>
      {sub.pending ? 'Menyimpan...' : 'Simpan'}
    </Button>
  );
}
```

## Related skills
- [[solid-start-solidstart-v2-features]] — the action/query/revalidate model.
- [[solid-start-session-cookies]] — the session an action authenticates against.
- [[solid-start-security-hardening]] — treating actions as untrusted endpoints.
- [[solid-start-optimistic-ui-updates]] — reflecting the mutation instantly.
- [[solid-start-middleware]] — how event.locals.userId is set before actions run.
