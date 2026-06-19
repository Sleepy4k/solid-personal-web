import type { Profile, ProfileLink } from "@prisma/client";
import { Button } from "~/components/ui/Button";
import { LazyImg } from "~/components/ui/LazyAsset";
import { Skeleton } from "~/components/ui/Skeleton";
import { Show, For, onMount } from "solid-js";
import { TbOutlineDownload, TbOutlineArrowDown } from "solid-icons/tb";

interface Props {
  profile?: (Profile & { links?: ProfileLink[]; avatar?: { path: string } | null; resume?: { path: string } | null }) | null;
  loading?: boolean;
}

export default function Hero(props: Props) {
  let textRef: HTMLDivElement | undefined;
  let imgRef: HTMLDivElement | undefined;
  let badgesRef: HTMLDivElement | undefined;

  onMount(async () => {
    if (props.loading) return;
    const { default: gsap } = await import("gsap");
    const tl = gsap.timeline();
    tl.from(textRef!, { opacity: 0, y: 50, duration: 0.8, ease: "power3.out" })
      .from(badgesRef!, { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" }, "-=0.3")
      .from(imgRef!, { opacity: 0, scale: 0.9, duration: 0.8, ease: "power3.out" }, "-=0.6");
  });

  return (
    <section
      id="hero"
      class="relative min-h-screen flex items-center pt-16 overflow-hidden"
      aria-label="Pengenalan"
    >
      <div class="absolute inset-0 -z-10 pointer-events-none">
        <div class="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-[#ff6b00]/5 blur-3xl" />
        <div class="absolute bottom-1/3 left-1/4 w-96 h-96 rounded-full bg-[#ff6b00]/3 blur-3xl" />
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full grid md:grid-cols-2 gap-12 items-center">
        <div class="space-y-6 order-2 md:order-1" ref={textRef}>
          <Show
            when={!props.loading}
            fallback={
              <div class="space-y-4">
                <Skeleton class="h-6 w-28" />
                <Skeleton class="h-14 w-full" />
                <Skeleton class="h-5 w-3/4" />
                <Skeleton class="h-5 w-2/3" />
              </div>
            }
          >
            <div class="inline-flex items-center gap-2 bg-[#ff6b00]/10 text-[#ff6b00] px-4 py-1.5 rounded-full text-sm font-semibold">
              <span class="size-2 bg-[#ff6b00] rounded-full animate-pulse" />
              Tersedia untuk proyek baru
            </div>
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--c-text)] leading-[1.1] tracking-tight">
              Halo, Saya{" "}
              <span class="text-[#ff6b00]">{props.profile?.name ?? "Nama Anda"}</span>
            </h1>
            <p class="text-xl text-[var(--c-text-muted)] leading-relaxed font-medium">
              {props.profile?.title ?? "Profesional Title"}
            </p>
            <p class="text-[var(--c-text-muted)] leading-relaxed max-w-lg">
              {props.profile?.bio?.slice(0, 200) ?? ""}
            </p>
          </Show>

          <div class="flex flex-wrap gap-3 pt-2" ref={badgesRef}>
            <Button as="a" href="/projects" class="gap-2">
              Lihat Proyek
            </Button>
            <Button variant="outline" as="a" href="#contact" class="gap-2">
              Hubungi Saya
            </Button>
            <Show when={props.profile?.resume?.path}>
              <Button variant="ghost" as="a" href={props.profile!.resume!.path} class="gap-2">
                <TbOutlineDownload size={15} />CV
              </Button>
            </Show>
          </div>
        </div>

        <div class="flex justify-center order-1 md:order-2" ref={imgRef}>
          <Show
            when={props.profile?.avatar?.path && !props.loading}
            fallback={
              <div class="relative">
                <Skeleton class="size-56 sm:size-72 md:size-80 rounded-full" />
              </div>
            }
          >
            <div class="relative">
              <div class="absolute inset-0 rounded-full ring-4 ring-[#ff6b00]/20 scale-110" />
              <div class="absolute inset-0 rounded-full ring-1 ring-[#ff6b00]/10 scale-125" />
              <LazyImg
                src={props.profile!.avatar!.path}
                alt={`Foto profil ${props.profile?.name}`}
                class="size-56 sm:size-72 md:size-80 rounded-full object-cover shadow-2xl relative z-10"
              />
            </div>
          </Show>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Scroll ke bawah"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors animate-bounce"
      >
        <TbOutlineArrowDown size={20} />
      </a>
    </section>
  );
}
