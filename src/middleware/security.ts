import { randomBytes } from "node:crypto";
import type { FetchEvent } from "@solidjs/start/server";

export function securityHeadersMW(event: FetchEvent) {
  // Nonce stored in locals for future use with controlled inline scripts
  const nonce = randomBytes(16).toString("base64");
  event.locals.cspNonce = nonce;

  const h = event.response.headers;
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  h.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // 'unsafe-inline' is required — SolidStart injects inline hydration scripts
      // without nonce support in this alpha version. Adding a nonce alongside
      // 'unsafe-inline' would cause CSP Level 3 browsers to ignore 'unsafe-inline',
      // breaking hydration. We omit the nonce from script-src intentionally.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.github.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join("; ")
  );
}
