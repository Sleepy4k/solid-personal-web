import { hashPassword } from "~/lib/shared/hashing";
import { db } from "~/server/db/client";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@portfolio.local";
  const rawPassword = process.env.ADMIN_PASSWORD ?? "changeme123";

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin sudah ada: ${email}`);
    return;
  }

  const password = await hashPassword(rawPassword);
  await db.user.create({ data: { email, password } });
  console.log(`✓ Admin dibuat: ${email}`);
  console.log(`  Password: ${rawPassword}`);
  console.log(`  Segera ubah password di produksi!`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
