import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense, Index } from "solid-js";
import { getEducations } from "~/server/db/dashboard";
import { saveEducation, deleteEducation } from "~/server/actions/education";
import DashboardLayout from "~/features/dashboard/Layout";
import FileUpload from "~/features/dashboard/FileUpload";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { FormField, Input, Textarea, SaveStatus } from "~/components/form/FormField";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { TbOutlineSchool, TbOutlinePlus, TbOutlinePencil, TbOutlineTrash, TbOutlineChevronRight } from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => getEducations() };

function EduForm(props: {
  item?: Awaited<ReturnType<typeof getEducations>>[number];
  onDone: () => void;
}) {
  const save = useAction(saveEducation);
  const [achievements, setAchievements] = createSignal<string[]>(
    props.item?.achievements.map(a => a.title) ?? [""]
  );
  const [logoId, setLogoId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.target as HTMLFormElement);
    form.set("achievements", JSON.stringify(achievements().filter(Boolean)));
    if (logoId()) form.set("logoId", logoId()!);
    try { await save(form); setStatus("saved"); props.onDone(); }
    catch { setStatus("error"); }
  }

  return (
    <form onSubmit={handleSubmit} class="p-6 space-y-5">
      <input type="hidden" name="id" value={props.item?.id ?? ""} />

      <FileUpload name="logoId" label="Logo Institusi" current={props.item?.logo} accept="image/*" onUpload={a => setLogoId(a.id)} />

      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="Institusi" name="institution" required>
          <Input name="institution" value={props.item?.institution ?? ""} placeholder="Universitas / Sekolah" required />
        </FormField>
        <FormField label="Gelar" name="degree" required>
          <Input name="degree" value={props.item?.degree ?? ""} placeholder="S1, S2, SMA" required />
        </FormField>
        <FormField label="Jurusan / Bidang" name="field" required>
          <Input name="field" value={props.item?.field ?? ""} placeholder="Ilmu Komputer" required />
        </FormField>
        <FormField label="IPK" name="gpa">
          <Input name="gpa" value={props.item?.gpa ?? ""} placeholder="3.75" />
        </FormField>
        <FormField label="Tanggal Mulai" name="startDate" required>
          <Input type="date" name="startDate" value={props.item?.startDate ? new Date(props.item.startDate).toISOString().slice(0, 10) : ""} required />
        </FormField>
        <FormField label="Tanggal Selesai" name="endDate" hint="Kosongkan jika masih berlangsung">
          <Input type="date" name="endDate" value={props.item?.endDate ? new Date(props.item.endDate).toISOString().slice(0, 10) : ""} />
        </FormField>
      </div>

      <FormField label="Deskripsi" name="description">
        <Textarea name="description" rows={3} placeholder="Deskripsi singkat program studi...">{props.item?.description ?? ""}</Textarea>
      </FormField>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-[var(--c-text)]">Prestasi / Penghargaan</p>
          <Button type="button" variant="ghost" class="text-xs gap-1" onClick={() => setAchievements(a => [...a, ""])}>
            <TbOutlinePlus size={13} />Tambah
          </Button>
        </div>
        <Index each={achievements()}>
          {(a, i) => (
            <div class="flex gap-2 items-center">
              <TbOutlineChevronRight class="text-[#ff6b00] shrink-0" size={14} />
              <Input
                placeholder="Judul prestasi"
                value={a()}
                onInput={e => setAchievements(x => x.map((v, j) => j === i ? (e.target as HTMLInputElement).value : v))}
              />
              <button
                type="button"
                class="text-[var(--c-text-muted)] hover:text-red-500 transition-colors shrink-0"
                onClick={() => setAchievements(x => x.filter((_, j) => j !== i))}
                aria-label="Hapus prestasi"
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

export default function EducationPage() {
  const doDelete = useAction(deleteEducation);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const items = createAsync(() => getEducations());
  const [editing, setEditing] = createSignal<string | null>(null);

  return (
    <DashboardLayout>
      <Title>Pendidikan - Dashboard Portfolio</Title>
      <Meta name="description" content="Kelola data pendidikan di portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#0ea5e9]/10 rounded-xl">
              <TbOutlineSchool class="text-[#0ea5e9]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Pendidikan</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Riwayat pendidikan Anda</p>
            </div>
          </div>
          <Button onClick={() => setEditing("new")} class="gap-2 text-sm">
            <TbOutlinePlus size={15} />Tambah
          </Button>
        </div>

        <Show when={editing() === "new"}>
          <Card class="border-[#ff6b00]/30">
            <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
              <p class="font-semibold text-[var(--c-text)] text-sm">Pendidikan Baru</p>
            </div>
            <EduForm onDone={() => setEditing(null)} />
          </Card>
        </Show>

        <Suspense fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}>
          <div class="space-y-3">
            <For each={items()} fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineSchool class="mx-auto mb-3 opacity-30" size={40} />
                <p class="text-sm">Belum ada data pendidikan. Klik "Tambah" untuk mulai.</p>
              </div>
            }>
              {edu => (
                <Card>
                  <Show
                    when={editing() === edu.id}
                    fallback={
                      <div class="p-5 flex items-center gap-4">
                        <Show when={edu.logo}>
                          <img src={edu.logo!.path} alt="" class="size-10 rounded-lg object-contain shrink-0 border border-[var(--c-border)]" />
                        </Show>
                        <Show when={!edu.logo}>
                          <div class="size-10 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center shrink-0">
                            <TbOutlineSchool class="text-[#0ea5e9]" size={18} />
                          </div>
                        </Show>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-[var(--c-text)] text-sm">{edu.institution}</p>
                          <p class="text-xs text-[#ff6b00] mt-0.5">{edu.degree} - {edu.field}</p>
                          <p class="text-xs text-[var(--c-text-muted)] mt-0.5">
                            {new Date(edu.startDate).toLocaleDateString("id-ID", { year: "numeric", month: "short" })} -
                            {edu.endDate ? new Date(edu.endDate).toLocaleDateString("id-ID", { year: "numeric", month: "short" }) : " Sekarang"}
                            {edu.gpa && <span class="ml-2 font-medium">IPK {edu.gpa}</span>}
                          </p>
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditing(edu.id)}
                            class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[#ff6b00] transition-colors"
                            aria-label="Edit"
                          >
                            <TbOutlinePencil size={15} />
                          </button>
                          <button
                              type="button"
                              class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="Hapus"
                              onClick={() => setDeleteId(edu.id)}
                            >
                              <TbOutlineTrash size={15} />
                            </button>
                        </div>
                      </div>
                    }
                  >
                    <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
                      <p class="font-semibold text-[var(--c-text)] text-sm">Edit: {edu.institution}</p>
                    </div>
                    <EduForm item={edu} onDone={() => setEditing(null)} />
                  </Show>
                </Card>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Pendidikan"
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


