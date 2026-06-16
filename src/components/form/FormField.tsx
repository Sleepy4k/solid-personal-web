import type { JSX, ParentProps } from "solid-js";
import { Show, splitProps } from "solid-js";
import { TbOutlineChevronDown } from "solid-icons/tb";

interface FieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export function FormField(props: ParentProps<FieldProps>) {
  return (
    <div class="space-y-1.5">
      <label for={props.name} class="block text-sm font-medium text-[var(--c-text)]">
        {props.label}
        <Show when={props.required}>
          <span class="text-[#ff6b00] ml-1" aria-hidden="true">*</span>
        </Show>
      </label>
      {props.children}
      <Show when={props.hint && !props.error}>
        <p class="text-xs text-[var(--c-text-muted)]">{props.hint}</p>
      </Show>
      <Show when={props.error}>
        <p class="text-xs text-red-500" role="alert">{props.error}</p>
      </Show>
    </div>
  );
}

export const inputClass =
  "w-full px-3 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-bg)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-colors appearance-none";

export function Input(props: JSX.InputHTMLAttributes<HTMLInputElement> & { class?: string }) {
  const [local, rest] = splitProps(props, ["class"]);
  return <input class={`${inputClass} ${local.class ?? ""}`} {...rest} />;
}

export function Textarea(props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & { class?: string }) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <textarea
      class={`${inputClass} resize-y min-h-[100px] ${local.class ?? ""}`}
      {...rest}
    />
  );
}

export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement> & { children: JSX.Element }) {
  const [local, rest] = splitProps(props as any, ["class", "children"]);
  return (
    <div class="relative">
      <select
        class={`w-full pl-3 pr-10 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-bg)] text-[var(--c-text)] appearance-none focus:outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-colors cursor-pointer ${local.class ?? ""}`}
        {...rest}
      >
        {local.children}
      </select>
      <TbOutlineChevronDown
        class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--c-text-muted)]"
        size={16}
      />
    </div>
  );
}

interface SaveStatusProps {
  status: "idle" | "saving" | "saved" | "error";
}

export function SaveStatus(props: SaveStatusProps) {
  return (
    <Show when={props.status !== "idle"}>
      <span
        class={`text-xs font-medium ${
          props.status === "saved" ? "text-green-600" :
          props.status === "saving" ? "text-[var(--c-text-muted)]" :
          "text-red-500"
        }`}
        role="status"
        aria-live="polite"
      >
        {props.status === "saving" ? "Menyimpan..." :
         props.status === "saved" ? "✓ Tersimpan" :
         "Gagal menyimpan"}
      </span>
    </Show>
  );
}
