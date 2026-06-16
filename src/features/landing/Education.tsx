import type { Education, EducationAchievement, Asset } from "@prisma/client";
import { Card } from "~/components/ui/Card";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { LazyImg } from "~/components/ui/LazyAsset";
import { For, Show, onMount } from "solid-js";
import { TbOutlineChevronRight } from "solid-icons/tb";

type EducationFull = Education & {
  achievements: EducationAchievement[];
  logo?: Asset | null;
};

interface Props {
  items?: EducationFull[];
  loading?: boolean;
}

function formatDate(d: Date | null) {
  if (!d) return "Sekarang";
  return new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short" });
}

export default function EducationSection(props: Props) {
  let sectionRef: HTMLElement | undefined;

  onMount(async () => {
    if (!sectionRef) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.querySelectorAll("article"), {
      opacity: 0, y: 20, duration: 0.5, stagger: 0.1,
      scrollTrigger: { trigger: sectionRef, start: "top 80%" }
    });
  });

  return (
    <section id="education" class="py-24 bg-[var(--c-bg)]" aria-labelledby="edu-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="mb-10">
          <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Riwayat</p>
          <h2 id="edu-heading" class="text-3xl font-bold text-[var(--c-text)]">Pendidikan</h2>
        </div>
        <Show
          when={!props.loading}
          fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /></div>}
        >
          <div class="space-y-6" role="list">
            <For each={props.items}>
              {edu => (
                <Card class="p-6" role="listitem">
                  <article>
                    <div class="flex items-start gap-4">
                      <Show when={edu.logo}>
                        <LazyImg
                          src={edu.logo!.path}
                          alt={`Logo ${edu.institution}`}
                          class="size-12 rounded-lg object-contain shrink-0"
                        />
                      </Show>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-lg text-[var(--c-text)]">{edu.institution}</h3>
                        <p class="text-[#ff6b00] font-medium">{edu.degree} - {edu.field}</p>
                        <p class="text-sm text-[var(--c-text-muted)] mt-1">
                          <time dateTime={edu.startDate?.toISOString()}>{formatDate(edu.startDate)}</time>
                          {" - "}
                          <time>{formatDate(edu.endDate)}</time>
                          {edu.gpa && <span class="ml-3 font-medium">IPK: {edu.gpa}</span>}
                        </p>
                        <Show when={edu.description}>
                          <p class="text-[var(--c-text-muted)] mt-2 text-sm leading-relaxed">{edu.description}</p>
                        </Show>
                        <Show when={edu.achievements.length > 0}>
                          <ul class="mt-3 space-y-1" aria-label="Prestasi">
                            <For each={edu.achievements}>
                              {a => (
                                <li class="text-sm text-[var(--c-text-muted)] flex items-start gap-2">
                                  <TbOutlineChevronRight class="text-[#ff6b00] mt-0.5 shrink-0" size={14} aria-hidden="true" />
                                  {a.title}
                                </li>
                              )}
                            </For>
                          </ul>
                        </Show>
                      </div>
                    </div>
                  </article>
                </Card>
              )}
            </For>
          </div>
        </Show>
      </div>
    </section>
  );
}

