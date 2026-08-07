import { create } from 'zustand';
import {
  User,
  Category,
  Transaction,
  Subscription,
  Lending,
  Todo,
  Goal,
  Subcategory,
  PaymentMode,
  ProposedAiAction,
} from '../types.js';
import { apiFetch } from '../lib/api.js';

const CACHE_KEY = 'pfinance_cache_v2';

interface CacheStructure {
  user: User | null;
  categories: Category[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  lendings: Lending[];
  todos: Todo[];
  goals: Goal[];
  lastSyncedAt: number;
}

interface FinanceState {
  user: User | null;
  categories: Category[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  lendings: Lending[];
  todos: Todo[];
  goals: Goal[];
  lastSyncedAt: number;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  resetStore: () => void;

  // Actions
  initialize: () => Promise<void>;
  syncWithServer: () => Promise<void>;

  // Category & Subcategory
  addSubcategory: (categoryId: string, name: string) => Promise<{ subcategory?: Subcategory; error?: string }>;
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<boolean>;

  // Expense / Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Subscriptions
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;

  // Lendings
  addLending: (lending: Omit<Lending, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateLending: (id: string, updates: Partial<Lending>) => Promise<void>;
  deleteLending: (id: string) => Promise<void>;
  payLendingInstallment: (id: string) => Promise<void>;

  // Todos
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => Promise<void>;
  toggleTodo: (id: string, isDone: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;

  // Goals
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // User
  updateUserBudget: (monthlyBudget: number | null) => Promise<void>;

  // AI Actions Execution
  executeAiAction: (action: ProposedAiAction) => Promise<{ success: boolean; message: string }>;
}

function loadCache(): CacheStructure | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: Partial<CacheStructure>) {
  try {
    const existing = loadCache() || {
      user: null,
      categories: [],
      transactions: [],
      subscriptions: [],
      lendings: [],
      todos: [],
      goals: [],
      lastSyncedAt: 0,
    };
    const updated = { ...existing, ...data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save finance cache', e);
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  user: null,
  categories: [],
  transactions: [],
  subscriptions: [],
  lendings: [],
  todos: [],
  goals: [],
  lastSyncedAt: 0,
  isLoading: true,
  isSyncing: false,
  error: null,

  initialize: async () => {
    // 1. Load local cache first for instant rendering
    const cached = loadCache();
    if (cached) {
      set({
        user: cached.user,
        categories: cached.categories || [],
        transactions: cached.transactions || [],
        subscriptions: cached.subscriptions || [],
        lendings: cached.lendings || [],
        todos: cached.todos || [],
        goals: cached.goals || [],
        lastSyncedAt: cached.lastSyncedAt || 0,
        isLoading: false,
      });
    }

    // 2. Perform background sync check with server
    await get().syncWithServer();
  },

  syncWithServer: async () => {
    set({ isSyncing: true });
    try {
      const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
      const headers = { Authorization: `Bearer ${token}` };

      // Step A: Check server last modified timestamp
      const checkRes = await apiFetch('/api/sync-check', { headers });
      if (checkRes.ok) {
        const { lastModifiedAt } = await checkRes.json();
        const currentLocal = get().lastSyncedAt;

        // If local cache is fresh and data exists, skip full sync!
        if (currentLocal && lastModifiedAt <= currentLocal && get().transactions.length > 0) {
          set({ isSyncing: false, isLoading: false });
          return;
        }
      }

      // Step B: Fetch full sync from server
      const fullRes = await apiFetch('/api/full-sync', { headers });
      if (fullRes.ok) {
        const data = await fullRes.json();
        const now = Date.now();
        set({
          user: data.user,
          categories: data.categories || [],
          transactions: data.transactions || [],
          subscriptions: data.subscriptions || [],
          lendings: data.lendings || [],
          todos: data.todos || [],
          goals: data.goals || [],
          lastSyncedAt: now,
          isLoading: false,
          isSyncing: false,
        });

        saveCache({
          user: data.user,
          categories: data.categories,
          transactions: data.transactions,
          subscriptions: data.subscriptions,
          lendings: data.lendings,
          todos: data.todos,
          goals: data.goals,
          lastSyncedAt: now,
        });
      } else {
        set({ isSyncing: false, isLoading: false });
      }
    } catch (err) {
      console.error('Sync error:', err);
      set({ isSyncing: false, isLoading: false });
    }
  },

  // Category & Subcategory
  addSubcategory: async (categoryId: string, name: string) => {
    try {
      const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
      const cat = get().categories.find((c) => c.id === categoryId);
      if (cat) {
        const isDuplicate = cat.subcategories.some(
          (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (isDuplicate) {
          return { error: `Subcategory "${name.trim()}" already exists in ${cat.name}!` };
        }
      }

      const res = await apiFetch(`/api/categories/${categoryId}/subcategories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        const newSub: Subcategory = await res.json();
        set((state) => {
          const updatedCats = state.categories.map((c) => {
            if (c.id === categoryId) {
              return {
                ...c,
                subcategories: [...c.subcategories, newSub],
              };
            }
            return c;
          });
          saveCache({ categories: updatedCats });
          return { categories: updatedCats };
        });
        return { subcategory: newSub };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { error: errData.error || 'Failed to add subcategory' };
      }
    } catch (err: any) {
      console.error('Failed to create subcategory', err);
      return { error: 'Network error creating subcategory' };
    }
  },

  deleteSubcategory: async (categoryId: string, subcategoryId: string) => {
    // Optimistically remove subcategory from state immediately
    set((state) => {
      const updatedCats = state.categories.map((c) => ({
        ...c,
        subcategories: c.subcategories.filter((s) => s.id !== subcategoryId),
      }));
      saveCache({ categories: updatedCats });
      return { categories: updatedCats };
    });

    try {
      const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
      const targetCatId = categoryId || 'cat_1';
      await apiFetch(`/api/categories/${targetCatId}/subcategories/${subcategoryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Failed to sync subcategory deletion to server', err);
    }
    return true;
  },

  // Expense / Transactions
  addTransaction: async (tx) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
    const tempId = `tx_temp_${Date.now()}`;
    const user = get().user;

    const cat = get().categories.find((c) => c.id === tx.categoryId);
    const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId);

    const optimisticTx: Transaction = {
      ...tx,
      id: tempId,
      userId: user?.id || 'usr_demo',
      categoryName: cat?.name || 'Miscellaneous',
      subcategoryName: sub?.name || 'No specific subcategory',
      categoryIcon: cat?.icon || 'Grid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistic Update
    set((state) => {
      const updated = [optimisticTx, ...state.transactions];
      saveCache({ transactions: updated, lastSyncedAt: Date.now() });
      return { transactions: updated, lastSyncedAt: Date.now() };
    });

    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tx),
      });
      if (res.ok) {
        const serverTx: Transaction = await res.json();
        set((state) => {
          const updated = state.transactions.map((t) => (t.id === tempId ? serverTx : t));
          saveCache({ transactions: updated });
          return { transactions: updated };
        });
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  },

  updateTransaction: async (id, updates) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveCache({ transactions: updated, lastSyncedAt: Date.now() });
      return { transactions: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating transaction:', err);
    }
  },

  deleteTransaction: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.transactions.filter((t) => t.id !== id);
      saveCache({ transactions: updated, lastSyncedAt: Date.now() });
      return { transactions: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  },

  // Subscriptions
  addSubscription: async (sub) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
    const user = get().user;
    const cat = get().categories.find((c) => c.id === sub.categoryId);
    const subCat = cat?.subcategories.find((s) => s.id === sub.subcategoryId);

    const tempId = `subscr_temp_${Date.now()}`;
    const optimisticSub: Subscription = {
      ...sub,
      id: tempId,
      userId: user?.id || 'usr_demo',
      categoryName: cat?.name || 'Subscriptions',
      subcategoryName: subCat?.name || 'No specific subcategory',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [optimisticSub, ...state.subscriptions];
      saveCache({ subscriptions: updated, lastSyncedAt: Date.now() });
      return { subscriptions: updated, lastSyncedAt: Date.now() };
    });

    try {
      const res = await apiFetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sub),
      });
      if (res.ok) {
        const serverSub: Subscription = await res.json();
        set((state) => {
          const updated = state.subscriptions.map((s) => (s.id === tempId ? serverSub : s));
          saveCache({ subscriptions: updated });
          return { subscriptions: updated };
        });
      }
    } catch (err) {
      console.error('Error adding subscription:', err);
    }
  },

