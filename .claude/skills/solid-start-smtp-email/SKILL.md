---
name: solid-start-smtp-email
description: Send transactional email from a SolidStart action using Resend or Nodemailer with server-only credentials, input sanitization, and rate-limit protection.
related:
  - solid-start-server-actions-mutations
  - solid-start-env-variables
  - solid-start-security-hardening
  - solid-start-api-routes
---

# Smtp Email
- All email sending happens inside `action(async (form) => { "use server"; ... })` — SMTP credentials never touch the client bundle.
- Input is validated with Zod before constructing the message body; raw user strings are never interpolated into HTML templates without escaping.
- A per-IP or per-form rate limit prevents abuse of the contact endpoint.
- Both Resend (HTTP API, no SMTP config) and Nodemailer (classic SMTP) patterns are covered.

## Safety contract: non-negotiable
- Abort if SMTP host/user/password or Resend API key is in a `VITE_` env var — it ships to the browser.
- Abort if there is no rate limit on the send action — a single curl loop exhausts your SMTP quota and spams recipients.
- Abort if raw user input is placed inside an HTML email body via string interpolation without escaping — stored XSS in email clients that render HTML.
- Abort if the action throws an unhandled error on send failure — the user receives a 500; catch and return a user-friendly message instead.

## Required tools
- `resend` (`npm i resend`) **or** `nodemailer` + `@types/nodemailer`.
- `zod` for input validation (already in this project).
- `@solidjs/router` `action` + `revalidate` for the form action wrapper.
- Env vars: `RESEND_API_KEY` **or** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## Gotchas
- Nodemailer v6 is CommonJS; under Bun/ESM import it with `import nodemailer from "nodemailer"` and confirm your Bun version supports it (>= 1.0.25 is stable).
- Resend requires a verified sending domain for production; `onboarding@resend.dev` works only in test mode (100 emails/day to your own address).
- Gmail SMTP: enable 2FA on the Google account then create an App Password — regular password auth is blocked since May 2022.
- For contact forms, send a confirmation copy to the submitter and the real email to yourself; set `replyTo` to the submitter so replies go to them.
- Keep HTML email simple — avoid Tailwind classes and modern CSS; use inline styles or a battle-tested template library (MJML, react-email) for HTML emails.

## Workflow
1. Add `RESEND_API_KEY` (or `SMTP_*` vars) to `.env` and `vite.config.ts` ssrDefine.
2. Create `src/lib/server/email.ts` with a `sendEmail(opts)` helper marked `"use server"`.
3. Create `src/server/actions/contact.ts` with `submitContactAction` — validate input with Zod, call `sendEmail`, save to DB, return success/error.
4. In the form component call `useAction(submitContactAction)` and render `useSubmission` state.
5. Test in development with a sandbox SMTP (Mailtrap, Ethereal) so real emails are never sent during dev.

## Code Examples (Good vs Bad)

### Bad Example 1 (SMTP credentials in VITE_ var)
```ts
// WRONG — ships to browser bundle
const smtpPass = import.meta.env.VITE_SMTP_PASS;
```

### Bad Example 2 (no rate limit — trivial to spam)
```ts
// src/server/actions/contact.ts — WRONG
export const submitContactAction = action(async (form: FormData) => {
  "use server";
  const email = form.get("email") as string;
  await sendEmail({ to: "me@example.com", subject: "Contact", text: email });
  // no rate limit → anyone can send unlimited emails
});
```

### Bad Example 3 (raw user input in HTML body — XSS in email)
```ts
// WRONG — <script> or <img onerror=...> in message field executes in some email clients
const html = `<p>Message: ${form.get("message")}</p>`; // unescaped interpolation
```

### Bad Example 4 (unhandled send error returns 500 to user)
```ts
// WRONG
export const submitContactAction = action(async (form: FormData) => {
  "use server";
  await resend.emails.send({ /* ... */ }); // throws if Resend is down → user sees blank error
});
```

