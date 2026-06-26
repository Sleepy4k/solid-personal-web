import type { GithubStats } from "~/types";
import { getGithubStatsByYear } from "~/server/db/portfolio";
import { Card } from "~/components/ui/Card";
import { Skeleton } from "~/components/ui/Skeleton";
import { CustomSelect } from "~/components/form/CustomSelect";
import { For, Show, onMount, createSignal, createMemo } from "solid-js";
import {
  TbOutlineGitCommit,
  TbOutlineGitFork,
  TbOutlineUsers,
  TbOutlineActivity,
} from "solid-icons/tb";

interface Props {
  stats?: GithubStats | null;
  loading?: boolean;
}

const GITHUB_STATS_START_YEAR = 2022;
const CURRENT_YEAR = new Date().getFullYear();

function contribClass(count: number) {
  if (count === 0) return "contrib-0";
  if (count <= 3) return "contrib-1";
  if (count <= 6) return "contrib-2";
  if (count <= 9) return "contrib-3";
  return "contrib-4";
}

function formatDateString(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMonthStartLabels(weeks: GithubStats["weeks"]): Map<number, string> {
  const map = new Map<number, string>();
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const day = week.contributionDays[0];
    if (!day) return;
    const date = new Date(day.date);
    const month = date.getMonth();
    if (month !== lastMonth) {
      if (col > 0) {
        map.set(col, date.toLocaleDateString("id-ID", { month: "short" }));
      }
      lastMonth = month;
    }
  });
  return map;
}

function buildYearOptions() {
  const opts = [];
  for (let y = CURRENT_YEAR; y >= GITHUB_STATS_START_YEAR; y--) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
}

const YEAR_OPTIONS = buildYearOptions();

