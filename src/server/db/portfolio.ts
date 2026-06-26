import { query } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getGithubStats } from "~/lib/server/github";

export const getGithubStatsByYear = query(async (year: number) => {
  "use server";
  return getGithubStats(year);
}, "github-stats-year");

export const getPortfolioData = query(async () => {
  "use server";
  const [profile, educations, experiences, projects, volunteerings, githubStats] =
    await Promise.all([
      db.profile.findFirst({
        include: { links: true, avatar: true, resume: true }
      }),
      db.education.findMany({
        orderBy: { order: "asc" },
        include: { achievements: { orderBy: { order: "asc" } }, logo: true }
      }),
      db.experience.findMany({
        take: 3,
        orderBy: { order: "asc" },
        include: {
          responsibilities: { orderBy: { order: "asc" } },
          technologies: { include: { technology: true } },
          logo: true
        }
      }),
      db.project.findMany({
        take: 3,
        orderBy: [{ featured: "desc" }, { order: "asc" }],
        include: {
          technologies: { include: { technology: true } },
          cover: true
        }
      }),
      db.volunteering.findMany({
        take: 3,
        orderBy: { order: "asc" },
        include: { impacts: { orderBy: { order: "asc" } }, logo: true }
      }),
      getGithubStats()
    ]);

  return { profile, educations, experiences, projects, volunteerings, githubStats };
}, "portfolio");

export const getAllProjects = query(async (params?: { q?: string; tech?: string }) => {
  "use server";
  const q = params?.q?.trim();
  const tech = params?.tech;
  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { technologies: { some: { technology: { name: { contains: q } } } } }
    ];
  }
  if (tech && tech !== "all") {
    where.technologies = {
      some: { technologyId: tech }
    };
  }
  return db.project.findMany({
    where,
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    include: {
      technologies: { include: { technology: true } },
      cover: true
    }
  });
}, "all-projects");

export const getAllExperiences = query(async (params?: { q?: string; tech?: string }) => {
  "use server";
  const q = params?.q?.trim();
  const tech = params?.tech;
  const where: any = {};
  if (q) {
    where.OR = [
      { company: { contains: q } },
      { position: { contains: q } },
      { description: { contains: q } },
      { responsibilities: { some: { description: { contains: q } } } },
      { technologies: { some: { technology: { name: { contains: q } } } } }
    ];
  }
  if (tech && tech !== "all") {
    where.technologies = {
      some: { technologyId: tech }
    };
  }
  return db.experience.findMany({
    where,
    orderBy: { order: "asc" },
    include: {
      responsibilities: { orderBy: { order: "asc" } },
      technologies: { include: { technology: true } },
      logo: true
    }
  });
}, "all-experiences");

export const getAllVolunteerings = query(async (params?: { q?: string; status?: string }) => {
  "use server";
  const q = params?.q?.trim();
  const status = params?.status;
  const where: any = {};
  if (q) {
    where.OR = [
      { organization: { contains: q } },
      { role: { contains: q } },
      { description: { contains: q } },
      { impacts: { some: { description: { contains: q } } } }
    ];
  }
  if (status === "current") {
    where.current = true;
  } else if (status === "past") {
    where.current = false;
  }
  return db.volunteering.findMany({
    where,
    orderBy: { order: "asc" },
    include: { impacts: { orderBy: { order: "asc" } }, logo: true }
  });
}, "all-volunteerings");

export const getAllTechnologies = query(async () => {
  "use server";
  return db.technology.findMany({ orderBy: { name: "asc" } });
}, "all-technologies");
