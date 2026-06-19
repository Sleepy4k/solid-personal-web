import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { Suspense, Show, createSignal, createEffect } from "solid-js";
import { getAllVolunteerings } from "~/server/db/portfolio";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import VolunteeringSection from "~/features/landing/Volunteering";
import { TbOutlineSearch } from "solid-icons/tb";
import { CustomSelect } from "~/components/form/CustomSelect";

export const route: RouteDefinition = {
  preload: () => getAllVolunteerings()
};

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: any;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export default function VolunteeringPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const volunteerings = createAsync(() => getAllVolunteerings({
    q: searchParams.q,
    status: searchParams.status
  }));

  const q = () => searchParams.q ?? "";
  const selectedStatus = () => searchParams.status ?? "all";

  const [localSearch, setLocalSearch] = createSignal(q());
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
      <Title>Volunteering - Portfolio</Title>
      <Meta name="description" content="Riwayat lengkap kegiatan volunteering dan kontribusi sosial yang telah dilakukan." />
      <Meta name="robots" content="index, follow" />

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

          <Suspense fallback={<VolunteeringSection loading />}>
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
              <VolunteeringSection items={volunteerings() ?? []} showAll />
            </Show>
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
