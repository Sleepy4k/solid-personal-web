import { query } from "@solidjs/router";
import { db } from "~/server/db/client";

export const getStats = query(async () => {
  "use server";
  const [projects, experiences, educations, volunteerings, assets] = await Promise.all([
    db.project.count(),
    db.experience.count(),
    db.education.count(),
    db.volunteering.count(),
    db.asset.count()
  ]);
  return { projects, experiences, educations, volunteerings, assets };
}, "dashboard-stats");

export const getProfile = query(async () => {
  "use server";
  return db.profile.findFirst({ include: { links: true, avatar: true, resume: true } });
}, "dashboard-profile");

export const getEducations = query(async () => {
  "use server";
  return db.education.findMany({
    orderBy: { order: "asc" },
    include: { achievements: { orderBy: { order: "asc" } }, logo: true }
  });
}, "dashboard-educations");

export const getProjects = query(async () => {
  "use server";
  return db.project.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: { technologies: { include: { technology: true } }, cover: true }
  });
}, "dashboard-projects");

export const getExperiences = query(async () => {
  "use server";
  return db.experience.findMany({
    orderBy: { order: "asc" },
    include: {
      responsibilities: { orderBy: { order: "asc" } },
      technologies: { include: { technology: true } },
      logo: true
    }
  });
}, "dashboard-experiences");

export const getVolunteerings = query(async () => {
  "use server";
  return db.volunteering.findMany({
    orderBy: { order: "asc" },
    include: { impacts: { orderBy: { order: "asc" } }, logo: true }
  });
}, "dashboard-volunteerings");

export const getAssets = query(async () => {
  "use server";
  return db.asset.findMany({ orderBy: { createdAt: "desc" } });
}, "dashboard-assets");
