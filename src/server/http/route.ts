import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { isPrismaKnownError } from '@/lib/prisma';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { AppError } from './errors';
import { getLocale } from '@/i18n/server';
import { translateValidation } from '@/i18n/validation';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/**
 * Standard API envelope.
 *   success: { ok: true, data }
 *   failure: { ok: false, error: { code, message, details? } }
 */
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } };

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);

const fail = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json<ApiFailure>({ ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });

/** Next.js control-flow errors (dynamic rendering bailout, redirect, notFound) must propagate. */
function isNextInternal(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_') || digest === 'DYNAMIC_SERVER_USAGE');
}

/** Connection problems (unreachable server, pool timeout, closed connection): temporary, not a bug. */
function isDatabaseUnavailable(error: unknown) {
  const e = error as { name?: string; code?: string } | null;
  return e?.name === 'PrismaClientInitializationError' || ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(e?.code ?? '');
}

/** Maps any thrown value to a safe JSON error. Unknown errors never leak internals. */
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) return fail(error.status, error.code, error.message, error.details);
  if (error instanceof ZodError) {
    const locale = getLocale();
    const details = error.issues.map((i) => ({ path: i.path.join('.'), message: translateValidation(i.message, locale) }));
    return fail(422, 'VALIDATION_ERROR', details[0]?.message ?? msg().invalidData, details);
  }
  if (isPrismaKnownError(error)) {
    if (error.code === 'P2002') return fail(409, 'CONFLICT', msg().duplicateValue, { target: error.meta?.target });
    if (error.code === 'P2025') return fail(404, 'NOT_FOUND', msg().notFound);
    if (error.code === 'P2003') return fail(409, 'CONFLICT', msg().stillInUse);
  }
  if (isDatabaseUnavailable(error)) {
    console.error('[api] database unavailable', (error as Error).message.split('\n').filter(Boolean).pop());
    return fail(503, 'UNAVAILABLE', msg().databaseDown);
  }
  console.error('[api] unexpected error', error);
  return fail(500, 'INTERNAL_ERROR', msg().unexpected);
}

type Ctx<P> = { params: P };
type Handler<P> = (request: NextRequest, ctx: Ctx<P>) => Promise<Response> | Response;

/** Wraps a route handler with the global error handling. */
export function route<P = Record<string, string>>(handler: Handler<P>) {
  return async (request: NextRequest, ctx: Ctx<P>) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      if (isNextInternal(error)) throw error;
      return toErrorResponse(error);
    }
  };
}

/** Parses and validates a JSON body. Rejects bodies over 100 kB. */
export async function parseBody<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 100_000) throw new AppError('BAD_REQUEST', msg().bodyTooLarge);
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new AppError('BAD_REQUEST', msg().invalidJson);
  }
  return schema.parse(json);
}

/** Parses query-string parameters with a Zod schema. */
export function parseQuery<S extends ZodTypeAny>(request: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
}

/** Best-effort client IP for rate limiting. */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}
