import { action, revalidate } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getProfile } from "~/server/db/dashboard";
import { getPortfolioData } from "~/server/db/portfolio";
import { profileSchema } from "~/lib/shared/validation";

export const saveProfile = action(async (form: FormData) => {
  "use server";
  const getFileOrString = (val: FormDataEntryValue | null) => {
    if (!val || val instanceof File) return undefined;
    return String(val) || undefined;
  };

  const raw = {
    name: String(form.get("name") ?? ""),
    title: String(form.get("title") ?? ""),
    bio: String(form.get("bio") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: getFileOrString(form.get("phone")),
    location: getFileOrString(form.get("location")),
    avatarId: getFileOrString(form.get("avatarId")),
    resumeId: getFileOrString(form.get("resumeId"))
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(", ");
    throw new Error(msg);
  }

  const data = {
    ...result.data,
    phone: result.data.phone || null,
    location: result.data.location || null
  };

  const existing = await db.profile.findFirst();
  if (existing) {
    await db.profile.update({ where: { id: existing.id }, data });
  } else {
    await db.profile.create({ data });
  }

  const links = JSON.parse(String(form.get("links") ?? "[]"));
  const profileId = (await db.profile.findFirst())!.id;
  await db.profileLink.deleteMany({ where: { profileId } });
  if (links.length > 0) {
    await db.profileLink.createMany({
      data: links
        .filter((l: { platform: string; url: string }) => l.platform && l.url)
        .map((l: { platform: string; url: string; label?: string }) => ({ ...l, profileId }))
    });
  }

  await revalidate(getProfile.key);
  return revalidate(getPortfolioData.key);
}, "save-profile");
