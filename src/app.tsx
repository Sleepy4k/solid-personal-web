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
              <div class="noscript-bio">
                <h1 class="noscript-bio-name">Apri Pandu Wicaksono</h1>
                <p class="noscript-bio-text">
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
              <div class="noscript-banner">
                Aktifkan JavaScript di browser Anda untuk menggunakan semua
                fitur interaktif di website portfolio ini.
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
