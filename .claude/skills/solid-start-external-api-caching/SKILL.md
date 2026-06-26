---
name: solid-start-external-api-caching
description: Fetch from a rate-limited external API with a DB-backed TTL cache so repeated requests are served from the database and stale data is returned on failure instead of crashing.
related:
  - solid-start-prisma-database
  - solid-start-basic-code
  - solid-start-env-variables
  - solid-start-security-hardening
---

# External Api Caching
- Every external API call checks a DB cache table first; fresh data (within TTL) is returned without hitting the network.
- On fetch success the cache row is upserted; on failure the stale cache row is returned as a graceful fallback.
- The whole read is wrapped in `query()` so SolidStart's in-memory dedup layer sits on top of the DB cache.
- API credentials (`TOKEN`, `API_KEY`) live in `process.env` via `ssrDefine`, never in `VITE_` vars.

## Safety contract: non-negotiable
- Abort if API credentials are read outside `"use server"` scope (they would appear in the client bundle).
- Abort if there is no TTL check — every request hits the external API, exhausting rate limits and adding latency.
- Abort if a failed fetch throws instead of returning stale cache — one API outage must not take down the whole page.
- Abort if the cached JSON blob is used without validation/casting — the shape may have changed between fetches.

## Required tools
- Prisma DB model for the cache table (e.g. `GithubCache` with `data Json`, `fetchedAt DateTime`).
- Node `fetch` (built-in >= Node 18, Bun built-in) — no extra HTTP library needed for simple cases.
- `"use server"` + `query()` from `@solidjs/router`.

## Gotchas
- TTL comparison: compare `Date.now() - cache.fetchedAt.getTime()` against a millisecond constant, not a raw number — define `const CACHE_TTL_MS = 6 * 60 * 60 * 1000` at the top of the file.
- `db.model.upsert` requires a unique constraint on the cache key column; add `@unique` to `username` (or the equivalent key field) in the schema.
- GitHub GraphQL pagination: the contributions query caps at 100 repos per page — if you need all repos, implement cursor-based pagination or accept the 100-repo limit.
- Prisma stores `Json` as a string in MariaDB; cast it explicitly: `cache.data as unknown as YourType`. Validate the shape with Zod if the external API schema is not guaranteed.
- For high-traffic apps, add a `SELECT ... FOR UPDATE` lock or a distributed mutex around the fetch-and-upsert to prevent thundering herd (multiple simultaneous cache misses hitting the API at once).

## Workflow
1. Add a `CacheModel` to `prisma/schema.prisma` with `username String @unique`, `data Json`, `fetchedAt DateTime`.
2. Run `bun run db:generate` and `bun run db:push`.
3. Write `fetchFromExternalApi(key)` that: checks cache, returns if fresh, fetches if stale, upserts cache, falls back to stale on error.
4. Expose via `query(async (key) => { "use server"; return fetchFromExternalApi(key); }, "cache-key")`.
5. In the component use `createAsync(() => getCachedData(param))` inside `<Suspense>`.

## Code Examples (Good vs Bad)

### Bad Example 1 (no cache — hits GitHub API on every request)
```ts
// src/lib/server/github.ts — WRONG
export async function getGithubStats() {
  "use server";
  const res = await fetch("https://api.github.com/graphql", { /* ... */ });
  return res.json(); // re-fetches every SSR render → rate-limited within minutes
}
```

### Bad Example 2 (API token in VITE_ var — leaks to browser)
```ts
// WRONG
const token = import.meta.env.VITE_GITHUB_TOKEN; // ends up in client JS bundle
```

### Bad Example 3 (throws on API failure instead of returning stale data)
```ts
// WRONG — one GitHub outage takes down the portfolio page
export async function getGithubStats() {
  "use server";
  const res = await fetch(url, { headers: { Authorization: `bearer ${token}` } });
  if (!res.ok) throw new Error("GitHub API failed"); // should fall back to cache instead
  // ...
}
```

### Bad Example 4 (raw JSON blob cast without shape validation)
```ts
// WRONG — cache.data shape may have changed; TypeScript cast hides the mismatch
const stats = cache.data as GithubStats; // no validation; field added/removed in API breaks silently
```

### Bad Example 5 (magic number TTL — unreadable and hard to tune)
```ts
// WRONG
if (Date.now() - cache.fetchedAt.getTime() < 21600000) { // what is 21600000?
  return cache.data;
}
```

### Good Example 1 (cache model in schema.prisma)
```prisma
model GithubCache {
  id        String   @id @default(cuid())
  username  String   @unique           // cache key
  data      Json                        // serialized API response
  fetchedAt DateTime @default(now()) @map("fetched_at")

  @@index([fetchedAt])
  @@map("github_cache")
}
```

### Good Example 2 (fetch-with-cache-fallback pattern)
```ts
// src/lib/server/github.ts
"use server";
import { db } from "~/server/db/client";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getGithubStats(year?: number): Promise<GithubStats | null> {
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_TOKEN;
  if (!username || !token) return null;

  const cacheKey = year ? `${username}:${year}` : username;
  const cache = await db.githubCache.findUnique({ where: { username: cacheKey } });
  const isFresh = cache && Date.now() - cache.fetchedAt.getTime() < CACHE_TTL_MS;
  if (isFresh) return cache.data as unknown as GithubStats;

  try {
    const data = await fetchFromGitHub(username, token, year);
    await db.githubCache.upsert({
      where: { username: cacheKey },
      create: { username: cacheKey, data: data as any },
      update: { data: data as any, fetchedAt: new Date() },
    });
    return data;
  } catch {
    return cache ? (cache.data as unknown as GithubStats) : null; // stale fallback
  }
}
```

### Good Example 3 (wrapped in query() for SolidStart dedup layer)
```ts
// src/server/db/portfolio.ts
import { query } from "@solidjs/router";
import { getGithubStats } from "~/lib/server/github";

export const getGithubStatsByYear = query(async (year: number) => {
  "use server";
  return getGithubStats(year);
}, "github-stats-year");
```

### Good Example 4 (consumed in component with Suspense + Show)
```tsx
// src/features/landing/GitHubStats.tsx
import { createAsync } from "@solidjs/router";
import { Suspense, Show } from "solid-js";
import { getGithubStatsByYear } from "~/server/db/portfolio";

export default function GitHubStats(props: { stats?: GithubStats | null }) {
  const [selectedYear, setSelectedYear] = createSignal(new Date().getFullYear());

  const yearStats = createAsync(() => getGithubStatsByYear(selectedYear()));

  return (
    <Suspense fallback={<Skeleton class="h-48" />}>
      <Show when={props.stats} fallback={<p>Stats unavailable.</p>}>
        {/* render yearStats() or fall back to props.stats */}
      </Show>
    </Suspense>
  );
}
```

### Good Example 5 (cache invalidation endpoint for admin use)
```ts
// src/server/actions/cache.ts
import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getGithubStatsByYear } from "~/server/db/portfolio";

export const clearGithubCacheAction = action(async () => {
  "use server";
  await db.githubCache.deleteMany();
  return revalidate(getGithubStatsByYear.key);
}, "clear-github-cache");
```

## Related skills
- [[solid-start-prisma-database]] — the DB singleton and cache model schema live here.
- [[solid-start-basic-code]] — query() wrapping and createAsync consumption pattern.
- [[solid-start-env-variables]] — API tokens must be in ssrDefine (process.env), never VITE_.
- [[solid-start-security-hardening]] — validate cached JSON shape before use to prevent type confusion.
