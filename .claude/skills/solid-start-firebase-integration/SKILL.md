---
name: solid-start-firebase-integration
description: Integrate Firebase into SolidStart with a singleton app initializer, strict client/server SDK separation, server-side token verification, and no service account credentials in the browser bundle.
related:
  - solid-start-env-variables
  - solid-start-security-hardening
  - solid-start-session-cookies
  - solid-start-server-actions-mutations
---

# Firebase Integration
- Firebase App is initialised once using a singleton guard so hot-reload never triggers the "app already exists" error.
- Client SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`) is used only in the browser; Admin SDK (`firebase-admin`) is used only inside `"use server"` functions.
- Firebase ID tokens sent by the client are verified server-side with `admin.auth().verifyIdToken()` before any privileged operation.
- No `FIREBASE_ADMIN_*` private key, service account JSON, or project credentials appear in `VITE_` vars.

## Safety contract: non-negotiable
- Abort if `firebase-admin` is imported outside a `"use server"` boundary — the Admin SDK includes the service account private key and must never reach the browser bundle.
- Abort if `initializeApp()` is called without checking `getApps().length > 0` — duplicate initialization throws `FirebaseError: Firebase App named '[DEFAULT]' already exists`.
- Abort if a client-supplied `uid` is trusted for authorization without server-side token verification — any user can forge a uid string and impersonate another.
- Abort if `FIREBASE_ADMIN_PRIVATE_KEY` or service account JSON path is in a `VITE_` env var — it ships to the browser.
- Abort if `onSnapshot` real-time listeners are registered during SSR — they are async and cause hydration mismatches; register only inside `onMount`.

## Required tools
- `firebase` (client SDK, `firebase/app`, `firebase/auth`, `firebase/firestore`).
- `firebase-admin` (server SDK — Node.js only; Bun compatible with caveats).
- Env vars: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (public); `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (server-only via ssrDefine).

## Gotchas
- `firebase-admin` reads the private key as a PEM string from env; newlines in the key are escaped as `\n` in `.env` files — parse with `.replace(/\\n/g, "\n")` when initialising the credential.
- Firestore `onSnapshot` listeners must be unsubscribed in `onCleanup`; the returned unsubscribe function must be called to avoid memory leaks.
- Firebase Emulator Suite: set `connectFirestoreEmulator(db, "localhost", 8080)` in dev; guard with `import.meta.env.DEV` so it doesn't fire in production.
- `firebase/auth` persistence defaults to `browserLocalStorage`; during SSR (no `window`) it falls back silently — always guard auth state reads with `onMount` or `typeof window !== "undefined"`.
- The Admin SDK's `auth().verifyIdToken()` makes a network call to Google's JWKS endpoint on first use; subsequent calls use a cached key (5-min TTL). This adds ~200ms to the first request per worker process.

## Workflow
1. Create `src/lib/client/firebase.ts` (client SDK singleton) and `src/lib/server/firebase-admin.ts` (admin SDK singleton, `"use server"` at top).
2. Add `VITE_FIREBASE_*` vars to `.env` for the client app config; add `FIREBASE_ADMIN_*` to `.env` and `ssrDefine` in `vite.config.ts`.
3. In auth flows: client calls `signInWithEmailAndPassword()`, gets an ID token via `user.getIdToken()`, sends it to a server action, server verifies with `admin.auth().verifyIdToken(token)`.
4. Wrap all Firestore server reads in `query(async () => { "use server"; ... }, "key")`.
5. For real-time features, use `onSnapshot` inside `onMount`; call the returned unsubscribe in `onCleanup`.

## Code Examples (Good vs Bad)

### Bad Example 1 (firebase-admin imported in a client component — private key in bundle)
```ts
// src/components/SomeComponent.tsx — WRONG
import admin from "firebase-admin"; // ships service account to browser bundle
const db = admin.firestore();
```

### Bad Example 2 (duplicate initializeApp — crashes on hot reload)
```ts
// src/lib/client/firebase.ts — WRONG
import { initializeApp } from "firebase/app";
export const app = initializeApp({ apiKey: "...", projectId: "..." }); // crashes on second call
```

### Bad Example 3 (trusting client uid without token verification)
```ts
// src/server/actions/profile.ts — WRONG
export const updateProfile = action(async (form: FormData) => {
  "use server";
  const uid = form.get("uid") as string; // client-controlled — trivial to forge
  await admin.firestore().collection("users").doc(uid).set({ /* ... */ });
}, "update-profile");
```

### Bad Example 4 (admin private key in VITE_ var)
```env
# .env — WRONG — VITE_ prefix means it ships to browser JS bundle
VITE_FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### Bad Example 5 (onSnapshot during SSR — hydration mismatch)
```tsx
// WRONG — runs during SSR, listener resolves async after hydration
export default function LiveFeed() {
  const [items, setItems] = createSignal([]);
  // This runs on the server during SSR and then again on the client
  const unsub = onSnapshot(collection(db, "posts"), snap => {
    setItems(snap.docs.map(d => d.data()));
  });
  // No cleanup either
  return <For each={items()}>{item => <p>{item.title}</p>}</For>;
}
```

### Good Example 1 (client SDK singleton with duplicate-init guard)
```ts
// src/lib/client/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export { getAuth, getFirestore } from "firebase/..."; // re-export as needed
```

### Good Example 2 (admin SDK singleton with private key parsing)
```ts
// src/lib/server/firebase-admin.ts
"use server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
```

### Good Example 3 (server action with ID token verification)
```ts
// src/server/actions/auth.ts
import { action, redirect } from "@solidjs/router";
import { adminAuth } from "~/lib/server/firebase-admin";
import { setSessionCookie } from "~/lib/server/session";

export const firebaseLoginAction = action(async (form: FormData) => {
  "use server";
  const idToken = form.get("idToken") as string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    await setSessionCookie(decoded.uid);
    return redirect("/dashboard");
  } catch {
    return { error: "Token tidak valid." };
  }
}, "firebase-login");
```

### Good Example 4 (Firestore read wrapped in query())
```ts
// src/server/db/posts.ts
import { query } from "@solidjs/router";
import { adminDb } from "~/lib/server/firebase-admin";

export const getPosts = query(async () => {
  "use server";
  const snap = await adminDb.collection("posts").orderBy("createdAt", "desc").limit(20).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}, "posts");
```

### Good Example 5 (real-time onSnapshot with onMount + onCleanup)
```tsx
// src/features/LiveComments.tsx — client-side only, SSR-safe
import { createSignal, onMount, onCleanup } from "solid-js";
import { app } from "~/lib/client/firebase";

export default function LiveComments(props: { postId: string }) {
  const [comments, setComments] = createSignal<any[]>([]);

  onMount(async () => {
    const { getFirestore, collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
    const db = getFirestore(app);
    const q = query(collection(db, "posts", props.postId, "comments"), orderBy("createdAt"));

    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onCleanup(unsub); // unsubscribes on route change
  });

  return <For each={comments()}>{c => <p>{c.text}</p>}</For>;
}
```

## Related skills
- [[solid-start-env-variables]] — VITE_FIREBASE_* for the client config; FIREBASE_ADMIN_* in ssrDefine only.
- [[solid-start-security-hardening]] — always verify ID tokens server-side before trusting uid.
- [[solid-start-session-cookies]] — combine Firebase Auth with a server-side session cookie for SSR-ready auth state.
- [[solid-start-server-actions-mutations]] — admin Firestore writes wrapped in action() with "use server".
