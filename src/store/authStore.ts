'use client';

import { create } from 'zustand';
import type { Address, User } from '@/types';
import { api } from '@/lib/api';

/**
 * Signed-in user as returned by /api/auth/me. The session itself lives in
 * HttpOnly cookies; this store is only the UI copy. Guards and layouts read
 * `user.role`; the server re-checks every request.
 */
export interface ClientPreferences {
  orderUpdatesSms: boolean;
  orderUpdatesEmail: boolean;
  promotions: boolean;
  newsletter: boolean;
  defaultDelivery: 'standard' | 'express' | 'pickup';
  defaultPayment: 'orange_money' | 'mtn_momo' | 'wave' | 'card' | 'cash';
}

export const DEFAULT_PREFERENCES: ClientPreferences = {
  orderUpdatesSms: true,
  orderUpdatesEmail: true,
  promotions: true,
  newsletter: false,
  defaultDelivery: 'standard',
  defaultPayment: 'card',
};

export interface MePayload {
  user: User;
  preferences: ClientPreferences;
}

interface AuthState {
  user: User | null;
  preferences: ClientPreferences;
  favorites: string[];
  /** Email waiting for verification after sign-up (no session yet). */
  pendingEmail: string | null;
  setSession: (me: MePayload | null) => void;
  setUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  setPendingEmail: (email: string | null) => void;
  setPreferences: (patch: Partial<ClientPreferences>) => Promise<void>;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (pizzaId: string) => Promise<boolean>;
  saveAddress: (address: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  logout: () => void;
}

const isUuid = (id?: string) => Boolean(id && /^[0-9a-f-]{36}$/i.test(id));

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  preferences: DEFAULT_PREFERENCES,
  favorites: [],
  pendingEmail: null,

  setSession: (me) => set(me ? { user: me.user, preferences: me.preferences } : { user: null, preferences: DEFAULT_PREFERENCES, favorites: [] }),
  setUser: (user) => set({ user }),
  updateUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
  setPendingEmail: (pendingEmail) => set({ pendingEmail }),

  setPreferences: async (patch) => {
    const next = { ...get().preferences, ...patch };
    const saved = await api.put<ClientPreferences>('/api/account/preferences', next);
    set({ preferences: saved });
  },

  loadFavorites: async () => {
    if (get().user?.role !== 'client') return;
    set({ favorites: await api.get<string[]>('/api/account/favorites') });
  },

  /** Returns the new state (true = favorite). Throws when signed out. */
  toggleFavorite: async (pizzaId) => {
    const isFav = get().favorites.includes(pizzaId);
    set((s) => ({ favorites: isFav ? s.favorites.filter((id) => id !== pizzaId) : [...s.favorites, pizzaId] }));
    try {
      const favorites = isFav ? await api.delete<string[]>(`/api/account/favorites/${pizzaId}`) : await api.post<string[]>('/api/account/favorites', { pizzaId });
      set({ favorites });
      return !isFav;
    } catch (error) {
      set((s) => ({ favorites: isFav ? [...s.favorites, pizzaId] : s.favorites.filter((id) => id !== pizzaId) }));
      throw error;
    }
  },

  saveAddress: async (address) => {
    const body = { label: address.label, street: address.street, district: address.district, city: address.city, details: address.details ?? null, isDefault: Boolean(address.isDefault) };
    const addresses = isUuid(address.id) && get().user?.addresses.some((a) => a.id === address.id)
      ? await api.put<Address[]>(`/api/account/addresses/${address.id}`, body)
      : await api.post<Address[]>('/api/account/addresses', body);
    set((s) => (s.user ? { user: { ...s.user, addresses } } : s));
  },

  deleteAddress: async (id) => {
    const addresses = await api.delete<Address[]>(`/api/account/addresses/${id}`);
    set((s) => (s.user ? { user: { ...s.user, addresses } } : s));
  },

  logout: () => set({ user: null, preferences: DEFAULT_PREFERENCES, favorites: [] }),
}));
