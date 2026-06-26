---
name: solid-start-dark-mode-theme
description: Wire a FOUC-free dark/light mode into SolidStart using data-theme on <html>, CSS custom properties, and localStorage persistence — without a flash on first paint.
related:
  - solid-start-ssr-hydration-matching
  - solid-start-basic-code
  - solid-start-best-practices
---

# Dark Mode Theme
- Sets `data-theme` on `<html>` (not `<body>`) so CSS custom properties cascade to every element including `<head>`-injected assets.
- An inline `<script>` in `entry-server.tsx` runs before CSS renders, reading `localStorage` to prevent any flash of unstyled/wrong-theme content (FOUC).
- Theme state is kept in a SolidJS signal; `onMount` reads `localStorage` so no SSR/client mismatch crash.
- `onCleanup` removes any event listeners registered alongside theme logic inside `onMount`.

## Safety contract: non-negotiable
- Abort if `localStorage` or `window` is accessed at module scope (crashes SSR — always guard inside `onMount` or `typeof window !== "undefined"`).
- Abort if `data-theme` is set on anything other than `document.documentElement` (`<html>`) — CSS vars scoped to `body` or a component div break elements rendered outside that subtree (portals, fixed overlays).
- Abort if the FOUC-prevention inline script is missing from `entry-server.tsx` — users with `prefers-color-scheme: dark` or a saved dark preference will see a white flash on every hard reload.
- Abort if the inline script uses `localStorage.getItem` without a try/catch — private browsing contexts throw a `SecurityError` and break the entire page before JS loads.

## Required tools
- SolidStart >= 1.0 (`@solidjs/start`).
- CSS custom properties (no third-party theming library needed).
- `localStorage` (browser) — already available; no package required.

## Gotchas
- CSS `transition: background-color 0.2s ease` on `body` also transitions during the initial FOUC-prevention script run (before styles are parsed). The inline script fires early enough that no transition is seen, but if you programmatically toggle later keep this in mind — add a tiny `requestAnimationFrame` delay before re-enabling transitions if you see a flicker.
- `createSignal("light")` in the component initialises to `"light"` on SSR; the `onMount` corrects it. This means the toggle button icon always renders "moon" on the server. Wrap the icon in `<Show>` keyed on the signal so it hydrates correctly without a mismatch warning.
- Multiple components reading the same theme signal must share state — either lift the signal to a context provider or use a module-level signal. Two separate `createSignal` calls will not stay in sync.
- `document.documentElement.setAttribute` is synchronous and paint-blocking; calling it from `onMount` is fine. Never call it inside a `createEffect` that depends on a fetched value — that runs async and causes a flash.

## Workflow
1. Define CSS variables for both themes in `src/app.css` under `:root, [data-theme="light"]` and `[data-theme="dark"]`.
2. Add the FOUC-prevention inline script to `<head>` in `src/entry-server.tsx` (reads `localStorage` and applies `data-theme` before the browser paints).
3. Implement `getTheme()` (guarded `localStorage.getItem`) and `applyTheme(t)` (`setAttribute` + `localStorage.setItem`) helpers.
4. In the Header component: `createSignal("light")`, read real value in `onMount`, call `applyTheme` on toggle.
5. Export a `ThemeContext` if multiple components need to read the theme reactively.

## Code Examples (Good vs Bad)

### Bad Example 1 (localStorage read at module scope — SSR crash)
```ts
// src/components/Header.tsx — WRONG
const savedTheme = localStorage.getItem("theme") ?? "light"; // ReferenceError: localStorage is not defined (SSR)
export default function Header() {
  const [theme, setTheme] = createSignal(savedTheme);
  // ...
}
```

### Bad Example 2 (data-theme on body instead of <html>)
```ts
// WRONG — fixed overlays, portals, and <head> content won't inherit --c-bg etc.
function applyTheme(t: string) {
  document.body.setAttribute("data-theme", t); // should be document.documentElement
  localStorage.setItem("theme", t);
}
```

### Bad Example 3 (no FOUC-prevention script — flashes on hard reload)
```tsx
// src/entry-server.tsx — WRONG: no inline script
export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          {/* missing: <script innerHTML="...localStorage..." /> */}
          {assets}
        </head>
        <body><div id="app">{children}</div>{scripts}</body>
      </html>
    )}
  />
));
// Result: dark-mode users see white flash on every load
```

