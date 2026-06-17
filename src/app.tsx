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
        root={props => (
          <>
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
