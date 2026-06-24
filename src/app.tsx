import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense, createEffect, createSignal, onMount } from "solid-js";
import { useIsRouting } from "@solidjs/router";
import "./app.css";

function NavProgress() {
  const isRouting = useIsRouting();
  const [np, setNp] = createSignal<{ start(): void; done(): void } | null>(null);

  onMount(() => {
    import("~/lib/client/nprogress").then(({ NProgress, configureNProgress }) => {
      configureNProgress();
      setNp(NProgress);
    });
  });

  createEffect(() => {
    const progress = np();
    if (!progress) return;
    isRouting() ? progress.start() : progress.done();
  });

  return null;
}

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={(props) => (
          <>
            <noscript>
              <div
                style={{
                  "background-color": "#ff6b00",
                  color: "white",
                  padding: "12px",
                  "text-align": "center",
                  "font-family": "system-ui, -apple-system, sans-serif",
                  "font-size": "14px",
                  "font-weight": "600",
                  position: "sticky",
                  top: "0",
                  "z-index": "9999",
                }}
              >
                Aktifkan JavaScript di browser Anda untuk menggunakan semua
                fitur interaktif di website portfolio ini.
              </div>
              <div
                style={{
                  padding: "20px",
                  "font-family": "system-ui, -apple-system, sans-serif",
                  "max-width": "800px",
                  margin: "0 auto",
                  "text-align": "center",
                  "border-bottom": "1px solid var(--c-border)",
                }}
              >
                <h2
                  style={{
                    "font-size": "1.5rem",
                    "font-weight": "700",
                    color: "var(--c-text)",
                    "margin-bottom": "8px",
                  }}
                >
                  Apri Pandu Wicaksono
                </h2>
                <p
                  style={{
                    "font-size": "0.875rem",
                    color: "var(--c-text-muted)",
                    "line-height": "1.5",
                  }}
                >
                  Hai! Saya Apri Pandu Wicaksono, seorang Pengembang Perangkat Lunak yang
                  termotivasi oleh tantangan untuk mengubah ide-ide kompleks
                  menjadi solusi digital yang fungsional, bermanfaat, terbarukan
                  dan berpusat pada pengguna. Perjalanan saya dimulai di SMK
                  Telkom Purwokerto, tempat saya mengambil spesialisasi di
                  bidang Rekayasa Perangkat Lunak dan menyelesaikan magang
                  pengembangan web selama sembilan bulan yang memperkuat dasar
                  saya dalam penulisan kode yang bersih dan pemecahan masalah
                  yang efektif. Saat ini, saya sedang memperdalam keahlian
                  teknis saya di bidang algoritma, struktur data, dan arsitektur
                  perangkat lunak sambil menempuh gelar Sarjana Ilmu Komputer di
                  Universitas Telkom Purwokerto.
                </p>
              </div>
            </noscript>
            <NavProgress />
            <Suspense>{props.children}</Suspense>
          </>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
