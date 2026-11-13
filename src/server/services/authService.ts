import 'server-only';
import { cookies } from 'next/headers';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createClient, REMEMBER_COOKIE } from '@/utils/supabase/server';
import { hasSupabaseAdmin, supabaseAdmin } from '@/utils/supabase/admin';
import { AppError, badRequest, conflict, forbidden, unauthenticated } from '../http/errors';
import { assertRateLimit, resetRateLimit } from '../lib/rateLimit';
import { env } from '../env';
import { getSessionUser, type SessionUser } from '../auth/session';
import type { loginSchema, registerSchema } from '../validations/auth';
import { userService } from './userService';
import { storageService } from './storageService';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

/*
 * Authentication runs on the server only: the browser never talks to
 * Supabase Auth directly. Sessions live in HttpOnly cookies set here.
 * Supabase hashes passwords (bcrypt), signs the JWT (1 h) and rotates the
 * refresh token; the middleware refreshes it on each request.
 */

/** Translates the Supabase errors users actually hit into French messages. */
function translate(message: string, fallback: string): AppError {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return badRequest(fallback);
  if (m.includes('email not confirmed')) return new AppError('FORBIDDEN', msg().emailNotConfirmed, { reason: 'EMAIL_NOT_CONFIRMED' });
  if (m.includes('already registered')) return conflict(msg().accountExists);
  if (m.includes('banned')) return forbidden(msg().accountSuspended);
  if (m.includes('expired') || m.includes('invalid')) return badRequest(msg().codeExpired);
  if (m.includes('rate limit') || m.includes('security purposes')) return new AppError('RATE_LIMITED', msg().tooManyAttemptsShort);
  if (m.includes('should be different')) return badRequest(msg().passwordMustDiffer);
  if (m.includes('password')) return badRequest(msg().passwordTooWeak);
  return badRequest(fallback);
}

const site = () => env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

