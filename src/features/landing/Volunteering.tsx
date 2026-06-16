import type { Volunteering, VolunteeringImpact, Asset } from "@prisma/client";
import { Card } from "~/components/ui/Card";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { LazyImg } from "~/components/ui/LazyAsset";
import { Button } from "~/components/ui/Button";
import { For, Show, onMount } from "solid-js";
import { TbOutlineChevronRight, TbOutlineMapPin } from "solid-icons/tb";
import { A } from "@solidjs/router";

type VoluntFull = Volunteering & {
  impacts: VolunteeringImpact[];
  logo?: Asset | null;
};

interface Props {
  items?: VoluntFull[];
  loading?: boolean;
  showAll?: boolean;
}

function formatDate(d: Date | null) {
  if (!d) return "Sekarang";
  return new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short" });
}

export default function VolunteeringSection(props: Props) {
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

  const displayed = () =>
    props.showAll ? props.items : (props.items ?? []).slice(0, 3);

  return (
    <section id="volunteering" class="py-24 bg-[var(--c-bg-alt)]" aria-labelledby="vol-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Sosial</p>
            <h2 id="vol-heading" class="text-3xl font-bold text-[var(--c-text)]">Volunteering</h2>
          </div>
          <Show when={!props.showAll && (props.items?.length ?? 0) > 0}>
            <A
              href="/volunteering"
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
              {vol => (
                <Card class="p-6" role="listitem">
                  <article>
                    <div class="flex items-start gap-4">
                      <Show when={vol.logo}>
                        <LazyImg
                          src={vol.logo!.path}
                          alt={`Logo ${vol.organization}`}
                          class="size-12 rounded-lg object-contain shrink-0"
                        />
                      </Show>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <h3 class="font-semibold text-lg text-[var(--c-text)]">{vol.role}</h3>
                            <p class="text-[#ff6b00] font-medium">{vol.organization}</p>
                          </div>
                          <Show when={vol.current}>
                            <span class="shrink-0 text-xs bg-[#ff6b00]/10 text-[#ff6b00] px-2 py-1 rounded-full font-medium">
                              Aktif
                            </span>
                          </Show>
                        </div>
                        <p class="text-sm text-[var(--c-text-muted)] mt-1 flex items-center gap-2 flex-wrap">
                          <span>
                            <time>{formatDate(vol.startDate)}</time>
                            {" - "}
                            <time>{formatDate(vol.endDate)}</time>
                          </span>
                          <Show when={vol.location}>
                            <span class="inline-flex items-center gap-1">
                              <TbOutlineMapPin size={12} aria-hidden="true" />
                              {vol.location}
                            </span>
                          </Show>
                        </p>
                        <Show when={vol.impacts.length > 0}>
                          <ul class="mt-3 space-y-1.5" aria-label="Dampak">
                            <For each={vol.impacts}>
                              {imp => (
                                <li class="text-sm text-[var(--c-text-muted)] flex items-start gap-2">
                                  <TbOutlineChevronRight class="text-[#ff6b00] mt-0.5 shrink-0" size={14} aria-hidden="true" />
                                  {imp.description}
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
          <Show when={!props.showAll && (props.items?.length ?? 0) > 3}>
            <div class="text-center mt-8 sm:hidden">
              <Button as="a" href="/volunteering" variant="outline">Lihat Semua Volunteering</Button>
            </div>
          </Show>
        </Show>
      </div>
    </section>
  );
}