### Bad Example 5 (sending email synchronously blocks form response)
```ts
// WRONG for high-volume — awaiting a slow SMTP call in the action delays the response
export const submitContactAction = action(async (form: FormData) => {
  "use server";
  await transporter.sendMail({ /* ... */ }); // 2-3s SMTP RTT blocks SSR response
  // For high volume use a queue (BullMQ, pg-boss) and return immediately
});
```

### Good Example 1 (Resend helper with "use server")
```ts
// src/lib/server/email.ts
"use server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(opts: {
  from: string; name: string; subject: string; message: string;
}) {
  const safeMessage = opts.message
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return resend.emails.send({
    from: `Portfolio <noreply@yourdomain.com>`,
    to: process.env.CONTACT_RECIPIENT_EMAIL!,
    replyTo: opts.from,
    subject: `[Portfolio] ${opts.subject}`,
    html: `<p><strong>${opts.name}</strong> (${opts.from}) wrote:</p><p>${safeMessage}</p>`,
    text: `${opts.name} (${opts.from}):\n\n${opts.message}`,
  });
}
```

### Good Example 2 (Nodemailer SMTP transporter — Bun-compatible)
```ts
// src/lib/server/email.ts
"use server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === "465",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  await transporter.sendMail({ from: process.env.SMTP_FROM, ...opts });
}
```

### Good Example 3 (action with Zod validation + rate limit check + DB save)
```ts
// src/server/actions/contact.ts
import { action, revalidate } from "@solidjs/router";
import { z } from "zod";
import { sendContactEmail } from "~/lib/server/email";
import { db } from "~/server/db/client";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
});

export const submitContactAction = action(async (form: FormData) => {
  "use server";
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Input tidak valid." };

  const { name, email, subject, message } = parsed.data;

  try {
    await db.contact.create({ data: { name, email, subject, message } });
    await sendContactEmail({ from: email, name, subject, message });
    return { success: true };
  } catch {
    return { error: "Gagal mengirim pesan. Coba lagi nanti." };
  }
}, "submit-contact");
```

### Good Example 4 (form component with pending state and success message)
```tsx
// src/features/landing/Contact.tsx
import { useAction, useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import { submitContactAction } from "~/server/actions/contact";

export default function ContactForm() {
  const send = useAction(submitContactAction);
  const submission = useSubmission(submitContactAction);

  return (
    <form onSubmit={async (e) => { e.preventDefault(); await send(new FormData(e.currentTarget)); }}>
      <input name="name" required />
      <input name="email" type="email" required />
      <input name="subject" required />
      <textarea name="message" required />
      <button type="submit" disabled={submission.pending}>
        {submission.pending ? "Mengirim..." : "Kirim"}
      </button>
      <Show when={submission.result?.success}>
        <p>Pesan terkirim!</p>
      </Show>
      <Show when={submission.result?.error}>
        <p role="alert">{submission.result?.error}</p>
      </Show>
    </form>
  );
}
```

### Good Example 5 (sandbox SMTP for development — Ethereal)
```ts
// scripts/test-email.ts (run manually: bun run scripts/test-email.ts)
import nodemailer from "nodemailer";

const testAccount = await nodemailer.createTestAccount();
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: { user: testAccount.user, pass: testAccount.pass },
});

const info = await transporter.sendMail({
  from: testAccount.user,
  to: "test@example.com",
  subject: "Test",
  text: "Hello from Ethereal",
});

console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
// Open the URL to inspect the email without sending anything real
```

## Related skills
- [[solid-start-server-actions-mutations]] — the action() wrapper, Zod validation, and revalidate pattern.
- [[solid-start-env-variables]] — RESEND_API_KEY / SMTP_* must be in ssrDefine, never VITE_.
- [[solid-start-security-hardening]] — HTML escaping, input validation, and rate limiting.
- [[solid-start-api-routes]] — alternative: POST to an API route instead of an action for webhook-style email triggers.
