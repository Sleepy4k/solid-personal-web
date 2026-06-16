import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    solidStart({
      middleware: "./src/middleware/index.ts"
    }),
    tailwindcss(),
    nitro({
      routeRules: {
        "/": { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
        "/dashboard/**": { headers: { "Cache-Control": "private, no-store" } },
        "/uploads/**": { headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
      }
    })
  ]
});
