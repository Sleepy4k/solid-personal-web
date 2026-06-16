import { Show, createEffect } from "solid-js";
import { TbOutlineX, TbOutlineTrash, TbOutlineLogout } from "solid-icons/tb";
import { Button } from "~/components/ui/Button";

export type ConfirmVariant = "danger" | "warning";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal(props: Props) {
  const variant = () => props.variant ?? "danger";

  createEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = props.open ? "hidden" : "";
  });

  createEffect(() => {
    if (!props.open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") props.onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  const iconBg = () =>
    variant() === "danger" ? "bg-red-100" : "bg-amber-100";
  const iconColor = () =>
    variant() === "danger" ? "text-red-600" : "text-amber-600";
  const btnVariant = () =>
    variant() === "danger" ? ("danger" as const) : ("primary" as const);

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={e => { if (e.target === e.currentTarget) props.onCancel(); }}
      >
        <div class="absolute inset-0 bg-black/55 animate-[fadeIn_0.12s_ease-out]" aria-hidden="true" />

        <div class="relative bg-[var(--c-card)] rounded-[20px] border border-[var(--c-border)] shadow-2xl w-full max-w-sm p-6 space-y-5 animate-[slideUp_0.2s_ease]">
          <button
            onClick={props.onCancel}
            class="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] transition-colors"
            aria-label="Tutup"
          >
            <TbOutlineX size={16} />
          </button>

          <div class={`size-12 rounded-2xl ${iconBg()} flex items-center justify-center`}>
            <Show
              when={variant() === "warning"}
              fallback={<TbOutlineTrash size={22} class={iconColor()} />}
            >
              <TbOutlineLogout size={22} class={iconColor()} />
            </Show>
          </div>

          <div>
            <h2 id="confirm-title" class="text-base font-bold text-[var(--c-text)]">{props.title}</h2>
            <p class="text-sm text-[var(--c-text-muted)] mt-1 leading-relaxed">{props.message}</p>
          </div>

          <div class="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              class="flex-1"
              onClick={props.onCancel}
              disabled={props.loading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant={btnVariant()}
              class="flex-1"
              loading={props.loading}
              onClick={props.onConfirm}
            >
              {props.confirmLabel ?? "Ya, Lanjutkan"}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}

