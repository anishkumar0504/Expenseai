/**
 * Run once: npx tsx scripts/migrate-json-to-supabase.ts
 * Copies everything from .data/db.json into Supabase via Prisma.
 * Requires: prisma migrate deploy (or migrate dev) already run, and
 * prisma/seed.ts already run so categories/subcategories exist.
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DB_FILE = path.join(process.cwd(), '.data', 'db.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No .data/db.json found — nothing to migrate.');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

  // 1. Users (parents first)
  for (const u of raw.users || []) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        monthlyBudget: u.monthlyBudget ?? null,
        passwordHash: raw.passwords?.[u.id] || null,
        createdAt: new Date(u.createdAt),
      },
    });
  }
  console.log(`Migrated ${raw.users?.length || 0} users.`);

  // 2. Categories & subcategories — skip if seed.ts already created the defaults;
  // this only adds any custom ones present in the JSON but missing in Postgres.
  for (const c of raw.categories || []) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, name: c.name, icon: c.icon, isDefault: c.isDefault ?? true },
    });
  }
  for (const s of raw.subcategories || []) {
    await prisma.subcategory.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, categoryId: s.categoryId, name: s.name },
    });
  }
  console.log(`Migrated ${raw.categories?.length || 0} categories, ${raw.subcategories?.length || 0} subcategories.`);

  // 3. Transactions
  for (const t of raw.transactions || []) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: t.userId,
        categoryId: t.categoryId,
        subcategoryId: t.subcategoryId || null,
        amount: t.amount,
        paymentMode: t.paymentMode,
        date: t.date,
        description: t.description ?? null,
        tags: t.tags || [],
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
  }
  console.log(`Migrated ${raw.transactions?.length || 0} transactions.`);

  // 4. Lendings
  for (const l of raw.lendings || []) {
    await prisma.lending.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        userId: l.userId,
        personName: l.personName,
        amount: l.amount,
        type: l.type,
        dueDate: l.dueDate ?? null,
        status: l.status,
        installmentNo: l.installmentNo ?? null,
        totalInstallments: l.totalInstallments ?? null,
        notes: l.notes ?? null,
        createdAt: new Date(l.createdAt),
      },
    });
  }
  console.log(`Migrated ${raw.lendings?.length || 0} lendings.`);

  // 5. Subscriptions
  for (const s of raw.subscriptions || []) {
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: s.userId,
        name: s.name,
        amount: s.amount,
        categoryId: s.categoryId,
        subcategoryId: s.subcategoryId || null,
        billingDay: s.billingDay,
        paymentMode: s.paymentMode,
        status: s.status,
        startDate: s.startDate,
        lastBilledDate: s.lastBilledDate ?? null,
        nextBillingDate: s.nextBillingDate,
        notes: s.notes ?? null,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log(`Migrated ${raw.subscriptions?.length || 0} subscriptions.`);

  // 6. Todos
  for (const t of raw.todos || []) {
    await prisma.todo.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        userId: t.userId,
        date: t.date,
        title: t.title,
        description: t.description ?? null,
        isDone: t.isDone,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
  }
  console.log(`Migrated ${raw.todos?.length || 0} todos.`);

  // 7. Goals
  for (const g of raw.goals || []) {
    await prisma.goal.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        userId: g.userId,
        title: g.title,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        deadline: g.deadline ?? null,
        status: g.status,
        createdAt: new Date(g.createdAt),
      },
    });
  }
  console.log(`Migrated ${raw.goals?.length || 0} goals.`);

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });