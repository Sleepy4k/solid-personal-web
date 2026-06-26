import { defineConfig, loadEnv } from "vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

process.noDeprecation = true;

const SERVER_ENV_KEYS = [
  "JWT_SECRET",
  "DATABASE_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "GITHUB_USERNAME",
  "GITHUB_TOKEN",
  "NODE_ENV",
] as const;

export default defineConfig(({ command, mode }) => {
  let definitions = {}
  const env = loadEnv(mode, process.cwd(), "");
  const ssrDefine = Object.fromEntries(
    SERVER_ENV_KEYS.map((key) => [
      `process.env.${key}`,
      JSON.stringify(env[key] ?? process.env[key] ?? ""),
    ]),
  );

  if (command === "build") {
    definitions = {
      "import.meta.env.DEV": "false",
      "import.meta.env.START_DEV_OVERLAY": "false",
    };
  }

  return {
    server: {
      host: true,
      port: 5173,
    },
    resolve: {
      dedupe: ["solid-js", "@solidjs/router", "@solidjs/meta", "solid-js/web"],
    },
    build: {
      target: "es2020",
      minify: "terser",
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      terserOptions: {
        format: { comments: false },
        compress: {
          drop_debugger: true,
          passes: 2,
          pure_getters: true,
        },
        mangle: true,
      },
    },
    define: definitions,
    plugins: [
      solidStart({
        ssr: true,
        middleware: "./src/middleware/index.ts",
      }),
      tailwindcss(),
    ],
    optimizeDeps: { include: ["nprogress"] },
    environments: {
      ssr: {
        define: ssrDefine,
      },
    },
  };
});
