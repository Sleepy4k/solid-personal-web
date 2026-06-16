import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { TbOutlineChevronDown } from "solid-icons/tb";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  class?: string;
}

export function CustomSelect(props: CustomSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;

  const selectedOption = () =>
    props.options.find(opt => opt.value === props.value) || props.options[0];

  const clickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("click", clickOutside);
    onCleanup(() => document.removeEventListener("click", clickOutside));
  });

  return (
    <div class={`relative ${props.class ?? ""}`} ref={containerRef!}>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        class="w-full pl-3 pr-10 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-card)] text-[var(--c-text)] text-left focus:outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all flex items-center justify-between cursor-pointer"
      >
        <span class="truncate">{selectedOption()?.label ?? props.placeholder}</span>
        <TbOutlineChevronDown
          class={`text-[var(--c-text-muted)] transition-transform duration-200 shrink-0 ${isOpen() ? "rotate-180" : ""}`}
          size={14}
        />
      </button>

      <Show when={isOpen()}>
        <div class="absolute z-50 w-full mt-1.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-[10px] shadow-xl max-h-60 overflow-y-auto py-1 animate-[fadeIn_0.1s_ease-out]">
          <For each={props.options}>
            {option => (
              <button
                type="button"
                onClick={() => {
                  props.onChange(option.value);
                  setIsOpen(false);
                }}
                class={`w-full px-3 py-2 text-sm text-left hover:bg-[#ff6b00]/10 hover:text-[#ff6b00] transition-colors flex items-center justify-between ${
                  option.value === props.value ? "bg-[#ff6b00]/5 text-[#ff6b00] font-semibold" : "text-[var(--c-text)]"
                }`}
              >
                <span class="truncate">{option.label}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