export default function GitHubStatsSection(props: Props) {
  let sectionRef: HTMLElement | undefined;

  const [hoveredDay, setHoveredDay] = createSignal<{
    date: string;
    count: number;
    vx: number;
    vy: number;
  } | null>(null);
  const [selectedYearStr, setSelectedYearStr] = createSignal(String(CURRENT_YEAR));
  const [yearStats, setYearStats] = createSignal<GithubStats | null>(null);
  const [yearLoading, setYearLoading] = createSignal(false);

  onMount(async () => {
    if (!sectionRef || !props.stats) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.querySelectorAll(".stat-card"), {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.08,
      scrollTrigger: { trigger: sectionRef, start: "top 82%" },
    });
  });

  async function handleYearChange(value: string) {
    if (value === selectedYearStr()) return;
    setHoveredDay(null);
    setSelectedYearStr(value);
    const year = parseInt(value);
    // Current year data is already in props.stats (preloaded)
    if (year === CURRENT_YEAR) {
      setYearStats(null);
      return;
    }
    setYearLoading(true);
    setYearStats(null);
    try {
      const stats = await getGithubStatsByYear(year);
      setYearStats(stats ?? null);
    } finally {
      setYearLoading(false);
    }
  }

  const isCurrentYear = () => parseInt(selectedYearStr()) === CURRENT_YEAR;
  const activeStats = () => (isCurrentYear() ? props.stats : yearStats()) ?? null;
  const activeContribs = () => activeStats()?.totalContributions ?? 0;
  const activeCommits = () => activeStats()?.totalCommits ?? 0;

  const calendarWeeks = () => {
    if (yearLoading()) return [];
    return activeStats()?.weeks ?? [];
  };

  const monthStartLabels = createMemo(() =>
    getMonthStartLabels(calendarWeeks())
  );

  const STAT_ITEMS = () => [
    {
      label: "Kontribusi",
      value: activeContribs(),
      Icon: TbOutlineActivity,
      yearSpecific: true,
    },
    {
      label: "Commit",
      value: activeCommits(),
      Icon: TbOutlineGitCommit,
      yearSpecific: true,
    },
    {
      label: "Repository",
      value: props.stats?.publicRepos ?? 0,
      Icon: TbOutlineGitFork,
      yearSpecific: false,
    },
    {
      label: "Followers",
      value: props.stats?.followers ?? 0,
      Icon: TbOutlineUsers,
      yearSpecific: false,
    },
  ];

  return (
    <section
      id="github"
      class="py-24 bg-[var(--c-bg)]"
      aria-labelledby="gh-heading"
      ref={sectionRef!}
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="mb-10">
          <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">
            Open Source
          </p>
          <h2 id="gh-heading" class="text-3xl font-bold text-[var(--c-text)]">
            Statistik GitHub
          </h2>
        </div>

        <Show
          when={!props.loading}
          fallback={<Skeleton class="h-48 w-full rounded-[16px]" />}
        >
          <Show
            when={props.stats}
            fallback={
              <div class="text-center py-16 text-[var(--c-text-muted)]">
                <TbOutlineActivity class="mx-auto mb-3 opacity-30" size={40} />
                <p>Statistik GitHub tidak tersedia.</p>
                <p class="text-sm mt-1">
                  Tambahkan GITHUB_TOKEN di konfigurasi.
                </p>
              </div>
            }
          >
            <div class="space-y-5">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <For each={STAT_ITEMS()}>
                  {(stat) => {
                    const StatIcon = stat.Icon;
                    return (
                      <Card class="p-5 text-center stat-card">
                        <StatIcon
                          class="mx-auto text-[#ff6b00] mb-2"
                          size={22}
                          aria-hidden="true"
                        />
                        <Show
                          when={!(yearLoading() && stat.yearSpecific)}
                          fallback={
                            <div class="h-7 w-16 mx-auto bg-[var(--c-border)] rounded animate-pulse mb-0.5" />
                          }
                        >
                          <p class="text-2xl font-bold text-[var(--c-text)]">
                            {stat.value.toLocaleString("id-ID")}
                          </p>
                        </Show>
                        <p class="text-sm text-[var(--c-text-muted)] mt-0.5">
                          {stat.label}
                        </p>
                      </Card>
                    );
                  }}
                </For>
              </div>

              <Card class="overflow-hidden">
                {/* Header */}
                <div class="px-5 pt-5 pb-4 border-b border-[var(--c-border)] flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-[var(--c-text)]">
                      Riwayat Kontribusi
                    </p>
                    <Show
                      when={!yearLoading()}
                      fallback={
                        <div class="mt-1 h-3.5 w-44 bg-[var(--c-border)] rounded animate-pulse" />
                      }
                    >
                      <p class="text-xs text-[var(--c-text-muted)] mt-0.5">
                        <span class="font-semibold text-[var(--c-text)]">
                          {activeContribs().toLocaleString("id-ID")}
                        </span>{" "}
                        kontribusi · {selectedYearStr()}
                      </p>
                    </Show>
                  </div>

                  <div class="w-full sm:w-28 flex-shrink-0">
                    <CustomSelect
                      value={selectedYearStr()}
                      options={YEAR_OPTIONS}
                      onChange={handleYearChange}
                    />
                  </div>
                </div>

                <div class="px-5 py-5 overflow-x-auto scrollbar-none">
                  <Show
                    when={!yearLoading()}
                    fallback={
                      <div>
                        <div class="h-4 w-20 bg-[var(--c-border)] rounded animate-pulse mb-2" />
                        <div class="contrib-skeleton-grid">
                          <For each={Array(53).fill(null)}>
                            {() => (
                              <div class="contrib-week-col">
                                <For each={Array(7).fill(null)}>
                                  {() => (
                                    <div class="contrib-0 animate-pulse rounded-sm aspect-square" />
                                  )}
                                </For>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    }
                  >
                    <div class="relative w-full">
                      <Show when={monthStartLabels().size > 0}>
                        <div
                          class="w-full mb-1"
                          style={{
                            display: "grid",
                            "grid-template-columns": `repeat(${calendarWeeks().length}, minmax(10px, 1fr))`,
                            "min-width": `${calendarWeeks().length * 10 + Math.max(0, calendarWeeks().length - 1) * 4}px`,
                            gap: "4px",
                          }}
                        >
                          <For each={calendarWeeks()}>
                            {(_, i) => (
                              <div class="text-[10px] text-[var(--c-text-muted)] overflow-visible whitespace-nowrap">
                                {monthStartLabels().get(i()) ?? ""}
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>

                      <div
                        class="w-full"
                        style={{
                          display: "grid",
                          "grid-template-columns": `repeat(${calendarWeeks().length}, minmax(10px, 1fr))`,
                          "min-width": `${calendarWeeks().length * 10 + Math.max(0, calendarWeeks().length - 1) * 4}px`,
                          gap: "4px",
                        }}
                        role="img"
                        aria-label={`Grafik kontribusi GitHub ${selectedYearStr()}: ${activeContribs()} kontribusi`}
                      >
                        <For each={calendarWeeks()}>
                          {(week) => (
                            <div class="contrib-week-col">
                              <For each={week.contributionDays}>
                                {(day) => (
                                  <div
                                    class={`${contribClass(day.contributionCount)} rounded-sm transition-transform duration-100 hover:scale-110 cursor-pointer aspect-square`}
                                    onMouseEnter={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      setHoveredDay({
                                        date: formatDateString(day.date),
                                        count: day.contributionCount,
                                        vx: rect.left + rect.width / 2,
                                        vy: rect.top - 6,
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredDay(null)}
                                  />
                                )}
                              </For>
                            </div>
                          )}
                        </For>
                      </div>

                      <div class="flex items-center gap-2 mt-3 text-xs text-[var(--c-text-muted)]">
                        <span>Sedikit</span>
                        {(
                          [
                            "contrib-0",
                            "contrib-1",
                            "contrib-2",
                            "contrib-3",
                            "contrib-4",
                          ] as const
                        ).map((c) => (
                          <div
                            class={`size-3 rounded-sm ${c}`}
                            aria-hidden="true"
                          />
                        ))}
                        <span>Banyak</span>
                      </div>
                    </div>
                  </Show>
                </div>
              </Card>
            </div>
          </Show>
        </Show>
      </div>

      <Show when={hoveredDay()}>
        {(day) => (
          <div
            class="fixed z-[9999] bg-slate-950 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none flex flex-col items-center border border-slate-800 -translate-x-1/2 -translate-y-full"
            style={{ left: `${day().vx}px`, top: `${day().vy}px` }}
          >
            <span class="font-bold text-[#ff6b00]">
              {day().count} kontribusi
            </span>
            <span class="text-slate-400 mt-0.5">{day().date}</span>
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-950" />
          </div>
        )}
      </Show>
    </section>
  );
}
