---
name: solid-start-global-error-boundary
description: Catch SolidStart errors with ErrorBoundary - per-route and a root boundary, reset/retry, server-side logging, and sanitized client messages - instead of a white screen or leaked stack traces.
related:
  - solid-start-error-pages
  - solid-start-optimistic-ui-updates
  - solid-start-telemetry-performance-monitoring
  - solid-start-security-hardening
---

# SolidStart Global Error Boundary
- Render and resource errors are caught by `<ErrorBoundary>`: a root boundary as a safety net, plus per-route boundaries for localized recovery.
- The fallback offers a reset/retry; the full error is logged server-side while the client sees a sanitized message.
- Boundaries pair with `<Suspense>` so async failures (from `createAsync`/resources) surface as catchable errors.

## Safety contract: non-negotiable
- Abort if there's no root `ErrorBoundary` (an uncaught error blanks the whole app — white screen).
- Abort if the raw error/stack trace is rendered to the client (information disclosure).
- Abort if the boundary catches but never logs/reports the error (failures vanish — see [[solid-start-telemetry-performance-monitoring]]).
- Abort if a transient error has no reset/retry path (the user is stuck until a full reload).

## Required tools
- SolidJS `ErrorBoundary`/`Suspense`, `@solidjs/start`, a server logger/error reporter.

## Gotchas
- `<ErrorBoundary fallback={(err, reset) => ...}>` gives the error and a `reset()` to re-attempt the subtree.
- Wrap async consumers in `<Suspense>` inside an `<ErrorBoundary>` so a rejected resource is caught, not thrown past it.
- Log the real error on the server (or via a reporter); show users a generic message — never the stack.
- A root boundary catches what per-route boundaries don't; use both for graceful, localized recovery.

## Workflow
1. Add a root `<ErrorBoundary>` around the app shell.
2. Add per-route boundaries where localized recovery matters.
3. In the fallback, log/report the error and render a safe message + `reset()`.
4. Pair with `<Suspense>` for async failures.

## Code Examples (Good vs Bad)

### Bad Example 1 (no boundary -> white screen)
```tsx
export default function App(props) {
  return <Layout>{props.children}</Layout>; // any thrown error blanks the entire app
}
```

### Bad Example 2 (leaks stack, no logging/reset)
```tsx
<ErrorBoundary fallback={(err) => <pre>{err.stack}</pre>}> {/* exposes internals; no log, no retry */}
  <Dashboard />
</ErrorBoundary>
```

### Bad Example 3 (async error escapes the boundary)
```tsx
function Panel() {
  const data = createAsync(() => getReport());     // can reject
  return <ErrorBoundary fallback={<p>err</p>}>
    <Chart data={data()} />                          {/* no <Suspense> -> rejection thrown past the boundary */}
  </ErrorBoundary>;
}
```

### Bad Example 4 (swallows the error entirely)
```tsx
<ErrorBoundary fallback={<div />}> {/* blank fallback, no report -> failures vanish silently */}
  <Dashboard />
</ErrorBoundary>
```

### Bad Example 5 (reset doesn't re-fetch -> stuck)
```tsx
<ErrorBoundary fallback={(e) => <button onClick={() => location.reload()}>Reload</button>}>
  {/* full reload instead of reset() -> loses all state, hostile for a transient blip */}
  <Feed />
</ErrorBoundary>
```

### Good Example 1 (root boundary with safe message + reset)
```tsx
export default function App(props) {
  return (
    <ErrorBoundary fallback={(err, reset) => {
      reportError(err);                       // server/reporter log
      return <div role="alert"><p>Something went wrong.</p><button onClick={reset}>Retry</button></div>;
    }}>
      <Layout>{props.children}</Layout>
    </ErrorBoundary>
  );
}
```

### Good Example 2 (per-route boundary around async)
```tsx
function ReportPanel() {
  const data = createAsync(() => getReport());
  return (
    <ErrorBoundary fallback={(e, reset) => <RetryCard onRetry={reset} />}>
      <Suspense fallback={<Spinner />}><Chart data={data()} /></Suspense>
    </ErrorBoundary>
  );
}
```

### Good Example 3 (reset() actually re-runs the resource)
```tsx
function Feed() {
  const posts = createAsync(() => getPosts());
  return (
    <ErrorBoundary fallback={(e, reset) => <button onClick={reset}>Try again</button>}>
      <Suspense fallback={<Spinner />}><List items={posts()} /></Suspense>
    </ErrorBoundary>
  );
}
// reset() re-renders the subtree -> createAsync re-fetches, no full reload
```

### Good Example 2b (sanitized message, structured server log)
```tsx
<ErrorBoundary fallback={(err, reset) => {
  reportError({ message: err.message, stack: err.stack, at: 'dashboard' }); // structured, server-side
  return <Alert onRetry={reset}>We couldn't load this. Please retry.</Alert>; // no internals to user
}}>
  <Dashboard />
</ErrorBoundary>
```

### Good Example 3b (distinct boundaries per independent region)
```tsx
export default function Page() {
  return (
    <>
      <ErrorBoundary fallback={<SidebarFallback />}><Sidebar /></ErrorBoundary>
      <ErrorBoundary fallback={<MainFallback />}><Main /></ErrorBoundary>
      {/* a crash in one region doesn't take down the other */}
    </>
  );
}
```

## Related skills
- [[solid-start-error-pages]] — HTTP-level 404/500 pages.
- [[solid-start-optimistic-ui-updates]] — catching action failures.
- [[solid-start-telemetry-performance-monitoring]] — reporting caught errors.
- [[solid-start-security-hardening]] — never leaking stack traces.
