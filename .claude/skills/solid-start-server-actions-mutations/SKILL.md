---
name: solid-start-server-actions-mutations
description: Mutate data with SolidStart actions - "use server" functions that authenticate, validate input, perform the write, and revalidate - treating every action as a public, untrusted endpoint.
related:
  - solid-start-solidstart-v2-features
  - solid-start-session-cookies
  - solid-start-security-hardening
  - solid-start-optimistic-ui-updates
---

# SolidStart Server Actions & Mutations
- Writes are `action(async (...) => { 'use server'; ... })` functions; the client gets an RPC stub, the code runs only on the server.
- Every action authenticates the session, authorizes the user, and validates input with a schema before touching the database.
- On success the action `revalidate`s affected queries so the UI reflects the change.

## Safety contract: non-negotiable
- Abort if an action performs a write without verifying the session/role (it's a public endpoint anyone can POST to).
- Abort if client input is used unvalidated (`db.delete(id)` with a raw id — IDOR / injection of arbitrary ids).
- Abort if the action returns sensitive data or internal errors to the client (information disclosure).
- Abort if a mutation doesn't `revalidate`/`reload` the relevant query (stale UI after the write).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`action`, `revalidate`, `redirect`), a schema validator, a session helper.

## Gotchas
- A `"use server"` action is reachable by direct HTTP request — never assume it's only called from your UI; re-check auth + input every time.
- Throw `redirect('/login')` from an action to bounce unauthenticated users; throw a typed error for validation failures.
- `revalidate(queryKey)` refreshes one cached read; `reload()` refreshes the route — pick the narrowest.
- Actions integrate with `<form action={...}>` for progressive enhancement (works before JS hydration).

## Workflow
1. Define `action(async (form) => { 'use server'; ... })`.
2. Load + verify the session/role; `redirect` if unauthorized.
3. Validate input with a schema; perform the write.
4. `revalidate` affected queries; return only what the client needs.

## Code Examples (Good vs Bad)

### Bad Example 1 (no auth, raw client input)
```ts
export const deleteUser = action(async (id: string) => {
  'use server';
  await db.user.delete({ where: { id } }); // anyone can delete any user id -> IDOR, no auth
});
```

### Bad Example 2 (leaks internals, no revalidate)
```ts
export const updateEmail = action(async (form: FormData) => {
  'use server';
  try { await db.user.update({ data: { email: form.get('email') } }); } // unvalidated
  catch (e) { return { error: e.stack }; }   // leaks stack trace; UI not revalidated
});
```

### Bad Example 3 (action returns sensitive fields)
```ts
export const getProfile = action(async (id: string) => {
  'use server';
  return db.user.findUnique({ where: { id } }); // ships passwordHash, resetToken, mfaSecret to the client
});
```

### Bad Example 4 (write with no revalidate -> stale list)
```ts
export const addTodo = action(async (form: FormData) => {
  'use server';
  await db.todo.create({ data: { text: form.get('text') as string } });
  // never revalidates listTodos -> the new row doesn't appear until a full reload
});
```

### Bad Example 5 (authz only in the UI)
```tsx
export const deleteUser = action(async (form: FormData) => {
  'use server';
  await db.user.delete({ where: { id: form.get('id') as string } }); // no server check
});
function Admin(props) {
  return <Show when={props.user.isAdmin}><form action={deleteUser}><button>Delete</button></form></Show>;
  // hiding the form is cosmetic — anyone can POST to the action directly
}
```

### Good Example 1 (auth + validate + write + revalidate)
```ts
import { action, redirect, revalidate } from '@solidjs/router';
import { z } from 'zod';
const schema = z.object({ id: z.string().uuid() });
export const deleteUser = action(async (form: FormData) => {
  'use server';
  const session = await getSession();
  if (!session?.isAdmin) throw redirect('/login');          // authz
  const { id } = schema.parse(Object.fromEntries(form));    // validate
  await db.user.delete({ where: { id } });
  return revalidate(listUsers.key);                         // refresh the list
});
```

### Good Example 2 (progressive-enhancement form)
```tsx
import { useSubmission } from '@solidjs/router';
function DeleteButton(props) {
  const submission = useSubmission(deleteUser);
  return (
    <form action={deleteUser} method="post">
      <input type="hidden" name="id" value={props.id} />
      <button disabled={submission.pending}>Delete</button>   {/* works without JS */}
    </form>
  );
}
```

### Good Example 3 (return only what the client needs)
```ts
export const getProfile = action(async (id: string) => {
  'use server';
  const session = await getSession();
  if (session.data.userId !== id) throw redirect('/login');     // own profile only
  const u = await db.user.findUnique({ where: { id } });
  return { id: u.id, name: u.name, email: u.email };            // no secrets in the payload
});
```

### Good Example 4 (pending state via useSubmission)
```tsx
import { useSubmission } from '@solidjs/router';
function AddTodo() {
  const sub = useSubmission(addTodo);
  return (
    <form action={addTodo} method="post">
      <input name="text" required />
      <button disabled={sub.pending}>{sub.pending ? 'Saving…' : 'Add'}</button>
    </form>
  );
}
```

### Good Example 5 (typed validation error returned to the UI)
```ts
const schema = z.object({ email: z.string().email() });
export const updateEmail = action(async (form: FormData) => {
  'use server';
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }; // typed, safe
  await db.user.update({ where: { id: await currentUserId() }, data: parsed.data });
  return revalidate(getProfile.key);
});
```

## Related skills
- [[solid-start-solidstart-v2-features]] — the action/query/revalidate model.
- [[solid-start-session-cookies]] — the session an action authenticates against.
- [[solid-start-security-hardening]] — treating actions as untrusted endpoints.
- [[solid-start-optimistic-ui-updates]] — reflecting the mutation instantly.
