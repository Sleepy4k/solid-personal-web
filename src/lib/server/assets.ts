"use server";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "~/server/db/client";
import fs from "fs/promises";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "application/pdf"
]);

export async function uploadAsset(file: File) {
  if (file.size > MAX_SIZE) throw new Error("File terlalu besar (maks 10MB)");
  if (!ALLOWED.has(file.type)) throw new Error("Tipe file tidak diizinkan");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `${randomUUID()}.${ext}`;

  await fs.writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  return db.asset.create({
    data: {
      filename: file.name,
      path: `/uploads/${filename}`,
      mimeType: file.type,
      size: file.size,
      alt: file.name.replace(/\.[^.]+$/, "")
    }
  });
}

export async function deleteAsset(id: string) {
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) return;
  const full = join(process.cwd(), "public", asset.path);
  await unlink(full).catch(() => {});
  await db.asset.delete({ where: { id } });
}
