'use client';

import * as React from 'react';
import { DEFAULT_LOCALE, isLocale, type Locale } from './config';
import { messagesFor, type Messages, type Namespace } from './messages';
import { createFormat } from '@/lib/format';

const LocaleContext = React.createContext<Locale>(DEFAULT_LOCALE);

/** Receives the locale chosen by the server (cookie or Accept-Language). */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => React.useContext(LocaleContext);

/** Messages of one namespace in the current language. */
export function useMessages<N extends Namespace>(ns: N): Messages<N> {
  return messagesFor(useLocale(), ns);
}

/** Price, number and date formatters for the current language. */
export function useFormat() {
  const locale = useLocale();
  return React.useMemo(() => createFormat(locale), [locale]);
}

/** Locale of the page, for code outside React render (stores, async callbacks). Browser only. */
export function currentLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}

/** Messages for code outside React render (stores, toasts in async callbacks). Browser only. */
export function tr<N extends Namespace>(ns: N): Messages<N> {
  return messagesFor(currentLocale(), ns);
}

/**
 * Saves the language (cookie, and the profile when signed in) then reloads,
 * so the server-rendered parts, the catalog and the API messages follow.
 */
export async function changeLocale(locale: Locale) {
  if (locale === currentLocale()) return;
  try {
    await fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }), credentials: 'same-origin' });
  } catch {
    // Offline: the cookie below still applies the choice on this device.
  }
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
