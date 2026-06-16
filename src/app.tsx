import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense, createEffect } from "solid-js";
import { useIsRouting } from "@solidjs/router";
import { NProgress, configureNProgress } from "~/lib/client/nprogress";
import "./app.css";

configureNProgress();

function NavProgress() {
  const isRouting = useIsRouting();
  createEffect(() => {
    isRouting() ? NProgress.start() : NProgress.done();
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
