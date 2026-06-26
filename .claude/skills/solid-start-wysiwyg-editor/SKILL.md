---
name: solid-start-wysiwyg-editor
description: Integrate a Tiptap rich-text editor into SolidStart with SSR safety, proper cleanup, sanitized HTML output, and optional image upload via the project's file-upload action.
related:
  - solid-start-island-architecture-ssr
  - solid-start-file-uploads-server
  - solid-start-server-actions-mutations
  - solid-start-security-hardening
---

# Wysiwyg Editor
- The editor is instantiated only inside `onMount` (never at module level) so SSR never encounters `window`/`document` references.
- `editor.destroy()` is called in `onCleanup` to release DOM listeners and prevent memory leaks on route change.
- Content is stored as JSON (Tiptap's `getJSON()`) for portability; converted to HTML only for display using `generateHTML()` on the server.
- User-submitted HTML is sanitized server-side before saving — never trust the HTML string from the client.

## Safety contract: non-negotiable
- Abort if `@tiptap/core` or any editor extension is imported at module level without an SSR guard — it references `document` and crashes the SSR pass with `ReferenceError: document is not defined`.
- Abort if `editor.destroy()` is missing from `onCleanup` — route changes leave zombie DOM event listeners and eventually leak the editor instance.
- Abort if the editor's HTML output is saved to the DB and later rendered with `innerHTML` without server-side sanitization — stored XSS via crafted paste content.
- Abort if content is stored as raw HTML for the canonical format — JSON is lossless and schema-portable; HTML is a derived display format.

## Required tools
- `@tiptap/core` + desired extensions (e.g. `@tiptap/starter-kit`, `@tiptap/extension-image`).
- `dompurify` + `jsdom` (server-side sanitizer) **or** `sanitize-html` for server-only HTML cleaning.
- `@tiptap/html` (`generateHTML`) for converting JSON → HTML on the server for display.
- SolidJS `onMount`, `onCleanup`, `createSignal`.

## Gotchas
- Tiptap has no official SolidJS adapter — use `@tiptap/core` directly and imperatively call `editor.chain()` methods. Do not attempt to use `@tiptap/react` with SolidJS.
- The Tiptap `Editor` constructor expects a real DOM `element` node; pass the ref after the element mounts: `onMount(() => { const editor = new Editor({ element: el, ... }) })`.
- `editor.getHTML()` and `editor.getJSON()` are synchronous — call them before `editor.destroy()` in `onCleanup` if you need the final value.
- ProseMirror (Tiptap's base) adds its own CSS to `.ProseMirror`; Tailwind's preflight may strip default list/heading styles inside the editor — add `prose` class or explicit styles to the editor container.
- For collaborative editing (Yjs), the Yjs WebSocket provider must be disconnected in `onCleanup` before the editor is destroyed.

## Workflow
1. Install `@tiptap/core` and required extensions; add `dompurify`/`sanitize-html` for server sanitization.
2. Create an `Editor` component that wraps a `<div ref={el}>` and initialises `new Editor(...)` in `onMount`; destroys in `onCleanup`.
3. Expose a `getValue()` accessor that returns `editor.getJSON()` and wire it to the parent form via a callback prop or a store.
4. In the server action, receive the JSON string, parse and sanitize (convert to HTML → sanitize → back to HTML or store JSON), then save to DB.
5. For display, call `generateHTML(storedJson, extensions)` in the server render function and set `innerHTML` on the prose container.

## Code Examples (Good vs Bad)

### Bad Example 1 (top-level import — SSR crash)
```ts
// src/features/editor/RichEditor.tsx — WRONG
import { Editor } from "@tiptap/core"; // document/window accessed at import time → SSR crash
import StarterKit from "@tiptap/starter-kit";

export default function RichEditor() {
  const editor = new Editor({ extensions: [StarterKit] }); // runs during SSR
  // ...
}
```

### Bad Example 2 (no onCleanup destroy — memory leak)
```tsx
// WRONG
onMount(() => {
  const editor = new Editor({ element: el, extensions: [StarterKit] });
  setEditor(editor);
  // missing: onCleanup(() => editor.destroy());
});
```

### Bad Example 3 (raw editor HTML saved and rendered without sanitization — XSS)
```ts
// action — WRONG
const html = form.get("content") as string; // client-controlled HTML
await db.post.create({ data: { content: html } }); // stored as-is
// template — WRONG
<div innerHTML={post.content} /> // XSS: <img src=x onerror="alert(1)"> in content
```

### Bad Example 4 (storing HTML as canonical format — portability issues)
```ts
// WRONG — HTML is layout-dependent; can't migrate to different renderers
const content = editor.getHTML();    // schema-tied HTML
await db.post.create({ data: { content } }); // JSON is the right canonical format
```

### Bad Example 5 (using @tiptap/react in a SolidJS project)
```tsx
// WRONG — @tiptap/react uses React hooks; importing it in SolidJS throws
import { useEditor, EditorContent } from "@tiptap/react";
export default function Editor() {
  const editor = useEditor({ extensions: [StarterKit] }); // React hook, not SolidJS
  return <EditorContent editor={editor} />;
}
```

### Good Example 1 (editor component with SSR-safe dynamic import)
```tsx
// src/components/ui/RichEditor.tsx
import { createSignal, onMount, onCleanup } from "solid-js";

interface Props {
  initialContent?: object;
  onChange?: (json: object) => void;
}

export default function RichEditor(props: Props) {
  let el: HTMLDivElement | undefined;
  const [ready, setReady] = createSignal(false);
  let editorInstance: any;

  onMount(async () => {
    const { Editor } = await import("@tiptap/core");
    const { default: StarterKit } = await import("@tiptap/starter-kit");

    editorInstance = new Editor({
      element: el!,
      extensions: [StarterKit],
      content: props.initialContent ?? "",
      onUpdate: ({ editor }) => props.onChange?.(editor.getJSON()),
    });
    setReady(true);

    onCleanup(() => editorInstance?.destroy());
  });

  return (
    <div
      ref={el}
      class="prose max-w-none min-h-[200px] border border-[var(--c-border)] rounded-xl p-4 focus-within:ring-2 focus-within:ring-[var(--c-primary)]"
    />
  );
}
```

### Good Example 2 (server-side sanitization before DB save)
```ts
// src/server/actions/posts.ts
import { action } from "@solidjs/router";
import { z } from "zod";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

const { window } = new JSDOM("");
const purify = DOMPurify(window as any);

export const savePostAction = action(async (form: FormData) => {
  "use server";
  const contentJson = JSON.parse(form.get("content") as string);
  const rawHtml = generateHTML(contentJson, [StarterKit]);
  const safeHtml = purify.sanitize(rawHtml, { ALLOWED_TAGS: ["p","strong","em","h2","h3","ul","li","a","img"] });

  await db.post.upsert({ /* ... */ data: { contentJson, contentHtml: safeHtml } });
}, "save-post");
```

### Good Example 3 (displaying sanitized HTML from JSON)
```tsx
// src/routes/posts/[slug].tsx
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

// server-side: convert stored JSON to HTML
function renderContent(json: object) {
  "use server";
  return generateHTML(json, [StarterKit]);
}

export default function PostPage() {
  const post = createAsync(() => getPost());
  return (
    <article
      class="prose"
      innerHTML={post()?.contentHtml ?? ""} // already sanitized on save
    />
  );
}
```

### Good Example 4 (image upload integration with project's uploadAssetFn)
```tsx
// Extension config for image upload
import { uploadAssetFn } from "~/server/actions/assets";

const imageUploadExtension = {
  addCommands() {
    return {
      uploadImage: () => async ({ editor }: any) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const form = new FormData();
          form.append("file", file);
          const asset = await uploadAssetFn(form);
          editor.chain().focus().setImage({ src: asset.path }).run();
        };
        input.click();
      },
    };
  },
};
```

### Good Example 5 (wrapping in clientOnly for guaranteed SSR skip)
```tsx
// src/routes/posts/new.tsx
import { clientOnly } from "@solidjs/start";

// Zero SSR overhead: the entire editor chunk is excluded from SSR
const RichEditor = clientOnly(() => import("~/components/ui/RichEditor"));

export default function NewPost() {
  const [content, setContent] = createSignal({});
  return (
    <form>
      <RichEditor onChange={setContent} />
      <input type="hidden" name="content" value={JSON.stringify(content())} />
      <button type="submit">Publish</button>
    </form>
  );
}
```

## Related skills
- [[solid-start-island-architecture-ssr]] — clientOnly() and onMount-guarded dynamic imports for browser-only widgets.
- [[solid-start-file-uploads-server]] — uploadAssetFn integration for in-editor image upload.
- [[solid-start-server-actions-mutations]] — action() wrapper for saving sanitized content to DB.
- [[solid-start-security-hardening]] — server-side DOMPurify sanitization before persisting or rendering user HTML.
