---
name: solid-start-maps-integration
description: Embed an interactive Leaflet or Mapbox GL JS map in SolidStart with SSR-safe lazy import, explicit container height, cleanup on unmount, and no window-is-not-defined crashes.
related:
  - solid-start-island-architecture-ssr
  - solid-start-basic-code
  - solid-start-env-variables
---

# Maps Integration
- The map library is imported only inside `onMount` (dynamic import) so the SSR pass never executes browser-only code.
- The container `<div>` is given an explicit CSS height before the map is initialised — without this Leaflet renders a zero-pixel map.
- `map.remove()` is called in `onCleanup` to detach all event listeners and release the canvas/WebGL context on route change.
- Mapbox public token lives in a `VITE_` var (it is safe to expose); Mapbox server-side secrets and tile credentials must remain in `process.env` / ssrDefine.

## Safety contract: non-negotiable
- Abort if `leaflet` or `mapbox-gl` is imported at the top of a component file — any SSR render crashes with `ReferenceError: window is not defined`.
- Abort if `map.remove()` is missing from `onCleanup` — navigating away leaves a detached canvas with all its WebGL resources allocated, eventually causing tab crashes.
- Abort if the map container has no explicit height (no `h-[400px]`, `height: 400px`, or equivalent) — Leaflet silently renders a 0×0 box with no error.
- Abort if a Mapbox server-side secret or style access token with restricted scope is embedded in a `VITE_` var — use a public token for the client SDK; restrict it by domain in the Mapbox dashboard.

## Required tools
- `leaflet` + `@types/leaflet` **or** `mapbox-gl` + `@types/mapbox-gl`.
- Leaflet CSS: import in `app.css` via `@import "leaflet/dist/leaflet.css"` or load dynamically alongside the JS.
- For Mapbox: `VITE_MAPBOX_TOKEN` public env var (domain-locked in Mapbox dashboard).
- SolidJS `onMount`, `onCleanup`, and a `ref` on the container div.

## Gotchas
- Leaflet marker icons use absolute URLs derived from `L.Icon.Default.imagePath`; under Vite the default resolution breaks. Fix with: `import iconUrl from "leaflet/dist/images/marker-icon.png?url"` and set `L.Icon.Default.prototype._getIconUrl = () => iconUrl` or use a custom icon.
- Mapbox GL JS v2 is Mapbox-proprietary (not MIT); use `maplibre-gl` (a fork, MIT) as a drop-in replacement for open-source projects.
- Calling `map.setCenter()` or adding layers before the `"load"` event fires on Mapbox/MapLibre causes silent failures — wait for `map.on("load", () => { ... })`.
- Avoid re-initialising the map inside a `createEffect` or reactive context — the ref assignment triggers once; initialise only in `onMount`.
- On mobile, Leaflet touch events fire both `touchstart` and `click`; add `.stopPropagation()` to popup close handlers to prevent ghost clicks.

## Workflow
1. Install `leaflet` (or `mapbox-gl`/`maplibre-gl`); add Leaflet CSS to `app.css`.
2. Give the container div a fixed or percentage height via a CSS class (`h-[400px]`, etc.).
3. In `onMount`, dynamically import the library, initialise the map with the container ref, add tiles and markers.
4. Register `onCleanup(() => map.remove())`.
5. For Mapbox/MapLibre tokens: add `VITE_MAPBOX_TOKEN` to `.env`; read with `import.meta.env.VITE_MAPBOX_TOKEN` in the component.

## Code Examples (Good vs Bad)

### Bad Example 1 (top-level import — SSR crash)
```tsx
// WRONG
import L from "leaflet"; // window is not defined during SSR
import "leaflet/dist/leaflet.css";

export default function Map() {
  let el: HTMLDivElement | undefined;
  onMount(() => { L.map(el!).setView([51.5, -0.09], 13); });
  return <div ref={el} class="h-[400px]" />;
}
```

### Bad Example 2 (no cleanup — WebGL/canvas leak on route change)
```tsx
// WRONG
onMount(async () => {
  const L = (await import("leaflet")).default;
  const map = L.map(el!).setView([-7.25, 109.2], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  // missing: onCleanup(() => map.remove());
});
```

### Bad Example 3 (no explicit height — zero-pixel invisible map)
```tsx
// WRONG — Leaflet renders but is invisible; no error thrown
<div ref={el} /> {/* height: 0 */}
```

