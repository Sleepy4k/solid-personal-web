"use server";
import "dotenv/config";
import { db } from "~/server/db/client";
import type { GithubStats, ContribDay } from "~/types";

const GRAPHQL = "https://api.github.com/graphql";
const CACHE_TTL = 24 * 60 * 60 * 1000;

const QUERY = `query($u:String!,$from:DateTime!,$to:DateTime!){
  user(login:$u){
    name bio createdAt
    followers{totalCount}
    following{totalCount}
    repositories(ownerAffiliations:OWNER,privacy:PUBLIC){totalCount}
    contributionsCollection(from:$from,to:$to){
      totalCommitContributions
      contributionCalendar{
        totalContributions
        weeks{contributionDays{contributionCount date weekday}}
      }
    }
  }
}`;

function buildFullYearCalendar(
  year: number,
  apiWeeks: { contributionDays: ContribDay[] }[]
): GithubStats["weeks"] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dataMap = new Map<string, number>();
  for (const week of apiWeeks) {
    for (const day of week.contributionDays) {
      dataMap.set(day.date, day.contributionCount);
    }
  }

  const result: GithubStats["weeks"] = [];
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const startSunday = new Date(jan1);
  startSunday.setDate(jan1.getDate() - jan1.getDay());

  const cur = new Date(startSunday);
  while (cur <= dec31) {
    const days: ContribDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      day.setDate(cur.getDate() + d);
      const y = day.getFullYear();
      const m = String(day.getMonth() + 1).padStart(2, "0");
      const dd = String(day.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dd}`;
      const inTargetYear = y === year;
      const isFuture = day > today;
      days.push({
        date: dateStr,
        contributionCount:
          inTargetYear && !isFuture ? (dataMap.get(dateStr) ?? 0) : 0,
        weekday: d,
      });
    }
    result.push({ contributionDays: days });
    cur.setDate(cur.getDate() + 7);
  }

  return result;
}

export async function getGithubStats(year?: number): Promise<GithubStats | null> {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return null;

  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const cacheKey = `${username}:${targetYear}`;

  const cached = await db.githubCache.findUnique({ where: { username: cacheKey } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL) {
    return cached.data as unknown as GithubStats;
  }

  const from = new Date(targetYear, 0, 1);
  const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);
  const to = yearEnd < now ? yearEnd : now;

  try {
    const res = await fetch(GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "Portfolio-App/1.0"
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { u: username, from: from.toISOString(), to: to.toISOString() }
      })
    });

    if (!res.ok) {
      console.error("[GitHub] HTTP error:", res.status, await res.text());
      return cached ? (cached.data as unknown as GithubStats) : null;
    }

    const json = await res.json();

    if (json.errors?.length) {
      console.error("[GitHub] GraphQL errors:", JSON.stringify(json.errors));
      return cached ? (cached.data as unknown as GithubStats) : null;
    }

    const u = json.data?.user;
    if (!u) {
      console.error("[GitHub] No user in response:", JSON.stringify(json));
      return cached ? (cached.data as unknown as GithubStats) : null;
    }

    const cal = u.contributionsCollection?.contributionCalendar;
    const createdYear = u.createdAt
      ? new Date(u.createdAt).getFullYear()
      : now.getFullYear() - 2;

    const stats: GithubStats = {
      name: u.name ?? username,
      bio: u.bio ?? "",
      followers: u.followers?.totalCount ?? 0,
      following: u.following?.totalCount ?? 0,
      publicRepos: u.repositories?.totalCount ?? 0,
      totalContributions: cal?.totalContributions ?? 0,
      totalCommits: u.contributionsCollection?.totalCommitContributions ?? 0,
      weeks: buildFullYearCalendar(targetYear, cal?.weeks ?? []),
      createdYear,
    };

    await db.githubCache.upsert({
      where: { username: cacheKey },
      create: { username: cacheKey, data: stats as unknown as object, fetchedAt: now },
      update: { data: stats as unknown as object, fetchedAt: now }
    });

    return stats;
  } catch (err) {
    console.error("[GitHub] Fetch error:", err);
    return cached ? (cached.data as unknown as GithubStats) : null;
  }
}
