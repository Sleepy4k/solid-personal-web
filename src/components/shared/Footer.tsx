import { A } from "@solidjs/router";
import { TbOutlineBrandGithub, TbOutlineBrandLinkedin, TbOutlineBrandInstagram, TbOutlineMail, TbOutlineHeart } from "solid-icons/tb";

const NAV_SECTIONS = [
  {
    title: "Navigasi",
    links: [
      { href: "/", label: "Home" },
      { href: "/experience", label: "Pengalaman" },
      { href: "/projects", label: "Proyek" },
      { href: "/volunteering", label: "Volunter" },
      { href: "/#contact", label: "Kontak" },
    ],
  },
  {
    title: "Lainnya",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/#github", label: "GitHub Stats" },
      { href: "/#about", label: "Tentang Saya" },
    ],
  },
];

const SOCIALS = [
  { href: "https://github.com", label: "GitHub", Icon: TbOutlineBrandGithub },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: TbOutlineBrandLinkedin },
  { href: "https://instagram.com", label: "Instagram", Icon: TbOutlineBrandInstagram },
];

const STACK = ["SolidStart", "TypeScript", "Tailwind v4", "Prisma", "MariaDB"];

export default function Footer() {
  return (
    <footer class="bg-[var(--c-bg)] border-t border-[var(--c-border)]" role="contentinfo">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Main grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 py-14">

          {/* Brand column */}
          <div class="lg:col-span-2 space-y-4">
            <A href="/" class="inline-block font-bold text-xl text-[var(--c-text)] hover:text-[#ff6b00] transition-colors">
              Portfolio
            </A>
            <p class="text-sm text-[var(--c-text-muted)] leading-relaxed max-w-xs">
              Website portfolio pribadi yang menampilkan pengalaman, proyek, dan kontribusi di dunia teknologi.
              Dibangun dengan teknologi modern dan desain yang bersih.
            </p>
            {/* Social links */}
            <div class="flex items-center gap-2 pt-1">
              {SOCIALS.map(s => {
                const SocialIcon = s.Icon;
                return (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    class="size-9 rounded-xl border border-[var(--c-border)] flex items-center justify-center text-[var(--c-text-muted)] hover:text-[#ff6b00] hover:border-[#ff6b00]/40 hover:bg-[#ff6b00]/5 transition-all duration-200"
                  >
                    <SocialIcon size={17} />
                  </a>
                );
              })}
              <a
                href="mailto:hello@example.com"
                aria-label="Email"
                class="size-9 rounded-xl border border-[var(--c-border)] flex items-center justify-center text-[var(--c-text-muted)] hover:text-[#ff6b00] hover:border-[#ff6b00]/40 hover:bg-[#ff6b00]/5 transition-all duration-200"
              >
                <TbOutlineMail size={17} />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_SECTIONS.map(section => (
            <div class="space-y-4">
              <p class="text-xs font-bold uppercase tracking-widest text-[var(--c-text)]">{section.title}</p>
              <ul class="space-y-2.5 list-none m-0 p-0">
                {section.links.map(link => (
                  <li>
                    <A
                      href={link.href}
                      class="text-sm text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors"
                    >
                      {link.label}
                    </A>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div class="border-t border-[var(--c-border)] py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-[var(--c-text-muted)] flex items-center gap-1">
            &copy; {new Date().getFullYear()} Portfolio. Dibuat dengan
            <TbOutlineHeart class="text-[#ff6b00] inline" size={12} />
          </p>
          <div class="flex flex-wrap justify-center gap-x-2 gap-y-1">
            {STACK.map((s, i) => (
              <>
                <span class="text-xs text-[var(--c-text-muted)]">{s}</span>
                {i < STACK.length - 1 && (
                  <span class="text-xs text-[var(--c-border)]" aria-hidden="true">·</span>
                )}
              </>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}

