import 'server-only';
import { cache } from 'react';
import type { User as DbUser } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { AppError, forbidden, unauthenticated } from '../http/errors';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

export type SessionUser = DbUser;

/**
 * Resolves the current user from the Supabase session cookie, then loads the
 * profile from the database. The database row is the source of truth for the
 * role and the account status; JWT claims are never trusted alone.
 * Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  // A network failure to Supabase Auth is not a sign-out: answer 503 so the
  // browser keeps the session and retries, instead of logging the user out.
  if (error && isAuthRetryableFetchError(error)) throw new AppError('UNAVAILABLE', msg().authUnavailable);
  if (!user) return null;

  let profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile && user.email) {
    // Safety net when the auth trigger is missing (e.g. migration not applied yet).
    profile = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email.toLowerCase(),
        firstName: String(user.user_metadata?.first_name ?? '').slice(0, 80),
        lastName: String(user.user_metadata?.last_name ?? '').slice(0, 80),
        phone: String(user.user_metadata?.phone ?? '').slice(0, 30),
        emailVerifiedAt: user.email_confirmed_at ? new Date(user.email_confirmed_at) : null,
      },
    });
  }
  if (!profile || profile.deletedAt) return null;
  return profile;
});

/** Any signed-in, active account. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw unauthenticated();
  if (user.status === 'BLOCKED') throw forbidden(msg().accountSuspended);
  return user;
}

/** Signed-in client account (role CLIENT). */
export async function requireClient(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'CLIENT') throw forbidden(msg().clientsOnly);
  return user;
}

/** Signed-in administrator (role ADMIN in the database). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw forbidden(msg().adminsOnly);
  return user;
}
