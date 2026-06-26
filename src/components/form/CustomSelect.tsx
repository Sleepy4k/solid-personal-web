import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { TbOutlineChevronDown, TbOutlineSearch } from "solid-icons/tb";

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
  searchable?: boolean;
}

export function CustomSelect(props: CustomSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let containerRef: HTMLDivElement | undefined;
  let searchRef: HTMLInputElement | undefined;

  const selectedOption = () =>
    props.options.find(opt => opt.value === props.value) || props.options[0];

  const filteredOptions = () => {
    if (!props.searchable || !search()) return props.options;
    const q = search().toLowerCase();
    return props.options.filter(opt => opt.label.toLowerCase().includes(q));
  };

  const clickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch("");
    }
  };

  onMount(() => {
    document.addEventListener("click", clickOutside);
    onCleanup(() => document.removeEventListener("click", clickOutside));
  });

  function open() {
    setIsOpen(true);
    if (props.searchable) setTimeout(() => searchRef?.focus(), 10);
  }

  function close() {
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div class={`relative ${props.class ?? ""}`} ref={containerRef!}>
      <button
        type="button"
        onClick={() => (isOpen() ? close() : open())}
        class="w-full pl-3 pr-3 py-2.5 text-sm border border-[var(--c-border)] rounded-[10px] bg-[var(--c-card)] text-[var(--c-text)] text-left focus:outline-none focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 transition-all flex items-center justify-between cursor-pointer"
      >
        <span class="truncate">{selectedOption()?.label ?? props.placeholder}</span>
        <TbOutlineChevronDown
          class={`text-[var(--c-text-muted)] transition-transform duration-200 shrink-0 ${isOpen() ? "rotate-180" : ""}`}
          size={14}
        />
      </button>

      <Show when={isOpen()}>
        <div class="absolute z-50 w-full mt-1.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-[10px] shadow-xl py-1 animate-[fadeIn_0.1s_ease-out]">
          <Show when={props.searchable}>
            <div class="px-2 pt-1.5 pb-1.5 border-b border-[var(--c-border)]">
              <div class="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-[6px] focus-within:border-[#ff6b00] transition-colors">
                <TbOutlineSearch class="text-[var(--c-text-muted)] shrink-0" size={13} />
                <input
                  ref={searchRef!}
                  type="text"
                  placeholder="Cari..."
                  value={search()}
                  onInput={e => setSearch((e.target as HTMLInputElement).value)}
                  class="flex-1 text-xs bg-transparent text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] outline-none min-w-0"
                />
              </div>
            </div>
          </Show>

          <div class="max-h-52 overflow-y-auto">
            <For
              each={filteredOptions()}
              fallback={
                <p class="px-3 py-2.5 text-sm text-[var(--c-text-muted)] text-center">
                  Tidak ditemukan
                </p>
              }
            >
              {option => (
                <button
                  type="button"
                  onClick={() => {
                    props.onChange(option.value);
                    close();
                  }}
                  class={`w-full px-3 py-2 text-sm text-left hover:bg-[#ff6b00]/10 hover:text-[#ff6b00] transition-colors flex items-center justify-between ${
                    option.value === props.value
                      ? "bg-[#ff6b00]/5 text-[#ff6b00] font-semibold"
                      : "text-[var(--c-text)]"
                  }`}
                >
                  <span class="truncate">{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
