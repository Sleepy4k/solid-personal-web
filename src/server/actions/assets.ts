import { action, revalidate } from "@solidjs/router";
import { uploadAsset, deleteAsset } from "~/lib/server/assets";
import { getAssets } from "~/server/db/dashboard";

export const uploadAssetAction = action(async (form: FormData) => {
  "use server";
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("File tidak ditemukan");
  const asset = await uploadAsset(file);
  await revalidate(getAssets.key);
  return asset;
}, "upload-asset");

export const deleteAssetAction = action(async (form: FormData) => {
  "use server";
  await deleteAsset(String(form.get("id")));
  return revalidate(getAssets.key);
}, "delete-asset");
