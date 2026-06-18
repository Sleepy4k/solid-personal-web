import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, Index, Suspense } from "solid-js";
import { getProfile } from "~/server/db/dashboard";
import { saveProfile } from "~/server/actions/profile";
import DashboardLayout from "~/features/dashboard/Layout";
import FileUpload from "~/features/dashboard/FileUpload";
import { FormField, Input, Textarea, Select, SaveStatus } from "~/components/form/FormField";
import { Button } from "~/components/ui/Button";
import { Skeleton } from "~/components/ui/Skeleton";
import { TbOutlineUser, TbOutlinePlus, TbOutlineTrash } from "solid-icons/tb";

export const route: RouteDefinition = {
  preload: () => getProfile()
};

export default function ProfilePage() {
  const profile = createAsync(() => getProfile());
  const save = useAction(saveProfile);
  const [saveStatus, setSaveStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle");
  const [avatarId, setAvatarId] = createSignal<string | null>(null);
  // Derive initial links from server data; user edits stored separately
  const serverLinks = () =>
    profile()?.links?.map(l => ({ platform: l.platform, url: l.url, label: l.label ?? "" })) ?? [];
  const [linksOverride, setLinksOverride] = createSignal<{ platform: string; url: string; label: string }[] | null>(null);
  const links = () => linksOverride() ?? serverLinks();
  const setLinks = (fn: (prev: { platform: string; url: string; label: string }[]) => { platform: string; url: string; label: string }[]) => {
    setLinksOverride(prev => fn(prev ?? serverLinks()));
  };

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    const form = new FormData(e.target as HTMLFormElement);
    form.set("links", JSON.stringify(links()));
    if (avatarId()) form.set("avatarId", avatarId()!);
    try {
      await save(form);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  return (
    <DashboardLayout>
      <Title>Profil - Dashboard Portfolio</Title>
      <Meta name="description" content="Edit profil dan informasi pribadi portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#8b5cf6]/10 rounded-xl">
              <TbOutlineUser class="text-[#8b5cf6]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Profil</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Informasi pribadi dan tautan sosial</p>
            </div>
          </div>
          <SaveStatus status={saveStatus()} />
        </div>

        <Suspense fallback={<div class="space-y-4"><Skeleton class="h-40 w-full" /></div>}>
          <form onSubmit={handleSubmit} class="space-y-6">
            <FileUpload
              name="avatarId"
              label="Foto Profil"
              current={profile()?.avatar}
              accept="image/*"
              onUpload={asset => setAvatarId(asset.id)}
            />

            <div class="grid sm:grid-cols-2 gap-4">
              <FormField label="Nama Lengkap" name="name" required>
                <Input id="name" name="name" value={profile()?.name ?? ""} required />
              </FormField>
              <FormField label="Judul / Profesi" name="title" required>
                <Input id="title" name="title" value={profile()?.title ?? ""} required />
              </FormField>
            </div>

            <FormField label="Bio" name="bio">
              <Textarea id="bio" name="bio" rows={4}>{profile()?.bio ?? ""}</Textarea>
            </FormField>

            <div class="grid sm:grid-cols-2 gap-4">
              <FormField label="Email Publik" name="email" required>
                <Input id="email" type="email" name="email" value={profile()?.email ?? ""} required />
              </FormField>
              <FormField label="Telepon" name="phone">
                <Input id="phone" type="tel" name="phone" value={profile()?.phone ?? ""} />
              </FormField>
            </div>

            <FormField label="Lokasi" name="location">
              <Input id="location" name="location" value={profile()?.location ?? ""} placeholder="Jakarta, Indonesia" />
            </FormField>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-[var(--c-text)]">Tautan Sosial</p>
                <Button
                  type="button"
                  variant="ghost"
                  class="text-xs gap-1"
                  onClick={() => setLinks(l => [...l, { platform: "", url: "", label: "" }])}
                >
                  <TbOutlinePlus size={13} />Tambah
                </Button>
              </div>
              <Index each={links()}>
                {(link, i) => (
                  <div class="flex gap-2 items-start">
                    <Select
                      value={link().platform}
                      onChange={e => setLinks(l => l.map((x, j) => j === i ? { ...x, platform: (e.target as HTMLSelectElement).value } : x))}
                      class="w-36"
                    >
                      <option value="">Platform</option>
                      <option value="github">GitHub</option>
                      <option value="gitlab">GitLab</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="youtube">YouTube</option>
                      <option value="website">Website</option>
                    </Select>
                    <Input
                      placeholder="URL"
                      value={link().url}
                      onInput={e => setLinks(l => l.map((x, j) => j === i ? { ...x, url: (e.target as HTMLInputElement).value } : x))}
                    />
                    <Input
                      placeholder="Label"
                      value={link().label}
                      onInput={e => setLinks(l => l.map((x, j) => j === i ? { ...x, label: (e.target as HTMLInputElement).value } : x))}
                      class="w-28"
                    />
                    <button
                      type="button"
                      class="mt-2.5 p-1 text-[var(--c-text-muted)] hover:text-red-500 transition-colors shrink-0"
                      onClick={() => setLinks(l => l.filter((_, j) => j !== i))}
                      aria-label="Hapus tautan"
                    >
                      <TbOutlineTrash size={15} />
                    </button>
                  </div>
                )}
              </Index>
            </div>

            <Button type="submit" loading={saveStatus() === "saving"}>Simpan Perubahan</Button>
          </form>
        </Suspense>
      </div>
    </DashboardLayout>
  );
}