### Bad Example 4 (Mapbox server secret in VITE_ var)
```env
# WRONG — server-only Mapbox secret style URL exposed to browser
VITE_MAPBOX_SECRET_STYLE=mapbox://styles/company/secret-proprietary-style
```

### Bad Example 5 (adding layers before Mapbox "load" event)
```ts
// WRONG — throws "Map not fully loaded" or silently fails
const map = new mapboxgl.Map({ container: el!, style: "mapbox://styles/mapbox/streets-v12", token });
map.addLayer({ id: "points", type: "circle", source: "my-source" }); // too early
```

### Good Example 1 (Leaflet with SSR-safe dynamic import + cleanup)
```tsx
// src/components/ui/LeafletMap.tsx
import { onMount, onCleanup } from "solid-js";

interface Props { lat: number; lng: number; zoom?: number; class?: string; }

export default function LeafletMap(props: Props) {
  let el: HTMLDivElement | undefined;

  onMount(async () => {
    const L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    // Fix default icon broken by Vite
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9/dist/images/marker-shadow.png",
    });

    const map = L.map(el!).setView([props.lat, props.lng], props.zoom ?? 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.marker([props.lat, props.lng]).addTo(map);

    onCleanup(() => map.remove());
  });

  return <div ref={el} class={`h-[400px] rounded-xl overflow-hidden ${props.class ?? ""}`} />;
}
```

### Good Example 2 (MapLibre GL with token from VITE_ env)
```tsx
// src/components/ui/MapLibreMap.tsx
import { onMount, onCleanup } from "solid-js";

export default function MapLibreMap(props: { lat: number; lng: number }) {
  let el: HTMLDivElement | undefined;

  onMount(async () => {
    const maplibregl = (await import("maplibre-gl")).default;
    await import("maplibre-gl/dist/maplibre-gl.css");

    const map = new maplibregl.Map({
      container: el!,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`,
      center: [props.lng, props.lat],
      zoom: 13,
    });

    map.on("load", () => {
      new maplibregl.Marker().setLngLat([props.lng, props.lat]).addTo(map);
    });

    onCleanup(() => map.remove());
  });

  return <div ref={el} class="h-[400px] w-full rounded-xl" />;
}
```

### Good Example 3 (multiple markers from server data)
```tsx
// src/components/ui/LocationMap.tsx
import { onMount, onCleanup } from "solid-js";

interface Marker { lat: number; lng: number; label: string; }

export default function LocationMap(props: { markers: Marker[] }) {
  let el: HTMLDivElement | undefined;

  onMount(async () => {
    const L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    const bounds = props.markers.map(m => [m.lat, m.lng] as [number, number]);
    const map = L.map(el!);

    props.markers.forEach(m => {
      L.marker([m.lat, m.lng]).bindPopup(m.label).addTo(map);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    onCleanup(() => map.remove());
  });

  return <div ref={el} class="h-[500px] w-full rounded-xl" />;
}
```

### Good Example 4 (clientOnly wrapper for route-level SSR skip)
```tsx
// src/routes/contact.tsx
import { clientOnly } from "@solidjs/start";
const LeafletMap = clientOnly(() => import("~/components/ui/LeafletMap"));

export default function ContactPage() {
  return (
    <main>
      <h1>Lokasi</h1>
      {/* Entirely excluded from SSR bundle — no hydration mismatch */}
      <LeafletMap lat={-7.2575} lng={109.2503} zoom={15} />
    </main>
  );
}
```

### Good Example 5 (geolocation + map center update without re-init)
```tsx
// Pan to user location without destroying and re-creating the map
onMount(async () => {
  const L = (await import("leaflet")).default;
  await import("leaflet/dist/leaflet.css");

  const map = L.map(el!).setView([-7.25, 109.25], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

  let userMarker: any = null;

  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 15); // pan without re-init
    if (userMarker) userMarker.setLatLng([latitude, longitude]);
    else userMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("Lokasi Anda");
  });

  onCleanup(() => map.remove());
});
```

## Related skills
- [[solid-start-island-architecture-ssr]] — clientOnly() and onMount dynamic imports for browser-only widgets.
- [[solid-start-basic-code]] — onMount/onCleanup lifecycle rules.
- [[solid-start-env-variables]] — VITE_MAPBOX_TOKEN public var vs server-only tile credentials.
