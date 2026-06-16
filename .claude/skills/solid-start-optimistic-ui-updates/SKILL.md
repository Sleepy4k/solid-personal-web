---
name: solid-start-optimistic-ui-updates
description: Show instant feedback in SolidStart with useSubmission/useSubmissions - render the pending action's input optimistically, then reconcile on success and roll back on failure - not frozen UIs.
related:
  - solid-start-server-actions-mutations
  - solid-start-solidstart-v2-features
  - solid-start-global-error-boundary
  - solid-start-best-practices
---

# SolidStart Optimistic UI Updates
- While an `action` is in flight, the UI shows the expected result immediately using `useSubmission`'s `pending`/`input`.
- On success the server's revalidated data replaces the optimistic value; on failure the UI rolls back and surfaces the error.
- The optimistic state is derived from the pending submission, not stored as duplicated mutable state.

## Safety contract: non-negotiable
- Abort if optimistic state is committed permanently without reconciling against the server result (UI diverges from truth on failure).
- Abort if an action error isn't surfaced/rolled back (the user thinks it succeeded — silent data loss).
- Abort if optimistic updates assume success for operations that often fail (payments) without a clear failure path.
- Abort if duplicated mutable copies of server state are hand-maintained instead of deriving from `useSubmission`.

## Required tools
- `@solidjs/start` >= 1, `@solidjs/router` (`action`, `useSubmission`, `useSubmissions`, `revalidate`).

## Gotchas
- `useSubmission(action)` exposes `pending`, `input` (the args submitted), `result`, and `error` — derive the optimistic view from these.
- `useSubmissions` handles many concurrent submissions (e.g. a list of toggles) — track each by its input.
- The real data arrives via `revalidate` after the action; render the merge of confirmed data + pending inputs.
- On `submission.error`, show a message and let the underlying query's confirmed value stand (automatic rollback).

## Workflow
1. Define the `action` (with auth/validation — see [[solid-start-server-actions-mutations]]).
2. Read `useSubmission(action)` for `pending`/`input`/`error`.
3. Render confirmed data merged with the pending input as the optimistic view.
4. On error, surface it; the confirmed data remains the source of truth.

## Code Examples (Good vs Bad)

### Bad Example 1 (commit optimistic, no rollback)
```tsx
function Like(props) {
  const [liked, setLiked] = createSignal(props.liked);
  return <button onClick={() => { setLiked(true); like(props.id); }}>♥</button>;
  // if like() fails, the heart stays filled forever -> UI lies
}
```

### Bad Example 2 (frozen UI, no feedback)
```tsx
<form action={addTodo} method="post">
  <input name="text" />
  <button>Add</button>   {/* no pending state; user clicks again -> duplicate submits */}
</form>
```

### Bad Example 3 (optimistic on a payment that often fails)
```tsx
function Pay(props) {
  const [done, setDone] = createSignal(false);
  return <button onClick={() => { setDone(true); charge(props.id); }}>{done() ? 'Paid ✓' : 'Pay'}</button>;
  // shows "Paid" before the charge settles -> user believes a declined payment succeeded
}
```

### Bad Example 4 (hand-maintained duplicate of the list)
```tsx
const [todos, setTodos] = createSignal(props.todos);
const add = (text) => { setTodos([...todos(), { text }]); addTodo(text); };
// local copy drifts from the server query; revalidated data and this signal disagree
```

### Bad Example 5 (swallows the submission error)
```tsx
const sub = useSubmission(saveProfile);
return <button onClick={() => saveProfile(data)} disabled={sub.pending}>Save</button>;
// sub.error is never read -> a failed save looks identical to a successful one
```

### Good Example 1 (optimistic from useSubmission, auto-rollback)
```tsx
import { useSubmission } from '@solidjs/router';
function Like(props) {
  const sub = useSubmission(like);
  const liked = () => sub.pending ? sub.input?.[0] === props.id : props.liked; // optimistic
  return (
    <button disabled={sub.pending} onClick={() => like(props.id)} aria-pressed={liked()}>
      {liked() ? '♥' : '♡'}
      <Show when={sub.error}><small>failed</small></Show>  {/* surfaced + confirmed value stands */}
    </button>
  );
}
```

### Good Example 2 (optimistic list append, reconciled on revalidate)
```tsx
import { useSubmissions } from '@solidjs/router';
function Todos(props) {
  const submissions = useSubmissions(addTodo);
  const pending = () => [...submissions].filter(s => s.pending).map(s => ({ text: s.input[0].get('text'), pending: true }));
  return <For each={[...props.todos, ...pending()]}>{(t) => <li classList={{ dim: t.pending }}>{t.text}</li>}</For>;
}
```

### Good Example 3 (no optimism for risky ops; show progress instead)
```tsx
function Pay(props) {
  const sub = useSubmission(charge);
  return (
    <button disabled={sub.pending} onClick={() => charge(props.id)}>
      {sub.pending ? 'Processing…' : 'Pay'}                {/* wait for the real result, don't fake success */}
      <Show when={sub.error}><small>Payment failed</small></Show>
    </button>
  );
}
```

### Good Example 4 (derive, never duplicate, the list)
```tsx
const submissions = useSubmissions(addTodo);
const view = () => [
  ...props.todos,                                          // confirmed, from the query
  ...[...submissions].filter(s => s.pending).map(s => ({ text: s.input[0].get('text'), pending: true })),
];
return <For each={view()}>{(t) => <li classList={{ dim: t.pending }}>{t.text}</li>}</For>;
```

### Good Example 5 (surface the error explicitly)
```tsx
const sub = useSubmission(saveProfile);
return <>
  <button onClick={() => saveProfile(data)} disabled={sub.pending}>Save</button>
  <Show when={sub.error}>{(e) => <p role="alert">Couldn't save: {e().message}</p>}</Show>
</>;
```

## Related skills
- [[solid-start-server-actions-mutations]] — the actions being tracked.
- [[solid-start-solidstart-v2-features]] — useSubmission/revalidate model.
- [[solid-start-global-error-boundary]] — catching action failures.
- [[solid-start-best-practices]] — deriving over duplicating state.