function setRememberCookie(remember: boolean) {
  cookies().set(REMEMBER_COOKIE, remember ? '1' : '0', {
    httpOnly: true,
    secure: env().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export const authService = {
  /**
   * Password login for one space (client or admin). Rate limited per IP and
   * per email. The role comes from the database; an account never logs into
   * the other space.
   */
  async login(input: z.infer<typeof loginSchema>, ip: string) {
    const fallback = input.space === 'admin' ? msg().invalidAdminCredentials : msg().invalidCredentials;
    assertRateLimit(`login:ip:${ip}`, 20, 15 * 60_000);
    assertRateLimit(`login:email:${input.email}`, 5, 15 * 60_000, msg().tooManyAccountAttempts);

    setRememberCookie(input.remember);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data.user) throw translate(error?.message ?? '', fallback);

    const profile = await prisma.user.findUnique({ where: { id: data.user.id } });
    const role = profile?.role === 'ADMIN' ? 'admin' : 'client';
    if (!profile || profile.deletedAt || role !== input.space) {
      await supabase.auth.signOut();
      // Same message as a wrong password: never reveal that an admin account exists.
      throw badRequest(fallback);
    }
    if (profile.status === 'BLOCKED') {
      await supabase.auth.signOut();
      throw forbidden(msg().accountSuspended);
    }
    resetRateLimit(`login:email:${input.email}`);
    await prisma.user.update({ where: { id: profile.id }, data: { lastLoginAt: new Date() } });
    return userService.me(profile);
  },

  /** Public sign-up: always a CLIENT (the database trigger ignores any role in metadata). */
  async register(input: z.infer<typeof registerSchema>, ip: string) {
    assertRateLimit(`register:ip:${ip}`, 5, 60 * 60_000);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { first_name: input.firstName, last_name: input.lastName, phone: input.phone },
        emailRedirectTo: `${site()}/auth/callback?next=/account`,
      },
    });
    if (error) throw translate(error.message, msg().registerFailed);
    // With email confirmation on, an existing address returns a user with no identities.
    if (!data.user || data.user.identities?.length === 0) throw conflict(msg().accountExists);
    return { email: input.email, needsVerification: !data.session };
  },

  async logout() {
    await createClient().auth.signOut();
    cookies().delete(REMEMBER_COOKIE);
  },

  async verifyEmail(email: string, code: string, ip: string) {
    assertRateLimit(`verify:${ip}:${email}`, 10, 15 * 60_000);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.user) throw translate(error?.message ?? 'invalid', msg().wrongCode);
    const user = await getSessionUserFresh(data.user.id);
    return user ? userService.me(user) : null;
  },

  async resendVerification(email: string, ip: string) {
    assertRateLimit(`resend:${ip}`, 5, 15 * 60_000);
    const { error } = await createClient().auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${site()}/auth/callback?next=/account` } });
    if (error) throw translate(error.message, msg().sendFailed);
  },

  /** Always answers OK so the endpoint does not reveal which emails exist. */
  async requestPasswordReset(email: string, ip: string) {
    assertRateLimit(`reset:${ip}`, 5, 15 * 60_000);
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${site()}/auth/callback?next=/reset-password` });
    if (error && /rate limit|security purposes/i.test(error.message)) throw translate(error.message, '');
  },

  /** Runs after /auth/callback exchanged the email link for a recovery session. */
  async resetPassword(password: string) {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw unauthenticated(msg().resetLinkExpired);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw translate(error.message, msg().updateFailed);
    // Log in again with the new password everywhere.
    await supabase.auth.signOut({ scope: 'global' });
  },

  async changePassword(user: SessionUser, current: string, next: string, ip: string) {
    assertRateLimit(`password:${user.id}:${ip}`, 5, 15 * 60_000);
    const supabase = createClient();
    // Supabase does not check the old password: re-authenticate first.
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (authError) throw badRequest(msg().wrongCurrentPassword);
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw translate(error.message, msg().updateFailed);
    // Other devices must log in again.
    await supabase.auth.signOut({ scope: 'others' });
  },

  /** Revokes the sessions of every other device. */
  async logoutOthers() {
    const { error } = await createClient().auth.signOut({ scope: 'others' });
    if (error) throw badRequest(msg().logoutOthersFailed);
  },

  /**
   * Deletes the account after a password check. The auth trigger anonymizes
   * the profile; orders keep their snapshot for accounting.
   */
  async deleteAccount(user: SessionUser, password: string, ip: string) {
    assertRateLimit(`delete:${user.id}:${ip}`, 5, 15 * 60_000);
    if (user.role === 'ADMIN') throw forbidden(msg().adminCannotDelete);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) throw badRequest(msg().wrongPassword);
    const { error: deleteError } = await supabaseAdmin().auth.admin.deleteUser(user.id);
    if (deleteError) throw badRequest(msg().deleteFailed);
    if (user.avatarKey) await storageService.remove(user.avatarKey);
    await supabase.auth.signOut().catch(() => undefined);
    cookies().delete(REMEMBER_COOKIE);
  },

  /** Email change: Supabase sends a confirmation link to the new address. */
  async changeEmail(email: string) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) throw conflict(msg().emailTaken);
    const { error } = await createClient().auth.updateUser({ email }, { emailRedirectTo: `${site()}/auth/callback?next=/account/profile` });
    if (error) throw translate(error.message, msg().emailChangeFailed);
  },

  /** Short-lived access token for Supabase Realtime in the browser (cookies are HttpOnly). */
  async realtimeToken() {
    const { data } = await createClient().auth.getSession();
    if (!data.session) throw unauthenticated();
    return { accessToken: data.session.access_token, expiresAt: data.session.expires_at ?? null };
  },

  /** Keeps the JWT role claim in sync with the database (used by the middleware). */
  async syncRoleClaim(userId: string, role: 'CLIENT' | 'ADMIN') {
    if (!hasSupabaseAdmin()) return;
    await supabaseAdmin().auth.admin.updateUserById(userId, { app_metadata: { role: role === 'ADMIN' ? 'admin' : 'client' } });
  },
};

async function getSessionUserFresh(id: string) {
  return (await prisma.user.findUnique({ where: { id } })) ?? getSessionUser();
}
