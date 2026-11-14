'use client';

import * as React from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

/** Order refresh while an order is in progress, whatever the Realtime state. */
const ACTIVE_POLL_MS = 8_000;
/** Background refresh when Realtime is down (or no order is in progress). */
const IDLE_POLL_MS = 20_000;
const TOKEN_REFRESH_MS = 45 * 60_000;

let realtime: SupabaseClient | null = null;
function client() {
  if (!realtime) {
    realtime = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return realtime;
}

/**
 * Live order and notification updates for the signed-in user.
 * Supabase Realtime (postgres_changes, filtered by RLS) is the primary
 * channel; events only trigger a refetch through the API. Realtime can report
 * SUBSCRIBED and still drop events (expired token, network, RLS), so polling
 * never depends on it alone: every 8 s while an order is in progress, every
 * 20 s otherwise when the channel is down. An admin status change therefore
 * always reaches the customer without a manual reload.
 */
export function useLiveUpdates() {
  const user = useAuthStore((s) => s.user);
  const adminReady = useDataStore((s) => s.status.admin === 'ready');
  const clientReady = useDataStore((s) => s.status.client === 'ready');
  const ready = user?.role === 'admin' ? adminReady : clientReady;

  React.useEffect(() => {
    if (!user || !ready) return;
    const data = useDataStore.getState;
    let channel: RealtimeChannel | null = null;
    let connected = false;
    let disposed = false;

    const onOrder = (id?: string) => {
      if (id) void data().refreshOrder(id);
      else void data().refreshOrders().catch(() => undefined);
    };
    const onNotification = () => void data().refreshNotifications().catch(() => undefined);

    const authorize = async () => {
      const { accessToken } = await api.get<{ accessToken: string }>('/api/auth/realtime-token');
      client().realtime.setAuth(accessToken);
    };

    (async () => {
      try {
        await authorize();
        if (disposed) return;
        const isAdmin = user.role === 'admin';
        channel = client()
          .channel(`live-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', ...(isAdmin ? {} : { filter: `userId=eq.${user.id}` }) }, (payload) =>
            onOrder((payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id),
          )
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` }, onNotification)
          .subscribe((status) => {
            connected = status === 'SUBSCRIBED';
          });
      } catch {
        connected = false;
      }
    })();

    const hasActiveOrder = () => data().orders.some((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    let lastIdleRefresh = Date.now();
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (hasActiveOrder()) onOrder();
      if (!connected && Date.now() - lastIdleRefresh >= IDLE_POLL_MS) {
        lastIdleRefresh = Date.now();
        if (!hasActiveOrder()) onOrder();
        onNotification();
      }
    }, ACTIVE_POLL_MS);
    const refreshToken = setInterval(() => void authorize().catch(() => undefined), TOKEN_REFRESH_MS);
    // Back on the tab: catch up at once (timers are throttled in background tabs).
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return;
      onOrder();
      onNotification();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(refreshToken);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      if (channel) void client().removeChannel(channel);
    };
  }, [user, ready]);
}
