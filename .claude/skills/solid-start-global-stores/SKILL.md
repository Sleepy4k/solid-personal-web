---
name: solid-start-global-stores
description: Create shared reactive state in SolidStart using context-based Provider + query() pattern (src/stores/) for cross-page data like profile meta and session user — avoiding title flash on client navigation, preventing SSR data leakage, and keeping type definitions centralized in src/types/.
related:
  - solid-start-basic-code
  - solid-start-server-actions-mutations
  - solid-start-meta-tags
  - solid-start-authentication-guard-routes
  - solid-start-session-cookies
---

# Global Stores
- Stores live in `src/stores/` and use **SolidJS context** (not module-level signals) to share data across routes without SSR data leakage between users.
- Architecture: `profile.ts` / `auth.ts` export contexts and hooks; `providers.tsx` exports the Provider components that call `createAsync`; `app.tsx` mounts the providers once at the Router root.
- This solves the **client-nav title flash**: mounting `ProfileProvider` at app root ensures profile data is loaded once on hydration and available to ALL subsequent route navigations synchronously.
- Pages still call `getProfileMeta()` in `route.preload` to pre-warm the query cache for SSR — the Provider's `createAsync` reads from this cache synchronously during server render.
- TypeScript types are centralized in `src/types/` (not `src/lib/shared/types.ts`); `src/lib/shared/types.ts` is a re-export shim kept only for backward compatibility.

## Safety contract: non-negotiable
- Abort if server-only data (DB client, `process.env` secrets, `getRequestEvent()`) is accessed outside a `query()` or `action()` with `"use server"` — it crashes the browser bundle.
- Abort if `createAsync` is called at module level (outside a component) — Solid's owner system requires reactive primitives inside a component; module-level `createAsync` throws or leaks.
- Abort if a `createStore()` or `createSignal()` is used at module level for cross-request state — module-level signals are shared across concurrent SSR requests, causing user-A's data to appear in user-B's response.
- Abort if `"use server"` is placed at the top of a stores file — that makes the entire file server-only and breaks imports from client components.
- Abort if `createContext` default value is a static object (not a function) when the context holds a reactive accessor — the default must be `() => undefined` so code calling `ctx()` works before a Provider is mounted.

## Required tools
- `@solidjs/router`: `query`, `createAsync`.
- SolidJS: `createContext`, `useContext`, `ParentProps`.
- `@solidjs/start/server`: `getRequestEvent` (used dynamically inside `"use server"` query callbacks).
- JSX in `providers.tsx` (must be `.tsx` extension).

## Gotchas
- Provider components that contain JSX **must** live in a `.tsx` file — keep them in `stores/providers.tsx` separate from the plain `.ts` context/hook files.
- The `createContext` default value (`() => undefined`) is used when a component calls `useContext` with no Provider above it. In tests or Storybook this prevents crashes; in the app the Provider is always mounted.
- `useProfileMeta()` returns a reactive accessor `() => ProfileMeta | undefined`. Call it as `profile()` inside JSX/effects; never store the result in a plain `let` variable.
- Preloads are still required: without `getProfileMeta()` in `route.preload`, the SSR render starts before the profile query is in cache, and the Provider's `createAsync` won't read synchronously → SSR title falls back to "Portfolio".
- New shared types go in `src/types/` — `src/lib/shared/types.ts` was deleted.
- **SolidStart 2.x / Bun gotcha**: `await import("@solidjs/start/server")` inside a `"use server"` query callback returns `getRequestEvent` as `undefined`. It throws `TypeError: getRequestEvent is not a function` at runtime. Never use dynamic imports from `@solidjs/start/server` inside query callbacks — if you need the request event, access it via static import in a server-only file (`"use server"` at file top) or read session data through middleware-populated `event.locals` in server actions.

## Workflow
1. **Define context + hook in `.ts`**: Export `SomeContext = createContext(...)` and `useSomething() = useContext(SomeContext)`.
2. **Define Provider in `providers.tsx`**: Call `createAsync(() => getSomeQuery())` and wrap `SomeContext.Provider`.
3. **Mount provider in `app.tsx`** Router root — once, persisting across all route navigations.
4. **Preload query in each page**: `preload: () => { getPageData(); getSomeQuery(); }` — ensures SSR cache hit.
5. **Consume in components**: `const value = useSomething(); return <Title>{value()?.name}</Title>;`

## Code Examples (Good vs Bad)

### Bad Example 1 (module-level createSignal — SSR data leakage between users)
```ts
// src/stores/profile.ts — WRONG
import { createSignal } from "solid-js";
export const [profile, setProfile] = createSignal(null);
// Shared across ALL concurrent SSR requests — user A's data appears in user B's response
```

### Bad Example 2 ("use server" at file top — can't import in client components)
```ts
// src/stores/auth.ts — WRONG
"use server"; // whole file is server-only; any client component importing it crashes
export const getSessionUser = query(async () => { ... }, "session-user");
```

