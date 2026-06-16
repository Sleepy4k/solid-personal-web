import { createSignal, Show } from "solid-js";
import { useAction } from "@solidjs/router";
import type { Asset } from "@prisma/client";
import { LazyImg } from "~/components/ui/LazyAsset";
import { uploadAssetAction } from "~/server/actions/assets";
import { TbOutlineUpload } from "solid-icons/tb";

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

  const upload = useAction(uploadAssetAction);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const asset = await upload(form);
      if (!asset || typeof asset !== "object" || !("id" in asset)) {
        throw new Error("Upload gagal");
      }
      setPreview((asset as Asset).path);
      props.onUpload?.(asset as Asset);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
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
            <p class="text-xs text-[var(--c-text-muted)] mt-2 text-center">Klik untuk ganti</p>
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

      <Show when={error()}>
        <p class="text-xs text-red-500" role="alert">{error()}</p>
      </Show>
    </div>
  );
}


