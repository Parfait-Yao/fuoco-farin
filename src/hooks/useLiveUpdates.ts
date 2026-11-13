'use client';

import * as React from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';

const POLL_MS = 20_000;
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
 * channel; events only trigger a refetch through the API. While the channel
 * is not connected, a 20 s polling keeps the screens fresh, so an admin
 * status change always reaches the client without a manual reload.
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

    const poll = setInterval(() => {
      if (connected || document.visibilityState !== 'visible') return;
      onOrder();
      onNotification();
    }, POLL_MS);
    const refreshToken = setInterval(() => void authorize().catch(() => undefined), TOKEN_REFRESH_MS);
    const onFocus = () => {
      if (!connected) {
        onOrder();
        onNotification();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(refreshToken);
      window.removeEventListener('focus', onFocus);
      if (channel) void client().removeChannel(channel);
    };
  }, [user, ready]);
}
