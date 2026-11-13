import 'server-only';
import { env } from '../env';
import { orderService } from '../services/orderService';
import { stockService } from '../services/stockService';

/*
 * Scheduled jobs. Two ways to run them:
 * - long-running Node server: node-cron in src/instrumentation.ts (ENABLE_CRON=true);
 * - serverless (Vercel): vercel.json crons call /api/cron/<job> with CRON_SECRET.
 * Each job is idempotent, so running it twice is harmless.
 */

export const jobs = {
  /** Every 15 min: email and notify admins about ingredients at or below threshold (once per crossing). */
  async stockAlerts() {
    const alerts = await stockService.checkLowStock();
    return { alerts };
  },

  /** Every 5 min: cancel online orders left unpaid and release their stock. */
  async expirePayments() {
    const expired = await orderService.expireUnpaid(env().PAYMENT_TIMEOUT_MINUTES);
    return { expired };
  },
};

export type JobName = keyof typeof jobs;
