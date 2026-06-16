import { Title, Meta } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { Button } from "~/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <Title>404 - Halaman Tidak Ditemukan</Title>
      <Meta name="description" content="Halaman yang Anda cari tidak ditemukan." />
      <Meta name="robots" content="noindex, nofollow" />
      <HttpStatusCode code={404} />

      <div class="min-h-screen flex items-center justify-center bg-[#f9f9f9] p-6">
        <div class="text-center max-w-sm">
          <p class="text-8xl font-bold text-[#ff6b00]" aria-hidden="true">404</p>
          <h1 class="text-2xl font-bold text-[var(--c-text)] mt-4">Halaman tidak ditemukan</h1>
          <p class="text-[var(--c-text-muted)] mt-2">
            Halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
          <div class="mt-8">
            <Button as="a" href="/">Kembali ke Beranda</Button>
          </div>
        </div>
      </div>
    </>
  );
}

