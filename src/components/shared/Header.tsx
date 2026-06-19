import { A } from "@solidjs/router";
import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { TbOutlineSun, TbOutlineMoon, TbOutlineMenu2, TbOutlineX } from "solid-icons/tb";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/experience", label: "Pengalaman" },
  { href: "/projects", label: "Proyek" },
  { href: "/volunteering", label: "Volunter" },
];

function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("theme") as "light" | "dark") ?? "light";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export default function Header() {
  const [scrolled, setScrolled] = createSignal(false);
  const [theme, setTheme] = createSignal<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = createSignal(false);

  onMount(() => {
    const t = getTheme();
    setTheme(t);
    applyTheme(t);

    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  function toggleTheme() {
    const next = theme() === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  const bgClass = () =>
    scrolled()
      ? "bg-[var(--c-bg)]/95 backdrop-blur-sm shadow-sm"
      : "bg-transparent";

  return (
    <header
      class={`fixed top-0 inset-x-0 z-40 transition-all duration-200 ${bgClass()}`}
      classList={{ scrolled: scrolled() }}
      role="banner"
    >
      <nav
        class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
        aria-label="Navigasi utama"
      >
        <A href="/" class="font-bold text-xl text-[var(--c-text)] hover:text-[#ff6b00] transition-colors">
          Portfolio
        </A>

        <ul class="hidden md:flex items-center gap-6 list-none m-0 p-0" role="list">
          {NAV.map(item => (
            <li>
              <A
                href={item.href}
                class="text-sm text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors font-medium"
              >
                {item.label}
              </A>
            </li>
          ))}
        </ul>

        <div class="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme() === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
            class="p-2 rounded-full text-[var(--c-text-muted)] hover:text-[#ff6b00] hover:bg-[#ff6b00]/10 transition-colors"
          >
            <Show when={theme() === "dark"} fallback={<TbOutlineMoon size={18} />}>
              <TbOutlineSun size={18} />
            </Show>
          </button>

          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen() ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen()}
            class="md:hidden p-2 rounded-lg text-[var(--c-text-muted)] hover:text-[#ff6b00] hover:bg-[#ff6b00]/10 transition-colors"
          >
            <Show when={menuOpen()} fallback={<TbOutlineMenu2 size={22} />}>
              <TbOutlineX size={22} />
            </Show>
          </button>
        </div>
      </nav>

      <Show when={menuOpen()}>
        <div
          class="md:hidden border-t border-[var(--c-border)] bg-[var(--c-bg)] px-4 py-4 space-y-1"
          role="menu"
        >
          {NAV.map(item => (
            <A
              href={item.href}
              onClick={() => setMenuOpen(false)}
              class="block px-3 py-2.5 text-sm font-medium text-[var(--c-text-muted)] hover:text-[#ff6b00] hover:bg-[#ff6b00]/5 rounded-lg transition-colors"
              role="menuitem"
            >
              {item.label}
            </A>
          ))}
          <A
            href="/#contact"
            onClick={() => setMenuOpen(false)}
            class="block mt-2 text-center bg-[#ff6b00] text-white text-sm font-medium px-4 py-2.5 rounded-[12px] hover:bg-[#e55a00] transition-colors"
            role="menuitem"
          >
            Hubungi Saya
          </A>
        </div>
      </Show>
    </header>
  );
}
