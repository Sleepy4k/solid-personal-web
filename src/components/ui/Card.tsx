import type { JSX, ParentProps } from "solid-js";

interface Props {
  class?: string;
  hover?: boolean;
  role?: JSX.AriaAttributes["role"];
}

export function Card(props: ParentProps<Props>) {
  return (
    <div
      role={props.role}
      class={[
        "bg-[var(--c-card)] rounded-[16px] border border-[var(--c-border)]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
        props.hover ? "transition-shadow hover:shadow-[0_4px_20px_rgba(255,107,0,0.12)] hover:-translate-y-0.5 duration-200" : "",
        props.class ?? ""
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}
