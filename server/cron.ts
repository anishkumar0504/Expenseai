import { db } from './db.js';

/**
 * Calculates the next occurrence of `billingDay` strictly after or on `fromDate`.
 * Handles months with fewer days (e.g. billingDay=31 in Feb -> Feb 28/29, Apr -> Apr 30).
 */
export function calculateNextBillingDate(billingDay: number, fromDate: Date): string {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-11
  const todayDate = fromDate.getDate();

  let targetYear = year;
  let targetMonth = month;

  // If today's day of month is already past the billingDay, billing happens next month
  if (todayDate > billingDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  // Get last day of target month
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const actualDay = Math.min(billingDay, lastDayOfTargetMonth);

  const resultDate = new Date(targetYear, targetMonth, actualDay);
  const yyyy = resultDate.getFullYear();
  const mm = String(resultDate.getMonth() + 1).padStart(2, '0');
  const dd = String(resultDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Advance `currentBillingDateStr` by 1 month to calculate the subsequent next billing date.
 */
export function computeSubsequentBillingDate(billingDay: number, currentBillingDateStr: string): string {
  const parts = currentBillingDateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 0-indexed

  // Move to next month
  month += 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }

  const lastDayOfNextMonth = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(billingDay, lastDayOfNextMonth);

  const nextDate = new Date(year, month, actualDay);
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Daily subscription auto-billing worker.
 * Idempotent: safe to run multiple times per day.
 */
export function runAutoBillingJob(): { billedCount: number; details: string[] } {
  const todayStr = new Date().toISOString().split('T')[0];
  const activeSubs = db.getAllActiveSubscriptions();

  let billedCount = 0;
  const details: string[] = [];

  for (const sub of activeSubs) {
    // Check if next billing date has arrived or passed
    if (sub.nextBillingDate <= todayStr) {
      // Idempotency check: guard against double billing for the exact same billing date
      if (sub.lastBilledDate === sub.nextBillingDate) {
        continue;
      }

      // 1. Create auto-billed Transaction
      const createdTx = db.createTransaction({
        userId: sub.userId,
        categoryId: sub.categoryId,
        subcategoryId: sub.subcategoryId,
        amount: sub.amount,
        paymentMode: sub.paymentMode,
        date: sub.nextBillingDate,
        description: `Auto-billed: ${sub.name}`,
        tags: ['subscription', 'auto'],
      });

      // 2. Compute subsequent billing date
      const subsequentNextDate = computeSubsequentBillingDate(sub.billingDay, sub.nextBillingDate);

      // 3. Update subscription lastBilledDate & nextBillingDate
      db.updateSubscription(sub.id, sub.userId, {
        lastBilledDate: sub.nextBillingDate,
        nextBillingDate: subsequentNextDate,
      });

      billedCount++;
      details.push(`Billed $${sub.amount} for '${sub.name}' on ${sub.nextBillingDate}`);
    }
  }

  return { billedCount, details };
}

/**
 * Initializes auto-billing timer (runs once on server start and then every 6 hours).
 */
export function initAutoBillingCron() {
  // Run once immediately on start
  try {
    const res = runAutoBillingJob();
    if (res.billedCount > 0) {
      console.log(`[Auto-Billing Cron] Processed ${res.billedCount} subscriptions:`, res.details);
    }
  } catch (err) {
    console.error('[Auto-Billing Cron Error]', err);
  }

  // Schedule to run every 6 hours
  setInterval(() => {
    try {
      const res = runAutoBillingJob();
      if (res.billedCount > 0) {
        console.log(`[Auto-Billing Cron] Processed ${res.billedCount} subscriptions:`, res.details);
      }
    } catch (err) {
      console.error('[Auto-Billing Cron Error]', err);
    }
  }, 6 * 60 * 60 * 1000);
}
