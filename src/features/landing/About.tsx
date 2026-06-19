import type { Profile, ProfileLink } from "@prisma/client";
import { Skeleton, SkeletonText } from "~/components/ui/Skeleton";
import { For, Show, onMount } from "solid-js";
import {
  TbFillBrandGithub,
  TbFillBrandLinkedin,
  TbFillBrandTwitter,
  TbFillBrandInstagram,
  TbOutlineWorld,
  TbOutlineMail,
  TbOutlineLink,
  TbOutlinePhone,
  TbOutlineMapPin,
} from "solid-icons/tb";

const PLATFORM_ICONS: Record<string, any> = {
  github: TbFillBrandGithub,
  linkedin: TbFillBrandLinkedin,
  twitter: TbFillBrandTwitter,
  instagram: TbFillBrandInstagram,
  website: TbOutlineWorld,
  email: TbOutlineMail
};

interface Props {
  profile?: (Profile & { links: ProfileLink[] }) | null;
  loading?: boolean;
}

export default function About(props: Props) {
  let sectionRef: HTMLElement | undefined;

  onMount(async () => {
    if (!sectionRef) return;
    const { default: gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(sectionRef.children, {
      opacity: 0, y: 24, duration: 0.6, stagger: 0.15,
      scrollTrigger: { trigger: sectionRef, start: "top 82%" }
    });
  });

  return (
    <section id="about" class="py-24 bg-[var(--c-bg-alt)]" aria-labelledby="about-heading" ref={sectionRef!}>
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="mb-10">
          <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Tentang</p>
          <h2 id="about-heading" class="text-3xl font-bold text-[var(--c-text)]">Tentang Saya</h2>
        </div>

        <Show when={!props.loading} fallback={<SkeletonText lines={6} />}>
          <div class="grid md:grid-cols-3 gap-8">
            {/* Bio */}
            <div class="md:col-span-2 space-y-4">
              <p class="text-[var(--c-text-muted)] leading-relaxed whitespace-pre-wrap text-base">
                {props.profile?.bio}
              </p>

              <Show when={props.profile?.links?.length}>
                <div class="pt-2">
                  <p class="text-xs font-semibold uppercase tracking-widest text-[var(--c-text-muted)] mb-3">Temukan Saya Di</p>
                  <div class="flex flex-wrap gap-2" role="list" aria-label="Tautan sosial">
                    <For each={props.profile!.links}>
                      {link => {
                        const Icon = PLATFORM_ICONS[link.platform] ?? TbOutlineLink;
                        return (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-full text-sm text-[var(--c-text)] hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all"
                            aria-label={`${link.platform} - ${link.label ?? link.url}`}
                            role="listitem"
                          >
                            <Icon size={14} aria-hidden="true" />
                            {link.label ?? link.platform}
                          </a>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-widest text-[var(--c-text-muted)] mb-3">Informasi Kontak</p>
              <Show when={props.profile?.email}>
                <div class="flex items-center gap-3 text-sm text-[var(--c-text-muted)]">
                  <TbOutlineMail class="text-[#ff6b00] shrink-0" size={15} />
                  <a href={`mailto:${props.profile!.email}`} class="hover:text-[#ff6b00] transition-colors truncate">
                    {props.profile!.email}
                  </a>
                </div>
              </Show>
              <Show when={props.profile?.phone}>
                <div class="flex items-center gap-3 text-sm text-[var(--c-text-muted)]">
                  <TbOutlinePhone class="text-[#ff6b00] shrink-0" size={15} />
                  <span>{props.profile!.phone}</span>
                </div>
              </Show>
              <Show when={props.profile?.location}>
                <div class="flex items-center gap-3 text-sm text-[var(--c-text-muted)]">
                  <TbOutlineMapPin class="text-[#ff6b00] shrink-0" size={15} />
                  <span>{props.profile!.location}</span>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </section>
  );
}


