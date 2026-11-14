import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, SITE_DEFAULT_LOCALE, type Locale } from './config';
import { messagesFor, type Messages, type Namespace } from './messages';

/**
 * Language of the current request: `locale` cookie, else English (site default,
 * whatever the browser language). Outside a request (cron jobs, scripts, tests)
 * it falls back to DEFAULT_LOCALE.
 */
export function getLocale(): Locale {
  try {
    const cookie = cookies().get(LOCALE_COOKIE)?.value;
    return isLocale(cookie) ? cookie : SITE_DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Messages of one namespace, in the request language unless `locale` is given. */
export function getMessages<N extends Namespace>(ns: N, locale: Locale = getLocale()): Messages<N> {
  return messagesFor(locale, ns);
}

/** Picks the English text when the page is in English and the text exists. */
export function pickLocalized(fr: string, en: string | null | undefined, locale: Locale = getLocale()): string {
  return locale === 'en' && en?.trim() ? en : fr;
}
