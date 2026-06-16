---
name: solid-start-security-hardening
description: Harden SolidStart apps - server-authoritative authz on every action/route, validated input, secrets behind "use server", security headers/CSP, and escaped output - against the OWASP top risks.
related:
  - solid-start-authentication-guard-routes
  - solid-start-session-cookies
  - solid-start-env-variables
  - solid-start-middleware
---

# SolidStart Security Hardening
- Authorization is server-authoritative: every action, API route, and protected page verifies the session/role server-side.
- All inputs (action args, API bodies, route params) are schema-validated on the server; the client is never trusted.
- Secrets stay behind `"use server"`; responses set security headers/CSP; output is escaped (Solid auto-escapes JSX).

## Safety contract: non-negotiable
- Abort if an action/endpoint trusts client-supplied identity/role instead of the server session (privilege escalation).
- Abort if a secret can reach the client bundle (non-`"use server"` import, `VITE_` secret — see [[solid-start-env-variables]]).
- Abort if untrusted HTML is rendered via `innerHTML` without sanitization (XSS), or a `javascript:` URL is used unchecked.
- Abort if security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`) and HTTPS/secure cookies are absent in production.

## Required tools
- `@solidjs/start` >= 1, a schema validator, `useSession` for auth, a sanitizer (DOMPurify) when HTML is rendered, middleware for headers.

## Gotchas
- `"use server"` actions are public HTTP endpoints — re-validate auth + input in each one, regardless of the calling UI.
- JSX text interpolation is escaped; the XSS hazard is `innerHTML` and unchecked `href`/`src` URLs.
- Set security headers centrally in middleware (`onBeforeResponse`) so every response is covered.
- Cross-site request protection: prefer `SameSite` cookies + verifying `Origin` on mutating endpoints.

## Workflow
1. Verify session/role in every action, API route, and protected page.
2. Validate every server input with a schema.
3. Keep secrets behind `"use server"`; never `VITE_`-prefix them.
4. Add CSP/security headers in middleware; escape/sanitize output; enforce HTTPS + secure cookies.

## Code Examples (Good vs Bad)

### Bad Example 1 (trusts client role + unsanitized HTML)
```tsx
export const promote = action(async (form: FormData) => {
  'use server';
  if (form.get('isAdmin')) await db.user.update({ /* ... */ }); // client decides its own privilege
});
<div innerHTML={comment.body} />               {/* stored XSS */}
```

### Bad Example 2 (no headers, secret in client)
```tsx
const KEY = import.meta.env.VITE_API_SECRET;   // leaked to browser
// no CSP / X-Content-Type-Options anywhere
```

### Bad Example 3 (IDOR — no ownership check)
```ts
export const getInvoice = action(async (id: string) => {
  'use server';
  return db.invoice.findUnique({ where: { id } }); // any logged-in user reads any invoice by guessing ids
});
```

### Bad Example 4 (unvalidated redirect target — open redirect)
```ts
export const go = action(async (form: FormData) => {
  'use server';
  throw redirect(form.get('next') as string); // attacker supplies //evil.com -> phishing redirect
});
```

### Bad Example 5 (javascript: URL rendered unchecked)
```tsx
<a href={user.website}>site</a> // user.website = "javascript:stealCookies()" -> XSS on click
```

### Good Example 1 (server authz + validated input)
```tsx
import { z } from 'zod';
const schema = z.object({ userId: z.string().uuid() });
export const promote = action(async (form: FormData) => {
  'use server';
  const me = await getSession();
  if (!me?.isAdmin) throw redirect('/login');                 // server-authoritative
  const { userId } = schema.parse(Object.fromEntries(form));  // validated
  await db.user.update({ where: { id: userId }, data: { role: 'admin' } });
});
```

### Good Example 2 (security headers in middleware + sanitized HTML)
```ts
export default createMiddleware({
  onBeforeResponse: [(e) => {
    const h = e.response.headers;
    h.set('Content-Security-Policy', "default-src 'self'");
    h.set('X-Content-Type-Options', 'nosniff');
    h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }],
});
// rendering trusted-but-rich HTML: <div innerHTML={DOMPurify.sanitize(post.html)} />
```

### Good Example 3 (ownership-scoped query)
```ts
export const getInvoice = action(async (id: string) => {
  'use server';
  const me = await getSession();
  if (!me) throw redirect('/login');
  const inv = await db.invoice.findUnique({ where: { id } });
  if (inv?.ownerId !== me.userId) throw notFound(); // authorize the object, not just the user
  return inv;
});
```

### Good Example 4 (allowlisted redirect target)
```ts
const SAFE = new Set(['/app', '/settings', '/billing']);
export const go = action(async (form: FormData) => {
  'use server';
  const next = form.get('next') as string;
  throw redirect(SAFE.has(next) ? next : '/app'); // only known internal paths
});
```

### Good Example 5 (validate the URL scheme before rendering)
```tsx
const safeHref = (u: string) => /^https?:\/\//i.test(u) ? u : '#'; // reject javascript:/data:
<a href={safeHref(user.website)} rel="noopener noreferrer">site</a>
```

## Related skills
- [[solid-start-authentication-guard-routes]] — server-side route guards.
- [[solid-start-session-cookies]] — hardened session cookies.
- [[solid-start-env-variables]] — keeping secrets server-side.
- [[solid-start-middleware]] — central security headers.