### Bad Example 4 (localStorage without try/catch — breaks in private mode)
```ts
// WRONG — SecurityError in Safari private browsing kills the page
const script = `var t = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', t);`;
// No try/catch → uncaught error before CSS loads → unstyled page
```

### Bad Example 5 (two separate signals for same theme — desync)
```tsx
// ComponentA.tsx
const [theme, setTheme] = createSignal("light");
// ComponentB.tsx
const [theme, setTheme] = createSignal("light"); // separate signal — toggling in A doesn't update B
```

### Good Example 1 (FOUC-prevention inline script in entry-server.tsx)
```tsx
// src/entry-server.tsx
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {/* Runs before CSS — prevents FOUC */}
          <script innerHTML="(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
```

### Good Example 2 (CSS custom properties split by theme)
```css
/* src/app.css */
:root,
[data-theme="light"] {
  --c-bg: #ffffff;
  --c-bg-alt: #f9f9f9;
  --c-text: #111111;
  --c-text-muted: #666666;
  --c-border: #e5e5e5;
  --c-primary: #ff6b00;
}

[data-theme="dark"] {
  --c-bg: #0e0e0e;
  --c-bg-alt: #1a1a1a;
  --c-text: #f0f0f0;
  --c-text-muted: #9a9a9a;
  --c-border: #2a2a2a;
}

body {
  background: var(--c-bg);
  color: var(--c-text);
  transition: background-color 0.2s ease, color 0.2s ease;
}
```

### Good Example 3 (SSR-safe helpers + onMount pattern)
```tsx
// src/components/shared/Header.tsx
import { createSignal, onMount, onCleanup, Show } from "solid-js";

function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"; // SSR guard
  try {
    return (localStorage.getItem("theme") as "light" | "dark") ?? "light";
  } catch {
    return "light";
  }
}

function applyTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch {}
}

export default function Header() {
  const [theme, setTheme] = createSignal<"light" | "dark">("light");

  onMount(() => {
    const t = getTheme();
    setTheme(t);
    applyTheme(t); // sync in case FOUC script set it already

    const onScroll = () => { /* scroll logic */ };
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  function toggleTheme() {
    const next = theme() === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <header>
      <button onClick={toggleTheme} aria-label={theme() === "dark" ? "Switch to light" : "Switch to dark"}>
        <Show when={theme() === "dark"} fallback={<MoonIcon />}>
          <SunIcon />
        </Show>
      </button>
    </header>
  );
}
```

### Good Example 4 (shared theme via context for multi-component access)
```tsx
// src/lib/client/theme.ts
import { createContext, useContext, createSignal, onMount } from "solid-js";

const ThemeContext = createContext<{ theme: () => "light"|"dark"; toggle: () => void }>();

export function ThemeProvider(props: { children: any }) {
  const [theme, setTheme] = createSignal<"light"|"dark">("light");

  onMount(() => {
    try { setTheme((localStorage.getItem("theme") as any) ?? "light"); } catch {}
  });

  const toggle = () => {
    const next = theme() === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{props.children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext)!;
```

### Good Example 5 (classList-driven conditional styles react to theme signal)
```tsx
// Component that changes appearance based on theme
export default function Card(props: { children: any }) {
  const { theme } = useTheme();
  return (
    <div
      class="rounded-xl p-4 border"
      classList={{
        "bg-white border-gray-200": theme() === "light",
        "bg-[#1a1a1a] border-[#2a2a2a]": theme() === "dark",
      }}
    >
      {props.children}
    </div>
  );
}
// Prefer CSS vars over classList for theme-driven styles — only use classList for
// structural differences (not just color) that can't be expressed with CSS vars.
```

## Related skills
- [[solid-start-ssr-hydration-matching]] — the inline script avoids hydration mismatches by setting the same theme the client will compute.
- [[solid-start-basic-code]] — onMount / onCleanup lifecycle rules this skill relies on.
- [[solid-start-best-practices]] — CSS var theming over Tailwind arbitrary values keeps bundle small and consistent.
