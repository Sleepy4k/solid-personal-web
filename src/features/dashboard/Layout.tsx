import type { ParentProps } from "solid-js";
import Sidebar from "./Sidebar";

export default function DashboardLayout(props: ParentProps) {
  return (
    <div class="flex bg-[var(--c-bg-alt)] min-h-screen">
      <Sidebar />
      <main class="flex-1 min-w-0 p-6 md:p-8 pt-20 md:pt-8">
        {props.children}
      </main>
    </div>
  );
}
