---
name: solid-start-ssr-hydration-matching
description: Avoid SolidStart hydration mismatches - deterministic SSR/CSR output, serialized query data, isServer/onMount guards for browser APIs, and no Date.now/random in markup - so hydration attaches cleanly.
related:
  - solid-start-island-architecture-ssr
  - solid-start-solidstart-v2-features
  - solid-start-runtime-compatibility
  - solid-start-best-practices
---

# SolidStart SSR Hydration Matching
- The server HTML and the first client render are identical, so SolidStart hydrates (attaches listeners) instead of rebuilding.
- Async data comes from `query()`/`createAsync`, whose results serialize from server to client — both sides render the same content.
- Browser-only values (`window`, `Date.now`, random) are deferred to `onMount`/guarded with `isServer`, never used in first-render markup.

## Safety contract: non-negotiable
- Abort if render output depends on `Date.now()`/`Math.random()`/`window` (server ≠ client → mismatch, DOM rebuilt, flicker).
- Abort if a browser global is read during SSR without an `isServer`/`onMount` guard (server crash).
- Abort if data is fetched in an effect instead of a serialized `query` (client refetches → content flips after hydration).
- Abort if first-render markup branches on a client-only value (`localStorage` flag) before mount.

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` `query`/`createAsync`, `isServer`/`onMount` from `solid-js`/`solid-js/web`.

## Gotchas
- SolidStart auto-serializes `query` data into the HTML and rehydrates it; a hand-rolled `fetch` in an effect is not serialized and will mismatch.
- `isServer` branches let the bundler keep server code off the client and vice versa.
- `onMount` runs only after hydration on the client — the safe place for measurement and `window`.
- Locale/time formatting can differ between server and client; render a stable string the server produced, reformat in `onMount` if needed.

## Workflow
1. Keep render pure: no `Date.now`/random/`window` in markup.
2. Load data with `query`/`createAsync` so it serializes.
3. Guard browser APIs with `isServer`; defer to `onMount`.
4. Delay client-only conditional UI until after mount.

## Code Examples (Good vs Bad)

### Bad Example 1 (non-deterministic markup + window in render)
```tsx
export default function Banner() {
  const id = Math.random();              // differs server vs client -> mismatch
  return <div data-id={id}>{window.innerWidth}px</div>; // window undefined on server
}
```

### Bad Example 2 (fetch-in-effect not serialized)
```tsx
export default function User() {
  const [u, setU] = createSignal();
  createEffect(() => fetch('/api/me').then(r => r.json()).then(setU)); // empty on server -> content flips
  return <span>{u()?.name}</span>;
}
```

### Bad Example 3 (locale formatting differs server vs client)
```tsx
export default function Price(props) {
  return <span>{new Intl.NumberFormat().format(props.amount)}</span>;
  // server locale != browser locale -> "1,000" vs "1.000" mismatch on hydration
}
```

### Bad Example 4 (first render branches on localStorage)
```tsx
export default function Theme() {
  const dark = localStorage.getItem('dark') === '1'; // undefined on server -> server renders light, client dark
  return <body class={dark ? 'dark' : 'light'} />;
}
```

### Bad Example 5 (conditional on isServer in markup)
```tsx
import { isServer } from 'solid-js/web';
export default function Greeting() {
  return <p>{isServer ? 'Loading…' : 'Welcome back'}</p>; // server text != client text -> mismatch
}
```

### Good Example 1 (serialized query)
```tsx
const getMe = query(async () => { 'use server'; return getSession(); }, 'me');
export default function User() {
  const me = createAsync(() => getMe());   // server-rendered + serialized -> identical first render
  return <Suspense><span>{me()?.name}</span></Suspense>;
}
```

### Good Example 2 (isServer guard + deferred client state)
```tsx
import { isServer } from 'solid-js/web';
export default function Width() {
  const [w, setW] = createSignal(0);       // deterministic default both sides
  if (!isServer) onMount(() => setW(window.innerWidth)); // client-only, post-hydration
  return <div>{w()}px</div>;
}
```

### Good Example 3 (fixed locale for deterministic formatting)
```tsx
export default function Price(props) {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }); // explicit, stable both sides
  return <span>{fmt.format(props.amount)}</span>;
}
```

### Good Example 4 (theme deferred to post-mount)
```tsx
export default function Theme() {
  const [dark, setDark] = createSignal(false);              // deterministic default
  onMount(() => setDark(localStorage.getItem('dark') === '1')); // applied after hydration
  return <body classList={{ dark: dark() }} />;
}
```

### Good Example 5 (same markup, content from serialized data)
```tsx
const getGreeting = query(async () => { 'use server'; const s = await getSession(); return s ? 'Welcome back' : 'Hello'; }, 'greeting');
export default function Greeting() {
  const g = createAsync(() => getGreeting());               // identical on server + client
  return <Suspense fallback={<p>Loading…</p>}><p>{g()}</p></Suspense>;
}
```

## Related skills
- [[solid-start-island-architecture-ssr]] — isolating browser-only widgets.
- [[solid-start-solidstart-v2-features]] — query data serialization.
- [[solid-start-runtime-compatibility]] — server vs browser runtime.
- [[solid-start-best-practices]] — deterministic render as a rule.
