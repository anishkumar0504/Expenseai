import { PrismaClient } from '@prisma/client';
import {
  User,
  Category,
  Subcategory,
  Transaction,
  Lending,
  Subscription,
  Todo,
  Goal,
} from '../src/types.js';

const prisma = new PrismaClient();

// ---- small mapping helpers (Prisma Date <-> your ISO-string shape) ----
const iso = (d: Date) => d.toISOString();

function toUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    monthlyBudget: u.monthlyBudget ?? null,
    createdAt: iso(u.createdAt),
  };
}

function toTransaction(t: any): Transaction {
  return {
    id: t.id,
    userId: t.userId,
    categoryId: t.categoryId,
    subcategoryId: t.subcategoryId || '',
    categoryName: t.category?.name || 'Miscellaneous',
    subcategoryName: t.subcategory?.name || 'No specific subcategory',
    categoryIcon: t.category?.icon || 'Grid',
    amount: t.amount,
    paymentMode: t.paymentMode,
    date: t.date,
    description: t.description,
    tags: t.tags,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

function toLending(l: any): Lending {
  return {
    id: l.id,
    userId: l.userId,
    personName: l.personName,
    amount: l.amount,
    type: l.type,
    dueDate: l.dueDate,
    status: l.status,
    installmentNo: l.installmentNo,
    totalInstallments: l.totalInstallments,
    notes: l.notes,
    createdAt: iso(l.createdAt),
  };
}

function toSubscription(s: any): Subscription {
  return {
    id: s.id,
    userId: s.userId,
    name: s.name,
    amount: s.amount,
    categoryId: s.categoryId,
    subcategoryId: s.subcategoryId || '',
    categoryName: s.category?.name || 'Subscriptions',
    subcategoryName: s.subcategory?.name || 'No specific subcategory',
    billingDay: s.billingDay,
    paymentMode: s.paymentMode,
    status: s.status,
    startDate: s.startDate,
    lastBilledDate: s.lastBilledDate,
    nextBillingDate: s.nextBillingDate,
    notes: s.notes,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

function toTodo(t: any): Todo {
  return {
    id: t.id,
    userId: t.userId,
    date: t.date,
    title: t.title,
    description: t.description,
    isDone: t.isDone,
    createdAt: iso(t.createdAt),
    updatedAt: iso(t.updatedAt),
  };
}

function toGoal(g: any): Goal {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    targetValue: g.targetValue,
    currentValue: g.currentValue,
    deadline: g.deadline,
    status: g.status,
    createdAt: iso(g.createdAt),
  };
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

class Database {
  // ---------------- USERS ----------------
  async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(toUser);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const u = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return u ? toUser(u) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toUser(u) : null;
  }

  async createUser(user: User, passwordHash: string): Promise<User> {
    const created = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        monthlyBudget: user.monthlyBudget,
        passwordHash: passwordHash || null,
      },
    });
    return toUser(created);
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    return u?.passwordHash ?? null;
  }

  async updateUserBudget(userId: string, monthlyBudget: number | null): Promise<User | null> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { monthlyBudget },
    }).catch(() => null);
    return updated ? toUser(updated) : null;
  }

  /** Ensures the demo/guest user exists (call once on server boot, or lazily in auth middleware). */
  async ensureDemoUser(): Promise<User> {
    const existing = await this.findUserById('usr_demo');
    if (existing) return existing;
    return this.createUser(
      {
        id: 'usr_demo',
        name: 'Alex Morgan',
        email: 'alex@nexus.finance',
        monthlyBudget: 3500,
        createdAt: new Date().toISOString(),
      },
      ''
    );
  }

  // touchUser/getLastModifiedAt are now backed by User.lastModifiedAt (@updatedAt),
  // which bumps automatically on every write to that user's row via any relation update
  // that also updates the user, OR call this explicitly after writes that don't touch User directly.
  async touchUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastModifiedAt: new Date() },
    }).catch(() => {});
  }

  async getLastModifiedAt(userId: string): Promise<number> {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    return u ? u.lastModifiedAt.getTime() : Date.now();
  }

  // ---------------- CATEGORIES ----------------
  async getCategories(): Promise<Category[]> {
    const cats = await prisma.category.findMany({ include: { subcategories: true } });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      isDefault: c.isDefault,
      subcategories: c.subcategories.map((s) => ({ id: s.id, categoryId: s.categoryId, name: s.name })),
    }));
  }

  async findCategoryById(id: string): Promise<Category | null> {
    const c = await prisma.category.findUnique({ where: { id }, include: { subcategories: true } });
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      isDefault: c.isDefault,
      subcategories: c.subcategories.map((s) => ({ id: s.id, categoryId: s.categoryId, name: s.name })),
    };
  }

  async findSubcategoryById(id: string): Promise<Subcategory | null> {
    const s = await prisma.subcategory.findUnique({ where: { id } });
    return s ? { id: s.id, categoryId: s.categoryId, name: s.name } : null;
  }

  async createSubcategory(categoryId: string, name: string): Promise<Subcategory> {
    const trimmed = name.trim();
    const existing = await prisma.subcategory.findFirst({
      where: { categoryId, name: { equals: trimmed, mode: 'insensitive' } },
    });
    if (existing) {
      throw new Error(`Subcategory "${trimmed}" already exists under this category.`);
    }
    const created = await prisma.subcategory.create({
      data: { id: genId('sub'), categoryId, name: trimmed },
    });
    return { id: created.id, categoryId: created.categoryId, name: created.name };
  }

  async deleteSubcategory(categoryId: string, subcategoryId: string): Promise<boolean> {
    const result = await prisma.subcategory.deleteMany({
      where: { id: subcategoryId, categoryId },
    });
    return result.count > 0;
  }

  // ---------------- TRANSACTIONS ----------------
  async getTransactions(userId: string): Promise<Transaction[]> {
    const txs = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true, subcategory: true },
      orderBy: { date: 'desc' },
    });
    return txs.map(toTransaction);
  }

  async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const created = await prisma.transaction.create({
      data: {
        id: genId('tx'),
        userId: tx.userId,
        categoryId: tx.categoryId,
        subcategoryId: tx.subcategoryId || null,
        amount: tx.amount,
        paymentMode: tx.paymentMode as any,
        date: tx.date,
        description: tx.description ?? null,
        tags: tx.tags || [],
      },
      include: { category: true, subcategory: true },
    });
    return toTransaction(created);
  }

  async updateTransaction(id: string, userId: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const { categoryName, subcategoryName, categoryIcon, createdAt, updatedAt, id: _id, userId: _uid, ...rest } = updates as any;
    if (rest.subcategoryId === '') rest.subcategoryId = null;
    const result = await prisma.transaction.updateMany({ where: { id, userId }, data: rest });
    if (result.count === 0) return null;
    const updated = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });
    return updated ? toTransaction(updated) : null;
  }

  async deleteTransaction(id: string, userId: string): Promise<boolean> {
    const result = await prisma.transaction.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  // ---------------- LENDINGS ----------------
  async getLendings(userId: string): Promise<Lending[]> {
    const rows = await prisma.lending.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toLending);
  }

  async createLending(lending: Omit<Lending, 'id' | 'createdAt'>): Promise<Lending> {
    const created = await prisma.lending.create({
      data: {
        id: genId('lend'),
        userId: lending.userId,
        personName: lending.personName,
        amount: lending.amount,
        type: lending.type as any,
        dueDate: lending.dueDate ?? null,
        status: lending.status as any,
        installmentNo: lending.installmentNo ?? null,
        totalInstallments: lending.totalInstallments ?? null,
        notes: lending.notes ?? null,
      },
    });
    return toLending(created);
  }

  async updateLending(id: string, userId: string, updates: Partial<Lending>): Promise<Lending | null> {
    const { id: _id, userId: _uid, createdAt, ...rest } = updates as any;
    const result = await prisma.lending.updateMany({ where: { id, userId }, data: rest });
    if (result.count === 0) return null;
    const updated = await prisma.lending.findUnique({ where: { id } });
    return updated ? toLending(updated) : null;
  }

  async deleteLending(id: string, userId: string): Promise<boolean> {
    const result = await prisma.lending.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  // ---------------- SUBSCRIPTIONS ----------------
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { userId },
      include: { category: true, subcategory: true },
      orderBy: { nextBillingDate: 'asc' },
    });
    return rows.map(toSubscription);
  }

  async getAllActiveSubscriptions(): Promise<Subscription[]> {
    const rows = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { category: true, subcategory: true },
    });
    return rows.map(toSubscription);
  }

  async createSubscription(sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const created = await prisma.subscription.create({
      data: {
        id: genId('subscr'),
        userId: sub.userId,
        name: sub.name,
        amount: sub.amount,
        categoryId: sub.categoryId,
        subcategoryId: sub.subcategoryId || null,
        billingDay: sub.billingDay,
        paymentMode: sub.paymentMode as any,
        status: sub.status as any,
        startDate: sub.startDate,
        lastBilledDate: sub.lastBilledDate ?? null,
        nextBillingDate: sub.nextBillingDate,
        notes: sub.notes ?? null,
      },
      include: { category: true, subcategory: true },
    });
    return toSubscription(created);
  }

  async updateSubscription(id: string, userId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    const { categoryName, subcategoryName, id: _id, userId: _uid, createdAt, updatedAt, ...rest } = updates as any;
    if (rest.subcategoryId === '') rest.subcategoryId = null;
    const result = await prisma.subscription.updateMany({ where: { id, userId }, data: rest });
    if (result.count === 0) return null;
    const updated = await prisma.subscription.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    });
    return updated ? toSubscription(updated) : null;
  }

  async deleteSubscription(id: string, userId: string): Promise<boolean> {
    const result = await prisma.subscription.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  // ---------------- TODOS ----------------
  async getTodos(userId: string): Promise<Todo[]> {
    const rows = await prisma.todo.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toTodo);
  }

  async createTodo(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> {
    const created = await prisma.todo.create({
      data: {
        id: genId('todo'),
        userId: todo.userId,
        date: todo.date,
        title: todo.title,
        description: todo.description ?? null,
        isDone: todo.isDone,
      },
    });
    return toTodo(created);
  }

  async updateTodo(id: string, userId: string, updates: Partial<Todo>): Promise<Todo | null> {
    const { id: _id, userId: _uid, createdAt, ...rest } = updates as any;
    const result = await prisma.todo.updateMany({ where: { id, userId }, data: rest });
    if (result.count === 0) return null;
    const updated = await prisma.todo.findUnique({ where: { id } });
    return updated ? toTodo(updated) : null;
  }

  async deleteTodo(id: string, userId: string): Promise<boolean> {
    const result = await prisma.todo.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  // ---------------- GOALS ----------------
  async getGoals(userId: string): Promise<Goal[]> {
    const rows = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map(toGoal);
  }

  async createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const created = await prisma.goal.create({
      data: {
        id: genId('goal'),
        userId: goal.userId,
        title: goal.title,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        deadline: goal.deadline ?? null,
        status: goal.status as any,
      },
    });
    return toGoal(created);
  }

  async updateGoal(id: string, userId: string, updates: Partial<Goal>): Promise<Goal | null> {
    const { id: _id, userId: _uid, createdAt, ...rest } = updates as any;
    const result = await prisma.goal.updateMany({ where: { id, userId }, data: rest });
    if (result.count === 0) return null;
    const updated = await prisma.goal.findUnique({ where: { id } });
    return updated ? toGoal(updated) : null;
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const result = await prisma.goal.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }
}

export const db = new Database();