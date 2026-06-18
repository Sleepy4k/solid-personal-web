import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getProjects } from "~/server/db/dashboard";

export const saveProject = action(async (form: FormData) => {
  "use server";
  const getFileOrString = (val: FormDataEntryValue | null) => {
    if (!val || val instanceof File) return undefined;
    return String(val) || undefined;
  };

  const id = String(form.get("id") ?? "");
  const techs = JSON.parse(String(form.get("techs") ?? "[]")) as string[];
  const data = {
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    demoUrl: String(form.get("demoUrl") ?? "") || null,
    repoUrl: String(form.get("repoUrl") ?? "") || null,
    featured: form.get("featured") === "true",
    order: Number(form.get("order") ?? 0),
    status: (String(form.get("status") ?? "COMPLETED")) as "IN_PROGRESS" | "COMPLETED" | "ARCHIVED",
    coverId: getFileOrString(form.get("coverId"))
  };

  let projId = id;
  if (id) {
    await db.project.update({ where: { id }, data });
  } else {
    const created = await db.project.create({ data });
    projId = created.id;
  }

  await db.projectTechnology.deleteMany({ where: { projectId: projId } });
  for (const name of techs.filter(Boolean)) {
    const tech = await db.technology.upsert({ where: { name }, create: { name }, update: {} });
    await db.projectTechnology.upsert({
      where: { projectId_technologyId: { projectId: projId, technologyId: tech.id } },
      create: { projectId: projId, technologyId: tech.id },
      update: {}
    });
  }
  return revalidate(getProjects.key);
}, "save-project");

export const deleteProject = action(async (form: FormData) => {
  "use server";
  await db.project.delete({ where: { id: String(form.get("id")) } });
  return revalidate(getProjects.key);
}, "delete-project");
