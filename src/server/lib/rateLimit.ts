import 'server-only';
import { rateLimited } from '../http/errors';

/**
 * Fixed-window rate limiter kept in process memory.
 * Good for a single Node server. On serverless or several instances, replace
 * the store with a shared one (Redis / Upstash) behind the same function.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function hit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) sweep(now);
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfterMs: bucket.resetAt - now };
}

/** Throws RATE_LIMITED when the key exceeded `limit` hits in `windowMs`. */
export function assertRateLimit(key: string, limit: number, windowMs: number, message?: string) {
  if (!hit(key, limit, windowMs).allowed) throw rateLimited(message);
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

function sweep(now: number) {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}
