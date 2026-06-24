import { A, useAction } from "@solidjs/router";
import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { logoutAction } from "~/server/actions/auth";
import {
  TbOutlineLayoutDashboard, TbOutlineUser, TbOutlineSchool, TbOutlineBriefcase,
  TbOutlineRocket, TbOutlineHeart, TbOutlinePhoto, TbOutlineArrowLeft,
  TbOutlineLogout, TbOutlineMenu2, TbOutlineX, TbOutlineMail
} from "solid-icons/tb";

const NAV = [
  { href: "/dashboard", label: "Overview", Icon: TbOutlineLayoutDashboard },
  { href: "/dashboard/profile", label: "Profil", Icon: TbOutlineUser },
  { href: "/dashboard/education", label: "Pendidikan", Icon: TbOutlineSchool },
  { href: "/dashboard/experience", label: "Pengalaman", Icon: TbOutlineBriefcase },
  { href: "/dashboard/projects", label: "Proyek", Icon: TbOutlineRocket },
  { href: "/dashboard/volunteering", label: "Volunteering", Icon: TbOutlineHeart },
  { href: "/dashboard/assets", label: "Asset", Icon: TbOutlinePhoto },
  { href: "/dashboard/contact", label: "Pesan Masuk", Icon: TbOutlineMail }
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [confirmLogout, setConfirmLogout] = createSignal(false);
  const logout = useAction(logoutAction);

  onMount(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", close);
    onCleanup(() => document.removeEventListener("keydown", close));
  });

  const SidebarContent = () => (
    <>
      <div class="p-5 border-b border-[var(--c-border)] shrink-0">
        <A
          href="/"
          class="inline-flex items-center gap-2 text-sm font-medium text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors"
        >
          <TbOutlineArrowLeft size={14} />
          Kembali ke Portfolio
        </A>
        <div class="mt-4 flex items-center gap-3">
          <div class="size-8 rounded-lg bg-[#ff6b00] flex items-center justify-center shrink-0">
            <TbOutlineLayoutDashboard class="text-white" size={15} />
          </div>
          <div>
            <p class="text-sm font-bold text-[var(--c-text)]">Dashboard</p>
            <p class="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wide">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-3 overflow-y-auto" aria-label="Navigasi dashboard">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-text-muted)] px-3 pt-2 pb-1.5">Menu</p>
        <ul class="space-y-0.5 list-none m-0 p-0">
          {NAV.map(item => {
            const NavIcon = item.Icon;
            return (
              <li>
                <A
                  href={item.href}
                  end
                  class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[var(--c-text)] transition-colors"
                  activeClass="bg-[#ff6b00]/10 text-[#ff6b00] font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  <NavIcon size={16} aria-hidden="true" />
                  {item.label}
                </A>
              </li>
            );
          })}
        </ul>
      </nav>

      <div class="p-3 border-t border-[var(--c-border)] shrink-0">
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors text-left"
        >
          <TbOutlineLogout size={16} aria-hidden="true" />
          Keluar
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        class="hidden md:flex w-60 shrink-0 bg-[var(--c-card)] border-r border-[var(--c-border)] h-screen sticky top-0 flex-col overflow-hidden"
        role="navigation"
        aria-label="Navigasi dashboard"
      >
        <SidebarContent />
      </aside>

      <div class="md:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--c-card)] border-b border-[var(--c-border)] h-14 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Buka menu dashboard"
          aria-expanded={mobileOpen()}
          class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] transition-colors"
        >
          <Show when={mobileOpen()} fallback={<TbOutlineMenu2 size={20} />}>
            <TbOutlineX size={20} />
          </Show>
        </button>
        <span class="font-semibold text-[var(--c-text)] text-sm">Dashboard</span>
      </div>

      <div
        class={`md:hidden fixed inset-0 z-40 flex transition-all duration-300 ${mobileOpen() ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={e => { if (e.target === e.currentTarget) setMobileOpen(false); }}
        aria-hidden={!mobileOpen()}
      >
        <div class="absolute inset-0 bg-black/40" aria-hidden="true" />
        <aside
          class={`relative w-64 bg-[var(--c-card)] flex flex-col h-full shadow-xl overflow-hidden transition-transform duration-300 ease-out ${mobileOpen() ? "translate-x-0" : "-translate-x-full"}`}
        >
          <SidebarContent />
        </aside>
      </div>
      <ConfirmModal
        open={confirmLogout()}
        title="Keluar dari Dashboard"
        message="Anda akan keluar dari sesi admin. Lanjutkan?"
        confirmLabel="Ya, Keluar"
        variant="warning"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />
    </>
  );
}
