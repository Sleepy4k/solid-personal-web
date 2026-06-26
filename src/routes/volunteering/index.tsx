import { createAsync, useSearchParams, useLocation, type RouteDefinition } from "@solidjs/router";
import { Title, Meta, Link } from "@solidjs/meta";
import { Suspense, For, Show, createSignal, createEffect } from "solid-js";
import { getAllVolunteerings } from "~/server/db/portfolio";
import { useProfileMeta, buildTitle, getProfileMeta } from "~/stores/profile";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import { Card } from "~/components/ui/Card";
import { LazyImg } from "~/components/ui/LazyAsset";
import { CustomSelect } from "~/components/form/CustomSelect";
import { Skeleton } from "~/components/ui/Skeleton";
import { TbOutlineSearch, TbOutlineMapPin, TbOutlineChevronRight } from "solid-icons/tb";
import { debounce, formatDate } from "~/lib/shared/utils";

export const route: RouteDefinition = {
  preload: () => { getAllVolunteerings(); getProfileMeta(); }
};

export default function VolunteeringPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const profile = useProfileMeta();
  const location = useLocation();
  const pageTitle = () => buildTitle("Riwayat Volunteering", profile());
  const description = () =>
    `Kegiatan volunteering dan kontribusi sosial ${profile()?.name ?? ""}.`.trim();
  const keywords = () =>
    ["volunteering", "organisasi", profile()?.name, profile()?.title, "portfolio"]
      .filter(Boolean).join(", ");
  const ogImage = () => profile()?.avatar?.path;

  const volunteerings = createAsync(() => getAllVolunteerings({
    q: searchParams.q,
    status: searchParams.status
  }));

  const q = () => searchParams.q ?? "";
  const selectedStatus = () => searchParams.status ?? "all";

  const [localSearch, setLocalSearch] = createSignal<string>(q());
  createEffect(() => {
    setLocalSearch(q());
  });

  const debouncedSetSearch = debounce((val: string) => {
    setSearchParams({ q: val || undefined });
  }, 300);

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "current", label: "Masih Berjalan" },
    { value: "past", label: "Selesai" }
  ];

  return (
    <>
      <Title>{pageTitle()}</Title>
      <Meta name="description" content={description()} />
      <Meta name="keywords" content={keywords()} />
      <Meta name="robots" content="index, follow" />
      <Meta property="og:type" content="website" />
      <Meta property="og:title" content={pageTitle()} />
      <Meta property="og:description" content={description()} />
      <Meta property="og:locale" content="id_ID" />
      <Show when={ogImage()}>
        <Meta property="og:image" content={ogImage()!} />
        <Meta name="twitter:image" content={ogImage()!} />
      </Show>
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={pageTitle()} />
      <Meta name="twitter:description" content={description()} />
      <Link rel="canonical" href={location.pathname} />

      <Header />
      <main id="main-content" class="min-h-screen pt-24 pb-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="mb-10">
            <h1 class="text-3xl font-bold text-[var(--c-text)] mb-2">Riwayat Volunteering</h1>
            <p class="text-[var(--c-text-muted)]">
              Daftar kegiatan kesukarelawanan, organisasi non-profit, dan kontribusi sosial.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mb-8">
            <div class="relative flex-1">
              <TbOutlineSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]" size={16} />
              <input
                type="search"
                placeholder="Cari organisasi, peran, atau dampak..."
                value={localSearch()}
                onInput={e => {
                  const val = (e.target as HTMLInputElement).value;
                  setLocalSearch(val);
                  debouncedSetSearch(val);
                }}
                class="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
                aria-label="Cari volunteering"
              />
            </div>
            <div class="sm:w-56">
              <CustomSelect
                value={selectedStatus()}
                options={statusOptions}
                onChange={val => setSearchParams({ status: val !== "all" ? val : undefined })}
              />
            </div>
          </div>

          <Suspense fallback={<Skeleton class="h-5 w-32 mb-4" />}>
            <p class="text-sm text-[var(--c-text-muted)] mb-6">
              {(volunteerings() ?? []).length} kegiatan ditemukan
            </p>
          </Suspense>

          <Suspense
            fallback={
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map(() => <Skeleton class="h-64 w-full rounded-[16px]" />)}
              </div>
            }
          >
            <Show
              when={(volunteerings() ?? []).length > 0}
              fallback={
                <div class="text-center py-20 bg-[var(--c-bg-alt)] rounded-[16px] border border-[var(--c-border)]">
                  <p class="text-[var(--c-text-muted)] text-lg">Tidak ada volunteering yang sesuai kriteria.</p>
                  <button
                    onClick={() => { setSearchParams({ q: undefined, status: undefined }); setLocalSearch(""); }}
                    class="mt-4 text-[#ff6b00] hover:underline text-sm"
                  >
                    Reset filter
                  </button>
                </div>
              }
            >
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                <For each={volunteerings()}>
                  {vol => (
                    <Card hover class="overflow-hidden h-full flex flex-col justify-between" role="listitem">
                      <article class="p-5 flex flex-col h-full justify-between space-y-4">
                        <div class="space-y-3">
                          <div class="flex items-start gap-3">
                            <Show
                              when={vol.logo}
                              fallback={
                                <div class="size-12 rounded-lg bg-[var(--c-bg-alt)] border border-[var(--c-border)] shrink-0 flex items-center justify-center text-[var(--c-text-muted)] font-bold text-sm">
                                  {vol.organization.slice(0, 2).toUpperCase()}
                                </div>
                              }
                            >
                              <LazyImg
                                src={vol.logo?.path ?? ""}
                                alt={`Logo ${vol.organization}`}
                                class="size-12 rounded-lg object-contain bg-white border border-[var(--c-border)] p-1 shrink-0"
                              />
                            </Show>
                            <div class="min-w-0">
                              <h2 class="font-semibold text-[var(--c-text)] leading-snug truncate" title={vol.role}>{vol.role}</h2>
                              <p class="text-[#ff6b00] text-sm font-medium truncate" title={vol.organization}>{vol.organization}</p>
                            </div>
                          </div>

                          <div class="text-xs text-[var(--c-text-muted)] flex flex-col gap-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span>{formatDate(vol.startDate)} - {formatDate(vol.endDate)}</span>
                              <Show when={vol.current}>
                                <span class="text-[10px] bg-[#ff6b00]/10 text-[#ff6b00] px-2 py-0.5 rounded-full font-medium">
                                  Aktif
                                </span>
                              </Show>
                            </div>
                            <Show when={vol.location}>
                              <span class="flex items-center gap-1">
                                <TbOutlineMapPin size={12} />
                                {vol.location}
                              </span>
                            </Show>
                          </div>

                          <Show when={vol.description}>
                            <p class="text-sm text-[var(--c-text-muted)] leading-relaxed line-clamp-3">
                              {vol.description}
                            </p>
                          </Show>

                          <Show when={vol.impacts.length > 0}>
                            <ul class="space-y-1" aria-label="Dampak">
                              <For each={vol.impacts.slice(0, 2)}>
                                {imp => (
                                  <li class="text-xs text-[var(--c-text-muted)] flex items-start gap-1.5">
                                    <TbOutlineChevronRight class="text-[#ff6b00] mt-0.5 shrink-0" size={12} />
                                    <span class="line-clamp-2">{imp.description}</span>
                                  </li>
                                )}
                              </For>
                            </ul>
                          </Show>
                        </div>
                      </article>
                    </Card>
                  )}
                </For>
              </div>
            </Show>
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
