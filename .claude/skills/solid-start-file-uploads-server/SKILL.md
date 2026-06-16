---
name: solid-start-file-uploads-server
description: Handle SolidStart file uploads on the server - parse multipart in an API route/action, validate type/size, store to object storage with random names, and stream - instead of trusting client filenames.
related:
  - solid-start-api-routes
  - solid-start-server-actions-mutations
  - solid-start-security-hardening
  - solid-start-runtime-compatibility
---

# SolidStart File Uploads (Server)
- Uploads are received server-side via `request.formData()` in an API route or action; the file is a Web `File`/`Blob`.
- Type and size are validated (sniffed, not just the client-declared MIME), and a random server-generated name is used.
- Files go to object storage (S3/R2) or outside the web root; large transfers are streamed, not buffered whole.

## Safety contract: non-negotiable
- Abort if the client-supplied filename/extension/MIME is trusted for the storage path or validation (path traversal, content spoof).
- Abort if there's no size limit (a huge upload exhausts memory/disk — DoS).
- Abort if files are written into a publicly served directory with predictable names (enumeration, overwrite).
- Abort if the whole file is read into memory under an edge/limited runtime instead of streamed (OOM — see [[solid-start-runtime-compatibility]]).

## Required tools
- `@solidjs/start` >= 1, Web `FormData`/`File`, an object-storage SDK (S3/R2) or a safe disk path, a size/type validator.

## Gotchas
- `const form = await request.formData(); const file = form.get('file') as File` gives a Web `File`; read bytes via `file.stream()`/`arrayBuffer()`.
- Validate the real content (magic bytes) — the `file.type` is client-asserted and spoofable.
- Generate the stored name (`crypto.randomUUID()`); persist a mapping, never the original client name as the key.
- Enforce a max size before reading the whole body; stream to storage for large files.

## Workflow
1. Receive the upload in an API route/action via `request.formData()`.
2. Enforce a size cap; validate the real type.
3. Store with a random name to object storage / outside web root.
4. Persist metadata; serve via signed URLs, not direct public paths.

## Code Examples (Good vs Bad)

### Bad Example 1 (trusts filename + no size/type check)
```ts
export async function POST({ request }) {
  const form = await request.formData();
  const file = form.get('file') as File;
  await writeFile(`./public/uploads/${file.name}`, Buffer.from(await file.arrayBuffer()));
  // client name -> ../../traversal; no size limit; buffers entire file; public predictable path
  return Response.json({ url: `/uploads/${file.name}` });
}
```

### Bad Example 2 (trusts client MIME)
```ts
if (file.type === 'image/png') await store(file); // file.type is client-set -> spoofable
```

### Bad Example 3 (no auth on the upload endpoint)
```ts
export async function POST({ request }) {
  const file = (await request.formData()).get('file') as File;
  await s3.putObject({ Key: crypto.randomUUID(), Body: file.stream() }); // anyone can fill your bucket
  return Response.json({ ok: true });
}
```

### Bad Example 4 (buffers whole file under an edge runtime)
```ts
export async function POST({ request }) {
  const file = (await request.formData()).get('file') as File;
  const buf = Buffer.from(await file.arrayBuffer()); // a 1GB upload -> OOM on a memory-limited worker
  await store(buf);
  return Response.json({ ok: true });
}
```

### Bad Example 5 (extension-based type check)
```ts
const file = form.get('file') as File;
if (file.name.endsWith('.png')) await store(file); // shell.php.png passes; extension proves nothing
```

### Good Example 1 (validated, random name, size cap)
```ts
const MAX = 5 * 1024 * 1024;
export async function POST({ request }) {
  const session = await getSession(request);
  if (!session) return new Response('unauthorized', { status: 401 });
  const file = (await request.formData()).get('file') as File;
  if (!file || file.size > MAX) return new Response('too large', { status: 413 });
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!isAllowedMagic(head)) return new Response('bad type', { status: 415 }); // sniff real type
  const key = `${session.userId}/${crypto.randomUUID()}`;                       // random, scoped
  await s3.putObject({ Key: key, Body: file.stream(), ContentLength: file.size });
  return Response.json({ key }, { status: 201 });
}
```

### Good Example 2 (serve via signed URL, not public path)
```ts
export async function GET({ params }) {
  const url = await s3.getSignedUrl('getObject', { Key: params.key, Expires: 300 }); // time-boxed
  return Response.json({ url });
}
```

### Good Example 3 (stream to storage, never fully buffer)
```ts
export async function POST({ request }) {
  const file = (await request.formData()).get('file') as File;
  if (file.size > MAX) return new Response('too large', { status: 413 });
  await s3.upload({ Key: crypto.randomUUID(), Body: file.stream(), ContentLength: file.size }); // streamed
  return Response.json({ ok: true }, { status: 201 });
}
```

### Good Example 4 (upload via a form action with auth)
```ts
export const uploadAvatar = action(async (form: FormData) => {
  'use server';
  const user = await getSession();
  if (!user) throw redirect('/login');
  const file = form.get('avatar') as File;
  if (file.size > 2 * 1024 * 1024) throw new Error('too large');
  const key = `${user.id}/${crypto.randomUUID()}`;
  await s3.putObject({ Key: key, Body: file.stream(), ContentLength: file.size });
  await db.user.update({ where: { id: user.id }, data: { avatarKey: key } });
});
```

### Good Example 5 (validate magic bytes against an allowlist)
```ts
const SIGNATURES: Record<string, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpg: [0xff, 0xd8, 0xff],
};
function isAllowedMagic(head: Uint8Array) {
  return Object.values(SIGNATURES).some(sig => sig.every((b, i) => head[i] === b));
}
```

## Related skills
- [[solid-start-api-routes]] — the endpoint receiving the upload.
- [[solid-start-server-actions-mutations]] — uploads via form actions.
- [[solid-start-security-hardening]] — validation and storage safety.
- [[solid-start-runtime-compatibility]] — streaming under limited runtimes.
