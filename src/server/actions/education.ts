import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getEducations } from "~/server/db/dashboard";

export const saveEducation = action(async (form: FormData) => {
  "use server";
  const getFileOrString = (val: FormDataEntryValue | null) => {
    if (!val || val instanceof File) return undefined;
    return String(val) || undefined;
  };

  const id = String(form.get("id") ?? "");
  const achievements = JSON.parse(String(form.get("achievements") ?? "[]")) as string[];
  const data = {
    institution: String(form.get("institution") ?? ""),
    degree: String(form.get("degree") ?? ""),
    field: String(form.get("field") ?? ""),
    startDate: new Date(String(form.get("startDate"))),
    endDate: form.get("endDate") ? new Date(String(form.get("endDate"))) : null,
    gpa: String(form.get("gpa") ?? "") || null,
    description: String(form.get("description") ?? "") || null,
    order: Number(form.get("order") ?? 0),
    logoId: getFileOrString(form.get("logoId"))
  };

  let eduId = id;
  if (id) {
    await db.education.update({ where: { id }, data });
  } else {
    const created = await db.education.create({ data });
    eduId = created.id;
  }

  await db.educationAchievement.deleteMany({ where: { educationId: eduId } });
  if (achievements.length > 0) {
    await db.educationAchievement.createMany({
      data: achievements.filter(Boolean).map((title, order) => ({ educationId: eduId, title, order }))
    });
  }
  return revalidate(getEducations.key);
}, "save-edu");

export const deleteEducation = action(async (form: FormData) => {
  "use server";
  await db.education.delete({ where: { id: String(form.get("id")) } });
  return revalidate(getEducations.key);
}, "delete-edu");
