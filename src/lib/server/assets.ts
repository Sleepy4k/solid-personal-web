"use server";
import { unlink, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { db } from "~/server/db/client";

function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return resolve(process.env.UPLOAD_DIR);
  }
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return join(thisFile, "client", "uploads");
  } catch {
    return join(process.cwd(), "public", "uploads");
  }
}

const UPLOAD_DIR = resolveUploadDir();

let isDirCreated = false;

async function ensureDir() {
  if (isDirCreated) return;
  await mkdir(UPLOAD_DIR, { recursive: true });
  isDirCreated = true;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "application/pdf",
]);

export async function uploadAsset(file: File) {
  if (file.size > MAX_SIZE) throw new Error("File terlalu besar (maks 10MB)");
  if (!ALLOWED.has(file.type)) throw new Error("Tipe file tidak diizinkan");

  await ensureDir();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return db.asset.create({
    data: {
      filename: file.name,
      path: `/uploads/${filename}`,
      mimeType: file.type,
      size: file.size,
      alt: file.name.replace(/\.[^.]+$/, ""),
    },
  });
}

export async function deleteAsset(id: string) {
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) return;

  const relativePath = asset.path.replace(/^\//, "");
  const full = join(UPLOAD_DIR, "..", relativePath);
  await unlink(full).catch(() => {});
  await db.asset.delete({ where: { id } });
}
