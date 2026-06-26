import { createSignal, Show, For } from "solid-js";
import type { Asset } from "@prisma/client";
import { LazyImg } from "~/components/ui/LazyAsset";
import { uploadAssetFn } from "~/server/actions/assets";
import { getAssets } from "~/server/db/dashboard";
import { TbOutlineUpload, TbOutlinePhotoScan, TbOutlineX } from "solid-icons/tb";

interface Props {
  name: string;
  label?: string;
  current?: Asset | null;
  accept?: string;
  onUpload?: (asset: Asset) => void;
}

export default function FileUpload(props: Props) {
  const [uploading, setUploading] = createSignal(false);
  const [preview, setPreview] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [pickerOpen, setPickerOpen] = createSignal(false);
  const [pickerAssets, setPickerAssets] = createSignal<Asset[]>([]);
  const [pickerLoading, setPickerLoading] = createSignal(false);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const asset = await uploadAssetFn(form);
      setPreview(asset.path);
      props.onUpload?.(asset);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function openPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const data = await getAssets();
      const imageOnly = (props.accept ?? "").includes("image");
      setPickerAssets(
        (data ?? []).filter(a => !imageOnly || a.mimeType.startsWith("image/"))
      );
    } catch {
      setPickerAssets([]);
    } finally {
      setPickerLoading(false);
    }
  }

  function selectAsset(asset: Asset) {
    setPreview(asset.path);
    props.onUpload?.(asset);
    setPickerOpen(false);
  }

  const currentSrc = () => preview() ?? props.current?.path ?? null;

  return (
    <div class="space-y-2">
      <Show when={props.label}>
        <p class="text-sm font-medium text-[var(--c-text)]">{props.label}</p>
      </Show>

      <label
        class="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--c-border)] rounded-[12px] p-6 cursor-pointer hover:border-[#ff6b00] hover:bg-[#fff5f0] transition-colors"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) handleFile(f); }}
      >
        <Show
          when={currentSrc()}
          fallback={
            <div class="text-center">
              <TbOutlineUpload class="mx-auto mb-2 text-[var(--c-text-muted)]" size={28} />
              <p class="text-sm text-[var(--c-text-muted)] mt-1">
                {uploading() ? "Mengunggah..." : "Klik atau seret file ke sini"}
              </p>
              <p class="text-xs text-[var(--c-text-muted)] mt-0.5">JPG, PNG, WebP, GIF, SVG, MP4, PDF - maks 10MB</p>
            </div>
          }
        >
          <div class="relative">
            <LazyImg
              src={currentSrc()!}
              alt="Preview"
              class="max-h-32 max-w-full rounded-lg object-contain"
            />
            <p class="text-xs text-[var(--c-text-muted)] mt-2 text-center">Klik untuk upload ulang</p>
          </div>
        </Show>

        <input
          type="file"
          name={props.name}
          accept={props.accept ?? "image/*,video/mp4,application/pdf"}
          class="sr-only"
          onInput={e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); }}
          disabled={uploading()}
          aria-label={props.label ?? "Upload file"}
        />
      </label>

      <button
        type="button"
        onClick={openPicker}
        class="flex items-center gap-1.5 text-xs text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors"
      >
        <TbOutlinePhotoScan size={14} />
        Pilih dari aset yang sudah diunggah
      </button>

      <Show when={error()}>
        <p class="text-xs text-red-500" role="alert">{error()}</p>
      </Show>

      <Show when={pickerOpen()}>
        <div
          class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            class="bg-[var(--c-card)] rounded-[16px] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div class="px-5 py-4 border-b border-[var(--c-border)] flex items-center justify-between flex-shrink-0">
              <p class="font-semibold text-sm text-[var(--c-text)]">Pilih Aset</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                class="p-1 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[var(--c-text)] transition-colors"
                aria-label="Tutup"
              >
                <TbOutlineX size={16} />
              </button>
            </div>

            <div class="overflow-y-auto p-4 flex-1">
              <Show
                when={!pickerLoading()}
                fallback={
                  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <For each={Array(10).fill(null)}>
                      {() => (
                        <div class="aspect-square rounded-[10px] bg-[var(--c-border)] animate-pulse" />
                      )}
                    </For>
                  </div>
                }
              >
                <Show
                  when={pickerAssets().length > 0}
                  fallback={
                    <div class="text-center py-10 text-[var(--c-text-muted)]">
                      <TbOutlinePhotoScan class="mx-auto mb-2 opacity-30" size={36} />
                      <p class="text-sm">Belum ada aset tersedia.</p>
                      <p class="text-xs mt-1">Upload gambar di halaman Aset terlebih dahulu.</p>
                    </div>
                  }
                >
                  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <For each={pickerAssets()}>
                      {asset => (
                        <button
                          type="button"
                          onClick={() => selectAsset(asset)}
                          class="aspect-square rounded-[10px] border-2 border-[var(--c-border)] hover:border-[#ff6b00] overflow-hidden transition-colors focus-visible:outline-none focus-visible:border-[#ff6b00] group relative"
                          title={asset.filename}
                        >
                          <img
                            src={asset.path}
                            alt={asset.alt ?? asset.filename}
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
