import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { contactSchema } from "~/lib/shared/validation";
import { getContacts } from "~/server/db/contact";

export const sendContactAction = action(async (form: FormData) => {
  "use server";
  const raw = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    subject: String(form.get("subject") ?? ""),
    message: String(form.get("message") ?? "")
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(", ");
    return { success: false as const, error: msg };
  }

  await db.contact.create({ data: result.data });
  return { success: true as const };
}, "send-contact");

export const deleteContactAction = action(async (form: FormData) => {
  "use server";
  await db.contact.delete({ where: { id: String(form.get("id")) } });
  return revalidate(getContacts.key);
}, "delete-contact");

export const markContactReadAction = action(async (form: FormData) => {
  "use server";
  await db.contact.update({
    where: { id: String(form.get("id")) },
    data: { isRead: true }
  });
  return revalidate(getContacts.key);
}, "mark-contact-read");
