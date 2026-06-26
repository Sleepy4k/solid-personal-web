import { type ParentProps } from "solid-js";
import { createAsync } from "@solidjs/router";
import { ProfileContext, getProfileMeta } from "./profile";

export function ProfileProvider(props: ParentProps) {
  const profile = createAsync(() => getProfileMeta());
  return (
    <ProfileContext.Provider value={profile}>
      {props.children}
    </ProfileContext.Provider>
  );
}
