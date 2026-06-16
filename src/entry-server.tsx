// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { IncomingMessage } from "node:http";
import { FastURL } from "srvx";

// Monkey patch IncomingMessage.prototype.url to always return absolute URL on the server
if (IncomingMessage && IncomingMessage.prototype) {
  Object.defineProperty(IncomingMessage.prototype, "url", {
    get() {
      let val = this._url_val;
      if (typeof val === "string" && val.startsWith("/")) {
        const encrypted = this.socket?.encrypted || this.connection?.encrypted;
        const proto = encrypted || this.headers["x-forwarded-proto"] === "https" ? "https:" : "http:";
        const host = this.headers.host || this.headers[":authority"] || "localhost";
        return `${proto}//${host}${val}`;
      }
      return val || "/";
    },
    set(v) {
      this._url_val = v;
    },
    configurable: true
  });
}

// Monkey patch URL[Symbol.hasInstance] to support srvx's FastURL/NodeRequestURL in H3
const NativeURL = globalThis.URL;
if (NativeURL && !NativeURL[Symbol.hasInstance]) {
  Object.defineProperty(NativeURL, Symbol.hasInstance, {
    value(instance) {
      if (!instance || typeof instance !== "object") return false;
      return (
        NativeURL.prototype.isPrototypeOf(instance) ||
        instance.constructor?.name === "FastURL" ||
        instance.constructor?.name === "NodeRequestURL" ||
        (typeof instance.href === "string" && typeof instance.pathname === "string" && "_" + "url" in instance)
      );
    },
    configurable: true,
    writable: true
  });
}

// Monkey patch FastURL._url getter to handle relative URLs without throwing
const srvxDescriptor = Object.getOwnPropertyDescriptor(FastURL.prototype, "_url");
if (srvxDescriptor && srvxDescriptor.get) {
  const originalGet = srvxDescriptor.get;
  Object.defineProperty(FastURL.prototype, "_url", {
    get() {
      try {
        return originalGet.call(this);
      } catch (err) {
        if (typeof this.href === "string" && this.href.startsWith("/")) {
          this.this_url_fallback = new NativeURL(this.href, "http://localhost");
          return this.this_url_fallback;
        }
        throw err;
      }
    },
    configurable: true
  });
}

// Suppress H3 event handler deprecation warning from SolidStart alpha
const originalWarn = console.warn;
console.warn = function (...args) {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Implicit event handler conversion is deprecated")
  ) {
    return;
  }
  return originalWarn.apply(this, args);
};

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#FF6B00" />
          <link rel="icon" href="/favicon.ico" />
          <meta name="robots" content="index, follow" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
          {/* Prevent dark mode flash — runs before first paint, covered by 'unsafe-inline' */}
          <script innerHTML="(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));