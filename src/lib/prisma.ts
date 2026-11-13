import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Single PrismaClient per server process. In dev, Next.js hot reload would
 * otherwise open a new connection pool on every change.
 * Server-only: never import this from a 'use client' module.
 *
 * In dev, Turbopack can load @prisma/client twice (instrumentation bundle and
 * route bundle) while both share this global client. Consequences:
 * - never nest Prisma.sql / Prisma.join fragments in raw queries (they are
 *   sent as JSON parameters); write SQL inline with plain parameters;
 * - never test Prisma errors with `instanceof`; use isPrismaKnownError.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Duck-typed check: `instanceof` fails when the error comes from another copy of @prisma/client. */
export function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'PrismaClientKnownRequestError' && typeof (error as { code?: unknown }).code === 'string')
  );
}
