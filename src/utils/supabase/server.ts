import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Cookie set at login when "Rester connecté" is unchecked. */
export const REMEMBER_COOKIE = 'ff-remember';

/**
 * Hardens Supabase auth cookies: HttpOnly (no JavaScript access), Secure in
 * production, SameSite=Lax. Without "Rester connecté", cookies become
 * browser-session cookies (no Max-Age), so closing the browser ends the session.
 */
export function hardenCookie(options: CookieOptions, remember: boolean): CookieOptions {
  const hardened: CookieOptions = {
    ...options,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
  // Deletions use maxAge 0: keep them.
  if (!remember && options.maxAge !== 0) {
    delete hardened.maxAge;
    delete hardened.expires;
  }
  return hardened;
}

type CookieStore = ReturnType<typeof cookies>;

/** Supabase client for Route Handlers and Server Components (auth only; data goes through Prisma). */
export const createClient = (cookieStore: CookieStore = cookies()) => {
  const remember = cookieStore.get(REMEMBER_COOKIE)?.value !== '0';
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, hardenCookie(options, remember)));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
};
