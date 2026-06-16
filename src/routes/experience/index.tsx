import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { Suspense, For, Show, createSignal, createEffect } from "solid-js";
import { getAllExperiences, getAllTechnologies } from "~/server/db/portfolio";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import ExperienceSection from "~/features/landing/Experience";
import { TbOutlineSearch } from "solid-icons/tb";
import { CustomSelect } from "~/components/form/CustomSelect";
import { Skeleton } from "~/components/ui/Skeleton";

export const route: RouteDefinition = {
  preload: () => { getAllExperiences(); getAllTechnologies(); }
};

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: any;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export default function ExperiencePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const experiences = createAsync(() => getAllExperiences({
    q: searchParams.q,
    tech: searchParams.tech
  }));
  const technologies = createAsync(() => getAllTechnologies());

  const q = () => searchParams.q ?? "";
  const selectedTech = () => searchParams.tech ?? "all";

  // Debounced local search input state
  const [localSearch, setLocalSearch] = createSignal(q());
  createEffect(() => {
    setLocalSearch(q());
  });

  const debouncedSetSearch = debounce((val: string) => {
    setSearchParams({ q: val || undefined });
  }, 300);

  // Map technologies to Option interface
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

          {/* Search + Filter */}
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

          {/* Results list */}
          <Suspense fallback={<ExperienceSection loading />}>
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
              <ExperienceSection items={experiences() ?? []} showAll />
            </Show>
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
