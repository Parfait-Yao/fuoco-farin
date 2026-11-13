import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/**
 * Domain errors. Route handlers throw them; `route()` turns them into the
 * standard JSON error body with the matching HTTP status.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'PAYMENT_ERROR'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  OUT_OF_STOCK: 409,
  PAYMENT_ERROR: 402,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 503,
  UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError('BAD_REQUEST', message, details);
export const unauthenticated = (message = msg().sessionExpired) => new AppError('UNAUTHENTICATED', message);
export const forbidden = (message = msg().forbidden) => new AppError('FORBIDDEN', message);
export const notFound = (message = msg().notFound) => new AppError('NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) => new AppError('CONFLICT', message, details);
export const outOfStock = (message: string, details?: unknown) => new AppError('OUT_OF_STOCK', message, details);
export const rateLimited = (message = msg().tooManyAttempts) => new AppError('RATE_LIMITED', message);
export const notConfigured = (message: string) => new AppError('NOT_CONFIGURED', message);
