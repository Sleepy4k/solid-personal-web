import type { Experience, ExperienceResponsibility, ExperienceTechnology, Technology, Asset } from "@prisma/client";
import { Card } from "~/components/ui/Card";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { LazyImg } from "~/components/ui/LazyAsset";
import { Button } from "~/components/ui/Button";
import { For, Show, onMount } from "solid-js";
import { TbOutlineChevronRight, TbOutlineMapPin } from "solid-icons/tb";
import { A } from "@solidjs/router";

type ExpFull = Experience & {
  responsibilities: ExperienceResponsibility[];
  technologies: (ExperienceTechnology & { technology: Technology })[];
  logo?: Asset | null;
};

interface Props {
  items?: ExpFull[];
  loading?: boolean;
  showAll?: boolean;
}

function formatDate(d: Date | null) {
  if (!d) return "Sekarang";
  return new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short" });
}

export default function ExperienceSection(props: Props) {
  let sectionRef: HTMLElement | undefined;

  onMount(async () => {
    if (!sectionRef) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.querySelectorAll("article"), {
      opacity: 0, x: -20, duration: 0.5, stagger: 0.12,
      scrollTrigger: { trigger: sectionRef, start: "top 80%" }
    });
  });

  const displayed = () =>
    props.showAll ? props.items : (props.items ?? []).slice(0, 3);

  return (
    <section id="experience" class="py-24 bg-[var(--c-bg-alt)]" aria-labelledby="exp-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Karir</p>
            <h2 id="exp-heading" class="text-3xl font-bold text-[var(--c-text)]">Pengalaman Kerja</h2>
          </div>
          <Show when={!props.showAll && (props.items?.length ?? 0) > 0}>
            <A
              href="/experience"
              class="text-sm text-[#ff6b00] hover:underline font-medium hidden sm:block"
            >
              Lihat Semua
            </A>
          </Show>
        </div>
        <Show
          when={!props.loading}
          fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}
        >
          <div class="space-y-6" role="list">
            <For each={displayed()}>
              {exp => (
                <Card class="p-6" role="listitem">
                  <article>
                    <div class="flex items-start gap-4">
                      <Show when={exp.logo}>
                        <LazyImg
                          src={exp.logo!.path}
                          alt={`Logo ${exp.company}`}
                          class="size-12 rounded-lg object-contain shrink-0"
                        />
                      </Show>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <h3 class="font-semibold text-lg text-[var(--c-text)]">{exp.position}</h3>
                            <p class="text-[#ff6b00] font-medium">{exp.company}</p>
                          </div>
                          <Show when={exp.current}>
                            <span class="shrink-0 text-xs bg-[#ff6b00]/10 text-[#ff6b00] px-2 py-1 rounded-full font-medium">
                              Saat ini
                            </span>
                          </Show>
                        </div>
                        <p class="text-sm text-[var(--c-text-muted)] mt-1 flex items-center gap-2 flex-wrap">
                          <span>
                            <time>{formatDate(exp.startDate)}</time>
                            {" - "}
                            <time>{formatDate(exp.endDate)}</time>
                          </span>
                          <Show when={exp.location}>
                            <span class="inline-flex items-center gap-1">
                              <TbOutlineMapPin size={12} aria-hidden="true" />
                              {exp.location}
                            </span>
                          </Show>
                        </p>
                        <Show when={exp.responsibilities.length > 0}>
                          <ul class="mt-3 space-y-1.5" aria-label="Tanggung jawab">
                            <For each={exp.responsibilities}>
                              {r => (
                                <li class="text-sm text-[var(--c-text-muted)] flex items-start gap-2">
                                  <TbOutlineChevronRight class="text-[#ff6b00] mt-0.5 shrink-0" size={14} aria-hidden="true" />
                                  {r.description}
                                </li>
                              )}
                            </For>
                          </ul>
                        </Show>
                        <Show when={exp.technologies.length > 0}>
                          <div class="mt-3 flex flex-wrap gap-2" aria-label="Teknologi">
                            <For each={exp.technologies}>
                              {t => (
                                <span class="text-xs bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-2.5 py-1 rounded-full text-[var(--c-text-muted)]">
                                  {t.technology.name}
                                </span>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </article>
                </Card>
              )}
            </For>
          </div>
          <Show when={!props.showAll && (props.items?.length ?? 0) > 3}>
            <div class="text-center mt-8 sm:hidden">
              <Button as="a" href="/experience" variant="outline">Lihat Semua Pengalaman</Button>
            </div>
          </Show>
        </Show>
      </div>
    </section>
  );
}

