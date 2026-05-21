/**
 * Standalone admin seed — safe to run against production.
 * Does NOT touch any other tables (no question/topic/exam wipes).
 *
 * Usage:
 *   ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD=secret pnpm seed:admin
 *
 * Defaults to admin@onemark.app / admin123 if env vars are not set.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const email    = process.env.ADMIN_SEED_EMAIL    ?? 'admin@onemark.app';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'admin123';
  const name     = process.env.ADMIN_SEED_NAME     ?? 'Admin';

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where:  { email },
    create: { email, name, password: hashed },
    update: { name, password: hashed, isActive: true },
  });

  console.log(`✓ Admin ready: ${admin.email} (id: ${admin.id})`);
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.log('  ⚠️  Using default password "admin123" — set ADMIN_SEED_PASSWORD to override.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
