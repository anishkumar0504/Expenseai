export type PaymentMode = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'NETBANKING';

export type LendingType = 'GIVEN' | 'BORROWED' | 'EMI';
export type LendingStatus = 'PENDING' | 'PARTIAL' | 'SETTLED';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  monthlyBudget: number | null; // null means no limit / no disclosure
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  subcategoryId: string;
  categoryName?: string;
  subcategoryName?: string;
  categoryIcon?: string;
  amount: number;
  paymentMode: PaymentMode;
  date: string; // YYYY-MM-DD
  description?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Lending {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  type: LendingType;
  dueDate?: string | null; // YYYY-MM-DD
  status: LendingStatus;
  installmentNo?: number | null;
  totalInstallments?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  categoryId: string;
  subcategoryId: string;
  categoryName?: string;
  subcategoryName?: string;
  billingDay: number; // 1-31
  paymentMode: PaymentMode;
  status: SubscriptionStatus;
  startDate: string; // YYYY-MM-DD
  lastBilledDate?: string | null;
  nextBillingDate: string; // YYYY-MM-DD
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string | null;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  deadline?: string | null;
  status: GoalStatus;
  createdAt: string;
}

export interface ParsedExpenseCandidate {
  categoryId: string;
  subcategoryId: string;
  categoryName: string;
  subcategoryName: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  description: string;
  confidence: number; // 0 to 1
  tags: string[];
}

export interface ProposedAiAction {
  actionType:
    | 'ADD_EXPENSE'
    | 'REMOVE_EXPENSE'
    | 'ADD_SUBSCRIPTION'
    | 'REMOVE_SUBSCRIPTION'
    | 'ADD_GOAL'
    | 'REMOVE_GOAL'
    | 'ADD_TODO'
    | 'REMOVE_TODO'
    | 'ADD_LENDING'
    | 'REMOVE_LENDING';
  title: string;
  confirmationPrompt: string;
  targetId?: string;
  payload?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  parsedExpense?: ParsedExpenseCandidate;
  proposedAction?: ProposedAiAction;
  timestamp: string;
}

export interface SyncCheckResponse {
  lastModifiedAt: number;
}

export interface FullSyncResponse {
  user: User;
  categories: Category[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  lendings: Lending[];
  todos: Todo[];
  goals: Goal[];
  lastModifiedAt: number;
}

export interface AnalyticsSummary {
  range: 'weekly' | 'monthly' | 'yearly';
  totalSpend: number;
  avgPerDay: number;
  avgPerWeek: number;
  avgPerMonth: number;
  daysElapsed: number;
  categoryBreakdown: { name: string; amount: number; percentage: number; color: string }[];
  trendData: { period: string; amount: number }[];
  paymentModeBreakdown: { mode: PaymentMode; amount: number; count: number }[];
  topTags: { tag: string; amount: number; count: number }[];
  monthsAvailableCount: number;
}
