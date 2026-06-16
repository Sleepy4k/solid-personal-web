---
name: solid-start-websockets-integration
description: Add realtime to SolidStart - a Nitro/experimental WebSocket route or external WS service, authenticated upgrades, client reconnection, and onCleanup - instead of leaking sockets or unauthenticated channels.
related:
  - solid-start-custom-adapters-deploy
  - solid-start-session-cookies
  - solid-start-runtime-compatibility
  - solid-start-security-hardening
---

# SolidStart WebSockets Integration
- Realtime uses a WebSocket endpoint (Nitro's experimental WS support, or a dedicated WS service) with the upgrade authenticated.
- The client connects in `onMount`, handles reconnection with backoff, and closes the socket in `onCleanup`.
- Messages are validated; the channel authorizes what each connection may subscribe to.

## Safety contract: non-negotiable
- Abort if the WS upgrade isn't authenticated/authorized (anyone connects and receives/sends data).
- Abort if the client socket isn't closed in `onCleanup` (leaked connections accumulate across navigations).
- Abort if there's no reconnection/backoff (a dropped connection silently stops updates forever).
- Abort if the deploy target/preset doesn't support persistent WS (e.g. some serverless) and there's no fallback — verify per platform (see [[solid-start-custom-adapters-deploy]]).

## Required tools
- `@solidjs/start` >= 1 with Nitro WS (experimental) or an external WS provider (Pusher/Ably/socket server); `crossws` under the hood.

## Gotchas
- Not all deploy presets support long-lived WebSockets; serverless/edge often need a managed realtime service instead.
- Authenticate at the upgrade (cookie/token) — you can't rely on per-message auth alone for subscription scoping.
- The browser `WebSocket` must be created on the client (`onMount`), never during SSR; close it on cleanup.
- Implement exponential backoff on reconnect to avoid hammering the server after an outage.

## Workflow
1. Choose Nitro WS or an external realtime service based on the deploy target.
2. Authenticate/authorize the connection at upgrade time.
3. On the client, connect in `onMount`, handle messages, reconnect with backoff.
4. Close the socket in `onCleanup`; validate inbound messages.

## Code Examples (Good vs Bad)

### Bad Example 1 (unauthenticated, leaked socket)
```tsx
function Live() {
  const ws = new WebSocket('wss://app/feed'); // created during render/SSR; no auth
  ws.onmessage = (e) => setFeed(JSON.parse(e.data));
  return <Feed />;                              // never closed -> leaks on every mount
}
```

### Bad Example 2 (no reconnect, trusts payload)
```tsx
const ws = new WebSocket(url);
ws.onclose = () => {};                          // dropped connection -> updates stop forever
ws.onmessage = (e) => apply(JSON.parse(e.data)); // unvalidated message applied directly
```

### Bad Example 3 (serverless preset, expects persistent WS)
```ts
export default defineConfig({ server: { preset: 'vercel' } }); // stateless serverless
// app opens a long-lived WebSocket route -> connection can't persist -> drops immediately
```

### Bad Example 4 (auth checked only per message)
```ts
export default defineWebSocketHandler({
  upgrade() { /* accepts everyone */ },
  message(peer, msg) { if (!verify(msg.token)) peer.close(); }, // already subscribed before this runs
});
```

### Bad Example 5 (token in the URL, logged everywhere)
```tsx
const ws = new WebSocket(`wss://app/feed?token=${sessionToken}`); // full token in access logs / referrers
```

### Good Example 1 (client-side connect + cleanup + reconnect)
```tsx
function Live(props) {
  onMount(() => {
    let ws, retry = 0, closed = false;
    const connect = () => {
      ws = new WebSocket(`${props.wsUrl}?token=${props.token}`); // auth token at upgrade
      ws.onmessage = (e) => { const m = MessageSchema.parse(JSON.parse(e.data)); apply(m); };
      ws.onclose = () => { if (!closed) setTimeout(connect, Math.min(1000 * 2 ** retry++, 30000)); };
    };
    connect();
    onCleanup(() => { closed = true; ws?.close(); });           // closed on unmount
  });
  return <Feed />;
}
```

### Good Example 2 (authenticated upgrade handler)
```ts
// server WS handler (Nitro experimental / crossws)
export default defineWebSocketHandler({
  async upgrade(req) {
    const session = await getSessionFromRequest(req);
    if (!session) return new Response('unauthorized', { status: 401 });  // authorize the connection
  },
  message(peer, msg) { /* validate + route */ },
});
```

### Good Example 3 (managed realtime service on serverless)
```tsx
// serverless deploy -> offload persistent connections to Ably/Pusher
import { Realtime } from 'ably';
function Live(props) {
  onMount(() => {
    const client = new Realtime({ authUrl: '/api/realtime-token' }); // server mints a scoped token
    const channel = client.channels.get(`room:${props.roomId}`);
    channel.subscribe((m) => apply(MessageSchema.parse(m.data)));
    onCleanup(() => client.close());
  });
  return <Feed />;
}
```

### Good Example 4 (short-lived single-use ticket, not the session token)
```tsx
// client fetches a one-time ticket, then connects with it
const { ticket } = await fetch('/api/ws-ticket').then(r => r.json()); // server-issued, ~30s TTL, single use
const ws = new WebSocket(`wss://app/feed`, ['ticket', ticket]);       // via subprotocol, not a logged query string
```

### Good Example 5 (authorize the subscription scope at upgrade)
```ts
export default defineWebSocketHandler({
  async upgrade(req) {
    const session = await getSessionFromRequest(req);
    if (!session) return new Response('unauthorized', { status: 401 });
    const room = new URL(req.url).searchParams.get('room');
    if (!(await canAccessRoom(session.userId, room))) return new Response('forbidden', { status: 403 });
  },
  message(peer, msg) { /* validate + route */ },
});
```

## Related skills
- [[solid-start-custom-adapters-deploy]] — whether the target supports persistent WS.
- [[solid-start-session-cookies]] — authenticating the upgrade.
- [[solid-start-runtime-compatibility]] — runtime limits on long-lived connections.
- [[solid-start-security-hardening]] — authorized channels and validated messages.
