import { route, ok } from '@/server/http/route';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { jobs } from '@/server/jobs';
import { env } from '@/server/env';
import { forbidden, notConfigured } from '@/server/http/errors';

const JOBS = { 'stock-alerts': 'stockAlerts', 'expire-payments': 'expirePayments' } as const;

export const dynamic = 'force-dynamic';

/** GET /api/cron/:job — scheduled jobs. Requires `Authorization: Bearer CRON_SECRET`. */
export const GET = route<{ job: string }>(async (request, { params }) => {
  const secret = env().CRON_SECRET;
  if (!secret) throw notConfigured('CRON_SECRET manquant.');
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw forbidden();
  const job = JOBS[z.enum(['stock-alerts', 'expire-payments']).parse(params.job)];
  return ok(await jobs[job]());
});
