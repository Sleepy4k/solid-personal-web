import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense, Index } from "solid-js";
import { getProjects } from "~/server/db/dashboard";
import { useProfileMeta, buildTitle, getProfileMeta } from "~/stores/profile";
import { saveProject, deleteProject } from "~/server/actions/projects";
import DashboardLayout from "~/features/dashboard/Layout";
import FileUpload from "~/features/dashboard/FileUpload";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { FormField, Input, Textarea, Select, SaveStatus } from "~/components/form/FormField";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { TbOutlineRocket, TbOutlinePlus, TbOutlinePencil, TbOutlineTrash, TbOutlineChevronRight, TbFillStar, TbOutlineExternalLink, TbFillBrandGithub } from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => { getProjects(); getProfileMeta(); } };

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Selesai",
  IN_PROGRESS: "Berlangsung",
  ARCHIVED: "Diarsipkan"
};
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-[var(--c-bg-alt)] text-[var(--c-text-muted)]"
};

function ProjectForm(props: { item?: Awaited<ReturnType<typeof getProjects>>[number]; onDone: () => void }) {
  const save = useAction(saveProject);
  const [techs, setTechs] = createSignal<string[]>(props.item?.technologies.map(t => t.technology.name) ?? [""]);
  const [coverId, setCoverId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.target as HTMLFormElement);
    form.set("techs", JSON.stringify(techs().filter(Boolean)));
    if (coverId()) form.set("coverId", coverId()!);
    try { await save(form); setStatus("saved"); props.onDone(); }
    catch { setStatus("error"); }
  }

  return (
    <form onSubmit={handleSubmit} class="p-6 space-y-5">
      <input type="hidden" name="id" value={props.item?.id ?? ""} />

      <FileUpload name="coverId" label="Cover / Thumbnail" current={props.item?.cover} accept="image/*" onUpload={a => setCoverId(a.id)} />

      <FormField label="Judul Proyek" name="title" required>
        <Input name="title" value={props.item?.title ?? ""} placeholder="Nama proyek yang menarik" required />
      </FormField>

      <FormField label="Deskripsi" name="description" required>
        <Textarea name="description" rows={4} placeholder="Jelaskan tujuan, fitur utama, dan dampak proyek...">{props.item?.description ?? ""}</Textarea>
      </FormField>

      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="URL Demo" name="demoUrl">
          <Input name="demoUrl" value={props.item?.demoUrl ?? ""} placeholder="https://demo.example.com" />
        </FormField>
        <FormField label="URL Repository" name="repoUrl">
          <Input name="repoUrl" value={props.item?.repoUrl ?? ""} placeholder="https://github.com/username/repo" />
        </FormField>
        <FormField label="Status" name="status">
          <Select name="status">
            <For each={["COMPLETED", "IN_PROGRESS", "ARCHIVED"]}>
              {s => <option value={s} selected={props.item?.status === s}>{STATUS_LABELS[s]}</option>}
            </For>
          </Select>
        </FormField>
        <FormField label="Urutan Tampil" name="order">
          <Input type="number" name="order" value={props.item?.order ?? 0} />
        </FormField>
      </div>

      <label class="flex items-center gap-2.5 text-sm text-[var(--c-text)] cursor-pointer">
        <input type="checkbox" name="featured" value="true" checked={props.item?.featured} class="rounded accent-[#ff6b00] size-4" />
        Tampilkan sebagai unggulan
      </label>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-[var(--c-text)]">Teknologi Digunakan</p>
          <Button type="button" variant="ghost" class="text-xs gap-1" onClick={() => setTechs(t => [...t, ""])}>
            <TbOutlinePlus size={13} />Tambah
          </Button>
        </div>
        <Index each={techs()}>
          {(t, i) => (
            <div class="flex gap-2 items-center">
              <TbOutlineChevronRight class="text-[#ff6b00] shrink-0" size={14} />
              <Input
                placeholder="TypeScript, React, Tailwind..."
                value={t()}
                onInput={e => setTechs(x => x.map((v, j) => j === i ? (e.target as HTMLInputElement).value : v))}
              />
              <button
                type="button"
                class="text-[var(--c-text-muted)] hover:text-red-500 transition-colors shrink-0"
                onClick={() => setTechs(x => x.filter((_, j) => j !== i))}
                aria-label="Hapus"
              >
                <TbOutlineTrash size={15} />
              </button>
            </div>
          )}
        </Index>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-[var(--c-border)]">
        <Button type="submit" loading={status() === "saving"}>Simpan</Button>
        <Button type="button" variant="ghost" onClick={props.onDone}>Batal</Button>
        <SaveStatus status={status()} />
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const profile = useProfileMeta();
  const doDelete = useAction(deleteProject);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const items = createAsync(() => getProjects());
  const [editing, setEditing] = createSignal<string | null>(null);

  return (
    <DashboardLayout>
      <Title>{buildTitle("Proyek", profile())}</Title>
      <Meta name="description" content="Kelola daftar proyek di portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#ff6b00]/10 rounded-xl">
              <TbOutlineRocket class="text-[#ff6b00]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Proyek</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Portfolio proyek dan karya terbaik Anda</p>
            </div>
          </div>
          <Button onClick={() => setEditing("new")} class="gap-2 text-sm">
            <TbOutlinePlus size={15} />Tambah
          </Button>
        </div>

        <Show when={editing() === "new"}>
          <Card class="border-[#ff6b00]/30">
            <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
              <p class="font-semibold text-[var(--c-text)] text-sm">Proyek Baru</p>
            </div>
            <ProjectForm onDone={() => setEditing(null)} />
          </Card>
        </Show>

        <Suspense fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}>
          <div class="space-y-3">
            <For each={items()} fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineRocket class="mx-auto mb-3 opacity-30" size={40} />
                <p class="text-sm">Belum ada proyek. Klik "Tambah" untuk mulai.</p>
              </div>
            }>
              {proj => (
                <Card>
                  <Show
                    when={editing() === proj.id}
                    fallback={
                      <div class="p-5 flex items-center gap-4">
                        <Show when={proj.cover}>
                          <img src={proj.cover!.path} alt="" class="size-12 rounded-lg object-cover shrink-0 border border-[var(--c-border)]" />
                        </Show>
                        <Show when={!proj.cover}>
                          <div class="size-12 rounded-lg bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                            <TbOutlineRocket class="text-[#ff6b00]" size={20} />
                          </div>
                        </Show>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-semibold text-[var(--c-text)] text-sm">{proj.title}</p>
                            <Show when={proj.featured}>
                              <span class="inline-flex items-center gap-0.5 text-[10px] bg-[#ff6b00] text-white px-1.5 py-0.5 rounded-full font-medium">
                                <TbFillStar size={9} />Unggulan
                              </span>
                            </Show>
                            <span class={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[proj.status] ?? ""}`}>
                              {STATUS_LABELS[proj.status] ?? proj.status}
                            </span>
                          </div>
                          <p class="text-xs text-[var(--c-text-muted)] mt-1 line-clamp-1">{proj.description}</p>
                          <div class="flex items-center gap-3 mt-1.5">
                            <Show when={proj.technologies.length > 0}>
                              <div class="flex flex-wrap gap-1">
                                <For each={proj.technologies.slice(0, 4)}>
                                  {t => <span class="text-[10px] bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-1.5 py-0.5 rounded-full text-[var(--c-text-muted)]">{t.technology.name}</span>}
                                </For>
                              </div>
                            </Show>
                            <div class="flex gap-2 ml-auto shrink-0">
                              <Show when={proj.demoUrl}>
                                <a href={proj.demoUrl!} target="_blank" rel="noopener noreferrer" class="text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors" title="Demo">
                                  <TbOutlineExternalLink size={13} />
                                </a>
                              </Show>
                              <Show when={proj.repoUrl}>
                                <a href={proj.repoUrl!} target="_blank" rel="noopener noreferrer" class="text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors" title="Repository">
                                  <TbFillBrandGithub size={13} />
                                </a>
                              </Show>
                            </div>
                          </div>
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditing(proj.id)}
                            class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[#ff6b00] transition-colors"
                            aria-label="Edit"
                          >
                            <TbOutlinePencil size={15} />
                          </button>
                          <button
                              type="button"
                              class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="Hapus"
                              onClick={() => setDeleteId(proj.id)}
                            >
                              <TbOutlineTrash size={15} />
                            </button>
                        </div>
                      </div>
                    }
                  >
                    <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
                      <p class="font-semibold text-[var(--c-text)] text-sm">Edit: {proj.title}</p>
                    </div>
                    <ProjectForm item={proj} onDone={() => setEditing(null)} />
                  </Show>
                </Card>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Proyek"
        message="Data ini akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        loading={deleting()}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId()) return;
          setDeleting(true);
          const form = new FormData();
          form.set("id", deleteId()!);
          await doDelete(form);
          setDeleting(false);
          setDeleteId(null);
        }}
      />
    </DashboardLayout>
  );
}



