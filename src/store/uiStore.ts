'use client';

import { create } from 'zustand';
import { tr } from '@/i18n/client';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
  action?: { label: string; href: string };
}

interface UiState {
  hydrated: boolean;
  toasts: Toast[];
  setHydrated: () => void;
  notify: (message: string, severity?: ToastSeverity, action?: Toast['action']) => void;
  dismiss: (id: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  hydrated: false,
  toasts: [],
  setHydrated: () => set({ hydrated: true }),
  notify: (message, severity = 'success', action) =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), message, severity, action }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shortcut usable from any component or service. */
export const notify = (...args: Parameters<UiState['notify']>) => useUiStore.getState().notify(...args);

/**
 * Runs an API action: shows `success` when it resolves, the server message
 * when it fails. Returns the result, or undefined on failure.
 */
export async function attempt<T>(action: Promise<T> | (() => Promise<T>), success?: string, severity: ToastSeverity = 'success'): Promise<T | undefined> {
  try {
    const result = await (typeof action === 'function' ? action() : action);
    if (success) notify(success, severity);
    return result;
  } catch (error) {
    notify((error as Error).message || tr('common').genericError, 'error');
    return undefined;
  }
}
