import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { notConfigured } from '@/server/http/errors';
import { getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

let client: SupabaseClient | null = null;

/**
 * Supabase client with the secret (service role) key. Server-only.
 * Used for admin-level auth operations (ban a customer, sync the role claim).
 */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw notConfigured(msg().supabaseKeyMissing);
  client = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

export const hasSupabaseAdmin = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
