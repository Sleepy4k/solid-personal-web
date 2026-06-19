import { createAsync, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { Suspense, For } from "solid-js";
import { getStats } from "~/server/db/dashboard";
import { Skeleton } from "~/components/ui/Skeleton";
import DashboardLayout from "~/features/dashboard/Layout";
import { TbOutlineRocket, TbOutlineBriefcase, TbOutlineSchool, TbOutlineHeart, TbOutlinePhoto, TbOutlineExternalLink, TbOutlineArrowRight, TbOutlineUser, TbOutlineTrendingUp } from "solid-icons/tb";

export const route: RouteDefinition = {
  preload: () => getStats()
};

const STAT_CARDS = [
  { label: "Proyek", key: "projects" as const, href: "/dashboard/projects", Icon: TbOutlineRocket, color: "#ff6b00" },
  { label: "Pengalaman", key: "experiences" as const, href: "/dashboard/experience", Icon: TbOutlineBriefcase, color: "#6366f1" },
  { label: "Pendidikan", key: "educations" as const, href: "/dashboard/education", Icon: TbOutlineSchool, color: "#0ea5e9" },
  { label: "Volunteering", key: "volunteerings" as const, href: "/dashboard/volunteering", Icon: TbOutlineHeart, color: "#10b981" },
  { label: "Asset", key: "assets" as const, href: "/dashboard/assets", Icon: TbOutlinePhoto, color: "#f59e0b" }
];

const QUICK_LINKS = [
  { href: "/dashboard/profile", label: "Edit Profil", Icon: TbOutlineUser, desc: "Nama, bio, dan tautan sosial" },
  { href: "/dashboard/projects", label: "Tambah Proyek", Icon: TbOutlineRocket, desc: "Proyek baru ke portfolio" },
  { href: "/", label: "Lihat Portfolio", Icon: TbOutlineExternalLink, desc: "Buka halaman publik", external: true }
];

export default function DashboardHome() {
  const stats = createAsync(() => getStats());

  return (
    <DashboardLayout>
      <Title>Dashboard - Kelola Portfolio</Title>
      <Meta name="description" content="Dashboard admin untuk mengelola konten portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-8">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold text-[var(--c-text)]">Selamat Datang</h1>
            <p class="text-[var(--c-text-muted)] mt-1 text-sm">Kelola dan perbarui konten portfolio Anda dari sini.</p>
          </div>
          <div class="hidden sm:flex items-center gap-2 text-xs text-[var(--c-text-muted)] bg-[var(--c-card)] border border-[var(--c-border)] rounded-full px-3 py-1.5">
            <TbOutlineTrendingUp size={12} class="text-green-500" />
            Sistem berjalan normal
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-[var(--c-text-muted)] mb-3">Ringkasan Konten</p>
          <Suspense
            fallback={
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <For each={Array.from({ length: 5 })}>
                  {() => <Skeleton class="h-28 rounded-[16px]" />}
                </For>
              </div>
            }
          >
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <For each={STAT_CARDS}>
                {card => {
                  const CardIcon = card.Icon;
                  return (
                    <a
                      href={card.href}
                      class="group block bg-[var(--c-card)] rounded-[16px] border border-[var(--c-border)] p-4 hover:border-[#ff6b00]/40 hover:shadow-md transition-all duration-200 no-underline"
                    >
                      <div
                        class="size-9 rounded-xl flex items-center justify-center mb-3"
                        style={{ "background-color": `${card.color}15` }}
                      >
                        <CardIcon size={18} style={{ color: card.color }} aria-hidden="true" />
                      </div>
                      <p class="text-2xl font-bold text-[var(--c-text)]">{stats()?.[card.key] ?? 0}</p>
                      <p class="text-xs text-[var(--c-text-muted)] mt-0.5">{card.label}</p>
                    </a>
                  );
                }}
              </For>
            </div>
          </Suspense>
        </div>

        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-[var(--c-text-muted)] mb-3">Aksi Cepat</p>
          <div class="grid sm:grid-cols-3 gap-3">
            <For each={QUICK_LINKS}>
              {link => {
                const LinkIcon = link.Icon;
                return (
                <a
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  class="group flex items-center gap-3 bg-[var(--c-card)] rounded-[16px] border border-[var(--c-border)] p-4 hover:border-[#ff6b00]/40 hover:shadow-md transition-all duration-200 no-underline"
                >
                  <div class="size-9 rounded-xl bg-[#ff6b00]/10 flex items-center justify-center shrink-0">
                    <LinkIcon class="text-[#ff6b00]" size={17} aria-hidden="true" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-[var(--c-text)] group-hover:text-[#ff6b00] transition-colors">{link.label}</p>
                    <p class="text-xs text-[var(--c-text-muted)] truncate">{link.desc}</p>
                  </div>
                  <TbOutlineArrowRight class="ml-auto text-[var(--c-text-muted)] group-hover:text-[#ff6b00] shrink-0 transition-colors" size={14} />
                </a>
              );
              }}
            </For>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


