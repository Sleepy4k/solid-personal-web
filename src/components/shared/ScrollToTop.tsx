import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { TbOutlineArrowUp } from "solid-icons/tb";

export default function ScrollToTop() {
  const [visible, setVisible] = createSignal(false);

  onMount(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Show when={visible()}>
      <button
        onClick={scrollTop}
        aria-label="Kembali ke atas"
        class="fixed bottom-6 right-6 z-50 p-3 bg-[#ff6b00] text-white rounded-full shadow-lg hover:bg-[#e55a00] active:scale-95 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <TbOutlineArrowUp size={20} />
      </button>
    </Show>
  );
}

