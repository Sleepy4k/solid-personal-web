---
name: solid-start-error-pages
description: Serve proper SolidStart error pages - a 404 catch-all route, correct HTTP status codes, redirect/notFound from server functions, and a friendly 500 - instead of 200-with-error-body or generic blanks.
related:
  - solid-start-global-error-boundary
  - solid-start-request-response-handling
  - solid-start-server-actions-mutations
  - solid-start-best-practices
---

# SolidStart Error Pages
- Unmatched URLs render a 404 page returned with a real `404` status (a `[...404].tsx` catch-all or `notFound()`), not a 200.
- Server functions signal not-found/redirect via `notFound()`/`redirect()` so the correct status reaches the client and crawlers.
- A friendly 500 page covers unexpected failures while the real error is logged server-side.

## Safety contract: non-negotiable
- Abort if a not-found response returns `200` with an "error" body (breaks SEO, caching, and client handling).
- Abort if the 500/error page renders the raw exception/stack to the user (information disclosure).
- Abort if a missing resource in a `query`/server function throws a generic error instead of `notFound()` (wrong status, no proper page).
- Abort if there's no catch-all 404 route (the framework default may be unhelpful or inconsistent across presets).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`notFound`/`HttpStatusCode`, `redirect`), a catch-all route file.

## Gotchas
- A `src/routes/[...404].tsx` (or `*404`) catch-all renders for unmatched paths; pair it with `<HttpStatusCode code={404} />` so the status is set during SSR.
- `notFound()`/throwing a `redirect()` from a `query`/server function sets the response status correctly — don't return a fake object.
- `<HttpStatusCode code={...}/>` from `@solidjs/router` sets the SSR response status from within a component.
- Log the underlying error server-side; the user-facing 500 stays generic.

## Workflow
1. Add a catch-all 404 route with `<HttpStatusCode code={404} />`.
2. In server functions, `throw notFound()`/`redirect()` for missing/forbidden resources.
3. Provide a friendly error/500 fallback (with `ErrorBoundary`) that logs server-side.
4. Verify real status codes in responses, not just the rendered body.

## Code Examples (Good vs Bad)

### Bad Example 1 (200 for not-found + leaked error)
```tsx
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug));
  return <Show when={post()} fallback={<p>Not found</p>}>{/* still HTTP 200 */}
    {post()?.body}</Show>;
}
// 500 handler somewhere: return <pre>{err.stack}</pre>  // leaks internals
```

### Bad Example 2 (generic throw instead of notFound)
```tsx
const getPost = query(async (slug: string) => {
  'use server';
  const p = await db.post.find(slug);
  if (!p) throw new Error('missing');     // becomes a 500, not a 404
  return p;
}, 'post');
```

### Bad Example 3 (no catch-all route at all)
```tsx
// src/routes/ has index.tsx and about.tsx only — no [...404].tsx
// /typo renders the framework default with an inconsistent status across presets
export default function Index() { return <h1>Home</h1>; }
```

### Bad Example 4 (forbidden modeled as a 200 message)
```tsx
const getAdmin = query(async () => {
  'use server';
  const u = await getSession();
  if (!u?.isAdmin) return { error: 'forbidden' };  // 200 body -> client/crawlers think it succeeded
  return loadAdmin();
}, 'admin');
```

### Bad Example 5 (status set only client-side after hydration)
```tsx
export default function NotFound() {
  onMount(() => { /* try to set status here */ });  // runs in the browser -> SSR already sent 200
  return <h1>Not found</h1>;
}
```

### Good Example 1 (catch-all 404 with status code)
```tsx
// src/routes/[...404].tsx
import { HttpStatusCode } from '@solidjs/router';
export default function NotFound() {
  return <main><HttpStatusCode code={404} /><h1>Page not found</h1><a href="/">Home</a></main>;
}
```

### Good Example 2 (notFound from a server function)
```tsx
import { query, createAsync } from '@solidjs/router';
import { notFound } from '@solidjs/router';   // sets a 404 response
const getPost = query(async (slug: string) => {
  'use server';
  const p = await db.post.find(slug);
  if (!p) throw notFound();                    // correct status + 404 page
  return p;
}, 'post');
export default function Post(props) {
  const post = createAsync(() => getPost(props.params.slug));
  return <Suspense><article>{post()?.body}</article></Suspense>;
}
```

### Good Example 3 (redirect for forbidden, correct status)
```tsx
const getAdmin = query(async () => {
  'use server';
  const u = await getSession();
  if (!u) throw redirect('/login');                // 302 to login
  if (!u.isAdmin) throw redirect('/403');          // dedicated forbidden page
  return loadAdmin();
}, 'admin');
```

### Good Example 4 (friendly 500 that logs server-side)
```tsx
<ErrorBoundary fallback={(err) => {
  console.error(err);                              // real error stays on the server
  return <main><HttpStatusCode code={500} /><h1>Something went wrong</h1></main>; // generic to user
}}>
  <App />
</ErrorBoundary>
```

### Good Example 5 (verify the real status, not just the body)
```bash
curl -I https://app.example.com/does-not-exist   # expect: HTTP/1.1 404 Not Found
curl -I https://app.example.com/admin            # unauthenticated -> expect 302 to /login
```

## Related skills
- [[solid-start-global-error-boundary]] — catching render/async errors.
- [[solid-start-request-response-handling]] — setting status codes on responses.
- [[solid-start-server-actions-mutations]] — redirect/notFound from server code.
- [[solid-start-best-practices]] — correct status codes as a rule.
