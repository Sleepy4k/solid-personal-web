import type { JSX, ParentProps } from "solid-js";
import { splitProps } from "solid-js";

type Variant = "primary" | "outline" | "ghost" | "danger";

interface Props extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  as?: "a";
  href?: string;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[#ff6b00] text-white hover:bg-[#e55a00] active:scale-95",
  outline:
    "border-2 border-[#ff6b00] text-[#ff6b00] hover:bg-[#ff6b00] hover:text-white",
  ghost:
    "text-[var(--c-text)] hover:bg-[var(--c-bg-alt)]",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:scale-95"
};

export function Button(props: ParentProps<Props>) {
  const [local, rest] = splitProps(props, ["variant", "loading", "children", "class", "as", "href"]);
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[12px] px-5 py-2.5 font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2";

  if (local.as === "a") {
    return (
      <a
        href={local.href}
        class={`${base} ${variants[local.variant ?? "primary"]} ${local.class ?? ""}`}
      >
        {local.children}
      </a>
    );
  }

  return (
    <button
      class={`${base} ${variants[local.variant ?? "primary"]} ${local.class ?? ""}`}
      disabled={local.loading || rest.disabled}
      {...rest}
    >
      {local.loading ? <span class="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : null}
      {local.children}
    </button>
  );
}

