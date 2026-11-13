import { api, ApiError } from '@/lib/api';
import { useAuthStore, type MePayload } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { useCartStore } from '@/store/cartStore';
import type { Role, User } from '@/types';

/**
 * Browser side of authentication. Every call goes to the Next.js API, which
 * talks to Supabase Auth and sets HttpOnly cookies. No token is ever stored
 * in JavaScript.
 */
export const authService = {
  /** Loads the current session (or null) into the stores. */
  async refresh(): Promise<MePayload | null> {
    const me = await api.get<MePayload | null>('/api/auth/me');
    useAuthStore.getState().setSession(me);
    if (me?.user.role === 'client') void useAuthStore.getState().loadFavorites().catch(() => undefined);
    return me;
  },

  async login(email: string, password: string, space: Role, remember = true): Promise<User> {
    const me = await api.post<MePayload>('/api/auth/login', { email, password, space, remember });
    useAuthStore.getState().setSession(me);
    if (me.user.role === 'client') void useAuthStore.getState().loadFavorites().catch(() => undefined);
    return me.user;
  },

  /** Public sign-up: always creates a client account. Returns the email to verify. */
  async register(data: { firstName: string; lastName: string; email: string; phone: string; password: string }): Promise<{ email: string; needsVerification: boolean }> {
    const result = await api.post<{ email: string; needsVerification: boolean }>('/api/auth/register', data);
    useAuthStore.getState().setPendingEmail(result.email);
    if (!result.needsVerification) await this.refresh();
    return result;
  },

  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/api/auth/forgot-password', { email });
  },

  /** Runs on the reset page, after /auth/callback exchanged the email link for a session. */
  async resetPassword(password: string): Promise<void> {
    await api.post('/api/auth/reset-password', { password });
    this.clearLocal();
  },

  /** Needs `{{ .Token }}` in the Supabase "Confirm signup" email template. */
  async verifyEmail(email: string, code: string): Promise<void> {
    const me = await api.post<MePayload | null>('/api/auth/verify-email', { email, code });
    if (me) useAuthStore.getState().setSession(me);
    useAuthStore.getState().setPendingEmail(null);
  },

  async resendVerification(email: string): Promise<void> {
    await api.post('/api/auth/resend-verification', { email });
  },

  async changePassword(current: string, next: string): Promise<void> {
    await api.post('/api/auth/change-password', { current, next });
  },

  /** Clears local state immediately; the server call ends the session cookies. */
  logout(): void {
    this.clearLocal();
    void api.post('/api/auth/logout').catch(() => undefined);
  },

  clearLocal(): void {
    useAuthStore.getState().logout();
    useDataStore.getState().clearPrivate();
    useCartStore.getState().replaceItems([]);
    useCartStore.getState().applyPromo(null);
  },
};
