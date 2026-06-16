import { action, redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { db } from "~/server/db/client";
import { createSession, sessionCookie, deleteSession, clearCookie } from "~/lib/server/session";
import { verifyPassword } from "~/lib/shared/hashing";

export const loginAction = action(async (form: FormData) => {
  "use server";
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Email dan password wajib diisi" };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return { error: "Email atau password salah" };
  }

  const { token, expiresAt } = await createSession(user.id);
  const event = getRequestEvent()!;
  event.response.headers.set("Set-Cookie", sessionCookie(token, expiresAt));
  throw redirect("/dashboard");
}, "login");

export const logoutAction = action(async () => {
  "use server";
  const event = getRequestEvent()!;
  const cookie = event.request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("session="))
    ?.slice("session=".length);
  if (token) await deleteSession(token);
  return new Response(null, {
    status: 302,
    headers: { "Set-Cookie": clearCookie(), Location: "/login" }
  });
}, "logout");
