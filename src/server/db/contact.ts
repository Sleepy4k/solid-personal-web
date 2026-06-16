import { query } from "@solidjs/router";
import { db } from "~/server/db/client";

export const getContacts = query(async () => {
  "use server";
  return db.contact.findMany({ orderBy: { createdAt: "desc" } });
}, "contacts");
