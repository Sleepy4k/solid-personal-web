import { createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { ConfirmModal } from "~/components/ui/ConfirmModal";
import { Title, Meta } from "@solidjs/meta";
import { createSignal, For, Show, Suspense } from "solid-js";
import { getContacts } from "~/server/db/contact";
import { deleteContactAction, markContactReadAction } from "~/server/actions/contact";
import DashboardLayout from "~/features/dashboard/Layout";
import { Card } from "~/components/ui/Card";
import { SkeletonCard } from "~/components/ui/Skeleton";
import {
  TbOutlineMail, TbOutlineTrash, TbOutlineChevronDown, TbOutlineChevronUp,
  TbOutlineUser, TbOutlineAt, TbOutlineClock, TbOutlineMessageCircle
} from "solid-icons/tb";

export const route: RouteDefinition = { preload: () => getContacts() };

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ContactPage() {
  const contacts = createAsync(() => getContacts());
  const markRead = useAction(markContactReadAction);
  const doDelete = useAction(deleteContactAction);
  const [expanded, setExpanded] = createSignal<string | null>(null);
  const [deleteId, setDeleteId] = createSignal<string | null>(null);
  const [deleting, setDeleting] = createSignal(false);

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  return (
    <DashboardLayout>
      <Title>Pesan Masuk - Dashboard Portfolio</Title>
      <Meta name="description" content="Lihat dan kelola pesan dari pengunjung portfolio." />
      <Meta name="robots" content="noindex, nofollow" />

      <div class="space-y-6">
        {/* Page header */}
        <div class="flex items-center gap-3">
          <div class="p-2 bg-[#0ea5e9]/10 rounded-xl">
            <TbOutlineMail class="text-[#0ea5e9]" size={20} />
          </div>
          <div>
            <h1 class="text-xl font-bold text-[var(--c-text)]">Pesan Masuk</h1>
            <p class="text-xs text-[var(--c-text-muted)]">Pesan dari pengunjung portfolio Anda</p>
          </div>
        </div>

        <Suspense fallback={<div class="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}>
          <Show
            when={(contacts()?.length ?? 0) > 0}
            fallback={
              <div class="text-center py-20 text-[var(--c-text-muted)]">
                <TbOutlineMail class="mx-auto mb-3 opacity-20" size={48} />
                <p class="text-sm font-medium">Belum ada pesan masuk</p>
                <p class="text-xs mt-1 text-[var(--c-text-muted)]">Pesan dari form kontak akan muncul di sini</p>
              </div>
            }
          >
            {/* Summary bar */}
            <div class="flex items-center gap-4 px-1">
              <p class="text-sm text-[var(--c-text-muted)]">
                <span class="font-semibold text-[var(--c-text)]">{contacts()?.length ?? 0}</span> pesan total
              </p>
              <Show when={(contacts()?.filter(c => !c.isRead).length ?? 0) > 0}>
                <span class="inline-flex items-center gap-1 text-xs bg-[#0ea5e9]/10 text-[#0ea5e9] px-2 py-0.5 rounded-full font-medium">
                  <span class="size-1.5 bg-[#0ea5e9] rounded-full" />
                  {contacts()?.filter(c => !c.isRead).length} belum dibaca
                </span>
              </Show>
            </div>

            <div class="space-y-3">
              <For each={contacts()}>
                {contact => (
                  <Card>
                    <div class="p-5">
                      {/* Header row */}
                      <div class="flex items-start gap-3">
                        {/* Unread indicator + avatar */}
                        <div class="relative shrink-0">
                          <div class="size-10 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center">
                            <TbOutlineUser class="text-[#0ea5e9]" size={18} />
                          </div>
                          <Show when={!contact.isRead}>
                            <span class="absolute -top-0.5 -right-0.5 size-3 bg-[#0ea5e9] rounded-full border-2 border-[var(--c-card)]" />
                          </Show>
                        </div>

                        {/* Info */}
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-semibold text-[var(--c-text)] text-sm">{contact.name}</p>
                            <Show when={!contact.isRead}>
                              <span class="text-[10px] bg-[#0ea5e9]/10 text-[#0ea5e9] px-1.5 py-0.5 rounded-full font-medium">Baru</span>
                            </Show>
                          </div>
                          <div class="flex items-center gap-1 mt-0.5">
                            <TbOutlineAt size={10} class="text-[var(--c-text-muted)] shrink-0" />
                            <p class="text-xs text-[var(--c-text-muted)] truncate">{contact.email}</p>
                          </div>
                          <div class="flex items-center gap-1 mt-0.5">
                            <TbOutlineClock size={10} class="text-[var(--c-text-muted)] shrink-0" />
                            <p class="text-xs text-[var(--c-text-muted)]">{formatDate(contact.createdAt)}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div class="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleExpand(contact.id)}
                            class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-[var(--c-bg-alt)] hover:text-[#0ea5e9] transition-colors"
                            aria-label={expanded() === contact.id ? "Tutup pesan" : "Lihat pesan"}
                          >
                            <Show when={expanded() === contact.id} fallback={<TbOutlineChevronDown size={15} />}>
                              <TbOutlineChevronUp size={15} />
                            </Show>
                          </button>
                          <button
                          type="button"
                          class="p-2 rounded-lg text-[var(--c-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                          aria-label="Hapus pesan"
                          title="Hapus pesan"
                          onClick={() => setDeleteId(contact.id)}
                        >
                          <TbOutlineTrash size={15} />
                        </button>
                        </div>
                      </div>

                      {/* Subject */}
                      <div class="mt-3 flex items-center gap-2">
                        <TbOutlineMessageCircle size={12} class="text-[var(--c-text-muted)] shrink-0" />
                        <p class="text-sm font-medium text-[var(--c-text)] truncate">{contact.subject}</p>
                      </div>

                      {/* Message preview / expanded */}
                      <Show
                        when={expanded() === contact.id}
                        fallback={
                          <button
                            onClick={() => {
                              toggleExpand(contact.id);
                              if (!contact.isRead) {
                                const form = new FormData();
                                form.set("id", contact.id);
                                markRead(form);
                              }
                            }}
                            class="mt-2 text-left w-full"
                          >
                            <p class="text-xs text-[var(--c-text-muted)] line-clamp-2 leading-relaxed">{contact.message}</p>
                          </button>
                        }
                      >
                        <div class="mt-3 pt-3 border-t border-[var(--c-border)]">
                          <p class="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-wide mb-2">Isi Pesan</p>
                          <p class="text-sm text-[var(--c-text)] leading-relaxed whitespace-pre-wrap">{contact.message}</p>
                          <a
                            href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
                            class="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
                          >
                            <TbOutlineMail size={12} />
                            Balas via Email
                          </a>
                        </div>
                      </Show>
                    </div>
                  </Card>
                )}
              </For>
            </div>
          </Show>
        </Suspense>
      </div>

      <ConfirmModal
        open={deleteId() !== null}
        title="Hapus Pesan"
        message="Pesan ini akan dihapus permanen dan tidak dapat dikembalikan."
        confirmLabel="Ya, Hapus"
        loading={deleting()}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId()) return;
          setDeleting(true);
          const form = new FormData();
          form.set("id", deleteId()!);
          await doDelete(form);
          setDeleting(false);
          setDeleteId(null);
        }}
      />
    </DashboardLayout>
  );
}
