---
name: solid-start-api-routes
description: Build SolidStart API routes - routes/api files exporting GET/POST returning Response, validated inputs, correct status codes, and JSON envelopes - for third-party/webhook endpoints, not page rendering.
related:
  - solid-start-request-response-handling
  - solid-start-server-actions-mutations
  - solid-start-security-hardening
  - solid-start-project-structure
---

# SolidStart API Routes
- HTTP endpoints live in `src/routes/api/*` and export method handlers (`GET`, `POST`, ...) that return a `Response`.
- They're for external consumers (mobile apps, webhooks, third parties); in-app data uses `query`/`action` instead.
- Inputs are validated, status codes are correct, and responses are consistent JSON envelopes.

## Safety contract: non-negotiable
- Abort if a handler returns user data without auth checks (API routes are public unless you guard them).
- Abort if request bodies/params are used unvalidated (injection, type confusion).
- Abort if errors return 200 with an error body, or leak stack traces (wrong status codes / info disclosure).
- Abort if a webhook endpoint doesn't verify the signature (forged requests trigger real actions).

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`APIEvent`), a schema validator, Web `Request`/`Response`.

## Gotchas
- A file exporting `GET`/`POST` is an endpoint; one exporting `default` is a page — don't mix in the same file.
- Handlers receive an `APIEvent` with `request`, `params`, and `nativeEvent`; read the body via `await request.json()`/`formData()`.
- Return a real `Response` with the right `status` and `content-type`; don't return a bare object.
- Verify webhook signatures (Stripe/GitHub) against the raw body before trusting the payload.

## Workflow
1. Create `src/routes/api/<name>.ts` exporting `GET`/`POST`.
2. Authenticate/authorize; validate body/params with a schema.
3. Return a `Response` with correct status + JSON envelope.
4. For webhooks, verify the signature on the raw body first.

## Code Examples (Good vs Bad)

### Bad Example 1 (no auth, unvalidated, wrong status)
```ts
export async function POST({ request }) {
  const body = await request.json();           // unvalidated
  await db.order.create({ data: body });        // anyone can write arbitrary fields
  return new Response('ok');                     // 200 text, no envelope, no auth
}
```

### Bad Example 2 (unverified webhook)
```ts
export async function POST({ request }) {
  const event = await request.json();           // no signature check
  if (event.type === 'payment') fulfill(event); // forged request triggers fulfillment
  return new Response(null, { status: 200 });
}
```

### Bad Example 3 (returns a bare object, not a Response)
```ts
export async function GET() {
  return { items: await db.item.findMany() }; // not a Response -> wrong content-type / framework coercion surprises
}
```

### Bad Example 4 (page and endpoint mixed in one file)
```ts
export default function Page() { return <div>UI</div>; } // page
export async function POST({ request }) { return Response.json({}); } // endpoint in the same file -> ambiguous route
```

### Bad Example 5 (leaks stack trace on error)
```ts
export async function GET({ params }) {
  try { return Response.json({ data: await load(params.id) }); }
  catch (e) { return Response.json({ error: e.stack }, { status: 200 }); } // 200 + stack trace to the client
}
```

### Good Example 1 (auth + validate + envelope)
```ts
import { z } from 'zod';
const schema = z.object({ sku: z.string(), qty: z.number().int().positive() });
export async function POST({ request }) {
  const session = await getSession(request);
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 422 });
  const order = await db.order.create({ data: { ...parsed.data, userId: session.userId } });
  return Response.json({ data: order }, { status: 201 });
}
```

### Good Example 2 (signature-verified webhook)
```ts
export async function POST({ request }) {
  const raw = await request.text();             // raw body for signature
  const sig = request.headers.get('stripe-signature');
  let event;
  try { event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WHSEC!); }
  catch { return new Response('bad signature', { status: 400 }); }
  await handle(event);
  return new Response(null, { status: 200 });
}
```

### Good Example 3 (correct status codes for each case)
```ts
export async function GET({ params }) {
  const item = await db.item.findUnique({ where: { id: params.id } });
  if (!item) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json({ data: item }, { status: 200 });
}
```

### Good Example 4 (typed APIEvent handler)
```ts
import type { APIEvent } from '@solidjs/start/server';
export async function DELETE({ params, request }: APIEvent) {
  const session = await getSession(request);
  if (!session) return new Response(null, { status: 401 });
  await db.item.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 }); // no content
}
```

### Good Example 5 (errors return correct status, no internals)
```ts
export async function GET({ params }) {
  try { return Response.json({ data: await load(params.id) }); }
  catch (e) {
    console.error(e);                                       // logged server-side only
    return Response.json({ error: 'internal error' }, { status: 500 });
  }
}
```

## Related skills
- [[solid-start-request-response-handling]] — working with Request/Response directly.
- [[solid-start-server-actions-mutations]] — in-app writes use actions, not API routes.
- [[solid-start-security-hardening]] — auth, validation, signature verification.
- [[solid-start-project-structure]] — where routes/api lives.
