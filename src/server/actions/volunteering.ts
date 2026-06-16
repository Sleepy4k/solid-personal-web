import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getVolunteerings } from "~/server/db/dashboard";

export const saveVolunteering = action(async (form: FormData) => {
  "use server";
  const id = String(form.get("id") ?? "");
  const impacts = JSON.parse(String(form.get("impacts") ?? "[]")) as string[];
  const data = {
    organization: String(form.get("organization") ?? ""),
    role: String(form.get("role") ?? ""),
    location: String(form.get("location") ?? "") || null,
    startDate: new Date(String(form.get("startDate"))),
    endDate: form.get("endDate") ? new Date(String(form.get("endDate"))) : null,
    current: form.get("current") === "true",
    description: String(form.get("description") ?? "") || null,
    order: Number(form.get("order") ?? 0),
    logoId: String(form.get("logoId") ?? "") || undefined
  };

  let volId = id;
  if (id) {
    await db.volunteering.update({ where: { id }, data });
  } else {
    const c = await db.volunteering.create({ data });
    volId = c.id;
  }

  await db.volunteeringImpact.deleteMany({ where: { volunteeringId: volId } });
  if (impacts.length > 0) {
    await db.volunteeringImpact.createMany({
      data: impacts.filter(Boolean).map((description, order) => ({ volunteeringId: volId, description, order }))
    });
  }
  return revalidate(getVolunteerings.key);
}, "save-vol");

export const deleteVolunteering = action(async (form: FormData) => {
  "use server";
  await db.volunteering.delete({ where: { id: String(form.get("id")) } });
  return revalidate(getVolunteerings.key);
}, "delete-vol");