  updateSubscription: async (id, updates) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveCache({ subscriptions: updated, lastSyncedAt: Date.now() });
      return { subscriptions: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/subscriptions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating subscription:', err);
    }
  },

  deleteSubscription: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.subscriptions.filter((s) => s.id !== id);
      saveCache({ subscriptions: updated, lastSyncedAt: Date.now() });
      return { subscriptions: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/subscriptions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error deleting subscription:', err);
    }
  },

  // Lendings
  addLending: async (lending) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
    const tempId = `lend_temp_${Date.now()}`;

    const optimisticLending: Lending = {
      ...lending,
      id: tempId,
      userId: get().user?.id || 'usr_demo',
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [optimisticLending, ...state.lendings];
      saveCache({ lendings: updated, lastSyncedAt: Date.now() });
      return { lendings: updated, lastSyncedAt: Date.now() };
    });

    try {
      const res = await apiFetch('/api/lendings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(lending),
      });
      if (res.ok) {
        const serverLending: Lending = await res.json();
        set((state) => {
          const updated = state.lendings.map((l) => (l.id === tempId ? serverLending : l));
          saveCache({ lendings: updated });
          return { lendings: updated };
        });
      }
    } catch (err) {
      console.error('Error adding lending:', err);
    }
  },

  updateLending: async (id, updates) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.lendings.map((l) => (l.id === id ? { ...l, ...updates } : l));
      saveCache({ lendings: updated, lastSyncedAt: Date.now() });
      return { lendings: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/lendings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating lending:', err);
    }
  },

  deleteLending: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.lendings.filter((l) => l.id !== id);
      saveCache({ lendings: updated, lastSyncedAt: Date.now() });
      return { lendings: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/lendings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error deleting lending:', err);
    }
  },

  payLendingInstallment: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.lendings.map((l) => {
        if (l.id === id) {
          const currentInst = l.installmentNo || 0;
          const totalInst = l.totalInstallments || 1;
          const newInst = currentInst + 1;
          const isSettled = newInst >= totalInst;
          return {
            ...l,
            installmentNo: newInst,
            status: isSettled ? ('SETTLED' as const) : ('PARTIAL' as const),
          };
        }
        return l;
      });
      saveCache({ lendings: updated, lastSyncedAt: Date.now() });
      return { lendings: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/lendings/${id}/installment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error paying installment:', err);
    }
  },

  // Todos
  addTodo: async (todo) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
    const tempId = `todo_temp_${Date.now()}`;

    const optimisticTodo: Todo = {
      ...todo,
      id: tempId,
      userId: get().user?.id || 'usr_demo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [optimisticTodo, ...state.todos];
      saveCache({ todos: updated, lastSyncedAt: Date.now() });
      return { todos: updated, lastSyncedAt: Date.now() };
    });

    try {
      const res = await apiFetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(todo),
      });
      if (res.ok) {
        const serverTodo: Todo = await res.json();
        set((state) => {
          const updated = state.todos.map((t) => (t.id === tempId ? serverTodo : t));
          saveCache({ todos: updated });
          return { todos: updated };
        });
      }
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  },

  toggleTodo: async (id, isDone) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.todos.map((t) => (t.id === id ? { ...t, isDone } : t));
      saveCache({ todos: updated, lastSyncedAt: Date.now() });
      return { todos: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDone }),
      });
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  },

  deleteTodo: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.todos.filter((t) => t.id !== id);
      saveCache({ todos: updated, lastSyncedAt: Date.now() });
      return { todos: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/todos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  },

  // Goals
  addGoal: async (goal) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';
    const tempId = `goal_temp_${Date.now()}`;

    const optimisticGoal: Goal = {
      ...goal,
      id: tempId,
      userId: get().user?.id || 'usr_demo',
      createdAt: new Date().toISOString(),
    };

    set((state) => {
      const updated = [optimisticGoal, ...state.goals];
      saveCache({ goals: updated, lastSyncedAt: Date.now() });
      return { goals: updated, lastSyncedAt: Date.now() };
    });

    try {
      const res = await apiFetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(goal),
      });
      if (res.ok) {
        const serverGoal: Goal = await res.json();
        set((state) => {
          const updated = state.goals.map((g) => (g.id === tempId ? serverGoal : g));
          saveCache({ goals: updated });
          return { goals: updated };
        });
      }
    } catch (err) {
      console.error('Error adding goal:', err);
    }
  },

  updateGoal: async (id, updates) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
      saveCache({ goals: updated, lastSyncedAt: Date.now() });
      return { goals: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  },

  deleteGoal: async (id) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updated = state.goals.filter((g) => g.id !== id);
      saveCache({ goals: updated, lastSyncedAt: Date.now() });
      return { goals: updated, lastSyncedAt: Date.now() };
    });

    try {
      await apiFetch(`/api/goals/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  },

  // User
  updateUserBudget: async (monthlyBudget) => {
    const token = localStorage.getItem('pfinance_token') || 'demo_guest_token';

    set((state) => {
      const updatedUser = state.user ? { ...state.user, monthlyBudget } : null;
      saveCache({ user: updatedUser });
      return { user: updatedUser };
    });

    try {
      await apiFetch('/api/auth/budget', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ monthlyBudget }),
      });
    } catch (err) {
      console.error('Error updating budget:', err);
    }
  },

  // AI Actions Execution
  executeAiAction: async (action: ProposedAiAction) => {
    try {
      switch (action.actionType) {
        case 'ADD_EXPENSE': {
          if (action.payload) {
            await get().addTransaction({
              categoryId: action.payload.categoryId,
              subcategoryId: action.payload.subcategoryId,
              amount: Number(action.payload.amount) || 0,
              paymentMode: (action.payload.paymentMode || 'UPI') as PaymentMode,
              date: action.payload.date || new Date().toISOString().split('T')[0],
              description: action.payload.description || action.title,
              tags: action.payload.tags || ['ai-added'],
            });
            return { success: true, message: `Successfully added expense of ₹${action.payload.amount} for ${action.payload.description || 'items'}.` };
          }
          break;
        }
        case 'REMOVE_EXPENSE': {
          if (action.targetId) {
            await get().deleteTransaction(action.targetId);
            return { success: true, message: 'Expense record successfully removed.' };
          }
          break;
        }
        case 'ADD_SUBSCRIPTION': {
          if (action.payload) {
            await get().addSubscription({
              name: action.payload.name || action.title,
              amount: Number(action.payload.amount) || 0,
              categoryId: action.payload.categoryId || get().categories[0]?.id || 'cat_1',
              subcategoryId: action.payload.subcategoryId || get().categories[0]?.subcategories[0]?.id || 'sub_1_1',
              billingDay: Number(action.payload.billingDay) || 1,
              paymentMode: (action.payload.paymentMode || 'CREDIT_CARD') as PaymentMode,
              status: 'ACTIVE',
              startDate: action.payload.startDate || new Date().toISOString().split('T')[0],
              nextBillingDate: action.payload.nextBillingDate || new Date().toISOString().split('T')[0],
              notes: action.payload.notes || 'Added via AI Assistant',
            });
            return { success: true, message: `Subscription ${action.payload.name} added.` };
          }
          break;
        }
        case 'REMOVE_SUBSCRIPTION': {
          if (action.targetId) {
            await get().deleteSubscription(action.targetId);
            return { success: true, message: 'Subscription successfully removed.' };
          }
          break;
        }
        case 'ADD_GOAL': {
          if (action.payload) {
            await get().addGoal({
              title: action.payload.title || action.title,
              targetValue: Number(action.payload.targetValue) || 1000,
              currentValue: Number(action.payload.currentValue) || 0,
              deadline: action.payload.deadline || null,
              status: 'ACTIVE',
            });
            return { success: true, message: `Goal "${action.payload.title}" created.` };
          }
          break;
        }
        case 'REMOVE_GOAL': {
          if (action.targetId) {
            await get().deleteGoal(action.targetId);
            return { success: true, message: 'Goal successfully removed.' };
          }
          break;
        }
        case 'ADD_TODO': {
          if (action.payload) {
            await get().addTodo({
              title: action.payload.title || action.title,
              description: action.payload.description || null,
              date: action.payload.date || new Date().toISOString().split('T')[0],
              isDone: false,
            });
            return { success: true, message: `Task "${action.payload.title}" added to todo list.` };
          }
          break;
        }
        case 'REMOVE_TODO': {
          if (action.targetId) {
            await get().deleteTodo(action.targetId);
            return { success: true, message: 'Task successfully removed.' };
          }
          break;
        }
        case 'ADD_LENDING': {
          if (action.payload) {
            await get().addLending({
              personName: action.payload.personName || action.title,
              amount: Number(action.payload.amount) || 0,
              type: action.payload.type || 'BORROWED',
              status: 'PENDING',
              notes: action.payload.notes || null,
            });
            return { success: true, message: `Lending/Debt record created for ${action.payload.personName}.` };
          }
          break;
        }
        case 'REMOVE_LENDING': {
          if (action.targetId) {
            await get().deleteLending(action.targetId);
            return { success: true, message: 'Lending/Debt record removed.' };
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error executing AI action:', err);
    }
    return { success: false, message: 'Failed to execute proposed action.' };
  },
    resetStore: () => {
    localStorage.removeItem(CACHE_KEY);
    set({
      user: null,
      categories: [],
      transactions: [],
      subscriptions: [],
      lendings: [],
      todos: [],
      goals: [],
      lastSyncedAt: 0,
      isLoading: false,
      isSyncing: false,
      error: null,
    });
  },

}));