### Bad Example 3 (createAsync at module level — outside reactive owner)
```ts
// WRONG — throws "createAsync called outside reactive scope" at startup
export const profileData = createAsync(() => getProfileMeta());
```

### Bad Example 4 (JSX Provider in a .ts file — TypeScript parse error)
```ts
// src/stores/profile.ts — WRONG
export function ProfileProvider(props: ParentProps) {
  return <ProfileContext.Provider value={...}>{props.children}</ProfileContext.Provider>;
  // TS error: JSX is not allowed in .ts files — move JSX to providers.tsx
}
```

### Bad Example 5 (no preload — SSR title is wrong fallback)
```tsx
// WRONG — profile not in query cache before SSR render
export const route: RouteDefinition = {
  preload: () => getAllProjects() // forgot getProfileMeta()
  // ProfileProvider's createAsync can't read from cache synchronously → SSR title = "Portfolio"
};
```

### Good Example 1 (profile.ts — context + hook, no JSX)
```ts
// src/stores/profile.ts
import { createContext, useContext } from "solid-js";
import { getProfileMeta } from "~/server/db/portfolio";

export { getProfileMeta };
export type ProfileMeta = Awaited<ReturnType<typeof getProfileMeta>>;

export const ProfileContext = createContext<() => ProfileMeta | undefined>(
  () => undefined  // default: accessor returning undefined when no Provider above
);

export function useProfileMeta() {
  return useContext(ProfileContext); // returns () => ProfileMeta | undefined
}

export function buildTitle(
  pageLabel: string | undefined,
  profile: ProfileMeta | undefined
): string {
  const base = profile?.name && profile?.title
    ? `${profile.name} - ${profile.title}` : "Portfolio";
  return pageLabel ? `${pageLabel} | ${base}` : base;
}
```

### Good Example 2 (providers.tsx — JSX in .tsx file)
```tsx
// src/stores/providers.tsx
import { type ParentProps } from "solid-js";
import { createAsync } from "@solidjs/router";
import { ProfileContext, getProfileMeta } from "./profile";
import { AuthContext, getSessionUser } from "./auth";

export function ProfileProvider(props: ParentProps) {
  const profile = createAsync(() => getProfileMeta());
  return (
    <ProfileContext.Provider value={profile}>
      {props.children}
    </ProfileContext.Provider>
  );
}

export function AuthProvider(props: ParentProps) {
  const user = createAsync(() => getSessionUser());
  return (
    <AuthContext.Provider value={user}>
      {props.children}
    </AuthContext.Provider>
  );
}
```

### Good Example 3 (app.tsx — providers mounted once at Router root)
```tsx
// src/app.tsx
import { ProfileProvider, AuthProvider } from "~/stores/providers";

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={(props) => (
          <ProfileProvider>
            <AuthProvider>
              <NavProgress />
              <Suspense>{props.children}</Suspense>
            </AuthProvider>
          </ProfileProvider>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
// ProfileProvider calls createAsync once on app mount.
// All route navigations use the already-loaded profile → no title flash.
```

### Good Example 4 (route page — preload + context consumption)
```tsx
// src/routes/projects/index.tsx
import { getProfileMeta } from "~/stores/profile"; // for preload
import { useProfileMeta, buildTitle } from "~/stores/profile"; // for component

export const route: RouteDefinition = {
  preload: () => { getAllProjects(); getProfileMeta(); } // pre-warms SSR query cache
};

export default function ProjectsPage() {
  const profile = useProfileMeta(); // reads from ProfileContext — no createAsync here
  const pageTitle = () => buildTitle("Semua Proyek", profile());
  return <Title>{pageTitle()}</Title>;
}
```

### Good Example 5 (src/types/ — centralized type definitions)
```ts
// src/types/github.ts — shared interfaces for GitHub data
export interface ContribDay {
  date: string;
  contributionCount: number;
  weekday: number;
}
export interface GithubStats {
  name: string;
  totalContributions: number;
  weeks: { contributionDays: ContribDay[] }[];
  // ...
}

// src/types/index.ts — central re-export
export type { ContribDay, GithubStats } from "./github";

// src/lib/shared/types.ts — backward-compat shim ONLY
export type { ContribDay, GithubStats } from "~/types"; // do not add new types here
```

## Related skills
- [[solid-start-basic-code]] — query()/createAsync() pattern that stores wrap.
- [[solid-start-server-actions-mutations]] — action() for mutations; stores handle reads only.
- [[solid-start-meta-tags]] — useProfileMeta + buildTitle consumed for SEO titles; ProfileProvider fixes client-nav flash.
- [[solid-start-authentication-guard-routes]] — useSessionUser for auth-aware UI.
- [[solid-start-session-cookies]] — event.locals.user populated by auth middleware, read by getSessionUser.
