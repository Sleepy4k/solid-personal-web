import type { JSX } from "solid-js";

interface Props {
  class?: string;
  style?: JSX.CSSProperties;
}

export function Skeleton(props: Props) {
  return <div class={`skeleton ${props.class ?? ""}`} style={props.style} aria-hidden="true" />;
}

export function SkeletonText(props: { lines?: number; class?: string }) {
  return (
    <div class={`space-y-2 ${props.class ?? ""}`} aria-hidden="true">
      {Array.from({ length: props.lines ?? 3 }).map((_, i) => (
        <Skeleton
          class={`h-4 ${i === (props.lines ?? 3) - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard(props: { class?: string }) {
  return (
    <div class={`rounded-[16px] border border-[var(--c-border)] p-6 space-y-4 ${props.class ?? ""}`} aria-hidden="true">
      <Skeleton class="h-6 w-2/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

