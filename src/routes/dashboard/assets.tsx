import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense } from "solid-js";
import { getAssets } from "~/server/db/dashboard";
import { uploadAssetAction, deleteAssetAction } from "~/server/actions/assets";
import DashboardLayout from "~/features/dashboard/Layout";
import { Card } from "~/components/ui/Card";
import { LazyImg } from "~/components/ui/LazyAsset";
import { Skeleton } from "~/components/ui/Skeleton";
import { TbOutlinePhoto, TbOutlineUpload, TbOutlineCopy, TbOutlineTrash, TbOutlineFileText, TbOutlineMovie, TbOutlineCheck } from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => getAssets() };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const assets = createAsync(() => getAssets());
  const upload = useAction(uploadAssetAction);
  const doDelete = useAction(deleteAssetAction);
  const [uploading, setUploading] = createSignal(false);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal<string | null>(null);

  async function handleUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await upload(form);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      (e.target as HTMLInputElement).value = "";
    }
  }

  function copyPath(path: string) {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(path);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <DashboardLayout>
      <Title>Asset Media - Dashboard Portfolio</Title>
      <Meta name="description" content="Kelola file dan asset media portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-[#f59e0b]/10 rounded-xl">
              <TbOutlinePhoto class="text-[#f59e0b]" size={20} />
            </div>
            <div>
              <h1 class="text-xl font-bold text-[var(--c-text)]">Asset Media</h1>
              <p class="text-xs text-[var(--c-text-muted)]">Gambar, dokumen, dan file media</p>
            </div>
          </div>

          <label class={`cursor-pointer inline-flex items-center gap-2 bg-[#ff6b00] text-white text-sm font-medium px-4 py-2.5 rounded-[12px] hover:bg-[#e55a00] transition-colors ${uploading() ? "opacity-60 pointer-events-none" : ""}`}>
            <Show when={uploading()} fallback={<><TbOutlineUpload size={15} />Upload File</>}>
              <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Mengunggah...
            </Show>
            <input
              type="file"
              class="sr-only"
              accept="image/*,video/mp4,video/webm,application/pdf"
              onInput={handleUpload}
              disabled={uploading()}
            />
          </label>
        </div>

        <Show when={uploadError()}>
          <p class="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg" role="alert">
            {uploadError()}
          </p>
        </Show>

        <Suspense
          fallback={
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <For each={Array.from({ length: 8 })}>
                {() => <Skeleton class="aspect-square rounded-[16px]" />}
              </For>
            </div>
          }
        >
          <Show
            when={(assets()?.length ?? 0) > 0}
            fallback={
              <div class="text-center py-20 text-[var(--c-text-muted)]">
                <TbOutlinePhoto class="mx-auto mb-3 opacity-30" size={48} />
                <p class="font-medium text-[var(--c-text-muted)]">Belum ada asset</p>
                <p class="text-sm mt-1">Upload file pertama Anda menggunakan tombol di atas.</p>
              </div>
            }
          >
            <p class="text-xs text-[var(--c-text-muted)]">{assets()!.length} file tersimpan</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <For each={assets()}>
                {asset => (
                  <Card class="overflow-hidden group">
                    {/* Preview */}
                    <div class="aspect-square relative bg-[var(--c-bg-alt)]">
                      <Show
                        when={asset.mimeType.startsWith("image/")}
                        fallback={
                          <div class="w-full h-full flex flex-col items-center justify-center gap-2">
                            <Show when={asset.mimeType.includes("pdf")} fallback={<TbOutlineMovie class="text-[var(--c-text-muted)]" size={32} />}>
                              <TbOutlineFileText class="text-[var(--c-text-muted)]" size={32} />
                            </Show>
                            <p class="text-xs text-[var(--c-text-muted)] px-2 text-center truncate w-full">{asset.mimeType.split("/")[1]?.toUpperCase()}</p>
                          </div>
                        }
                      >
                        <LazyImg src={asset.path} alt={asset.alt ?? asset.filename} class="w-full h-full object-cover" />
                      </Show>

                      {/* Hover overlay */}
                      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => copyPath(asset.path)}
                          class="flex items-center gap-1 text-xs text-white bg-[var(--c-card)]/20 hover:bg-[var(--c-card)]/30 px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Salin path"
                        >
                          <Show when={copied() === asset.path} fallback={<TbOutlineCopy size={12} />}>
                            <TbOutlineCheck size={12} />
                          </Show>
                          {copied() === asset.path ? "Disalin!" : "Salin"}
                        </button>
                        <button
                          type="button"
                          class="flex items-center gap-1 text-xs text-white bg-red-500/80 hover:bg-red-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Hapus asset"
                          onClick={() => setDeleteId(asset.id)}
                        >
                          <TbOutlineTrash size={12} />Hapus
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div class="p-2.5">
                      <p class="text-xs font-medium text-[var(--c-text)] truncate">{asset.filename}</p>
                      <p class="text-xs text-[var(--c-text-muted)] mt-0.5">{formatSize(asset.size)}</p>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Asset"
        message="File ini akan dihapus permanen dari server dan tidak dapat dikembalikan."
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


