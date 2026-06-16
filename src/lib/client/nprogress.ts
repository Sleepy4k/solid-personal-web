import NProgress from "nprogress";

export function configureNProgress() {
  NProgress.configure({ showSpinner: false, trickle: true, speed: 500, minimum: 0.5 });
}

export { NProgress };
