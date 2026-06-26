import { sendNodeResponse, NodeRequest } from "srvx/node";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname, extname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "dist/client");
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? resolve(process.env.UPLOAD_DIR)
  : join(__dirname, "public", "uploads");
const entryUrl = pathToFileURL(
  join(__dirname, "dist/server/entry-server.js"),
).href;

const { default: handler } = await import(entryUrl);
const fetchHandler = handler.fetch ?? ((req) => handler.request(req));

const MIME = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const IMMUTABLE_ASSETS = /^\/_build\/assets\//;

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const server = createServer(async (req, res) => {
  const pathname = req.url?.split("?")[0] ?? "/";
  const filePath = join(CLIENT_DIR, pathname);

  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      const ext = extname(filePath).toLowerCase();
      const mime = MIME[ext] ?? "application/octet-stream";
      const immutable = IMMUTABLE_ASSETS.test(pathname);
      const data = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": mime,
        "Content-Length": data.length,
        "Cache-Control": immutable
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, must-revalidate",
      });
      res.end(data);
      return;
    }
  } catch {
    // not a static file — fall through
  }

  // Serve dynamically-uploaded files from UPLOAD_DIR (not bundled into dist/client).
  // Paths stored in DB are always /uploads/<filename> with no subdirectories.
  if (pathname.startsWith("/uploads/")) {
    const filename = pathname.slice("/uploads/".length);
    // Reject empty names and any path traversal attempt
    if (filename && !filename.includes("/") && !filename.includes("..")) {
      const uploadPath = join(UPLOAD_DIR, filename);
      try {
        const info = await stat(uploadPath);
        if (info.isFile()) {
          const ext = extname(uploadPath).toLowerCase();
          const mime = MIME[ext] ?? "application/octet-stream";
          const data = await readFile(uploadPath);
          res.writeHead(200, {
            "Content-Type": mime,
            "Content-Length": data.length,
            "Cache-Control": "public, max-age=0, must-revalidate",
          });
          res.end(data);
          return;
        }
      } catch {
        // file not found — fall through to SSR (will 404)
      }
    }
  }

  res.setHeader("content-encoding", "identity");
  const webReq = new NodeRequest({ req, res });
  try {
    const webRes = await fetchHandler(webReq);
    await sendNodeResponse(res, webRes);
  } catch (err) {
    console.error("[server] Unhandled error:", err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
