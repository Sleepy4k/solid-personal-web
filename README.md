# Portfolio

Website portfolio pribadi dengan CMS dashboard admin, dibangun dengan SolidStart 2.0.0-alpha.2.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | SolidStart 2.0.0-alpha.2 + `@solidjs/vite-plugin-nitro-2` |
| Database | MariaDB via Prisma 7.8.0 + `@prisma/adapter-mariadb` |
| Styling | Tailwind CSS v4 (custom token via `@theme {}`) |
| Auth | JWT (`jose`) + `argon2` password hashing |
| Runtime | Bun >= 1.1.0 |
| Validasi | Zod 4.4.3 (semua server action) |
| Icon | Solid Icons (`solid-icons`) |
| Animasi | GSAP 3.15.0 + ScrollTrigger |

## Struktur Proyek

```
src/
  middleware/          → auth guard + security headers
    index.ts           → entry (didaftarkan di vite.config.ts)
    auth.ts            → adminAuthMW — blok /dashboard/** tanpa session
    security.ts        → securityHeadersMW — CSP, X-Frame, dll
  lib/
    client/            → kode browser-only (NProgress)
    server/            → kode server-only: session, assets, github
    shared/            → tipe TypeScript + Zod validation schemas
  server/
    db/
      client.ts        → Prisma singleton dengan @prisma/adapter-mariadb
      portfolio.ts     → query data landing page (3 terbaru per kategori) + pencarian server-side
      dashboard.ts     → query-query halaman dashboard
      contact.ts       → query data pesan kontak
    actions/           → semua server action (mutasi database) dengan Zod validation
  features/
    landing/           → section homepage (Hero, About, Experience, Projects, Volunteering, Contact)
    dashboard/         → komponen dashboard (Layout, Sidebar, FileUpload)
  components/
    ui/                → Button, Card, Skeleton, LazyAsset, ConfirmModal
    form/              → FormField, Input, Textarea, Select, CustomSelect, SaveStatus
    shared/            → Header (dark mode toggle), Footer, ScrollToTop
  routes/
    index.tsx          → halaman utama portfolio (lazy loaded sections dengan ambient gradient)
    login.tsx          → login admin (relocated back-to-portfolio link)
    projects/index.tsx → halaman semua proyek + server-side debounced search & custom select
    experience/index.tsx → halaman semua pengalaman kerja + server-side debounced search & custom select
    volunteering/index.tsx → halaman semua kegiatan volunteering + server-side debounced search & custom select
    dashboard/         → 8 halaman CRUD (profile, education, experience, projects, volunteering, assets, contact)
```

## Setup

### 1. Konfigurasi environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/portfolio_db"
JWT_SECRET="random-secret-minimal-32-karakter"
ADMIN_EMAIL="email@anda.com"
ADMIN_PASSWORD="password-kuat"
GITHUB_USERNAME="username-github"        # opsional
GITHUB_TOKEN="ghp_yourtoken"            # opsional, untuk statistik kontribusi
```

### 2. Install dependencies

```bash
bun install
```

### 3. Generate Prisma client + setup database

```bash
bun run db:generate   # generate Prisma client
bun run db:push       # buat tabel dari schema
bun run db:seed       # buat akun admin
```

### 4. Jalankan

```bash
bun run dev         # development
bun run build       # production build
bun run start       # production server
```

## Fitur

### Portfolio Publik
- **SEO lengkap**: meta tag per halaman, JSON-LD Person schema, og:type, twitter:card
- **Dark mode**: toggle cahaya/gelap, disimpan ke localStorage, tanpa flash saat load
- **GSAP animations**: animasi scroll-triggered di semua section landing
- **Code splitting**: lazy loading untuk section below-fold (Experience, Projects, dll)
- **Custom scrollbar**: desain tipis sesuai brand
- **Scroll to top**: tombol muncul setelah scroll 400px
- **Contact form**: pesan dari visitor tersimpan di database, divalidasi Zod
- **Halaman detail**: `/projects`, `/experience`, `/volunteering` dengan data lengkap
- **Server-side Search & Filter**: pencarian debounced (300ms) dan filter dropdown kustom (`CustomSelect`) diolah langsung oleh server/database untuk performa maksimal.
- **Responsive**: mobile-first, mobile hamburger header
- **Ambient Glow**: Gradien latar belakang bergaya premium dengan pendaran cahaya oranye lembut (`#ff6b00`) yang dinamis menyesuaikan mode gelap/terang.

### Dashboard Admin
- **CRUD penuh**: Profil, Pendidikan, Pengalaman, Proyek, Volunteering, Asset, dan Pesan Masuk
- **Upload file**: `uploadAssetAction` server action, `fs.writeFile()`, validasi tipe/ukuran
- **Solid Icons**: Ikon modern dan konsisten menggunakan library `solid-icons/tb`
- **Mobile sidebar**: drawer halus dengan animasi transisi CSS (`transform` & `opacity`)
- **Full-width & Statik Sidebar**: Tata letak desktop didesain lebar penuh (full-width) dengan sidebar statik (tinggi tidak mengikuti konten utama) agar navigasi tetap kokoh.
- **Confirm Modal**: Dialog konfirmasi kustom (`ConfirmModal`) yang responsif dan berkinerja tinggi untuk semua aksi penghapusan data dan logout.

### Keamanan
- **Server actions only**: tidak ada API route publik, semua mutasi via `action()`
- **Zod validation**: validasi di layer server action, bukan hanya client
- **CSP**: `Content-Security-Policy` dengan `'unsafe-inline'` (kompatibel SolidStart hydration)
- **HttpOnly cookie**: sesi JWT tidak bisa diakses JavaScript
- **argon2id**: hashing password dengan memory cost tinggi

## Perintah Database

```bash
bun run db:generate   # generate Prisma client setelah ubah schema
bun run db:push       # push schema (development, tanpa migration history)
bun run db:migrate    # buat migration file (production)
bun run db:seed       # buat/reset admin user dari .env
bun run db:studio     # buka Prisma Studio di browser
```

## Catatan Arsitektur

- **Prisma 7**: koneksi di `prisma.config.ts` (CLI) dan `src/server/db/client.ts` (runtime). `engineType = "library"` di `schema.prisma`. Adapter: `@prisma/adapter-mariadb`.
- **SolidStart v2 alpha**: konfigurasi di `vite.config.ts`, bukan `app.config.ts`.
- **Middleware**: registrasi path `./src/middleware/index.ts` di `vite.config.ts`.
- **Password hashing**: `argon2` (bukan `Bun.password`) — type `argon2id`, memoryCost 64MB.
- **File upload**: `uploadAsset()` di `~/lib/server/assets`, simpan ke `public/uploads/`.
- **Tailwind v4**: variabel CSS custom via `@theme {}` di `app.css`, bukan `tailwind.config.js`.
