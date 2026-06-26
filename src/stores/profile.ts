import { createContext, useContext } from "solid-js";
import { getProfileMeta } from "~/server/db/portfolio";

export { getProfileMeta };

export type ProfileMeta = Awaited<ReturnType<typeof getProfileMeta>>;

export const ProfileContext = createContext<() => ProfileMeta | undefined>(
  () => undefined
);

export function useProfileMeta() {
  return useContext(ProfileContext);
}

export function buildTitle(
  pageLabel: string | undefined,
  profile: ProfileMeta | undefined
): string {
  const base =
    profile?.name && profile?.title
      ? `${profile.name} - ${profile.title}`
      : "Portfolio";
  return pageLabel ? `${pageLabel} | ${base}` : base;
}
