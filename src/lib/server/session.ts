"use server";
import { SignJWT, jwtVerify } from "jose";
import { db } from "~/server/db/client";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-min-32-chars-long!");

async function createToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const token = await createToken(userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, token, expiresAt } });
  return { token, expiresAt };
}

export async function getSessionFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("session="))
    ?.slice("session=".length);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { token } }).catch(() => {});
    return null;
  }
  return session;
}

export async function deleteSession(token: string) {
  await db.session.delete({ where: { token } }).catch(() => {});
}

export const sessionCookie = (token: string, exp: Date) =>
  `session=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${exp.toUTCString()}`;

export const clearCookie = () =>
  "session=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
