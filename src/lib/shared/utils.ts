export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: any;
  return function(this: any, ...args: Parameters<T>): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatDate(d: any): string {
  if (!d) return "Sekarang";
  return new Date(d).toLocaleDateString("id-ID", { year: "numeric", month: "short" });
}
