import { useSubmission, A } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { Show } from "solid-js";
import { loginAction } from "~/server/actions/auth";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/form/FormField";
import { TbOutlineArrowLeft, TbOutlineLayoutDashboard } from "solid-icons/tb";

export default function LoginPage() {
  const sub = useSubmission(loginAction);

  return (
    <>
      <Title>Masuk - Dashboard Portfolio</Title>
      <Meta name="description" content="Halaman masuk untuk mengelola konten portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="min-h-screen bg-[var(--c-bg-alt)] flex items-center justify-center p-4">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <div class="size-14 bg-[#ff6b00] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TbOutlineLayoutDashboard class="text-white" size={26} />
            </div>
            <h1 class="text-2xl font-bold text-[var(--c-text)]">Dashboard</h1>
            <p class="text-sm text-[var(--c-text-muted)] mt-1">Masuk untuk mengelola portfolio</p>
          </div>

          <div class="bg-[var(--c-card)] rounded-[16px] border border-[var(--c-border)] shadow-sm p-6">
            <form action={loginAction} method="post" class="space-y-4">
              <div class="space-y-1.5">
                <label for="email" class="block text-sm font-medium text-[var(--c-text)]">Email</label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                  autocomplete="email"
                />
              </div>

              <div class="space-y-1.5">
                <label for="password" class="block text-sm font-medium text-[var(--c-text)]">Password</label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="*********"
                  required
                  autocomplete="current-password"
                />
              </div>

              <Show when={sub.result?.error}>
                <p class="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg" role="alert">
                  {sub.result!.error}
                </p>
              </Show>

              <Button type="submit" class="w-full" loading={sub.pending}>
                Masuk
              </Button>
            </form>
          </div>

          <div class="text-center mt-6">
            <A
              href="/"
              class="inline-flex items-center gap-1.5 text-sm text-[var(--c-text-muted)] hover:text-[#ff6b00] transition-colors font-medium"
            >
              <TbOutlineArrowLeft size={14} />
              Kembali ke Portfolio
            </A>
          </div>
        </div>
      </div>
    </>
  );
}
