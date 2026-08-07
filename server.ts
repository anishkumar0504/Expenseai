import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { calculateNextBillingDate, runAutoBillingJob, initAutoBillingCron } from './server/cron.js';
import { parseExpenseWithGemini, answerExpenseQueryWithGemini } from './server/gemini.js';
import { generateCsrfStateToken, verifyGoogleIdToken } from './server/googleAuth.js';
import { User, PaymentMode, LendingStatus } from './src/types.js';
import cors from 'cors';

const JWT_SECRET = process.env.JWT_SECRET || 'personal_finance_app_jwt_secret_key_2026';
const PORT = process.env.PORT || 3000;

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

// Wraps an async route handler so a rejected promise reaches Express's error
// handling instead of hanging the request. Express 4 does not do this for you.
function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// JWT Auth Middleware - Strictly protects user routes
const authenticateToken = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Unauthorized access. Please log in.' });
    return;
  }

  // Handle guest demo token if explicitly used
  if (token === 'demo_guest_token') {
    const demoUser = await db.ensureDemoUser();
    req.userId = demoUser.id;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'User session expired or invalid.' });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

    app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin, mobile apps, curl (no origin header)
    if (!origin) return callback(null, true);
    
    const allowed = [
      'https://expenseai-e3sq.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

 app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });  // ---------------- AUTH ROUTES ----------------
  app.post('/api/auth/signup', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters long' });
        return;
      }

      const existingUser = await db.findUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        monthlyBudget: null,
        createdAt: new Date().toISOString(),
      };

      await db.createUser(newUser, passwordHash);
      const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

      res.status(201).json({ user: newUser, token });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }));

  app.post('/api/auth/login', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await db.findUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const passwordHash = await db.getPasswordHash(user.id);
      const isMatch = await bcrypt.compare(password, passwordHash || '');

      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });

      res.json({ user, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }));

  // Endpoint to issue anti-CSRF state token for Google OAuth flow
  app.get('/api/auth/google/csrf-token', (req: Request, res: Response) => {
    const stateToken = generateCsrfStateToken();
    res.json({ stateToken });
  });

  // Secure Google OAuth Login / Signup Endpoint
  app.post('/api/auth/google', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { credential, stateToken, email: rawEmail, name: rawName } = req.body;

      // Perform strict Google Token Verification (Audience, Issuer, Expiry, CSRF State)
      const verifiedGoogleUser = await verifyGoogleIdToken(
        credential,
        stateToken,
        rawEmail,
        rawName
      );

      const cleanEmail = verifiedGoogleUser.email.toLowerCase().trim();
      let user = await db.findUserByEmail(cleanEmail);

      if (!user) {
        // Auto-register Google user
        user = {
          id: `usr_g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: verifiedGoogleUser.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          monthlyBudget: 5000,
          createdAt: new Date().toISOString(),
        };
        await db.createUser(user, '');
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ user, token });
    } catch (err: any) {
      console.error('Google Auth Security Check Failed:', err.message);
      res.status(401).json({ error: err.message || 'Google Sign-In failed security validation.' });
    }
  }));

  app.get('/api/auth/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await db.findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  }));

  app.patch('/api/auth/budget', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { monthlyBudget } = req.body;
    // monthlyBudget can be a positive number or null
    const budgetVal = monthlyBudget === null || monthlyBudget === '' || isNaN(Number(monthlyBudget))
      ? null
      : Math.max(0, Number(monthlyBudget));

    const updatedUser = await db.updateUserBudget(req.userId!, budgetVal);
    res.json({ user: updatedUser });
  }));

  // ---------------- SYNC & DATA ----------------
  app.get('/api/sync-check', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json({ lastModifiedAt: await db.getLastModifiedAt(req.userId!) });
  }));

  app.get('/api/full-sync', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId!;
    const users = await db.getUsers();
    const user = (await db.findUserById(userId)) || users[0];

    const [categories, transactions, subscriptions, lendings, todos, goals, lastModifiedAt] = await Promise.all([
      db.getCategories(),
      db.getTransactions(userId),
      db.getSubscriptions(userId),
      db.getLendings(userId),
      db.getTodos(userId),
      db.getGoals(userId),
      db.getLastModifiedAt(userId),
    ]);

    res.json({ user, categories, transactions, subscriptions, lendings, todos, goals, lastModifiedAt });
  }));

  // ---------------- CATEGORIES & SUBCATEGORIES ----------------
  app.get('/api/categories', asyncHandler(async (req: Request, res: Response) => {
    res.json(await db.getCategories());
  }));

  app.post('/api/categories/:categoryId/subcategories', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Subcategory name is required' });
        return;
      }
      const newSub = await db.createSubcategory(categoryId, name.trim());
      await db.touchUser(req.userId!);
      res.status(201).json(newSub);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create subcategory' });
    }
  }));

  app.delete('/api/categories/:categoryId/subcategories/:subcategoryId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId, subcategoryId } = req.params;
      const deleted = await db.deleteSubcategory(categoryId, subcategoryId);
      if (!deleted) {
        res.status(404).json({ error: 'Subcategory not found' });
        return;
      }
      await db.touchUser(req.userId!);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete subcategory' });
    }
  }));

  // ---------------- TRANSACTIONS / EXPENSES ----------------
  app.get(['/api/transactions', '/api/expenses'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transactions = await db.getTransactions(req.userId!);
    res.json(transactions);
  }));

  app.post(['/api/transactions', '/api/expenses'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { categoryId, subcategoryId, amount, paymentMode, date, description, tags } = req.body;

      if (!categoryId || !amount || isNaN(Number(amount))) {
        res.status(400).json({ error: 'Category and valid amount are required' });
        return;
      }

      const newTx = await db.createTransaction({
        userId: req.userId!,
        categoryId,
        subcategoryId: subcategoryId || '',
        amount: Number(amount),
        paymentMode: paymentMode || 'UPI',
        date: date || new Date().toISOString().split('T')[0],
        description: description || null,
        tags: Array.isArray(tags) ? tags : [],
      });

      res.status(201).json(newTx);
    } catch (err) {
      console.error('Create transaction error:', err);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  }));

  app.put(['/api/transactions/:id', '/api/expenses/:id'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updated = await db.updateTransaction(id, req.userId!, req.body);

    if (!updated) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json(updated);
  }));

  app.delete(['/api/transactions/:id', '/api/expenses/:id'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const deleted = await db.deleteTransaction(id, req.userId!);

    if (!deleted) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json({ success: true });
  }));

  app.post(['/api/transactions/batch', '/api/expenses/batch'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rows } = req.body; // array of valid row objects from Excel import
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ error: 'No valid rows provided' });
        return;
      }

      const createdList = [];
      for (const row of rows) {
        const tx = await db.createTransaction({
          userId: req.userId!,
          categoryId: row.categoryId,
          subcategoryId: row.subcategoryId,
          amount: Number(row.amount),
          paymentMode: row.paymentMode || 'UPI',
          date: row.date || new Date().toISOString().split('T')[0],
          description: row.description || null,
          tags: Array.isArray(row.tags) ? row.tags : [],
        });
        createdList.push(tx);
      }

      res.status(201).json({ createdCount: createdList.length, transactions: createdList });
    } catch (err) {
      console.error('Batch import error:', err);
      res.status(500).json({ error: 'Failed to import transactions' });
    }
  }));

  // ---------------- LENDINGS / EMI ----------------
  app.get('/api/lendings', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(await db.getLendings(req.userId!));
  }));

  app.post('/api/lendings', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { personName, amount, type, dueDate, status, installmentNo, totalInstallments, notes } = req.body;

      if (!personName || !amount || !type) {
        res.status(400).json({ error: 'Person name, amount, and type are required' });
        return;
      }

      const newLending = await db.createLending({
        userId: req.userId!,
        personName,
        amount: Number(amount),
        type,
        dueDate: dueDate || null,
        status: status || 'PENDING',
        installmentNo: installmentNo ? Number(installmentNo) : type === 'EMI' ? 0 : null,
        totalInstallments: totalInstallments ? Number(totalInstallments) : null,
        notes: notes || null,
      });

      res.status(201).json(newLending);
    } catch (err) {
      console.error('Create lending error:', err);
      res.status(500).json({ error: 'Failed to create lending record' });
    }
  }));

  app.put('/api/lendings/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.updateLending(req.params.id, req.userId!, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Lending record not found' });
      return;
    }
    res.json(updated);
  }));

  app.post(['/api/lendings/:id/installment', '/api/lendings/:id/pay-installment'], authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const lendings = await db.getLendings(req.userId!);
      const lending = lendings.find((l) => l.id === req.params.id);

      if (!lending) {
        res.status(404).json({ error: 'Lending record not found' });
        return;
      }

      // 1. Find "Loans & Lending" category
      const categories = await db.getCategories();
      const loanCat = categories.find((c) => c.name === 'Loans & Lending') || categories[0];
      const loanSub = loanCat.subcategories[0] || { id: '', name: '' };

      const installmentAmount =
        lending.type === 'EMI' && lending.totalInstallments && lending.totalInstallments > 0
          ? Number((lending.amount / lending.totalInstallments).toFixed(2))
          : lending.amount;

      const currentNo = (lending.installmentNo || 0) + 1;
      const totalNo = lending.totalInstallments || 1;

      const newTx = await db.createTransaction({
        userId: req.userId!,
        categoryId: loanCat.id,
        subcategoryId: loanSub.id,
        amount: installmentAmount,
        paymentMode: 'UPI',
        date: new Date().toISOString().split('T')[0],
        description: `Installment ${currentNo}/${totalNo} paid for ${lending.personName} (${lending.type})`,
        tags: ['lending', 'emi'],
      });

      const isCompleted = currentNo >= totalNo;
      const updatedLending = await db.updateLending(lending.id, req.userId!, {
        installmentNo: currentNo,
        status: isCompleted ? 'SETTLED' : 'PARTIAL',
      });

      await db.touchUser(req.userId!);
      res.json({ lending: updatedLending, transaction: newTx });
    } catch (err) {
      console.error('Pay installment error:', err);
      res.status(500).json({ error: 'Failed to record installment payment' });
    }
  }));

  app.delete('/api/lendings/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.deleteLending(req.params.id, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Lending record not found' });
      return;
    }
    await db.touchUser(req.userId!);
    res.json({ success: true });
  }));

  // ---------------- SUBSCRIPTIONS ----------------
  app.get('/api/subscriptions', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(await db.getSubscriptions(req.userId!));
  }));

  app.post('/api/subscriptions', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, amount, categoryId, subcategoryId, billingDay, paymentMode, startDate, notes } = req.body;

      if (!name || !amount || !billingDay || !startDate) {
        res.status(400).json({ error: 'Name, amount, billing day, and start date are required' });
        return;
      }

      // Fallback category to Subscriptions if omitted
      const categories = await db.getCategories();
      const subCategoryDefault = categories.find((c) => c.name === 'Subscriptions') || categories[0];
      const catId = categoryId || subCategoryDefault.id;
      const subCatId = subcategoryId || subCategoryDefault.subcategories[0]?.id || '';

      const bDay = Math.max(1, Math.min(31, Number(billingDay)));
      const startDt = new Date(startDate);
      const initialNextBillingDate = calculateNextBillingDate(bDay, startDt);

      const newSub = await db.createSubscription({
        userId: req.userId!,
        name,
        amount: Number(amount),
        categoryId: catId,
        subcategoryId: subCatId,
        billingDay: bDay,
        paymentMode: paymentMode || 'UPI',
        status: 'ACTIVE',
        startDate,
        lastBilledDate: null,
        nextBillingDate: initialNextBillingDate,
        notes: notes || null,
      });

      res.status(201).json(newSub);
    } catch (err) {
      console.error('Create subscription error:', err);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }));

  app.put('/api/subscriptions/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.updateSubscription(req.params.id, req.userId!, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    await db.touchUser(req.userId!);
    res.json(updated);
  }));

  app.delete('/api/subscriptions/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.deleteSubscription(req.params.id, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    await db.touchUser(req.userId!);
    res.json({ success: true });
  }));

  // ---------------- TODOS & GOALS (INDEPENDENT MODULE) ----------------
  app.get('/api/todos', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(await db.getTodos(req.userId!));
  }));

  app.post('/api/todos', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, date } = req.body;
      if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      const newTodo = await db.createTodo({
        userId: req.userId!,
        title,
        description: description || null,
        date: date || new Date().toISOString().split('T')[0],
        isDone: false,
      });

      res.status(201).json(newTodo);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create todo' });
    }
  }));

  app.patch('/api/todos/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.updateTodo(req.params.id, req.userId!, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(updated);
  }));

  app.delete('/api/todos/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.deleteTodo(req.params.id, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json({ success: true });
  }));

  // Goals
  app.get('/api/goals', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    res.json(await db.getGoals(req.userId!));
  }));

  app.post('/api/goals', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, targetValue, currentValue, deadline } = req.body;
      if (!title || !targetValue) {
        res.status(400).json({ error: 'Title and target value are required' });
        return;
      }

      const newGoal = await db.createGoal({
        userId: req.userId!,
        title,
        targetValue: Number(targetValue),
        currentValue: currentValue ? Number(currentValue) : 0,
        deadline: deadline || null,
        status: 'ACTIVE',
      });

      res.status(201).json(newGoal);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create goal' });
    }
  }));

  app.put('/api/goals/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.updateGoal(req.params.id, req.userId!, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json(updated);
  }));

  app.delete('/api/goals/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.deleteGoal(req.params.id, req.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }
    res.json({ success: true });
  }));

  // ---------------- ANALYTICS ----------------
  app.get('/api/analytics', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const range = (req.query.range as 'weekly' | 'monthly' | 'yearly') || 'monthly';
    const transactions = await db.getTransactions(req.userId!);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filter transactions based on range
    let filteredTxs = [...transactions];
    let daysElapsed = 1;

    if (range === 'weekly') {
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Monday=1, Sunday=7
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);

      const mondayStr = monday.toISOString().split('T')[0];
      filteredTxs = transactions.filter((t) => t.date >= mondayStr && t.date <= todayStr);
      daysElapsed = dayOfWeek;
    } else if (range === 'monthly') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      filteredTxs = transactions.filter((t) => t.date >= firstDayOfMonth && t.date <= todayStr);
      daysElapsed = now.getDate();
    } else if (range === 'yearly') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      filteredTxs = transactions.filter((t) => t.date >= firstDayOfYear && t.date <= todayStr);

      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffMs = now.getTime() - startOfYear.getTime();
      daysElapsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    // Count available distinct months across all transactions to see if Yearly view should unlock (requires >= 12 months)
    const monthSet = new Set(transactions.map((t) => t.date.slice(0, 7)));
    const monthsAvailableCount = monthSet.size;

    const totalSpend = filteredTxs.reduce((sum, t) => sum + t.amount, 0);

    const avgPerDay = totalSpend / Math.max(1, daysElapsed);
    const weeksElapsed = Math.max(1, daysElapsed / 7);
    const avgPerWeek = totalSpend / weeksElapsed;
    const monthsElapsed = Math.max(1, daysElapsed / 30);
    const avgPerMonth = totalSpend / monthsElapsed;

    // Category breakdown
    const catMap: Record<string, number> = {};
    filteredTxs.forEach((t) => {
      const name = t.categoryName || 'Other';
      catMap[name] = (catMap[name] || 0) + t.amount;
    });

    const categoryColors = [
      '#8b5cf6', '#06b6d4', '#f43f5e', '#f59e0b', '#10b981',
      '#ec4899', '#6366f1', '#3b82f6', '#14b8a6', '#84cc16'
    ];

    const categoryBreakdown = Object.entries(catMap)
      .map(([name, amount], i) => ({
        name,
        amount,
        percentage: totalSpend > 0 ? Number(((amount / totalSpend) * 100).toFixed(1)) : 0,
        color: categoryColors[i % categoryColors.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    // Trend Data
    const trendMap: Record<string, number> = {};
    if (range === 'weekly') {
      // Daily points for the week
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      for (let i = 1; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (dayOfWeek - i));
        const dateStr = d.toISOString().split('T')[0];
        trendMap[dayNames[i - 1]] = 0;

        filteredTxs.forEach((t) => {
          if (t.date === dateStr) {
            trendMap[dayNames[i - 1]] += t.amount;
          }
        });
      }
    } else if (range === 'monthly') {
      // Weekly points for the month (W1, W2, W3, W4)
      for (let w = 1; w <= 4; w++) {
        trendMap[`Week ${w}`] = 0;
      }
      filteredTxs.forEach((t) => {
        const dayNum = parseInt(t.date.split('-')[2], 10);
        const wIdx = Math.min(4, Math.ceil(dayNum / 7));
        trendMap[`Week ${wIdx}`] += t.amount;
      });
    } else {
      // Monthly points for the year
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthNames.forEach((m) => (trendMap[m] = 0));
      filteredTxs.forEach((t) => {
        const mIdx = parseInt(t.date.split('-')[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          trendMap[monthNames[mIdx]] += t.amount;
        }
      });
    }

    const trendData = Object.entries(trendMap).map(([period, amount]) => ({
      period,
      amount,
    }));

    // Payment mode breakdown
    const pmMap: Record<string, { amount: number; count: number }> = {};
    filteredTxs.forEach((t) => {
      const mode = t.paymentMode || 'UPI';
      if (!pmMap[mode]) pmMap[mode] = { amount: 0, count: 0 };
      pmMap[mode].amount += t.amount;
      pmMap[mode].count += 1;
    });

    const paymentModeBreakdown = Object.entries(pmMap).map(([mode, data]) => ({
      mode: mode as PaymentMode,
      amount: data.amount,
      count: data.count,
    }));

    // Top tags
    const tagMap: Record<string, { amount: number; count: number }> = {};
    filteredTxs.forEach((t) => {
      t.tags.forEach((tag) => {
        const cleanTag = tag.toLowerCase().trim();
        if (cleanTag) {
          if (!tagMap[cleanTag]) tagMap[cleanTag] = { amount: 0, count: 0 };
          tagMap[cleanTag].amount += t.amount;
          tagMap[cleanTag].count += 1;
        }
      });
    });

    const topTags = Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    res.json({
      range,
      totalSpend,
      avgPerDay: Number(avgPerDay.toFixed(2)),
      avgPerWeek: Number(avgPerWeek.toFixed(2)),
      avgPerMonth: Number(avgPerMonth.toFixed(2)),
      daysElapsed,
      categoryBreakdown,
      trendData,
      paymentModeBreakdown,
      topTags,
      monthsAvailableCount,
    });
  }));

  // ---------------- GEMINI CHATBOT ----------------
  app.post('/api/gemini/parse-expense', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ error: 'Text prompt required' });
        return;
      }

      const parsed = await parseExpenseWithGemini(text);
      res.json({ parsedExpense: parsed });
    } catch (err) {
      console.error('Parse expense error:', err);
      res.status(500).json({ error: 'Failed to parse expense' });
    }
  }));

  app.post('/api/gemini/chat-qa', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
    const { question, history } = req.body;   
      if (!question) {
        res.status(400).json({ error: 'Question prompt required' });
        return;
      }

const result = await answerExpenseQueryWithGemini(req.userId!, question, history);
      res.json({ answer: result.text, proposedAction: result.proposedAction });
    } catch (err) {
      console.error('Chat Q&A error:', err);
      res.status(500).json({ error: 'Failed to answer financial question' });
    }
  }));

  // Manual cron trigger endpoint
  app.post('/api/cron/trigger-autobill', asyncHandler(async (req: Request, res: Response) => {
    const result = await runAutoBillingJob();
    res.json(result);
  }));

  // ---------------- VITE / STATIC SERVING ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Catch-all error handler for anything asyncHandler forwarded via next(err)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled route error:', err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

 app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}

startServer();