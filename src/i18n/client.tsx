'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, SITE_DEFAULT_LOCALE, type Locale } from './config';
import { messagesFor, type Messages, type Namespace } from './messages';
import { createFormat } from '@/lib/format';

const LocaleContext = React.createContext<Locale>(SITE_DEFAULT_LOCALE);
const SetLocaleContext = React.createContext<(locale: Locale) => Promise<void>>(async () => undefined);

/**
 * Holds the page language. Starts with the locale chosen by the server (cookie,
 * English by default) and switches in place, without a page reload.
 */
export function I18nProvider({ locale: initial, children }: { locale: Locale; children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>(initial);
  const router = useRouter();

  // A server render with another language (e.g. after router.refresh) wins.
  React.useEffect(() => setLocale(initial), [initial]);

  const change = React.useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      // Instant switch of every client text, keeping scroll position and state.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      document.documentElement.lang = next;
      setLocale(next);
      try {
        // Saves the choice on the profile when signed in.
        await fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: next }), credentials: 'same-origin' });
      } catch {
        // Offline: the cookie above still applies the choice on this device.
      }
      // Server-rendered parts (metadata, server components) and localized API data
      // (pizza names, notifications) follow in the background, with no reload.
      router.refresh();
      // Lazy import: the data store depends on this module (tr) through the API client.
      const store = (await import('@/store/dataStore')).useDataStore.getState();
      const reloads: Promise<void>[] = [store.loadPublic(true)];
      if (store.status.client === 'ready') reloads.push(store.loadClient(true));
      if (store.status.admin === 'ready') reloads.push(store.loadAdmin(true));
      await Promise.allSettled(reloads);
    },
    [locale, router],
  );

  return (
    <SetLocaleContext.Provider value={change}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </SetLocaleContext.Provider>
  );
}

export const useLocale = () => React.useContext(LocaleContext);

/** Switches the page language in place (cookie, profile, data), without reloading. */
export const useChangeLocale = () => React.useContext(SetLocaleContext);

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
  if (typeof document === 'undefined') return SITE_DEFAULT_LOCALE;
  const lang = document.documentElement.lang;
  return isLocale(lang) ? lang : SITE_DEFAULT_LOCALE;
}

/** Messages for code outside React render (stores, toasts in async callbacks). Browser only. */
export function tr<N extends Namespace>(ns: N): Messages<N> {
  return messagesFor(currentLocale(), ns);
}
