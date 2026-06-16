import { createSignal, Show } from "solid-js";
import { useAction } from "@solidjs/router";
import { sendContactAction } from "~/server/actions/contact";
import { Button } from "~/components/ui/Button";
import { FormField, Input, Textarea } from "~/components/form/FormField";
import { TbOutlineMail, TbOutlineUser, TbOutlineMessageCircle, TbOutlineSend, TbOutlineCircleCheck, TbOutlinePhone } from "solid-icons/tb";

export default function ContactSection() {
  const sendContact = useAction(sendContactAction);
  const [status, setStatus] = createSignal<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = createSignal("");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (status() === "sending") return;
    setStatus("sending");
    setErrorMsg("");
    const form = new FormData(e.target as HTMLFormElement);
    try {
      const result = await sendContact(form);
      if (result && "success" in result && !result.success) {
        setErrorMsg(result.error ?? "Terjadi kesalahan");
        setStatus("error");
      } else {
        setStatus("sent");
        (e.target as HTMLFormElement).reset();
      }
    } catch {
      setErrorMsg("Gagal mengirim pesan, coba lagi nanti");
      setStatus("error");
    }
  }

  return (
    <section id="contact" class="py-24 bg-[var(--c-bg-alt)]" aria-labelledby="contact-heading">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="mb-12">
          <p class="text-[#ff6b00] text-sm font-semibold uppercase tracking-widest mb-2">Kontak</p>
          <h2 id="contact-heading" class="text-3xl font-bold text-[var(--c-text)]">Hubungi Saya</h2>
          <p class="text-[var(--c-text-muted)] mt-3 max-w-xl">
            Ada pertanyaan, peluang kerja sama, atau sekadar ingin berdiskusi? Kirim pesan dan saya akan segera merespons.
          </p>
        </div>

        <div class="grid md:grid-cols-5 gap-12">
          {/* Info */}
          <div class="md:col-span-2 space-y-6">
            <div class="flex items-start gap-4">
              <div class="p-3 bg-[#ff6b00]/10 rounded-xl shrink-0">
                <TbOutlineMail class="text-[#ff6b00]" size={20} />
              </div>
              <div>
                <p class="font-medium text-[var(--c-text)] text-sm">Email</p>
                <p class="text-[var(--c-text-muted)] text-sm mt-0.5">Respons dalam 1-2 hari kerja</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="p-3 bg-[#ff6b00]/10 rounded-xl shrink-0">
                <TbOutlinePhone class="text-[#ff6b00]" size={20} />
              </div>
              <div>
                <p class="font-medium text-[var(--c-text)] text-sm">Telepon / WhatsApp</p>
                <p class="text-[var(--c-text-muted)] text-sm mt-0.5">Hubungi untuk diskusi langsung</p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="p-3 bg-[#ff6b00]/10 rounded-xl shrink-0">
                <TbOutlineMessageCircle class="text-[#ff6b00]" size={20} />
              </div>
              <div>
                <p class="font-medium text-[var(--c-text)] text-sm">Formulir Ini</p>
                <p class="text-[var(--c-text-muted)] text-sm mt-0.5">Pesan akan tersimpan dan dijawab segera</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div class="md:col-span-3">
            <div class="bg-[var(--c-card)] rounded-[16px] border border-[var(--c-border)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <Show
                when={status() !== "sent"}
                fallback={
                  <div class="text-center py-10 space-y-4">
                    <TbOutlineCircleCheck class="mx-auto text-green-500" size={52} />
                    <h3 class="text-xl font-semibold text-[var(--c-text)]">Pesan Terkirim!</h3>
                    <p class="text-[var(--c-text-muted)]">Terima kasih telah menghubungi saya. Saya akan segera membalas.</p>
                    <Button variant="outline" onClick={() => setStatus("idle")} type="button">
                      Kirim Pesan Lain
                    </Button>
                  </div>
                }
              >
                <form onSubmit={handleSubmit} class="space-y-4" novalidate>
                  <div class="grid sm:grid-cols-2 gap-4">
                    <FormField label="Nama" name="name" required>
                      <div class="relative">
                        <TbOutlineUser class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)] pointer-events-none" size={15} />
                        <Input id="name" name="name" placeholder="Nama lengkap" required class="!pl-9" />
                      </div>
                    </FormField>
                    <FormField label="Email" name="email" required>
                      <div class="relative">
                        <TbOutlineMail class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-muted)] pointer-events-none" size={15} />
                        <Input id="email" name="email" type="email" placeholder="email@contoh.com" required class="!pl-9" />
                      </div>
                    </FormField>
                  </div>

                  <FormField label="Subjek" name="subject" required>
                    <Input id="subject" name="subject" placeholder="Topik pesan Anda" required />
                  </FormField>

                  <FormField label="Pesan" name="message" required>
                    <Textarea id="message" name="message" rows={5} placeholder="Tulis pesan Anda di sini..." required />
                  </FormField>

                  <Show when={status() === "error"}>
                    <p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5" role="alert">
                      {errorMsg()}
                    </p>
                  </Show>

                  <Button type="submit" loading={status() === "sending"} class="w-full gap-2">
                    <TbOutlineSend size={15} />
                    {status() === "sending" ? "Mengirim..." : "Kirim Pesan"}
                  </Button>
                </form>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


