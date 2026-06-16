---
name: solid-start-session-cookies
description: Manage SolidStart sessions with useSession - signed, HttpOnly/Secure/SameSite cookies, a server-side SESSION_SECRET, and regeneration on privilege change - instead of readable client cookies.
related:
  - solid-start-authentication-guard-routes
  - solid-start-env-variables
  - solid-start-security-hardening
  - solid-start-request-response-handling
---

# SolidStart Session Cookies
- Sessions use `useSession` (Vinxi/h3) with a server-only `password`/`SESSION_SECRET`, so the cookie is signed/encrypted and tamper-evident.
- The cookie is `HttpOnly`, `Secure`, `SameSite=Lax/Strict` — unreadable by JS and not sent cross-site by default.
- The session id is regenerated on login/privilege change to prevent fixation; sensitive data isn't stored client-side in plain cookies.

## Safety contract: non-negotiable
- Abort if session data is stored in a plain, unsigned/readable cookie or `localStorage` (tampering, theft via XSS).
- Abort if the cookie lacks `HttpOnly`/`Secure`/`SameSite` (JS-readable, sent over HTTP, CSRF-exposed).
- Abort if the `SESSION_SECRET` is committed, hardcoded, or `VITE_`-prefixed (signing key becomes public).
- Abort if the session isn't regenerated after login/privilege escalation (session fixation).

## Required tools
- `@solidjs/start` >= 1, `useSession` from `vinxi/http`, a strong `SESSION_SECRET` (server env), HTTPS in production.

## Gotchas
- `useSession({ password })` needs a ≥32-char secret from `process.env`, never `import.meta.env.VITE_*` (that would ship it to the client).
- Set `cookie: { httpOnly: true, secure: true, sameSite: 'lax' }`; `secure` requires HTTPS (use a dev exception only locally).
- `await session.update(...)` writes; `session.data` reads — both run server-side via the request event.
- Regenerate/clear on logout (`session.clear()`) and after auth state changes.

## Workflow
1. Wrap session access in a server helper using `useSession` with `process.env.SESSION_SECRET`.
2. Set `HttpOnly`/`Secure`/`SameSite` cookie options.
3. On login, `update` the session and regenerate; on logout, `clear`.
4. Read `session.data` server-side in guards/actions (see [[solid-start-authentication-guard-routes]]).

## Code Examples (Good vs Bad)

### Bad Example 1 (readable cookie, public secret)
```ts
const SECRET = import.meta.env.VITE_SESSION_SECRET;  // shipped to the browser -> forge any session
setCookie('user', JSON.stringify({ id, isAdmin: true })); // plain, JS-readable, tamperable
```

### Bad Example 2 (no cookie flags, no regeneration)
```ts
const session = await useSession({ password: process.env.SESSION_SECRET! }); // missing cookie opts
await session.update({ userId });   // login without regenerating -> fixation; cookie not HttpOnly/Secure
```

### Bad Example 3 (secret too short / weak)
```ts
const session = await useSession({ password: 'devsecret' }); // <32 chars -> weak signing key, brute-forceable
await session.update({ userId });
```

### Bad Example 4 (sensitive data stored in the session payload)
```ts
const session = await getSession();
await session.update(() => ({ userId, passwordHash, creditCard })); // even signed, this rides in every request
```

### Bad Example 5 (no clear on logout)
```ts
export const logout = action(async () => {
  'use server';
  throw redirect('/');   // session never cleared -> back button / replayed cookie stays authenticated
});
```

### Good Example 1 (signed, hardened cookie)
```ts
export function getSession() {
  'use server';
  return useSession({
    password: process.env.SESSION_SECRET!,            // server-only, >=32 chars
    cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 8 },
  });
}
```

### Good Example 2 (login regenerates, logout clears)
```ts
export const login = action(async (form: FormData) => {
  'use server';
  const user = await verify(form);                    // throws on bad creds
  const session = await getSession();
  await session.update(() => ({ userId: user.id, isAdmin: user.isAdmin })); // fresh session data
  throw redirect('/app');
});
export const logout = action(async () => { 'use server'; await (await getSession()).clear(); throw redirect('/'); });
```

### Good Example 3 (regenerate session id on privilege change)
```ts
export const elevateToAdmin = action(async () => {
  'use server';
  const session = await getSession();
  const data = { ...session.data, isAdmin: true };
  await session.clear();                       // drop the old session id
  await session.update(() => data);            // issue a fresh one -> defeats fixation
});
```

### Good Example 4 (read session.data server-side in a guard)
```ts
export const requireUser = query(async () => {
  'use server';
  const session = await getSession();
  if (!session.data.userId) throw redirect('/login'); // authz decided on the server, not the client
  return session.data.userId;
}, 'current-user');
```

### Good Example 5 (store only an id; hydrate the rest server-side)
```ts
export const me = query(async () => {
  'use server';
  const session = await getSession();
  if (!session.data.userId) return null;
  return db.user.findUnique({ where: { id: session.data.userId } }); // session holds just the id
}, 'me');
```

## Related skills
- [[solid-start-authentication-guard-routes]] — guards reading the session.
- [[solid-start-env-variables]] — keeping SESSION_SECRET server-side.
- [[solid-start-security-hardening]] — cookie flags and CSRF defense.
- [[solid-start-request-response-handling]] — cookies live on the request event.
