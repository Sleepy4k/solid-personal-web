import type { Project, ProjectTechnology, Technology, Asset } from "@prisma/client";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { SkeletonCard } from "~/components/ui/Skeleton";
import { LazyImg } from "~/components/ui/LazyAsset";
import { For, Show, onMount } from "solid-js";
import { TbFillStar, TbOutlineExternalLink, TbFillBrandGithub } from "solid-icons/tb";
import { A } from "@solidjs/router";

type ProjectFull = Project & {
  technologies: (ProjectTechnology & { technology: Technology })[];
  cover?: Asset | null;
};

interface Props {
  items?: ProjectFull[];
  loading?: boolean;
  showAll?: boolean;
}

export default function ProjectsSection(props: Props) {
  let sectionRef: HTMLElement | undefined;

  onMount(async () => {
    if (!sectionRef) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.querySelectorAll(".project-card"), {
      opacity: 0, y: 30, duration: 0.5, stagger: 0.1,
      scrollTrigger: { trigger: sectionRef, start: "top 80%" }
    });
  });

  const displayed = () =>
    props.showAll ? props.items : (props.items ?? []).slice(0, 3);

  return (
    <section id="projects" class="py-24 bg-[var(--c-bg)]" aria-labelledby="proj-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-end justify-between mb-10">
          <div>
            <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Portfolio</p>
            <h2 id="proj-heading" class="text-3xl font-bold text-[var(--c-text)]">Proyek Terbaru</h2>
          </div>
          <Show when={!props.showAll && (props.items?.length ?? 0) > 0}>
            <A
              href="/projects"
              class="text-sm text-[#ff6b00] hover:underline font-medium hidden sm:block"
            >
              Lihat Semua
            </A>
          </Show>
        </div>
        <Show
          when={!props.loading}
          fallback={
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          }
        >
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
            <For each={displayed()}>
              {project => (
                <Card hover class="overflow-hidden project-card" role="listitem">
                  <article>
                    <Show when={project.cover}>
                      <LazyImg
                        src={project.cover!.path}
                        alt={`Screenshot ${project.title}`}
                        class="w-full h-48 object-cover"
                      />
                    </Show>
                    <div class="p-5 space-y-3">
                      <div class="flex items-start justify-between gap-2">
                        <h3 class="font-semibold text-[var(--c-text)] leading-snug">{project.title}</h3>
                        <Show when={project.featured}>
                          <TbFillStar class="shrink-0 text-[#ff6b00]" size={16} aria-label="Unggulan" />
                        </Show>
                      </div>
                      <p class="text-sm text-[var(--c-text-muted)] leading-relaxed line-clamp-3">
                        {project.description}
                      </p>
                      <div class="flex flex-wrap gap-1.5" aria-label="Teknologi">
                        <For each={project.technologies.slice(0, 4)}>
                          {t => (
                            <span class="text-xs bg-[var(--c-bg-alt)] border border-[var(--c-border)] px-2 py-0.5 rounded-full text-[var(--c-text-muted)]">
                              {t.technology.name}
                            </span>
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
          <Show when={!props.showAll && (props.items?.length ?? 0) > 3}>
            <div class="text-center mt-8 sm:hidden">
              <Button as="a" href="/projects" variant="outline">Lihat Semua Proyek</Button>
            </div>
          </Show>
        </Show>
      </div>
    </section>
  );
}


