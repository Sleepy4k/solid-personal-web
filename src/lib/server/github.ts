"use server";
import "dotenv/config";
import { db } from "~/server/db/client";
import type { GithubStats } from "~/lib/shared/types";

const GRAPHQL = "https://api.github.com/graphql";
const CACHE_TTL = 24 * 60 * 60 * 1000;

const QUERY = `query($u:String!,$from:DateTime!,$to:DateTime!){
  user(login:$u){
    name bio
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

export async function getGithubStats(): Promise<GithubStats | null> {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return null;

  const cached = await db.githubCache.findUnique({ where: { username } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL) {
    return cached.data as unknown as GithubStats;
  }

  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

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
        variables: { u: username, from: from.toISOString(), to: now.toISOString() }
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

    const stats: GithubStats = {
      name: u.name ?? username,
      bio: u.bio ?? "",
      followers: u.followers?.totalCount ?? 0,
      following: u.following?.totalCount ?? 0,
      publicRepos: u.repositories?.totalCount ?? 0,
      totalContributions: cal?.totalContributions ?? 0,
      totalCommits: u.contributionsCollection?.totalCommitContributions ?? 0,
      weeks: cal?.weeks ?? []
    };

    await db.githubCache.upsert({
      where: { username },
      create: { username, data: stats as unknown as object, fetchedAt: now },
      update: { data: stats as unknown as object, fetchedAt: now }
    });

    return stats;
  } catch (err) {
    console.error("[GitHub] Fetch error:", err);
    return cached ? (cached.data as unknown as GithubStats) : null;
  }
}
