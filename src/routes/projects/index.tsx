import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { For, Show, Suspense, createSignal, createEffect } from "solid-js";
import { getAllProjects, getAllTechnologies } from "~/server/db/portfolio";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import { Card } from "~/components/ui/Card";
import { Skeleton } from "~/components/ui/Skeleton";
import { LazyImg } from "~/components/ui/LazyAsset";
import { Button } from "~/components/ui/Button";
import { TbFillStar, TbOutlineExternalLink, TbFillBrandGithub, TbOutlineSearch } from "solid-icons/tb";
import { CustomSelect } from "~/components/form/CustomSelect";

export const route: RouteDefinition = {
  preload: () => { getAllProjects(); getAllTechnologies(); }
};

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: any;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const projects = createAsync(() => getAllProjects({
    q: searchParams.q,
    tech: searchParams.tech
  }));
  const technologies = createAsync(() => getAllTechnologies());

  const q = () => searchParams.q ?? "";
  const selectedTech = () => searchParams.tech ?? "all";

  const [localSearch, setLocalSearch] = createSignal(q());
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
      <Title>Semua Proyek - Portfolio</Title>
      <Meta name="description" content="Daftar lengkap proyek yang telah dikerjakan, dengan filter berdasarkan teknologi dan pencarian." />
      <Meta name="robots" content="index, follow" />

      <Header />
      <main id="main-content" class="min-h-screen pt-24 pb-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6">
          <div class="mb-10">
            <h1 class="text-3xl font-bold text-[var(--c-text)] mb-2">Semua Proyek</h1>
            <p class="text-[var(--c-text-muted)]">
              Koleksi proyek yang telah dikerjakan - gunakan pencarian atau filter untuk menemukan proyek tertentu.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mb-8">
            <div class="relative flex-1">
              <TbOutlineSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)]" size={16} />
              <input
                type="search"
                placeholder="Cari proyek atau teknologi..."
                value={localSearch()}
                onInput={e => {
                  const val = (e.target as HTMLInputElement).value;
                  setLocalSearch(val);
                  debouncedSetSearch(val);
                }}
                class="w-full pl-10 pr-4 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
                aria-label="Cari proyek"
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
              {(projects() ?? []).length} proyek ditemukan
            </p>
          </Suspense>

          <Suspense
            fallback={
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map(() => <Skeleton class="h-72 w-full rounded-[16px]" />)}
              </div>
            }
          >
            <Show
              when={(projects() ?? []).length > 0}
              fallback={
                <div class="text-center py-20">
                  <p class="text-[var(--c-text-muted)] text-lg">Tidak ada proyek yang sesuai pencarian.</p>
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
                <For each={projects()}>
                  {project => (
                    <Card hover class="overflow-hidden" role="listitem">
                      <article>
                        <Show when={project.cover}>
                          <LazyImg
                            src={project.cover!.path}
                            alt={`Screenshot \${project.title}`}
                            class="w-full h-48 object-cover"
                          />
                        </Show>
                        <div class="p-5 space-y-3">
                          <div class="flex items-start justify-between gap-2">
                            <h2 class="font-semibold text-[var(--c-text)] leading-snug">{project.title}</h2>
                            <Show when={project.featured}>
                              <TbFillStar class="shrink-0 text-[#ff6b00]" size={16} aria-label="Unggulan" />
                            </Show>
                          </div>
                          <p class="text-sm text-[var(--c-text-muted)] leading-relaxed line-clamp-3">
                            {project.description}
                          </p>
                          <div class="flex flex-wrap gap-1.5" aria-label="Teknologi">
                            <For each={project.technologies}>
                              {t => (
                                <button
                                  onClick={() => setSearchParams({ tech: t.technology.id })}
                                  class="text-xs bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-2 py-0.5 rounded-full text-[var(--c-text-muted)] hover:border-[#ff6b00] hover:text-[#ff6b00] transition-colors"
                                >
                                  {t.technology.name}
                                </button>
                              )}
                            </For>
                          </div>
                          <div class="flex gap-2 pt-1">
                            <Show when={project.demoUrl}>
                              <Button as="a" href={project.demoUrl!} class="flex-1 text-xs py-1.5 gap-1">
                                <TbOutlineExternalLink size={12} />Demo
                              </Button>
                            </Show>
                            <Show when={project.repoUrl}>
                              <Button variant="outline" as="a" href={project.repoUrl!} class="flex-1 text-xs py-1.5 gap-1">
                                <TbFillBrandGithub size={12} />Kode
                              </Button>
                            </Show>
                          </div>
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
