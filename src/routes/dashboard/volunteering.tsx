import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense } from "solid-js";
import { getVolunteerings } from "~/server/db/dashboard";
import { saveVolunteering, deleteVolunteering } from "~/server/actions/volunteering";
import DashboardLayout from "~/features/dashboard/Layout";
import FileUpload from "~/features/dashboard/FileUpload";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { FormField, Input, Textarea, SaveStatus } from "~/components/form/FormField";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { TbOutlineHeart, TbOutlinePlus, TbOutlinePencil, TbOutlineTrash, TbOutlineChevronRight, TbOutlineMapPin } from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => getVolunteerings() };

function VolForm(props: { item?: Awaited<ReturnType<typeof getVolunteerings>>[number]; onDone: () => void }) {
  const save = useAction(saveVolunteering);
  const [impacts, setImpacts] = createSignal<string[]>(props.item?.impacts.map(i => i.description) ?? [""]);
  const [logoId, setLogoId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setStatus("saving");
    const form = new FormData(e.target as HTMLFormElement);
    form.set("impacts", JSON.stringify(impacts().filter(Boolean)));
    if (logoId()) form.set("logoId", logoId()!);
    try { await save(form); setStatus("saved"); props.onDone(); }
    catch { setStatus("error"); }
  }

  return (
    <form onSubmit={handleSubmit} class="p-6 space-y-5">
      <input type="hidden" name="id" value={props.item?.id ?? ""} />

      <FileUpload name="logoId" label="Logo Organisasi" current={props.item?.logo} accept="image/*" onUpload={a => setLogoId(a.id)} />

      <div class="grid sm:grid-cols-2 gap-4">
        <FormField label="Peran / Posisi" name="role" required>
          <Input name="role" value={props.item?.role ?? ""} placeholder="Koordinator, Fasilitator..." required />
        </FormField>
        <FormField label="Organisasi" name="organization" required>
          <Input name="organization" value={props.item?.organization ?? ""} placeholder="Nama komunitas / NGO" required />
        </FormField>
        <FormField label="Lokasi" name="location">
          <Input name="location" value={props.item?.location ?? ""} placeholder="Jakarta, Indonesia" />
        </FormField>
        <FormField label="Urutan Tampil" name="order">
          <Input type="number" name="order" value={props.item?.order ?? 0} />
        </FormField>
        <FormField label="Tanggal Mulai" name="startDate" required>
          <Input type="date" name="startDate" value={props.item?.startDate?.toISOString().slice(0, 10) ?? ""} required />
        </FormField>
        <FormField label="Tanggal Selesai" name="endDate" hint="Kosongkan jika masih aktif">
          <Input type="date" name="endDate" value={props.item?.endDate?.toISOString().slice(0, 10) ?? ""} />
        </FormField>
      </div>

      <label class="flex items-center gap-2.5 text-sm text-[var(--c-text)] cursor-pointer">
        <input type="checkbox" name="current" value="true" checked={props.item?.current} class="rounded accent-[#ff6b00] size-4" />
        Masih aktif
      </label>

      <FormField label="Deskripsi" name="description">
        <Textarea name="description" rows={3} placeholder="Jelaskan peran dan kontribusi Anda...">{props.item?.description ?? ""}</Textarea>
      </FormField>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-[var(--c-text)]">Dampak / Kontribusi</p>
          <Button type="button" variant="ghost" class="text-xs gap-1" onClick={() => setImpacts(i => [...i, ""])}>
            <TbOutlinePlus size={13} />Tambah
          </Button>
        </div>
        <For each={impacts()}>
          {(imp, i) => (
            <div class="flex gap-2 items-center">
              <TbOutlineChevronRight class="text-[#10b981] shrink-0" size={14} />
              <Input
                placeholder="Membantu 200+ siswa belajar coding..."
                value={imp}
                onInput={e => setImpacts(x => x.map((v, j) => j === i() ? (e.target as HTMLInputElement).value : v))}
              />
              <button
                type="button"
                class="text-[var(--c-text-muted)] hover:text-red-500 transition-colors shrink-0"
                onClick={() => setImpacts(x => x.filter((_, j) => j !== i()))}
                aria-label="Hapus"
              >
                <TbOutlineTrash size={15} />
              </button>
            </div>
          )}
        </For>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-[var(--c-border)]">
        <Button type="submit" loading={status() === "saving"}>Simpan</Button>
        <Button type="button" variant="ghost" onClick={props.onDone}>Batal</Button>
        <SaveStatus status={status()} />
      </div>
    </form>
  );
}

