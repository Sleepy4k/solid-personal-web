import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { Suspense, For, Show, createSignal, createEffect } from "solid-js";
import { getAllExperiences, getAllTechnologies } from "~/server/db/portfolio";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import { Card } from "~/components/ui/Card";
import { LazyImg } from "~/components/ui/LazyAsset";
import { CustomSelect } from "~/components/form/CustomSelect";
import { Skeleton } from "~/components/ui/Skeleton";
import { TbOutlineSearch, TbOutlineMapPin, TbOutlineChevronRight } from "solid-icons/tb";
import { debounce, formatDate } from "~/lib/shared/utils";

export const route: RouteDefinition = {
  preload: () => { getAllExperiences(); getAllTechnologies(); }
};

export default function ExperiencePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const experiences = createAsync(() => getAllExperiences({
    q: searchParams.q,
    tech: searchParams.tech
  }));
  const technologies = createAsync(() => getAllTechnologies());

  const q = () => searchParams.q ?? "";
  const selectedTech = () => searchParams.tech ?? "all";

  const [localSearch, setLocalSearch] = createSignal<string>(q());
  createEffect(() => {
    setLocalSearch(q());
  });

  const debouncedSetSearch = debounce((val: string) => {
    setSearchParams({ q: val || undefined });
  }, 300);

  const techOptions = () => {
    const list = technologies() ?? [];
    return [
      { value: "all", label: "Semua Teknologi" },
      ...list.map(t => ({ value: t.id, label: t.name }))
    ];
  };

  return (
    <>
      <Title>Pengalaman Kerja - Portfolio</Title>
      <Meta name="description" content="Riwayat lengkap pengalaman kerja dan posisi profesional yang telah dijalani." />
      <Meta name="robots" content="index, follow" />

      <Header />
      <main id="main-content" class="min-h-screen pt-24 pb-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="mb-10">
            <h1 class="text-3xl font-bold text-[var(--c-text)] mb-2">Riwayat Pengalaman</h1>
            <p class="text-[var(--c-text-muted)]">
              Daftar pengalaman profesional dan riwayat karir saya di dunia teknologi.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mb-8">
            <div class="relative flex-1">
              <TbOutlineSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]" size={16} />
              <input
                type="search"
                placeholder="Cari perusahaan, posisi, atau teknologi..."
                value={localSearch()}
                onInput={e => {
                  const val = (e.target as HTMLInputElement).value;
                  setLocalSearch(val);
                  debouncedSetSearch(val);
                }}
                class="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
                aria-label="Cari pengalaman"
              />
            </div>
            <div class="sm:w-56">
              <Suspense fallback={<Skeleton class="h-10 w-full rounded-[10px]" />}>
                <CustomSelect
                  value={selectedTech()}
                  options={techOptions()}
                  onChange={val => setSearchParams({ tech: val !== "all" ? val : undefined })}
                />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<Skeleton class="h-5 w-32 mb-4" />}>
            <p class="text-sm text-[var(--c-text-muted)] mb-6">
              {(experiences() ?? []).length} pengalaman ditemukan
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
              when={(experiences() ?? []).length > 0}
              fallback={
                <div class="text-center py-20 bg-[var(--c-bg-alt)] rounded-[16px] border border-[var(--c-border)]">
                  <p class="text-[var(--c-text-muted)] text-lg">Tidak ada pengalaman yang sesuai kriteria.</p>
                  <button
                    onClick={() => { setSearchParams({ q: undefined, tech: undefined }); setLocalSearch(""); }}
                    class="mt-4 text-[#ff6b00] hover:underline text-sm"
                  >
                    Reset filter
                  </button>
                </div>
              }
            >
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                <For each={experiences()}>
                  {exp => (
                    <Card hover class="overflow-hidden h-full flex flex-col justify-between" role="listitem">
                      <article class="p-5 flex flex-col h-full justify-between space-y-4">
                        <div class="space-y-3">
                          <div class="flex items-start gap-3">
                            <Show
                              when={exp.logo}
                              fallback={
                                <div class="size-12 rounded-lg bg-[var(--c-bg-alt)] border border-[var(--c-border)] shrink-0 flex items-center justify-center text-[var(--c-text-muted)] font-bold text-sm">
                                  {exp.company.slice(0, 2).toUpperCase()}
                                </div>
                              }
                            >
                              <LazyImg
                                src={exp.logo?.path ?? ""}
                                alt={`Logo ${exp.company}`}
                                class="size-12 rounded-lg object-contain bg-white border border-[var(--c-border)] p-1 shrink-0"
                              />
                            </Show>
                            <div class="min-w-0">
                              <h2 class="font-semibold text-[var(--c-text)] leading-snug truncate" title={exp.position}>{exp.position}</h2>
                              <p class="text-[#ff6b00] text-sm font-medium truncate" title={exp.company}>{exp.company}</p>
                            </div>
                          </div>

                          <div class="text-xs text-[var(--c-text-muted)] flex flex-col gap-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span>{formatDate(exp.startDate)} - {formatDate(exp.endDate)}</span>
                              <Show when={exp.current}>
                                <span class="text-[10px] bg-[#ff6b00]/10 text-[#ff6b00] px-2 py-0.5 rounded-full font-medium">
                                  Saat ini
                                </span>
                              </Show>
                            </div>
                            <Show when={exp.location}>
                              <span class="flex items-center gap-1">
                                <TbOutlineMapPin size={12} />
                                {exp.location}
                              </span>
                            </Show>
                          </div>

                          <Show when={exp.description}>
                            <p class="text-sm text-[var(--c-text-muted)] leading-relaxed line-clamp-3">
                              {exp.description}
                            </p>
                          </Show>

                          <Show when={exp.responsibilities.length > 0}>
                            <ul class="space-y-1" aria-label="Tanggung jawab">
                              <For each={exp.responsibilities.slice(0, 2)}>
                                {r => (
                                  <li class="text-xs text-[var(--c-text-muted)] flex items-start gap-1.5">
                                    <TbOutlineChevronRight class="text-[#ff6b00] mt-0.5 shrink-0" size={12} />
                                    <span class="line-clamp-2">{r.description}</span>
                                  </li>
                                )}
                              </For>
                            </ul>
                          </Show>
                        </div>

                        <Show when={exp.technologies.length > 0}>
                          <div class="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--c-border)]" aria-label="Teknologi">
                            <For each={exp.technologies}>
                              {t => (
                                <button
                                  onClick={() => setSearchParams({ tech: t.technology.id })}
                                  class="text-[10px] bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-2 py-0.5 rounded-full text-[var(--c-text-muted)] hover:border-[#ff6b00] hover:text-[#ff6b00] transition-colors"
                                >
                                  {t.technology.name}
                                </button>
                              )}
                            </For>
                          </div>
                        </Show>
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
