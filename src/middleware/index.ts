import { createMiddleware } from "@solidjs/start/middleware";
import type { FetchEvent } from "@solidjs/start/server";
import { adminAuthMW } from "./auth";
import { securityHeadersMW } from "./security";

export async function fixUrlMW(event: FetchEvent) {
  const req = event.request;
  if (req) {
    const headers = req.headers as any;
    if (headers && typeof headers.get !== "function") {
      Object.defineProperty(headers, "get", {
        value(name: string) {
          return this[name.toLowerCase()] || this[name] || null;
        },
        configurable: true,
        writable: true
      });
    }

    if (typeof req.url === "string" && req.url.startsWith("/")) {
      const encrypted = (req as any).socket?.encrypted || (req as any).connection?.encrypted;
      const protoHeader = headers.get("x-forwarded-proto");
      const protocol = encrypted || protoHeader === "https" ? "https:" : "http:";
      const host = headers.get("host") || "localhost";
      req.url = `${protocol}//${host}${req.url}`;
    }
  }
}

export default createMiddleware({
  onRequest: [fixUrlMW, adminAuthMW],
  onBeforeResponse: [securityHeadersMW]
});