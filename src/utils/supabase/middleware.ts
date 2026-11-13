import { createServerClient } from '@supabase/ssr';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { hardenCookie, REMEMBER_COOKIE } from './server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const ADMIN_LOGIN = '/admin/login';

/**
 * Runs on every matched request:
 * 1. refreshes the Supabase session (rotates tokens in HttpOnly cookies);
 * 2. blocks /account and /admin pages server-side for missing or wrong roles.
 * The role claim (app_metadata.role) is set only by the service role. API routes
 * re-check the role from the database on every call.
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0';

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, hardenCookie(options, remember)));
      },
    },
  });

  // Required: touching auth here is what refreshes an expired session token.
  // Do not put code between createServerClient and this call.
  // getClaims verifies the JWT signature locally (asymmetric keys, cached JWKS)
  // instead of calling Supabase Auth on every request: faster, and a slow
  // network no longer looks like a sign-out. API routes still check the
  // session with Supabase and the role in the database.
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname, search } = request.nextUrl;
  // Network failure: let the request through; the API layer protects the data.
  if (!claims && error && isAuthRetryableFetchError(error)) return response;
  const appRole = (claims?.app_metadata as { role?: string } | undefined)?.role;
  const role = claims ? (appRole === 'admin' ? 'admin' : 'client') : null;

  const redirect = (to: string, withNext = true) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = withNext ? `?redirect=${encodeURIComponent(pathname + search)}` : '';
    const res = NextResponse.redirect(url);
    // Keep refreshed cookies on the redirect.
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const isAdminPage = pathname.startsWith('/admin') && pathname !== ADMIN_LOGIN;
  if (isAdminPage) {
    if (!role) return redirect(ADMIN_LOGIN);
    if (role !== 'admin') return redirect('/unauthorized', false);
  }
  if (pathname.startsWith('/account')) {
    if (!role) return redirect('/login');
    if (role !== 'client') return redirect('/unauthorized', false);
  }

  return response;
};
