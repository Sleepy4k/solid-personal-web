import type { FetchEvent } from "@solidjs/start/server";
import { getSessionFromCookie } from "~/lib/server/session";

export async function adminAuthMW(event: FetchEvent) {
  const rawUrl = event.request.url;
  const pathname = new URL(rawUrl, "http://localhost").pathname;
  if (!pathname.startsWith("/dashboard")) return;

  const headers = event.request.headers as any;
  const cookie = typeof headers.get === "function" ? headers.get("cookie") : headers["cookie"];
  const session = await getSessionFromCookie(cookie);

  if (!session) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" }
    });
  }

  event.locals.userId = session.userId;
  event.locals.user = { id: session.userId, email: session.user.email };
}
