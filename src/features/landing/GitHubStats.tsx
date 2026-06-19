import type { GithubStats } from "~/lib/shared/types";
import { Card } from "~/components/ui/Card";
import { Skeleton } from "~/components/ui/Skeleton";
import { For, Show, onMount, createSignal } from "solid-js";
import { TbOutlineGitCommit, TbOutlineGitFork, TbOutlineUsers, TbOutlineActivity } from "solid-icons/tb";

interface Props {
  stats?: GithubStats | null;
  loading?: boolean;
}

function contribClass(count: number) {
  if (count === 0) return "contrib-0";
  if (count <= 3) return "contrib-1";
  if (count <= 6) return "contrib-2";
  if (count <= 9) return "contrib-3";
  return "contrib-4";
}

function formatDateString(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function GitHubStatsSection(props: Props) {
  let sectionRef: HTMLElement | undefined;
  const [hoveredDay, setHoveredDay] = createSignal<{ date: string; count: number; x: number; y: number } | null>(null);

  onMount(async () => {
    if (!sectionRef || !props.stats) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.querySelectorAll(".stat-card"), {
      opacity: 0, y: 20, duration: 0.4, stagger: 0.08,
      scrollTrigger: { trigger: sectionRef, start: "top 82%" }
    });
  });

  const STAT_ITEMS = () => [
    { label: "Kontribusi", value: props.stats!.totalContributions, Icon: TbOutlineActivity },
    { label: "Commit", value: props.stats!.totalCommits, Icon: TbOutlineGitCommit },
    { label: "Repository", value: props.stats!.publicRepos, Icon: TbOutlineGitFork },
    { label: "Followers", value: props.stats!.followers, Icon: TbOutlineUsers }
  ];

  return (
    <section id="github" class="py-24 bg-[var(--c-bg)]" aria-labelledby="gh-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="mb-10">
          <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Open Source</p>
          <h2 id="gh-heading" class="text-3xl font-bold text-[var(--c-text)]">Statistik GitHub</h2>
        </div>

        <Show when={!props.loading} fallback={<Skeleton class="h-48 w-full rounded-[16px]" />}>
          <Show
            when={props.stats}
            fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineActivity class="mx-auto mb-3 opacity-30" size={40} />
                <p>Statistik GitHub tidak tersedia.</p>
                <p class="text-sm mt-1">Tambahkan GITHUB_TOKEN di konfigurasi.</p>
              </div>
            }
          >
            <div class="space-y-6">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <For each={STAT_ITEMS()}>
                  {stat => {
                    const StatIcon = stat.Icon;
                    return (
                      <Card class="p-5 text-center stat-card">
                        <StatIcon class="mx-auto text-[#ff6b00] mb-2" size={22} aria-hidden="true" />
                        <p class="text-2xl font-bold text-[var(--c-text)]">{stat.value.toLocaleString("id-ID")}</p>
                        <p class="text-sm text-[var(--c-text-muted)] mt-0.5">{stat.label}</p>
                      </Card>
                    );
                  }}
                </For>
              </div>

              <Card class="p-6 overflow-x-auto relative">
                <p class="text-sm font-medium text-[var(--c-text-muted)] mb-4">
                  Kontribusi 1 tahun terakhir - {props.stats!.totalContributions.toLocaleString("id-ID")} total kontribusi
                </p>
                <div
                  class="flex gap-1 min-w-max pb-2"
                  role="img"
                  aria-label={`Grafik kontribusi GitHub: ${props.stats!.totalContributions} kontribusi dalam setahun`}
                >
                  <For each={props.stats!.weeks}>
                    {week => (
                      <div class="flex flex-col gap-1">
                        <For each={week.contributionDays}>
                          {day => (
                            <div
                              class={`size-3 rounded-sm ${contribClass(day.contributionCount)} transition-all duration-100 hover:scale-125 cursor-pointer`}
                              onMouseEnter={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const parent = e.currentTarget.closest(".relative");
                                if (parent) {
                                  const parentRect = parent.getBoundingClientRect();
                                  setHoveredDay({
                                    date: formatDateString(day.date),
                                    count: day.contributionCount,
                                    x: rect.left - parentRect.left + rect.width / 2,
                                    y: rect.top - parentRect.top - 6
                                  });
                                }
                              }}
                              onMouseLeave={() => setHoveredDay(null)}
                            />
                          )}
                        </For>
                      </div>
                    )}
                  </For>
                </div>

                <Show when={hoveredDay()}>
                  {day => (
                    <div
                      class="absolute z-20 bg-slate-950 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full transition-all duration-75 flex flex-col items-center border border-slate-800"
                      style={{
                        left: `${day().x}px`,
                        top: `${day().y}px`
                      }}
                    >
                      <span class="font-bold text-[#ff6b00]">{day().count} kontribusi</span>
                      <span class="text-slate-400 mt-0.5">{day().date}</span>
                      {/* Tooltip arrow */}
                      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-950" />
                    </div>
                  )}
                </Show>

                <div class="flex items-center gap-2 mt-4 text-xs text-[var(--c-text-muted)]">
                  <span>Sedikit</span>
                  {["contrib-0", "contrib-1", "contrib-2", "contrib-3", "contrib-4"].map(c => (
                    <div class={`size-3 rounded-sm ${c}`} aria-hidden="true" />
                  ))}
                  <span>Banyak</span>
                </div>
              </Card>
            </div>
          </Show>
        </Show>
      </div>
    </section>
  );
}
