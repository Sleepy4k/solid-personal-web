import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getExperiences } from "~/server/db/dashboard";

export const saveExperience = action(async (form: FormData) => {
  "use server";
  const getFileOrString = (val: FormDataEntryValue | null) => {
    if (!val || val instanceof File) return undefined;
    return String(val) || undefined;
  };

  const id = String(form.get("id") ?? "");
  const responsibilities = JSON.parse(String(form.get("responsibilities") ?? "[]")) as string[];
  const techs = JSON.parse(String(form.get("techs") ?? "[]")) as string[];
  const data = {
    company: String(form.get("company") ?? ""),
    position: String(form.get("position") ?? ""),
    location: String(form.get("location") ?? "") || null,
    startDate: new Date(String(form.get("startDate"))),
    endDate: form.get("endDate") ? new Date(String(form.get("endDate"))) : null,
    current: form.get("current") === "true",
    description: String(form.get("description") ?? "") || null,
    order: Number(form.get("order") ?? 0),
    logoId: getFileOrString(form.get("logoId"))
  };

  let expId = id;
  if (id) {
    await db.experience.update({ where: { id }, data });
  } else {
    const created = await db.experience.create({ data });
    expId = created.id;
  }

  await db.experienceResponsibility.deleteMany({ where: { experienceId: expId } });
  if (responsibilities.length > 0) {
    await db.experienceResponsibility.createMany({
      data: responsibilities.filter(Boolean).map((description, order) => ({ experienceId: expId, description, order }))
    });
  }

  await db.experienceTechnology.deleteMany({ where: { experienceId: expId } });
  for (const name of techs.filter(Boolean)) {
    const tech = await db.technology.upsert({ where: { name }, create: { name }, update: {} });
    await db.experienceTechnology.upsert({
      where: { experienceId_technologyId: { experienceId: expId, technologyId: tech.id } },
      create: { experienceId: expId, technologyId: tech.id },
      update: {}
    });
  }
  return revalidate(getExperiences.key);
}, "save-exp");

export const deleteExperience = action(async (form: FormData) => {
  "use server";
  await db.experience.delete({ where: { id: String(form.get("id")) } });
  return revalidate(getExperiences.key);
}, "delete-exp");
