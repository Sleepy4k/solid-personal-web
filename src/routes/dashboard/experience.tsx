import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense, Index } from "solid-js";
import { getExperiences } from "~/server/db/dashboard";
import { saveExperience, deleteExperience } from "~/server/actions/experience";
import DashboardLayout from "~/features/dashboard/Layout";
import FileUpload from "~/features/dashboard/FileUpload";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { FormField, Input, Textarea, SaveStatus } from "~/components/form/FormField";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { TbOutlineBriefcase, TbOutlinePlus, TbOutlinePencil, TbOutlineTrash, TbOutlineChevronRight, TbOutlineMapPin } from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => getExperiences() };

function ExpForm(props: { item?: Awaited<ReturnType<typeof getExperiences>>[number]; onDone: () => void }) {
  const save = useAction(saveExperience);
  const [resps, setResps] = createSignal<string[]>(props.item?.responsibilities.map(r => r.description) ?? [""]);
  const [techs, setTechs] = createSignal<string[]>(props.item?.technologies.map(t => t.technology.name) ?? [""]);
  const [logoId, setLogoId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.target as HTMLFormElement);
    form.set("responsibilities", JSON.stringify(resps().filter(Boolean)));
    form.set("techs", JSON.stringify(techs().filter(Boolean)));
    if (logoId()) form.set("logoId", logoId()!);
    try { await save(form); setStatus("saved"); props.onDone(); }
    catch { setStatus("error"); }
  }

  return (
    <form onSubmit={handleSubmit} class="p-6 space-y-5">
      <input type="hidden" name="id" value={props.item?.id ?? ""} />

      <FileUpload name="logoId" label="Logo Perusahaan" current={props.item?.logo} accept="image/*" onUpload={a => setLogoId(a.id)} />

      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="Posisi" name="position" required>
          <Input name="position" value={props.item?.position ?? ""} placeholder="Software Engineer" required />
        </FormField>
        <FormField label="Perusahaan" name="company" required>
          <Input name="company" value={props.item?.company ?? ""} placeholder="PT. Contoh Indonesia" required />
        </FormField>
        <FormField label="Lokasi" name="location">
          <Input name="location" value={props.item?.location ?? ""} placeholder="Jakarta, Indonesia" />
        </FormField>
        <FormField label="Urutan Tampil" name="order">
          <Input type="number" name="order" value={props.item?.order ?? 0} />
        </FormField>
        <FormField label="Tanggal Mulai" name="startDate" required>
          <Input type="date" name="startDate" value={props.item?.startDate ? new Date(props.item.startDate).toISOString().slice(0, 10) : ""} required />
        </FormField>
        <FormField label="Tanggal Selesai" name="endDate" hint="Kosongkan jika masih aktif">
          <Input type="date" name="endDate" value={props.item?.endDate ? new Date(props.item.endDate).toISOString().slice(0, 10) : ""} />
        </FormField>
      </div>

      <label class="flex items-center gap-2.5 text-sm text-[var(--c-text)] cursor-pointer">
        <input type="checkbox" name="current" value="true" checked={props.item?.current} class="rounded accent-[#ff6b00] size-4" />
        Pekerjaan saat ini
      </label>

      <FormField label="Deskripsi" name="description">
        <Textarea name="description" rows={3} placeholder="Deskripsi singkat peran dan tanggung jawab...">{props.item?.description ?? ""}</Textarea>
      </FormField>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-[var(--c-text)]">Tanggung Jawab</p>
          <Button type="button" variant="ghost" class="text-xs gap-1" onClick={() => setResps(x => [...x, ""])}>
            <TbOutlinePlus size={13} />Tambah
          </Button>
        </div>
        <Index each={resps()}>
          {(item, i) => (
            <div class="flex gap-2 items-center">
              <TbOutlineChevronRight class="text-[#ff6b00] shrink-0" size={14} />
              <Input
                placeholder="Merancang arsitektur microservice..."
                value={item()}
                onInput={e => setResps(x => x.map((v, j) => j === i ? (e.target as HTMLInputElement).value : v))}
              />
              <button
                type="button"
                class="text-[var(--c-text-muted)] hover:text-red-500 transition-colors shrink-0"
                onClick={() => setResps(x => x.filter((_, j) => j !== i))}
                aria-label="Hapus"
              >
                <TbOutlineTrash size={15} />
              </button>
            </div>
          )}
        </Index>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-[var(--c-text)]">Teknologi Digunakan</p>
          <Button type="button" variant="ghost" class="text-xs gap-1" onClick={() => setTechs(x => [...x, ""])}>
            <TbOutlinePlus size={13} />Tambah
          </Button>
        </div>
        <Index each={techs()}>
          {(item, i) => (
            <div class="flex gap-2 items-center">
              <TbOutlineChevronRight class="text-[#ff6b00] shrink-0" size={14} />
              <Input
                placeholder="TypeScript, React, PostgreSQL..."
                value={item()}
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

export default function ExperiencePage() {
  const doDelete = useAction(deleteExperience);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const items = createAsync(() => getExperiences());
  const [editing, setEditing] = createSignal<string | null>(null);

  return (
    <DashboardLayout>
      <Title>Pengalaman Kerja - Dashboard Portfolio</Title>
      <Meta name="description" content="Kelola data pengalaman kerja di portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#6366f1]/10 rounded-xl">
              <TbOutlineBriefcase class="text-[#6366f1]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Pengalaman Kerja</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Riwayat pekerjaan dan karier Anda</p>
            </div>
          </div>
          <Button onClick={() => setEditing("new")} class="gap-2 text-sm">
            <TbOutlinePlus size={15} />Tambah
          </Button>
        </div>

        <Show when={editing() === "new"}>
          <Card class="border-[#ff6b00]/30">
            <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
              <p class="font-semibold text-[var(--c-text)] text-sm">Pengalaman Baru</p>
            </div>
            <ExpForm onDone={() => setEditing(null)} />
          </Card>
        </Show>

        <Suspense fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}>
          <div class="space-y-3">
            <For each={items()} fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineBriefcase class="mx-auto mb-3 opacity-30" size={40} />
                <p class="text-sm">Belum ada data pengalaman. Klik "Tambah" untuk mulai.</p>
              </div>
            }>
              {exp => (
                <Card>
                  <Show
                    when={editing() === exp.id}
                    fallback={
                      <div class="p-5 flex items-center gap-4">
                        <Show when={exp.logo}>
                          <img src={exp.logo!.path} alt="" class="size-10 rounded-lg object-contain shrink-0 border border-[var(--c-border)]" />
                        </Show>
                        <Show when={!exp.logo}>
                          <div class="size-10 rounded-lg bg-[#6366f1]/10 flex items-center justify-center shrink-0">
                            <TbOutlineBriefcase class="text-[#6366f1]" size={18} />
                          </div>
                        </Show>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-[var(--c-text)] text-sm">{exp.position}</p>
                          <p class="text-xs text-[#ff6b00] mt-0.5">{exp.company}</p>
                          <div class="flex items-center gap-3 mt-0.5">
                            <p class="text-xs text-[var(--c-text-muted)]">
                              {new Date(exp.startDate).toLocaleDateString("id-ID", { year: "numeric", month: "short" })} -
                              {exp.endDate ? new Date(exp.endDate).toLocaleDateString("id-ID", { year: "numeric", month: "short" }) : " Sekarang"}
                            </p>
                            <Show when={exp.location}>
                              <span class="flex items-center gap-0.5 text-xs text-[var(--c-text-muted)]">
                                <TbOutlineMapPin size={10} />{exp.location}
                              </span>
                            </Show>
                          </div>
                          <Show when={exp.technologies.length > 0}>
                            <div class="flex flex-wrap gap-1 mt-1.5">
                              <For each={exp.technologies.slice(0, 5)}>
                                {t => <span class="text-[10px] bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-1.5 py-0.5 rounded-full text-[var(--c-text-muted)]">{t.technology.name}</span>}
                              </For>
                            </div>
                          </Show>
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditing(exp.id)}
                            class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[#ff6b00] transition-colors"
                            aria-label="Edit"
                          >
                            <TbOutlinePencil size={15} />
                          </button>
                          <button
                              type="button"
                              class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="Hapus"
                              onClick={() => setDeleteId(exp.id)}
                            >
                              <TbOutlineTrash size={15} />
                            </button>
                        </div>
                      </div>
                    }
                  >
                    <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
                      <p class="font-semibold text-[var(--c-text)] text-sm">Edit: {exp.position} di {exp.company}</p>
                    </div>
                    <ExpForm item={exp} onDone={() => setEditing(null)} />
                  </Show>
                </Card>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Pengalaman"
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


