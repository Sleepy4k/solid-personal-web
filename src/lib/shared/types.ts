export interface ContribDay {
  date: string;
  contributionCount: number;
  weekday: number;
}

export interface GithubStats {
  name: string;
  bio: string;
  followers: number;
  following: number;
  publicRepos: number;
  totalContributions: number;
  totalCommits: number;
  weeks: { contributionDays: ContribDay[] }[];
}