export default function VolunteeringPage() {
  const doDelete = useAction(deleteVolunteering);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const items = createAsync(() => getVolunteerings());
  const [editing, setEditing] = createSignal<string | null>(null);

  return (
    <DashboardLayout>
      <Title>Volunteering - Dashboard Portfolio</Title>
      <Meta name="description" content="Kelola data volunteering dan kontribusi sosial di portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#10b981]/10 rounded-xl">
              <TbOutlineHeart class="text-[#10b981]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Volunteering</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Kegiatan sukarela dan kontribusi sosial Anda</p>
            </div>
          </div>
          <Button onClick={() => setEditing("new")} class="gap-2 text-sm">
            <TbOutlinePlus size={15} />Tambah
          </Button>
        </div>

        <Show when={editing() === "new"}>
          <Card class="border-[#ff6b00]/30">
            <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
              <p class="font-semibold text-[var(--c-text)] text-sm">Volunteering Baru</p>
            </div>
            <VolForm onDone={() => setEditing(null)} />
          </Card>
        </Show>

        <Suspense fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}>
          <div class="space-y-3">
            <For each={items()} fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineHeart class="mx-auto mb-3 opacity-30" size={40} />
                <p class="text-sm">Belum ada data volunteering. Klik "Tambah" untuk mulai.</p>
              </div>
            }>
              {vol => (
                <Card>
                  <Show
                    when={editing() === vol.id}
                    fallback={
                      <div class="p-5 flex items-center gap-4">
                        <Show when={vol.logo}>
                          <img src={vol.logo!.path} alt="" class="size-10 rounded-lg object-contain shrink-0 border border-[var(--c-border)]" />
                        </Show>
                        <Show when={!vol.logo}>
                          <div class="size-10 rounded-lg bg-[#10b981]/10 flex items-center justify-center shrink-0">
                            <TbOutlineHeart class="text-[#10b981]" size={18} />
                          </div>
                        </Show>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-[var(--c-text)] text-sm">{vol.role}</p>
                          <p class="text-xs text-[#10b981] mt-0.5">{vol.organization}</p>
                          <div class="flex items-center gap-3 mt-0.5">
                            <p class="text-xs text-[var(--c-text-muted)]">
                              {vol.startDate.toLocaleDateString("id-ID", { year: "numeric", month: "short" })} -
                              {vol.endDate ? vol.endDate.toLocaleDateString("id-ID", { year: "numeric", month: "short" }) : " Sekarang"}
                            </p>
                            <Show when={vol.location}>
                              <span class="flex items-center gap-0.5 text-xs text-[var(--c-text-muted)]">
                                <TbOutlineMapPin size={10} />{vol.location}
                              </span>
                            </Show>
                          </div>
                          <Show when={vol.current}>
                            <span class="inline-block text-[10px] bg-[#10b981]/10 text-[#10b981] px-1.5 py-0.5 rounded-full mt-1 font-medium">Aktif</span>
                          </Show>
                        </div>
                        <div class="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditing(vol.id)}
                            class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[#ff6b00] transition-colors"
                            aria-label="Edit"
                          >
                            <TbOutlinePencil size={15} />
                          </button>
                          <button
                              type="button"
                              class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                              aria-label="Hapus"
                              onClick={() => setDeleteId(vol.id)}
                            >
                              <TbOutlineTrash size={15} />
                            </button>
                        </div>
                      </div>
                    }
                  >
                    <div class="px-6 pt-5 pb-1 border-b border-[var(--c-border)]">
                      <p class="font-semibold text-[var(--c-text)] text-sm">Edit: {vol.role} di {vol.organization}</p>
                    </div>
                    <VolForm item={vol} onDone={() => setEditing(null)} />
                  </Show>
                </Card>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Volunteering"
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


